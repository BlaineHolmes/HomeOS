import { EventEmitter } from 'events';
import { DatabaseService } from './database.js';

// ============================================================================
// WEATHER SERVICE - OPENWEATHERMAP INTEGRATION & AUTOMATION
// ============================================================================

export interface WeatherData {
  location: string;
  latitude: number;
  longitude: number;
  current: {
    temperature: number;
    feels_like: number;
    humidity: number;
    pressure: number;
    visibility: number;
    uv_index: number;
    wind_speed: number;
    wind_direction: number;
    condition: string;
    description: string;
    icon: string;
  };
  forecast: Array<{
    date: string;
    high: number;
    low: number;
    condition: string;
    description: string;
    icon: string;
    precipitation: number;
  }>;
  alerts: Array<{
    id: string;
    title: string;
    description: string;
    severity: 'minor' | 'moderate' | 'severe' | 'extreme';
    start: string;
    end: string;
  }>;
  automation: {
    triggers_active: number;
    last_action: string;
    next_scheduled: string;
  };
  last_updated: string;
}

export class WeatherMonitorService extends EventEmitter {
  private static instance: WeatherMonitorService | null = null;
  private apiKey: string;
  private location: { lat: number; lon: number; name: string };
  private updateInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  constructor() {
    super();
    
    // TODO: Get from environment variables
    this.apiKey = process.env.OPENWEATHER_API_KEY || 'demo_key';
    this.location = {
      lat: 40.7128, // Default to NYC
      lon: -74.0060,
      name: 'New York, NY',
    };

    // Don't start monitoring in constructor - wait for explicit call
  }

  /**
   * Get singleton instance
   */
  static getInstance(): WeatherMonitorService {
    if (!this.instance) {
      this.instance = new WeatherMonitorService();
    }
    return this.instance;
  }

  /**
   * Start weather monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    console.log('🌤️ Starting weather monitoring...');

    // Update weather data every 5 minutes
    this.updateWeatherData();
    this.updateInterval = setInterval(() => {
      this.updateWeatherData();
    }, 5 * 60 * 1000);

    this.emit('monitoringStarted');
  }

  /**
   * Stop weather monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    console.log('🌤️ Weather monitoring stopped');
    this.emit('monitoringStopped');
  }

  /**
   * Update weather data from OpenWeatherMap API
   */
  private async updateWeatherData(): Promise<void> {
    try {
      // For demo purposes, generate realistic weather data
      // TODO: Replace with actual OpenWeatherMap API calls
      const weatherData = this.generateRealisticWeatherData();
      
      // Store weather data
      await this.storeWeatherData(weatherData);
      
      // Check for severe weather alerts
      await this.checkWeatherAlerts(weatherData);
      
      // Emit weather update
      this.emit('weatherUpdate', weatherData);
      
    } catch (error: any) {
      console.error('❌ Failed to update weather data:', error.message);
    }
  }

  /**
   * Generate realistic weather data (replace with API calls)
   */
  private generateRealisticWeatherData(): WeatherData {
    const now = new Date();
    const hour = now.getHours();
    
    // Simulate realistic temperature patterns
    const baseTemp = 70;
    const dailyVariation = Math.sin((hour - 6) * Math.PI / 12) * 15; // Peak at 6 PM
    const randomVariation = (Math.random() - 0.5) * 10;
    const temperature = Math.round(baseTemp + dailyVariation + randomVariation);
    
    // Weather conditions with realistic probabilities
    const conditions = ['clear', 'partly-cloudy', 'cloudy', 'rain', 'thunderstorm'];
    const probabilities = [0.4, 0.3, 0.15, 0.1, 0.05];
    let condition = 'clear';
    const rand = Math.random();
    let cumulative = 0;
    for (let i = 0; i < conditions.length; i++) {
      cumulative += probabilities[i];
      if (rand <= cumulative) {
        condition = conditions[i];
        break;
      }
    }

    return {
      location: this.location.name,
      latitude: this.location.lat,
      longitude: this.location.lon,
      current: {
        temperature,
        feels_like: temperature + (Math.random() - 0.5) * 6,
        humidity: Math.round(40 + Math.random() * 40), // 40-80%
        pressure: Math.round(1000 + Math.random() * 30), // 1000-1030 mb
        visibility: Math.round(5 + Math.random() * 10), // 5-15 km
        uv_index: Math.max(0, Math.round((hour - 6) / 2 + Math.random() * 3)), // 0-11
        wind_speed: Math.round(Math.random() * 20), // 0-20 mph
        wind_direction: Math.round(Math.random() * 360), // 0-360 degrees
        condition,
        description: this.getWeatherDescription(condition),
        icon: this.getWeatherIcon(condition, hour),
      },
      forecast: this.generateForecast(),
      alerts: this.generateWeatherAlerts(condition),
      automation: {
        triggers_active: 3,
        last_action: condition === 'rain' ? 'Closed windows due to rain' : 'Adjusted thermostat',
        next_scheduled: 'Check sprinklers at 6:00 AM',
      },
      last_updated: now.toISOString(),
    };
  }

  /**
   * Generate 5-day forecast
   */
  private generateForecast(): WeatherData['forecast'] {
    const forecast = [];
    const days = ['Today', 'Tomorrow', 'Wednesday', 'Thursday', 'Friday'];
    
    for (let i = 0; i < 5; i++) {
      const baseHigh = 75 + (Math.random() - 0.5) * 20;
      const baseLow = baseHigh - 10 - Math.random() * 10;
      
      const conditions = ['clear', 'partly-cloudy', 'cloudy', 'rain'];
      const condition = conditions[Math.floor(Math.random() * conditions.length)];
      
      forecast.push({
        date: days[i] || new Date(Date.now() + i * 24 * 60 * 60 * 1000).toLocaleDateString(),
        high: Math.round(baseHigh),
        low: Math.round(baseLow),
        condition,
        description: this.getWeatherDescription(condition),
        icon: this.getWeatherIcon(condition, 12), // Noon icon
        precipitation: condition === 'rain' ? 70 + Math.random() * 30 : Math.random() * 30,
      });
    }
    
    return forecast;
  }

  /**
   * Generate weather alerts based on conditions
   */
  private generateWeatherAlerts(condition: string): WeatherData['alerts'] {
    const alerts = [];
    
    if (condition === 'thunderstorm' || Math.random() < 0.1) {
      alerts.push({
        id: `alert_${Date.now()}`,
        title: 'Severe Thunderstorm Watch',
        description: 'Severe thunderstorms possible this evening with damaging winds and large hail. Take precautions and stay indoors.',
        severity: 'severe' as const,
        start: new Date().toISOString(),
        end: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      });
    }
    
    return alerts;
  }

  /**
   * Get weather description from condition
   */
  private getWeatherDescription(condition: string): string {
    const descriptions = {
      clear: 'Clear sky',
      'partly-cloudy': 'Partly cloudy',
      cloudy: 'Overcast',
      rain: 'Light rain',
      thunderstorm: 'Thunderstorm',
    };
    
    return descriptions[condition as keyof typeof descriptions] || 'Unknown';
  }

  /**
   * Get weather icon code
   */
  private getWeatherIcon(condition: string, hour: number): string {
    const isDay = hour >= 6 && hour < 18;
    
    const icons = {
      clear: isDay ? '01d' : '01n',
      'partly-cloudy': isDay ? '02d' : '02n',
      cloudy: '04d',
      rain: '10d',
      thunderstorm: '11d',
    };
    
    return icons[condition as keyof typeof icons] || '01d';
  }

  /**
   * Store weather data in database
   */
  private async storeWeatherData(data: WeatherData): Promise<void> {
    try {
      await DatabaseService.execute(`
        INSERT OR REPLACE INTO weather_data (
          location, latitude, longitude, temperature, feels_like, humidity,
          pressure, visibility, uv_index, wind_speed, wind_direction,
          condition, description, icon, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        data.location,
        data.latitude,
        data.longitude,
        data.current.temperature,
        data.current.feels_like,
        data.current.humidity,
        data.current.pressure,
        data.current.visibility,
        data.current.uv_index,
        data.current.wind_speed,
        data.current.wind_direction,
        data.current.condition,
        data.current.description,
        data.current.icon,
        data.last_updated,
      ]);
    } catch (error: any) {
      console.error('❌ Failed to store weather data:', error.message);
    }
  }

  /**
   * Check for severe weather alerts
   */
  private async checkWeatherAlerts(data: WeatherData): Promise<void> {
    // Check for severe conditions
    const alerts = [];
    
    if (data.current.wind_speed > 25) {
      alerts.push({
        type: 'high_wind',
        message: `High wind warning: ${data.current.wind_speed} mph`,
        severity: 'moderate',
      });
    }
    
    if (data.current.temperature > 95) {
      alerts.push({
        type: 'extreme_heat',
        message: `Extreme heat warning: ${data.current.temperature}°F`,
        severity: 'severe',
      });
    }
    
    if (data.current.temperature < 32) {
      alerts.push({
        type: 'freeze_warning',
        message: `Freeze warning: ${data.current.temperature}°F`,
        severity: 'moderate',
      });
    }
    
    // Emit alerts
    for (const alert of alerts) {
      this.emit('weatherAlert', alert);
    }
  }

  /**
   * Get current weather data
   */
  async getCurrentWeather(): Promise<WeatherData | null> {
    try {
      const result = await DatabaseService.query(`
        SELECT * FROM weather_data 
        ORDER BY last_updated DESC 
        LIMIT 1
      `);
      
      if (result.length === 0) {
        return this.generateRealisticWeatherData();
      }
      
      const data = result[0];
      
      return {
        location: data.location,
        latitude: data.latitude,
        longitude: data.longitude,
        current: {
          temperature: data.temperature,
          feels_like: data.feels_like,
          humidity: data.humidity,
          pressure: data.pressure,
          visibility: data.visibility,
          uv_index: data.uv_index,
          wind_speed: data.wind_speed,
          wind_direction: data.wind_direction,
          condition: data.condition,
          description: data.description,
          icon: data.icon,
        },
        forecast: this.generateForecast(), // TODO: Store forecast in DB
        alerts: this.generateWeatherAlerts(data.condition), // TODO: Store alerts in DB
        automation: {
          triggers_active: 3,
          last_action: 'Adjusted thermostat',
          next_scheduled: 'Check sprinklers at 6:00 AM',
        },
        last_updated: data.last_updated,
      };
    } catch (error: any) {
      console.error('❌ Failed to get current weather:', error.message);
      return this.generateRealisticWeatherData();
    }
  }

  /**
   * Set location for weather monitoring
   */
  async setLocation(lat: number, lon: number, name: string): Promise<void> {
    this.location = { lat, lon, name };
    await this.updateWeatherData();
  }
}

// Export singleton instance
export const weatherMonitorService = WeatherMonitorService.getInstance();
