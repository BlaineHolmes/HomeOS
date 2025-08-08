import { EventEmitter } from 'events';
import { DatabaseService } from './database.js';

// ============================================================================
// ENERGY MONITORING SERVICE - REAL-TIME POWER ANALYTICS
// ============================================================================

export interface EnergyReading {
  id: string;
  timestamp: string;
  total_power: number;
  voltage: number;
  current: number;
  frequency: number;
  power_factor: number;
  daily_usage: number;
  monthly_usage: number;
  cost_today: number;
  cost_month: number;
  created_at: string;
}

export interface CircuitReading {
  id: string;
  circuit_id: string;
  circuit_name: string;
  power: number;
  voltage: number;
  current: number;
  status: 'normal' | 'warning' | 'critical';
  percentage: number;
  timestamp: string;
}

export interface EnergyAlert {
  id: string;
  type: 'high_usage' | 'voltage_anomaly' | 'circuit_overload' | 'power_outage';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  circuit_id?: string;
  value: number;
  threshold: number;
  timestamp: string;
  acknowledged: boolean;
}

export class EnergyMonitorService extends EventEmitter {
  private static instance: EnergyMonitorService | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private electricityRate = 0.12; // $0.12 per kWh

  // Circuit definitions
  private circuits = [
    { id: 'main', name: 'Main Panel', max_power: 5000, max_current: 25 },
    { id: 'hvac', name: 'HVAC System', max_power: 3000, max_current: 15 },
    { id: 'kitchen', name: 'Kitchen', max_power: 2000, max_current: 10 },
    { id: 'living', name: 'Living Room', max_power: 1500, max_current: 8 },
    { id: 'bedrooms', name: 'Bedrooms', max_power: 1000, max_current: 6 },
    { id: 'garage', name: 'Garage', max_power: 800, max_current: 5 },
  ];

  constructor() {
    super();
    // Don't start monitoring in constructor - wait for explicit call
  }

  /**
   * Get singleton instance
   */
  static getInstance(): EnergyMonitorService {
    if (!this.instance) {
      this.instance = new EnergyMonitorService();
    }
    return this.instance;
  }

  /**
   * Start energy monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    console.log('🔌 Starting energy monitoring...');

    // Simulate real-time energy readings every 5 seconds
    this.monitoringInterval = setInterval(() => {
      this.collectEnergyData();
    }, 5000);

    this.emit('monitoringStarted');
  }

  /**
   * Stop energy monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('🔌 Energy monitoring stopped');
    this.emit('monitoringStopped');
  }

  /**
   * Collect energy data (simulated)
   */
  private async collectEnergyData(): Promise<void> {
    try {
      const now = new Date();
      const timestamp = now.toISOString();

      // Generate realistic energy data
      const baseLoad = 2000; // Base load in watts
      const variableLoad = Math.sin(now.getHours() * Math.PI / 12) * 1500 + Math.random() * 500;
      const totalPower = baseLoad + variableLoad;

      const voltage = 240 + (Math.random() - 0.5) * 10; // 235-245V
      const current = totalPower / voltage;
      const frequency = 60 + (Math.random() - 0.5) * 0.2; // 59.9-60.1 Hz
      const powerFactor = 0.85 + Math.random() * 0.1; // 0.85-0.95

      // Calculate daily and monthly usage
      const dailyUsage = this.calculateDailyUsage(totalPower);
      const monthlyUsage = await this.calculateMonthlyUsage();
      const costToday = dailyUsage * this.electricityRate;
      const costMonth = monthlyUsage * this.electricityRate;

      // Create energy reading
      const reading: EnergyReading = {
        id: `reading_${Date.now()}`,
        timestamp,
        total_power: totalPower,
        voltage,
        current,
        frequency,
        power_factor: powerFactor,
        daily_usage: dailyUsage,
        monthly_usage: monthlyUsage,
        cost_today: costToday,
        cost_month: costMonth,
        created_at: timestamp,
      };

      // Store reading in database
      await this.storeEnergyReading(reading);

      // Generate circuit readings
      const circuitReadings = this.generateCircuitReadings(totalPower, voltage, timestamp);
      await this.storeCircuitReadings(circuitReadings);

      // Check for alerts
      await this.checkForAlerts(reading, circuitReadings);

      // Emit real-time data
      this.emit('energyData', {
        reading,
        circuits: circuitReadings,
      });

    } catch (error: any) {
      console.error('❌ Failed to collect energy data:', error.message);
    }
  }

  /**
   * Generate circuit readings based on total power
   */
  private generateCircuitReadings(totalPower: number, voltage: number, timestamp: string): CircuitReading[] {
    const readings: CircuitReading[] = [];

    // Distribute power across circuits with realistic patterns
    const powerDistribution = {
      main: totalPower,
      hvac: totalPower * (0.4 + Math.random() * 0.2), // 40-60% of total
      kitchen: 300 + Math.random() * 800, // 300-1100W
      living: 200 + Math.random() * 400, // 200-600W
      bedrooms: 150 + Math.random() * 300, // 150-450W
      garage: 50 + Math.random() * 200, // 50-250W
    };

    this.circuits.forEach(circuit => {
      const power = powerDistribution[circuit.id as keyof typeof powerDistribution] || 0;
      const current = power / voltage;
      const percentage = Math.min((power / circuit.max_power) * 100, 100);
      
      let status: 'normal' | 'warning' | 'critical' = 'normal';
      if (percentage > 90) status = 'critical';
      else if (percentage > 75) status = 'warning';

      readings.push({
        id: `circuit_${circuit.id}_${Date.now()}`,
        circuit_id: circuit.id,
        circuit_name: circuit.name,
        power,
        voltage: circuit.id === 'main' ? voltage : voltage / 2, // 120V for non-main circuits
        current,
        status,
        percentage,
        timestamp,
      });
    });

    return readings;
  }

  /**
   * Calculate daily usage in kWh
   */
  private calculateDailyUsage(currentPower: number): number {
    const now = new Date();
    const hoursElapsed = now.getHours() + now.getMinutes() / 60;
    const averagePower = 2500; // Assume average power consumption
    return (averagePower * hoursElapsed) / 1000; // Convert to kWh
  }

  /**
   * Calculate monthly usage from database
   */
  private async calculateMonthlyUsage(): Promise<number> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const result = await DatabaseService.query(`
        SELECT AVG(total_power) as avg_power, COUNT(*) as readings
        FROM energy_readings 
        WHERE created_at >= ?
      `, [startOfMonth.toISOString()]);

      if (result.length > 0 && result[0].avg_power) {
        const avgPower = result[0].avg_power;
        const daysInMonth = now.getDate();
        return (avgPower * 24 * daysInMonth) / 1000; // Convert to kWh
      }

      return 1250 + Math.random() * 200; // Fallback estimate
    } catch (error) {
      return 1250 + Math.random() * 200; // Fallback estimate
    }
  }

  /**
   * Store energy reading in database
   */
  private async storeEnergyReading(reading: EnergyReading): Promise<void> {
    try {
      await DatabaseService.execute(`
        INSERT INTO energy_readings (
          id, timestamp, total_power, voltage, current, frequency, 
          power_factor, daily_usage, monthly_usage, cost_today, 
          cost_month, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        reading.id,
        reading.timestamp,
        reading.total_power,
        reading.voltage,
        reading.current,
        reading.frequency,
        reading.power_factor,
        reading.daily_usage,
        reading.monthly_usage,
        reading.cost_today,
        reading.cost_month,
        reading.created_at,
      ]);
    } catch (error: any) {
      console.error('❌ Failed to store energy reading:', error.message);
    }
  }

  /**
   * Store circuit readings in database
   */
  private async storeCircuitReadings(readings: CircuitReading[]): Promise<void> {
    try {
      for (const reading of readings) {
        await DatabaseService.execute(`
          INSERT INTO circuit_readings (
            id, circuit_id, circuit_name, power, voltage, current, 
            status, percentage, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          reading.id,
          reading.circuit_id,
          reading.circuit_name,
          reading.power,
          reading.voltage,
          reading.current,
          reading.status,
          reading.percentage,
          reading.timestamp,
        ]);
      }
    } catch (error: any) {
      console.error('❌ Failed to store circuit readings:', error.message);
    }
  }

  /**
   * Check for energy alerts
   */
  private async checkForAlerts(reading: EnergyReading, circuits: CircuitReading[]): Promise<void> {
    const alerts: EnergyAlert[] = [];

    // Check for high usage
    if (reading.total_power > 4000) {
      alerts.push({
        id: `alert_${Date.now()}_high_usage`,
        type: 'high_usage',
        severity: reading.total_power > 4500 ? 'high' : 'medium',
        message: `High power usage detected: ${reading.total_power.toFixed(0)}W`,
        value: reading.total_power,
        threshold: 4000,
        timestamp: reading.timestamp,
        acknowledged: false,
      });
    }

    // Check for voltage anomalies
    if (reading.voltage < 230 || reading.voltage > 250) {
      alerts.push({
        id: `alert_${Date.now()}_voltage`,
        type: 'voltage_anomaly',
        severity: 'medium',
        message: `Voltage anomaly detected: ${reading.voltage.toFixed(1)}V`,
        value: reading.voltage,
        threshold: reading.voltage < 230 ? 230 : 250,
        timestamp: reading.timestamp,
        acknowledged: false,
      });
    }

    // Check for circuit overloads
    circuits.forEach(circuit => {
      if (circuit.status === 'critical') {
        alerts.push({
          id: `alert_${Date.now()}_circuit_${circuit.circuit_id}`,
          type: 'circuit_overload',
          severity: 'high',
          message: `Circuit overload: ${circuit.circuit_name} at ${circuit.percentage.toFixed(0)}%`,
          circuit_id: circuit.circuit_id,
          value: circuit.percentage,
          threshold: 90,
          timestamp: reading.timestamp,
          acknowledged: false,
        });
      }
    });

    // Store alerts
    for (const alert of alerts) {
      await this.storeAlert(alert);
      this.emit('energyAlert', alert);
    }
  }

  /**
   * Store alert in database
   */
  private async storeAlert(alert: EnergyAlert): Promise<void> {
    try {
      await DatabaseService.execute(`
        INSERT INTO energy_alerts (
          id, type, severity, message, circuit_id, value, 
          threshold, timestamp, acknowledged
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        alert.id,
        alert.type,
        alert.severity,
        alert.message,
        alert.circuit_id || null,
        alert.value,
        alert.threshold,
        alert.timestamp,
        alert.acknowledged ? 1 : 0,
      ]);
    } catch (error: any) {
      console.error('❌ Failed to store energy alert:', error.message);
    }
  }

  /**
   * Get latest energy reading
   */
  async getLatestReading(): Promise<EnergyReading | null> {
    try {
      const readings = await DatabaseService.query(`
        SELECT * FROM energy_readings 
        ORDER BY created_at DESC 
        LIMIT 1
      `);

      return readings.length > 0 ? readings[0] : null;
    } catch (error: any) {
      console.error('❌ Failed to get latest reading:', error.message);
      return null;
    }
  }

  /**
   * Get latest circuit readings
   */
  async getLatestCircuitReadings(): Promise<CircuitReading[]> {
    try {
      const readings = await DatabaseService.query(`
        SELECT DISTINCT circuit_id, circuit_name, power, voltage, current, 
               status, percentage, timestamp
        FROM circuit_readings 
        WHERE timestamp = (
          SELECT MAX(timestamp) FROM circuit_readings cr2 
          WHERE cr2.circuit_id = circuit_readings.circuit_id
        )
        ORDER BY circuit_id
      `);

      return readings;
    } catch (error: any) {
      console.error('❌ Failed to get circuit readings:', error.message);
      return [];
    }
  }

  /**
   * Get energy usage history
   */
  async getUsageHistory(hours: number = 24): Promise<EnergyReading[]> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const readings = await DatabaseService.query(`
        SELECT * FROM energy_readings 
        WHERE created_at >= ?
        ORDER BY created_at ASC
      `, [since.toISOString()]);

      return readings;
    } catch (error: any) {
      console.error('❌ Failed to get usage history:', error.message);
      return [];
    }
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<EnergyAlert[]> {
    try {
      const alerts = await DatabaseService.query(`
        SELECT * FROM energy_alerts 
        WHERE acknowledged = 0
        ORDER BY timestamp DESC
      `);

      return alerts.map(alert => ({
        ...alert,
        acknowledged: alert.acknowledged === 1,
      }));
    } catch (error: any) {
      console.error('❌ Failed to get active alerts:', error.message);
      return [];
    }
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await DatabaseService.execute(`
        UPDATE energy_alerts 
        SET acknowledged = 1 
        WHERE id = ?
      `, [alertId]);

      this.emit('alertAcknowledged', { alertId });

      return { success: true };
    } catch (error: any) {
      console.error('❌ Failed to acknowledge alert:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const energyMonitorService = EnergyMonitorService.getInstance();
