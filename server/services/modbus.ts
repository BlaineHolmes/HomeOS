import ModbusRTU from 'modbus-serial';
import { EventEmitter } from 'events';

// ============================================================================
// MODBUS SERVICE - RTU/TCP CLIENT WITH CONNECTION MANAGEMENT
// ============================================================================

export interface ModbusConfig {
  type: 'tcp' | 'rtu';
  host?: string;
  port?: number;
  path?: string;
  baudRate?: number;
  dataBits?: number;
  stopBits?: number;
  parity?: 'none' | 'even' | 'odd';
  unitId: number;
  timeout?: number;
  retryDelay?: number;
  maxRetries?: number;
}

export interface RegisterMap {
  address: number;
  type: 'holding' | 'input' | 'coil' | 'discrete';
  dataType: 'uint16' | 'int16' | 'uint32' | 'int32' | 'float32' | 'bool';
  scale?: number;
  offset?: number;
  name: string;
  unit?: string;
  description?: string;
}

export interface ModbusData {
  timestamp: Date;
  values: { [key: string]: any };
  errors: string[];
  connectionStatus: 'connected' | 'disconnected' | 'error';
}

export class ModbusService extends EventEmitter {
  private client: ModbusRTU;
  private config: ModbusConfig;
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private retryCount: number = 0;
  private lastError: string | null = null;

  constructor(config: ModbusConfig) {
    super();
    this.config = {
      timeout: 5000,
      retryDelay: 5000,
      maxRetries: 3,
      ...config,
    };
    this.client = new ModbusRTU();
    this.setupClient();
  }

  /**
   * Setup Modbus client with error handling
   */
  private setupClient(): void {
    this.client.setTimeout(this.config.timeout!);
    this.client.setID(this.config.unitId);

    // Handle connection errors
    this.client.on('error', (error: any) => {
      this.lastError = error.message;
      this.isConnected = false;
      this.emit('error', error);
      console.error('🔴 Modbus connection error:', error.message);
      this.scheduleReconnect();
    });

    this.client.on('close', () => {
      this.isConnected = false;
      this.emit('disconnect');
      console.warn('⚠️  Modbus connection closed');
      this.scheduleReconnect();
    });
  }

  /**
   * Connect to Modbus device
   */
  async connect(): Promise<boolean> {
    if (this.isConnected || this.isConnecting) {
      return this.isConnected;
    }

    this.isConnecting = true;
    console.log(`🔄 Connecting to Modbus ${this.config.type.toUpperCase()}...`);

    try {
      if (this.config.type === 'tcp') {
        await this.client.connectTCP(this.config.host!, {
          port: this.config.port || 502,
        });
      } else {
        await this.client.connectRTUBuffered(this.config.path!, {
          baudRate: this.config.baudRate || 9600,
          dataBits: this.config.dataBits || 8,
          stopBits: this.config.stopBits || 1,
          parity: this.config.parity || 'none',
        });
      }

      this.isConnected = true;
      this.isConnecting = false;
      this.retryCount = 0;
      this.lastError = null;
      this.emit('connect');
      console.log('✅ Modbus connected successfully');
      return true;
    } catch (error: any) {
      this.isConnecting = false;
      this.lastError = error.message;
      console.error('❌ Modbus connection failed:', error.message);
      this.scheduleReconnect();
      return false;
    }
  }

  /**
   * Disconnect from Modbus device
   */
  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.client.isOpen) {
      this.client.close(() => {
        console.log('🛑 Modbus disconnected');
      });
    }

    this.isConnected = false;
    this.emit('disconnect');
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.retryCount >= this.config.maxRetries!) {
      return;
    }

    this.retryCount++;
    console.log(`🔄 Scheduling reconnect attempt ${this.retryCount}/${this.config.maxRetries} in ${this.config.retryDelay}ms`);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      await this.connect();
    }, this.config.retryDelay);
  }

  /**
   * Read multiple registers according to register map
   */
  async readRegisters(registerMap: RegisterMap[]): Promise<ModbusData> {
    const result: ModbusData = {
      timestamp: new Date(),
      values: {},
      errors: [],
      connectionStatus: this.isConnected ? 'connected' : 'disconnected',
    };

    if (!this.isConnected) {
      result.errors.push('Modbus not connected');
      return result;
    }

    for (const register of registerMap) {
      try {
        const value = await this.readSingleRegister(register);
        result.values[register.name] = value;
      } catch (error: any) {
        result.errors.push(`Failed to read ${register.name}: ${error.message}`);
        console.error(`❌ Error reading register ${register.name}:`, error.message);
      }
    }

    return result;
  }

  /**
   * Read a single register
   */
  private async readSingleRegister(register: RegisterMap): Promise<any> {
    let rawValue: any;

    // Read based on register type
    switch (register.type) {
      case 'holding':
        if (register.dataType === 'float32' || register.dataType === 'uint32' || register.dataType === 'int32') {
          const data = await this.client.readHoldingRegisters(register.address, 2);
          rawValue = this.parseMultiRegisterValue(data.data, register.dataType);
        } else {
          const data = await this.client.readHoldingRegisters(register.address, 1);
          rawValue = data.data[0];
        }
        break;

      case 'input':
        if (register.dataType === 'float32' || register.dataType === 'uint32' || register.dataType === 'int32') {
          const data = await this.client.readInputRegisters(register.address, 2);
          rawValue = this.parseMultiRegisterValue(data.data, register.dataType);
        } else {
          const data = await this.client.readInputRegisters(register.address, 1);
          rawValue = data.data[0];
        }
        break;

      case 'coil':
        const coilData = await this.client.readCoils(register.address, 1);
        rawValue = coilData.data[0];
        break;

      case 'discrete':
        const discreteData = await this.client.readDiscreteInputs(register.address, 1);
        rawValue = discreteData.data[0];
        break;

      default:
        throw new Error(`Unsupported register type: ${register.type}`);
    }

    // Apply scaling and offset
    let processedValue = rawValue;
    if (register.dataType !== 'bool') {
      if (register.scale) {
        processedValue = rawValue * register.scale;
      }
      if (register.offset) {
        processedValue = processedValue + register.offset;
      }
    }

    return processedValue;
  }

  /**
   * Parse multi-register values (32-bit integers, floats)
   */
  private parseMultiRegisterValue(data: number[], dataType: string): number {
    const buffer = Buffer.allocUnsafe(4);
    buffer.writeUInt16BE(data[0], 0);
    buffer.writeUInt16BE(data[1], 2);

    switch (dataType) {
      case 'uint32':
        return buffer.readUInt32BE(0);
      case 'int32':
        return buffer.readInt32BE(0);
      case 'float32':
        return buffer.readFloatBE(0);
      default:
        return data[0];
    }
  }

  /**
   * Write to a single coil
   */
  async writeCoil(address: number, value: boolean): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error('Modbus not connected');
    }

    try {
      await this.client.writeCoil(address, value);
      console.log(`✅ Wrote coil ${address}: ${value}`);
      return true;
    } catch (error: any) {
      console.error(`❌ Failed to write coil ${address}:`, error.message);
      throw error;
    }
  }

  /**
   * Write to a single holding register
   */
  async writeRegister(address: number, value: number): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error('Modbus not connected');
    }

    try {
      await this.client.writeRegister(address, value);
      console.log(`✅ Wrote register ${address}: ${value}`);
      return true;
    } catch (error: any) {
      console.error(`❌ Failed to write register ${address}:`, error.message);
      throw error;
    }
  }

  /**
   * Get connection status
   */
  getStatus(): {
    connected: boolean;
    connecting: boolean;
    retryCount: number;
    lastError: string | null;
    config: ModbusConfig;
  } {
    return {
      connected: this.isConnected,
      connecting: this.isConnecting,
      retryCount: this.retryCount,
      lastError: this.lastError,
      config: this.config,
    };
  }
}
