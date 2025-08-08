import { ModbusService, ModbusConfig, RegisterMap, ModbusData } from './modbus.js';
import { DatabaseService } from './database.js';
import { EventEmitter } from 'events';

// ============================================================================
// GENERATOR SERVICE - ADVANCED MODBUS MONITORING & CONTROL
// ============================================================================

export interface GeneratorStatus {
  // Engine Status
  isRunning: boolean;
  isLoaded: boolean;
  isCooldown: boolean;
  isReady: boolean;
  isStarting: boolean;
  isStopping: boolean;

  // Power Status
  mainsAvailable: boolean;
  generatorOnline: boolean;
  transferSwitchPosition: 'mains' | 'generator' | 'off';

  // Engine Metrics
  metrics: {
    outputVoltage: number;
    outputCurrent: number;
    frequency: number;
    powerOutput: number;
    powerFactor: number;
    oilTemperature: number;
    coolantTemperature: number;
    exhaustTemperature: number;
    rpm: number;
    oilPressure: number;
    fuelPressure: number;
    mainsVoltage: number;
    runtime: number;
    fuelLevel: number;
    batteryVoltage: number;
  };

  // Alarms & Faults
  alarms: string[];
  faults: string[];
  warnings: string[];

  // Maintenance
  nextMaintenanceHours: number;
  totalRuntime: number;
  lastMaintenanceDate: Date | null;

  // Connection
  connectionStatus: 'connected' | 'disconnected' | 'error';
  lastUpdated: Date;
  dataAge: number; // seconds since last update
}

export interface GeneratorConfig {
  brand: 'generac' | 'kohler' | 'cummins' | 'caterpillar' | 'mebay' | 'custom';
  model: string;
  modbus: ModbusConfig;
  registerMap?: RegisterMap[];
  maintenanceInterval: number; // hours
  fuelCapacity: number; // gallons
  ratedPower: number; // kW
}

export class GeneratorService extends EventEmitter {
  private static instance: GeneratorService | null = null;
  private modbusClient: ModbusService | null = null;
  private config: GeneratorConfig | null = null;
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastStatus: GeneratorStatus | null = null;
  private registerMap: RegisterMap[] = [];

  constructor() {
    super();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): GeneratorService {
    if (!this.instance) {
      this.instance = new GeneratorService();
    }
    return this.instance;
  }

  /**
   * Initialize generator service with configuration
   */
  async initialize(config: GeneratorConfig): Promise<void> {
    this.config = config;
    this.registerMap = config.registerMap || this.getDefaultRegisterMap(config.brand);

    // Initialize Modbus client
    this.modbusClient = new ModbusService(config.modbus);

    // Setup event handlers
    this.modbusClient.on('connect', () => {
      console.log('✅ Generator Modbus connected');
      this.emit('connected');
    });

    this.modbusClient.on('disconnect', () => {
      console.warn('⚠️  Generator Modbus disconnected');
      this.emit('disconnected');
    });

    this.modbusClient.on('error', (error) => {
      console.error('❌ Generator Modbus error:', error);
      this.emit('error', error);
    });

    console.log(`🔧 Generator service initialized for ${config.brand} ${config.model}`);
  }

  /**
   * Start generator monitoring
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('⚠️  Generator monitoring already running');
      return;
    }

    if (!this.modbusClient || !this.config) {
      throw new Error('Generator service not initialized');
    }

    // Connect to Modbus device
    const connected = await this.modbusClient.connect();
    if (!connected) {
      throw new Error('Failed to connect to generator Modbus interface');
    }

    this.isMonitoring = true;
    console.log('🔄 Starting generator monitoring...');

    // Start polling
    this.monitoringInterval = setInterval(async () => {
      await this.pollGeneratorData();
    }, parseInt(process.env.GENERATOR_POLL_INTERVAL || '1000'));

    // Initial poll
    await this.pollGeneratorData();
  }

  /**
   * Stop generator monitoring
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.modbusClient) {
      await this.modbusClient.disconnect();
    }

    console.log('🛑 Generator monitoring stopped');
  }

  /**
   * Poll generator data from Modbus
   */
  private async pollGeneratorData(): Promise<void> {
    if (!this.modbusClient) return;

    try {
      const modbusData: ModbusData = await this.modbusClient.readRegisters(this.registerMap);
      const status = this.parseGeneratorStatus(modbusData);

      // Store in database
      await this.storeGeneratorData(status);

      // Emit status update if changed
      if (!this.lastStatus || this.hasStatusChanged(this.lastStatus, status)) {
        this.emit('statusUpdate', status);
      }

      this.lastStatus = status;

    } catch (error: any) {
      console.error('❌ Error polling generator data:', error.message);
      this.emit('error', error);
    }
  }

  /**
   * Parse raw Modbus data into generator status
   */
  private parseGeneratorStatus(modbusData: ModbusData): GeneratorStatus {
    const values = modbusData.values;
    const now = new Date();

    // Parse engine status
    const engineStatus = values.engineStatus || 0;
    const isRunning = (engineStatus & 0x01) !== 0;
    const isLoaded = (engineStatus & 0x02) !== 0;
    const isCooldown = (engineStatus & 0x04) !== 0;
    const isReady = (engineStatus & 0x08) !== 0;
    const isStarting = (engineStatus & 0x10) !== 0;
    const isStopping = (engineStatus & 0x20) !== 0;

    // Parse power status
    const powerStatus = values.powerStatus || 0;
    const mainsAvailable = (powerStatus & 0x01) !== 0;
    const generatorOnline = (powerStatus & 0x02) !== 0;
    const transferSwitchPos = (powerStatus & 0x0C) >> 2;

    let transferSwitchPosition: 'mains' | 'generator' | 'off' = 'off';
    switch (transferSwitchPos) {
      case 1: transferSwitchPosition = 'mains'; break;
      case 2: transferSwitchPosition = 'generator'; break;
      default: transferSwitchPosition = 'off'; break;
    }

    // Parse alarms and faults
    const alarmBits = values.alarmStatus || 0;
    const faultBits = values.faultStatus || 0;
    const warningBits = values.warningStatus || 0;

    const alarms = this.parseAlarmBits(alarmBits);
    const faults = this.parseFaultBits(faultBits);
    const warnings = this.parseWarningBits(warningBits);

    return {
      isRunning,
      isLoaded,
      isCooldown,
      isReady,
      isStarting,
      isStopping,
      mainsAvailable,
      generatorOnline,
      transferSwitchPosition,
      metrics: {
        outputVoltage: values.outputVoltage || 0,
        outputCurrent: values.outputCurrent || 0,
        frequency: values.frequency || 0,
        powerOutput: values.powerOutput || 0,
        powerFactor: values.powerFactor || 0,
        oilTemperature: values.oilTemperature || 0,
        coolantTemperature: values.coolantTemperature || 0,
        exhaustTemperature: values.exhaustTemperature || 0,
        rpm: values.rpm || 0,
        oilPressure: values.oilPressure || 0,
        fuelPressure: values.fuelPressure || 0,
        mainsVoltage: values.mainsVoltage || 0,
        runtime: values.runtime || 0,
        fuelLevel: values.fuelLevel || 0,
        batteryVoltage: values.batteryVoltage || 0,
      },
      alarms,
      faults,
      warnings,
      nextMaintenanceHours: this.calculateNextMaintenance(values.runtime || 0),
      totalRuntime: values.totalRuntime || 0,
      lastMaintenanceDate: null, // TODO: Get from database
      connectionStatus: modbusData.connectionStatus,
      lastUpdated: now,
      dataAge: 0,
    };
  }

  /**
   * Get default register map for generator brand
   */
  private getDefaultRegisterMap(brand: string): RegisterMap[] {
    switch (brand) {
      case 'generac':
        return this.getGeneracRegisterMap();
      case 'kohler':
        return this.getKohlerRegisterMap();
      case 'cummins':
        return this.getCumminsRegisterMap();
      case 'mebay':
        return this.getMebayDC9xDRegisterMap();
      default:
        return this.getGenericRegisterMap();
    }
  }

  /**
   * Generac register mapping
   */
  private getGeneracRegisterMap(): RegisterMap[] {
    return [
      { address: 1, type: 'holding', dataType: 'uint16', name: 'engineStatus', description: 'Engine status bits' },
      { address: 2, type: 'holding', dataType: 'uint16', name: 'powerStatus', description: 'Power status bits' },
      { address: 3, type: 'holding', dataType: 'uint16', name: 'alarmStatus', description: 'Alarm status bits' },
      { address: 4, type: 'holding', dataType: 'uint16', name: 'faultStatus', description: 'Fault status bits' },
      { address: 5, type: 'holding', dataType: 'uint16', name: 'warningStatus', description: 'Warning status bits' },
      { address: 10, type: 'holding', dataType: 'uint16', name: 'outputVoltage', scale: 0.1, unit: 'V', description: 'Generator output voltage' },
      { address: 11, type: 'holding', dataType: 'uint16', name: 'outputCurrent', scale: 0.1, unit: 'A', description: 'Generator output current' },
      { address: 12, type: 'holding', dataType: 'uint16', name: 'frequency', scale: 0.1, unit: 'Hz', description: 'Generator frequency' },
      { address: 13, type: 'holding', dataType: 'uint16', name: 'powerOutput', scale: 0.1, unit: 'kW', description: 'Generator power output' },
      { address: 14, type: 'holding', dataType: 'uint16', name: 'powerFactor', scale: 0.01, description: 'Power factor' },
      { address: 20, type: 'holding', dataType: 'int16', name: 'oilTemperature', unit: '°F', description: 'Engine oil temperature' },
      { address: 21, type: 'holding', dataType: 'int16', name: 'coolantTemperature', unit: '°F', description: 'Engine coolant temperature' },
      { address: 22, type: 'holding', dataType: 'int16', name: 'exhaustTemperature', unit: '°F', description: 'Exhaust temperature' },
      { address: 23, type: 'holding', dataType: 'uint16', name: 'rpm', unit: 'RPM', description: 'Engine RPM' },
      { address: 24, type: 'holding', dataType: 'uint16', name: 'oilPressure', scale: 0.1, unit: 'PSI', description: 'Engine oil pressure' },
      { address: 25, type: 'holding', dataType: 'uint16', name: 'fuelPressure', scale: 0.1, unit: 'PSI', description: 'Fuel pressure' },
      { address: 26, type: 'holding', dataType: 'uint16', name: 'mainsVoltage', scale: 0.1, unit: 'V', description: 'Mains voltage' },
      { address: 30, type: 'holding', dataType: 'uint32', name: 'runtime', unit: 'hours', description: 'Current run time' },
      { address: 32, type: 'holding', dataType: 'uint32', name: 'totalRuntime', unit: 'hours', description: 'Total runtime' },
      { address: 34, type: 'holding', dataType: 'uint16', name: 'fuelLevel', unit: '%', description: 'Fuel level percentage' },
      { address: 35, type: 'holding', dataType: 'uint16', name: 'batteryVoltage', scale: 0.1, unit: 'V', description: 'Battery voltage' },
    ];
  }

  /**
   * Kohler register mapping
   */
  private getKohlerRegisterMap(): RegisterMap[] {
    return [
      { address: 100, type: 'holding', dataType: 'uint16', name: 'engineStatus', description: 'Engine status bits' },
      { address: 101, type: 'holding', dataType: 'uint16', name: 'powerStatus', description: 'Power status bits' },
      { address: 102, type: 'holding', dataType: 'uint16', name: 'alarmStatus', description: 'Alarm status bits' },
      { address: 103, type: 'holding', dataType: 'uint16', name: 'faultStatus', description: 'Fault status bits' },
      { address: 104, type: 'holding', dataType: 'uint16', name: 'warningStatus', description: 'Warning status bits' },
      { address: 200, type: 'holding', dataType: 'uint16', name: 'outputVoltage', unit: 'V', description: 'Generator output voltage' },
      { address: 201, type: 'holding', dataType: 'uint16', name: 'outputCurrent', scale: 0.1, unit: 'A', description: 'Generator output current' },
      { address: 202, type: 'holding', dataType: 'uint16', name: 'frequency', scale: 0.01, unit: 'Hz', description: 'Generator frequency' },
      { address: 203, type: 'holding', dataType: 'uint16', name: 'powerOutput', scale: 0.1, unit: 'kW', description: 'Generator power output' },
      { address: 204, type: 'holding', dataType: 'uint16', name: 'powerFactor', scale: 0.001, description: 'Power factor' },
      { address: 300, type: 'holding', dataType: 'int16', name: 'oilTemperature', unit: '°C', description: 'Engine oil temperature' },
      { address: 301, type: 'holding', dataType: 'int16', name: 'coolantTemperature', unit: '°C', description: 'Engine coolant temperature' },
      { address: 302, type: 'holding', dataType: 'int16', name: 'exhaustTemperature', unit: '°C', description: 'Exhaust temperature' },
      { address: 303, type: 'holding', dataType: 'uint16', name: 'rpm', unit: 'RPM', description: 'Engine RPM' },
      { address: 304, type: 'holding', dataType: 'uint16', name: 'oilPressure', unit: 'kPa', description: 'Engine oil pressure' },
      { address: 305, type: 'holding', dataType: 'uint16', name: 'fuelPressure', unit: 'kPa', description: 'Fuel pressure' },
      { address: 306, type: 'holding', dataType: 'uint16', name: 'mainsVoltage', unit: 'V', description: 'Mains voltage' },
      { address: 400, type: 'holding', dataType: 'uint32', name: 'runtime', unit: 'minutes', description: 'Current run time' },
      { address: 402, type: 'holding', dataType: 'uint32', name: 'totalRuntime', unit: 'hours', description: 'Total runtime' },
      { address: 404, type: 'holding', dataType: 'uint16', name: 'fuelLevel', unit: '%', description: 'Fuel level percentage' },
      { address: 405, type: 'holding', dataType: 'uint16', name: 'batteryVoltage', scale: 0.1, unit: 'V', description: 'Battery voltage' },
    ];
  }

  /**
   * Generic register mapping (fallback)
   */
  private getGenericRegisterMap(): RegisterMap[] {
    return this.getGeneracRegisterMap(); // Use Generac as default
  }

  /**
   * Cummins register mapping
   */
  private getCumminsRegisterMap(): RegisterMap[] {
    return [
      { address: 0, type: 'holding', dataType: 'uint16', name: 'engineStatus', description: 'Engine status bits' },
      { address: 1, type: 'holding', dataType: 'uint16', name: 'powerStatus', description: 'Power status bits' },
      { address: 2, type: 'holding', dataType: 'uint16', name: 'alarmStatus', description: 'Alarm status bits' },
      { address: 3, type: 'holding', dataType: 'uint16', name: 'faultStatus', description: 'Fault status bits' },
      { address: 4, type: 'holding', dataType: 'uint16', name: 'warningStatus', description: 'Warning status bits' },
      { address: 50, type: 'holding', dataType: 'float32', name: 'outputVoltage', unit: 'V', description: 'Generator output voltage' },
      { address: 52, type: 'holding', dataType: 'float32', name: 'outputCurrent', unit: 'A', description: 'Generator output current' },
      { address: 54, type: 'holding', dataType: 'float32', name: 'frequency', unit: 'Hz', description: 'Generator frequency' },
      { address: 56, type: 'holding', dataType: 'float32', name: 'powerOutput', unit: 'kW', description: 'Generator power output' },
      { address: 58, type: 'holding', dataType: 'float32', name: 'powerFactor', description: 'Power factor' },
      { address: 100, type: 'holding', dataType: 'float32', name: 'oilTemperature', unit: '°C', description: 'Engine oil temperature' },
      { address: 102, type: 'holding', dataType: 'float32', name: 'coolantTemperature', unit: '°C', description: 'Engine coolant temperature' },
      { address: 104, type: 'holding', dataType: 'float32', name: 'exhaustTemperature', unit: '°C', description: 'Exhaust temperature' },
      { address: 106, type: 'holding', dataType: 'float32', name: 'rpm', unit: 'RPM', description: 'Engine RPM' },
      { address: 108, type: 'holding', dataType: 'float32', name: 'oilPressure', unit: 'kPa', description: 'Engine oil pressure' },
      { address: 110, type: 'holding', dataType: 'float32', name: 'fuelPressure', unit: 'kPa', description: 'Fuel pressure' },
      { address: 112, type: 'holding', dataType: 'float32', name: 'mainsVoltage', unit: 'V', description: 'Mains voltage' },
      { address: 150, type: 'holding', dataType: 'uint32', name: 'runtime', unit: 'seconds', description: 'Current run time' },
      { address: 152, type: 'holding', dataType: 'uint32', name: 'totalRuntime', unit: 'hours', description: 'Total runtime' },
      { address: 154, type: 'holding', dataType: 'float32', name: 'fuelLevel', unit: '%', description: 'Fuel level percentage' },
      { address: 156, type: 'holding', dataType: 'float32', name: 'batteryVoltage', unit: 'V', description: 'Battery voltage' },
    ];
  }

  /**
   * Parse alarm bits into readable messages
   */
  private parseAlarmBits(alarmBits: number): string[] {
    const alarms: string[] = [];
    if (alarmBits & 0x01) alarms.push('Low Oil Pressure');
    if (alarmBits & 0x02) alarms.push('High Engine Temperature');
    if (alarmBits & 0x04) alarms.push('Low Fuel Level');
    if (alarmBits & 0x08) alarms.push('Battery Voltage Low');
    if (alarmBits & 0x10) alarms.push('Overcurrent');
    if (alarmBits & 0x20) alarms.push('Overvoltage');
    if (alarmBits & 0x40) alarms.push('Undervoltage');
    if (alarmBits & 0x80) alarms.push('Overfrequency');
    return alarms;
  }

  /**
   * Parse fault bits into readable messages
   */
  private parseFaultBits(faultBits: number): string[] {
    const faults: string[] = [];
    if (faultBits & 0x01) faults.push('Engine Fault');
    if (faultBits & 0x02) faults.push('Generator Fault');
    if (faultBits & 0x04) faults.push('Transfer Switch Fault');
    if (faultBits & 0x08) faults.push('Communication Fault');
    if (faultBits & 0x10) faults.push('Sensor Fault');
    if (faultBits & 0x20) faults.push('Control System Fault');
    return faults;
  }

  /**
   * Parse warning bits into readable messages
   */
  private parseWarningBits(warningBits: number): string[] {
    const warnings: string[] = [];
    if (warningBits & 0x01) warnings.push('Maintenance Due');
    if (warningBits & 0x02) warnings.push('Filter Replacement Due');
    if (warningBits & 0x04) warnings.push('Oil Change Due');
    if (warningBits & 0x08) warnings.push('Battery Maintenance Due');
    if (warningBits & 0x10) warnings.push('Fuel Filter Due');
    if (warningBits & 0x20) warnings.push('Air Filter Due');
    return warnings;
  }

  /**
   * Calculate next maintenance based on runtime
   */
  private calculateNextMaintenance(currentRuntime: number): number {
    if (!this.config) return 0;
    const maintenanceInterval = this.config.maintenanceInterval;
    const nextMaintenance = Math.ceil(currentRuntime / maintenanceInterval) * maintenanceInterval;
    return nextMaintenance - currentRuntime;
  }

  /**
   * Check if status has significantly changed
   */
  private hasStatusChanged(oldStatus: GeneratorStatus, newStatus: GeneratorStatus): boolean {
    // Check critical status changes
    if (oldStatus.isRunning !== newStatus.isRunning) return true;
    if (oldStatus.isLoaded !== newStatus.isLoaded) return true;
    if (oldStatus.mainsAvailable !== newStatus.mainsAvailable) return true;
    if (oldStatus.transferSwitchPosition !== newStatus.transferSwitchPosition) return true;
    if (oldStatus.alarms.length !== newStatus.alarms.length) return true;
    if (oldStatus.faults.length !== newStatus.faults.length) return true;

    // Check significant metric changes (>5% change)
    const oldMetrics = oldStatus.metrics;
    const newMetrics = newStatus.metrics;

    const significantChange = (old: number, new_val: number, threshold: number = 0.05): boolean => {
      if (old === 0) return new_val !== 0;
      return Math.abs((new_val - old) / old) > threshold;
    };

    if (significantChange(oldMetrics.outputVoltage, newMetrics.outputVoltage)) return true;
    if (significantChange(oldMetrics.frequency, newMetrics.frequency)) return true;
    if (significantChange(oldMetrics.powerOutput, newMetrics.powerOutput)) return true;
    if (significantChange(oldMetrics.fuelLevel, newMetrics.fuelLevel, 0.02)) return true; // 2% for fuel

    return false;
  }

  /**
   * Store generator data in database
   */
  private async storeGeneratorData(status: GeneratorStatus): Promise<void> {
    try {
      const logId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await DatabaseService.execute(`
        INSERT INTO generator_logs (
          id, timestamp, is_running, is_loaded, is_cooldown, is_ready,
          mains_available, output_voltage, frequency, oil_temperature,
          coolant_temperature, rpm, oil_pressure, mains_voltage, runtime,
          fuel_level
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        logId,
        status.lastUpdated.toISOString(),
        status.isRunning ? 1 : 0,
        status.isLoaded ? 1 : 0,
        status.isCooldown ? 1 : 0,
        status.isReady ? 1 : 0,
        status.mainsAvailable ? 1 : 0,
        status.metrics.outputVoltage,
        status.metrics.frequency,
        status.metrics.oilTemperature,
        status.metrics.coolantTemperature,
        status.metrics.rpm,
        status.metrics.oilPressure,
        status.metrics.mainsVoltage,
        status.metrics.runtime,
        status.metrics.fuelLevel,
      ]);
    } catch (error: any) {
      console.error('❌ Failed to store generator data:', error.message);
    }
  }

  /**
   * Start generator (remote start)
   */
  async startGenerator(): Promise<boolean> {
    if (!this.modbusClient || !this.lastStatus) {
      throw new Error('Generator service not ready');
    }

    // Safety checks
    if (this.lastStatus.faults.length > 0) {
      throw new Error(`Cannot start generator: Active faults - ${this.lastStatus.faults.join(', ')}`);
    }

    if (this.lastStatus.isRunning) {
      throw new Error('Generator is already running');
    }

    if (!this.lastStatus.isReady) {
      throw new Error('Generator is not ready to start');
    }

    try {
      // Write to start coil (address may vary by brand)
      await this.modbusClient.writeCoil(1000, true);
      console.log('✅ Generator start command sent');

      // Wait a moment then reset the coil
      setTimeout(async () => {
        try {
          await this.modbusClient!.writeCoil(1000, false);
        } catch (error) {
          console.error('⚠️  Failed to reset start coil:', error);
        }
      }, 1000);

      return true;
    } catch (error: any) {
      console.error('❌ Failed to start generator:', error.message);
      throw error;
    }
  }

  /**
   * Stop generator (remote stop)
   */
  async stopGenerator(): Promise<boolean> {
    if (!this.modbusClient || !this.lastStatus) {
      throw new Error('Generator service not ready');
    }

    if (!this.lastStatus.isRunning) {
      throw new Error('Generator is not running');
    }

    try {
      // Write to stop coil (address may vary by brand)
      await this.modbusClient.writeCoil(1001, true);
      console.log('✅ Generator stop command sent');

      // Wait a moment then reset the coil
      setTimeout(async () => {
        try {
          await this.modbusClient!.writeCoil(1001, false);
        } catch (error) {
          console.error('⚠️  Failed to reset stop coil:', error);
        }
      }, 1000);

      return true;
    } catch (error: any) {
      console.error('❌ Failed to stop generator:', error.message);
      throw error;
    }
  }

  /**
   * Get current generator status
   */
  async getStatus(): Promise<GeneratorStatus | null> {
    if (this.lastStatus) {
      // Update data age
      const now = new Date();
      this.lastStatus.dataAge = Math.floor((now.getTime() - this.lastStatus.lastUpdated.getTime()) / 1000);
    }
    return this.lastStatus;
  }

  /**
   * Get generator configuration
   */
  getConfig(): GeneratorConfig | null {
    return this.config;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): any {
    return this.modbusClient?.getStatus() || null;
  }

  /**
   * Test generator connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.modbusClient) {
      throw new Error('Generator service not initialized');
    }

    try {
      const connected = await this.modbusClient.connect();
      if (connected) {
        // Try to read a simple register
        await this.modbusClient.readRegisters([this.registerMap[0]]);
        console.log('✅ Generator connection test successful');
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('❌ Generator connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Get historical data
   */
  async getHistoricalData(hours: number = 24): Promise<any[]> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      const data = await DatabaseService.query(`
        SELECT * FROM generator_logs
        WHERE timestamp >= ?
        ORDER BY timestamp DESC
      `, [since]);

      return data;
    } catch (error: any) {
      console.error('❌ Failed to get historical data:', error.message);
      return [];
    }
  }

  /**
   * MEBAY DC9xD register mapping - Based on official documentation
   * DC90DR/DC92DR/DC90DR MK2/DC92DR MK2 controllers
   */
  private getMebayDC9xDRegisterMap(): RegisterMap[] {
    return [
      // Engine Parameters
      { address: 0x1000, type: 'holding', dataType: 'uint16', name: 'engine_speed', description: 'Engine Speed (RPM)' },
      { address: 0x1001, type: 'holding', dataType: 'uint16', name: 'battery_voltage', description: 'Battery Voltage (V x 0.1)' },
      { address: 0x1002, type: 'holding', dataType: 'uint16', name: 'charging_voltage', description: 'Charging Voltage (V x 0.1)' },

      // Date and Time
      { address: 0x1007, type: 'holding', dataType: 'uint16', name: 'current_date', description: 'Current Date (bit0-4:Day, bit5-8:Month, bit9-15:Year)' },
      { address: 0x1008, type: 'holding', dataType: 'uint16', name: 'current_time', description: 'Current Time (Decimal HHMM)' },

      // Generator Electrical Parameters
      { address: 0x1009, type: 'holding', dataType: 'uint16', name: 'generator_frequency', description: 'Generator Frequency (Hz x 0.1)' },
      { address: 0x100A, type: 'holding', dataType: 'uint16', name: 'generator_voltage_l1', description: 'Generator Voltage L1 (V)' },
      { address: 0x100B, type: 'holding', dataType: 'uint16', name: 'generator_voltage_l2', description: 'Generator Voltage L2 (V)' },
      { address: 0x100C, type: 'holding', dataType: 'uint16', name: 'generator_voltage_l3', description: 'Generator Voltage L3 (V)' },
      { address: 0x100D, type: 'holding', dataType: 'uint16', name: 'generator_voltage_l1_l2', description: 'Generator Voltage L1-L2 (V)' },
      { address: 0x100E, type: 'holding', dataType: 'uint16', name: 'generator_voltage_l2_l3', description: 'Generator Voltage L2-L3 (V)' },
      { address: 0x100F, type: 'holding', dataType: 'uint16', name: 'generator_voltage_l3_l1', description: 'Generator Voltage L3-L1 (V)' },

      // Generator Current
      { address: 0x1010, type: 'holding', dataType: 'uint16', name: 'generator_current_l1', description: 'Generator Current L1 (A x 0.1)' },
      { address: 0x1011, type: 'holding', dataType: 'uint16', name: 'generator_current_l2', description: 'Generator Current L2 (A x 0.1)' },
      { address: 0x1012, type: 'holding', dataType: 'uint16', name: 'generator_current_l3', description: 'Generator Current L3 (A x 0.1)' },
      { address: 0x1013, type: 'holding', dataType: 'uint16', name: 'generator_total_current', description: 'Generator Total Current (A x 0.1)' },

      // Power Measurements
      { address: 0x1014, type: 'holding', dataType: 'uint16', name: 'apparent_power_s1', description: 'Apparent Power S1 (kVA x 0.1)' },
      { address: 0x1015, type: 'holding', dataType: 'uint16', name: 'apparent_power_s2', description: 'Apparent Power S2 (kVA x 0.1)' },
      { address: 0x1016, type: 'holding', dataType: 'uint16', name: 'apparent_power_s3', description: 'Apparent Power S3 (kVA x 0.1)' },
      { address: 0x1017, type: 'holding', dataType: 'uint16', name: 'total_apparent_power', description: 'Total Apparent Power (kVA x 0.1)' },

      { address: 0x1018, type: 'holding', dataType: 'uint16', name: 'active_power_p1', description: 'Active Power P1 (kW x 0.1)' },
      { address: 0x1019, type: 'holding', dataType: 'uint16', name: 'active_power_p2', description: 'Active Power P2 (kW x 0.1)' },
      { address: 0x101A, type: 'holding', dataType: 'uint16', name: 'active_power_p3', description: 'Active Power P3 (kW x 0.1)' },
      { address: 0x101B, type: 'holding', dataType: 'uint16', name: 'total_active_power', description: 'Total Active Power (kW x 0.1)' },

      { address: 0x101C, type: 'holding', dataType: 'uint16', name: 'reactive_power_q1', description: 'Reactive Power Q1 (kVar x 0.1)' },
      { address: 0x101D, type: 'holding', dataType: 'uint16', name: 'reactive_power_q2', description: 'Reactive Power Q2 (kVar x 0.1)' },
      { address: 0x101E, type: 'holding', dataType: 'uint16', name: 'reactive_power_q3', description: 'Reactive Power Q3 (kVar x 0.1)' },
      { address: 0x101F, type: 'holding', dataType: 'uint16', name: 'total_reactive_power', description: 'Total Reactive Power (kVar x 0.1)' },

      // Power Factor
      { address: 0x1020, type: 'holding', dataType: 'uint16', name: 'power_factor_pf1', description: 'Power Factor PF1 (x 0.01)' },
      { address: 0x1021, type: 'holding', dataType: 'uint16', name: 'power_factor_pf2', description: 'Power Factor PF2 (x 0.01)' },
      { address: 0x1022, type: 'holding', dataType: 'uint16', name: 'power_factor_pf3', description: 'Power Factor PF3 (x 0.01)' },
      { address: 0x1023, type: 'holding', dataType: 'uint16', name: 'average_power_factor', description: 'Average Power Factor (x 0.01)' },

      // Mains Electrical Parameters
      { address: 0x1024, type: 'holding', dataType: 'uint16', name: 'mains_frequency', description: 'Mains Frequency (Hz x 0.1)' },
      { address: 0x1025, type: 'holding', dataType: 'uint16', name: 'mains_voltage_l1', description: 'Mains Voltage L1 (V)' },
      { address: 0x1026, type: 'holding', dataType: 'uint16', name: 'mains_voltage_l2', description: 'Mains Voltage L2 (V)' },
      { address: 0x1027, type: 'holding', dataType: 'uint16', name: 'mains_voltage_l3', description: 'Mains Voltage L3 (V)' },
      { address: 0x1028, type: 'holding', dataType: 'uint16', name: 'mains_voltage_l1_l2', description: 'Mains Voltage L1-L2 (V)' },
      { address: 0x1029, type: 'holding', dataType: 'uint16', name: 'mains_voltage_l2_l3', description: 'Mains Voltage L2-L3 (V)' },
      { address: 0x102A, type: 'holding', dataType: 'uint16', name: 'mains_voltage_l3_l1', description: 'Mains Voltage L3-L1 (V)' },

      // Maintenance Information
      { address: 0x102C, type: 'holding', dataType: 'uint16', name: 'primary_maintenance_date', description: 'Primary Maintenance Date' },
      { address: 0x102D, type: 'holding', dataType: 'uint16', name: 'primary_maintenance_countdown', description: 'Primary Maintenance Countdown (H)' },
      { address: 0x102E, type: 'holding', dataType: 'uint16', name: 'secondary_maintenance_date', description: 'Secondary Maintenance Date' },
      { address: 0x102F, type: 'holding', dataType: 'uint16', name: 'secondary_maintenance_countdown', description: 'Secondary Maintenance Countdown (H)' },
      { address: 0x1030, type: 'holding', dataType: 'uint16', name: 'third_maintenance_date', description: 'Third Maintenance Date' },
      { address: 0x1031, type: 'holding', dataType: 'uint16', name: 'third_maintenance_countdown', description: 'Third Maintenance Countdown (H)' },

      // Status Registers
      { address: 0x1032, type: 'holding', dataType: 'uint16', name: 'switch_input_status', description: 'Switch Input Status' },
      { address: 0x1033, type: 'holding', dataType: 'uint16', name: 'relay_output_status', description: 'Relay Output Status' },
      { address: 0x1034, type: 'holding', dataType: 'uint16', name: 'running_time', description: 'Running Time (H x 0.1)' },
      { address: 0x1035, type: 'holding', dataType: 'uint16', name: 'total_crank_times', description: 'Total Crank Times' },
      { address: 0x1036, type: 'holding', dataType: 'uint16', name: 'total_running_time_h', description: 'Total Running Time High' },
      { address: 0x1037, type: 'holding', dataType: 'uint16', name: 'total_running_time_l', description: 'Total Running Time Low (H x 0.1)' },

      // Load Information
      { address: 0x1038, type: 'holding', dataType: 'uint16', name: 'dynamic_load_rate', description: 'Dynamic Load Rate (%)' },
      { address: 0x1039, type: 'holding', dataType: 'uint16', name: 'current_load_rate', description: 'Current Load Rate (%)' },
      { address: 0x103A, type: 'holding', dataType: 'uint16', name: 'average_load_rate', description: 'Average Load Rate (%)' },

      // Energy Consumption
      { address: 0x103B, type: 'holding', dataType: 'uint16', name: 'current_consumption_h', description: 'Current Consumption High' },
      { address: 0x103C, type: 'holding', dataType: 'uint16', name: 'current_consumption_l', description: 'Current Consumption Low (kWh)' },
      { address: 0x103D, type: 'holding', dataType: 'uint16', name: 'total_consumption_h', description: 'Total Consumption High' },
      { address: 0x103E, type: 'holding', dataType: 'uint16', name: 'total_consumption_l', description: 'Total Consumption Low (kWh)' },

      // Control Status
      { address: 0x103F, type: 'holding', dataType: 'uint16', name: 'gear_status', description: 'Gear Status (Stop/Manual/Auto/Test)' },
      { address: 0x1040, type: 'holding', dataType: 'uint16', name: 'ats_status', description: 'ATS Status (Mains/NC/Gen)' },
      { address: 0x1041, type: 'holding', dataType: 'uint16', name: 'running_status', description: 'Running Status' },
      { address: 0x1042, type: 'holding', dataType: 'uint16', name: 'led_status', description: 'LED Status' },

      // Alarm and Warning Codes
      { address: 0x1043, type: 'holding', dataType: 'uint16', name: 'alarm_code', description: 'Alarm Code' },
      { address: 0x1044, type: 'holding', dataType: 'uint16', name: 'warning_code_4', description: 'Warning Code 4' },
      { address: 0x1045, type: 'holding', dataType: 'uint16', name: 'warning_code_3', description: 'Warning Code 3' },
      { address: 0x1046, type: 'holding', dataType: 'uint16', name: 'warning_code_2', description: 'Warning Code 2' },
      { address: 0x1047, type: 'holding', dataType: 'uint16', name: 'warning_code_1', description: 'Warning Code 1' },

      // Engine Sensors
      { address: 0x1053, type: 'holding', dataType: 'uint16', name: 'oil_pressure', description: 'Oil Pressure (PSI)' },
      { address: 0x1054, type: 'holding', dataType: 'uint16', name: 'water_temperature', description: 'Water Temperature (°C)' },
      { address: 0x1055, type: 'holding', dataType: 'uint16', name: 'oil_temperature', description: 'Oil Temperature (°C)' },
      { address: 0x1056, type: 'holding', dataType: 'uint16', name: 'cylinder_temperature', description: 'Cylinder Temperature (°C)' },
      { address: 0x1057, type: 'holding', dataType: 'uint16', name: 'box_temperature', description: 'Box Temperature (°C)' },
      { address: 0x1058, type: 'holding', dataType: 'uint16', name: 'fuel_level', description: 'Fuel Level (%)' },

      // Additional Sensors
      { address: 0x1059, type: 'holding', dataType: 'uint16', name: 'sensor_1_resistance', description: 'Sensor 1 Resistance (Ω)' },
      { address: 0x105A, type: 'holding', dataType: 'uint16', name: 'sensor_2_resistance', description: 'Sensor 2 Resistance (Ω)' },
      { address: 0x105B, type: 'holding', dataType: 'uint16', name: 'sensor_3_resistance', description: 'Sensor 3 Resistance (Ω)' },
      { address: 0x105C, type: 'holding', dataType: 'uint16', name: 'sensor_4_resistance', description: 'Sensor 4 Resistance (Ω)' },
      { address: 0x1067, type: 'holding', dataType: 'uint16', name: 'sensor_5_resistance', description: 'Sensor 5 Resistance (Ω)' },
      { address: 0x1068, type: 'holding', dataType: 'uint16', name: 'sensor_6_resistance', description: 'Sensor 6 Resistance (Ω)' },
    ];
  }
}

// Export singleton instance
export const generatorService = GeneratorService.getInstance();
