import axios from 'axios';
import { EventEmitter } from 'events';
import { DatabaseService } from './database.js';

// ============================================================================
// PACKAGE TRACKING SERVICE - REAL-TIME UPDATES
// ============================================================================

export interface TrackingEvent {
  timestamp: Date;
  status: string;
  location: string;
  description: string;
  carrier: string;
}

export interface PackageStatus {
  trackingNumber: string;
  carrier: string;
  status: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  currentLocation?: string;
  events: TrackingEvent[];
  lastUpdated: Date;
}

export interface CarrierAPI {
  name: string;
  baseUrl: string;
  apiKey?: string;
  rateLimit: number; // requests per minute
  enabled: boolean;
}

export class PackageTrackingService extends EventEmitter {
  private static instance: PackageTrackingService | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private isUpdating = false;
  private carrierAPIs: Map<string, CarrierAPI> = new Map();
  private rateLimiters: Map<string, { count: number; resetTime: number }> = new Map();

  constructor() {
    super();
    this.initializeCarrierAPIs();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PackageTrackingService {
    if (!this.instance) {
      this.instance = new PackageTrackingService();
    }
    return this.instance;
  }

  /**
   * Initialize carrier API configurations
   */
  private initializeCarrierAPIs(): void {
    this.carrierAPIs.set('ups', {
      name: 'UPS',
      baseUrl: 'https://onlinetools.ups.com/track/v1/details',
      apiKey: process.env.UPS_API_KEY,
      rateLimit: 100, // 100 requests per minute
      enabled: !!process.env.UPS_API_KEY,
    });

    this.carrierAPIs.set('fedex', {
      name: 'FedEx',
      baseUrl: 'https://api.fedex.com/track/v1/trackingnumbers',
      apiKey: process.env.FEDEX_API_KEY,
      rateLimit: 100,
      enabled: !!process.env.FEDEX_API_KEY,
    });

    this.carrierAPIs.set('usps', {
      name: 'USPS',
      baseUrl: 'https://secure.shippingapis.com/ShippingAPI.dll',
      apiKey: process.env.USPS_API_KEY,
      rateLimit: 100,
      enabled: !!process.env.USPS_API_KEY,
    });

    // Note: Amazon doesn't provide public tracking API
    // DHL requires special access
  }

  /**
   * Start automatic package updates
   */
  startUpdates(): void {
    if (this.isUpdating) {
      console.log('⚠️  Package tracking updates already running');
      return;
    }

    this.isUpdating = true;
    console.log('📦 Starting package tracking updates...');

    // Update every 30 minutes
    this.updateInterval = setInterval(async () => {
      await this.updateAllPackages();
    }, 30 * 60 * 1000);

    // Initial update
    this.updateAllPackages();
  }

  /**
   * Stop automatic updates
   */
  stopUpdates(): void {
    if (!this.isUpdating) return;

    this.isUpdating = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    console.log('🛑 Package tracking updates stopped');
  }

  /**
   * Update all active packages
   */
  private async updateAllPackages(): Promise<void> {
    try {
      // Get all packages that aren't delivered
      const packages = await DatabaseService.query(`
        SELECT * FROM packages 
        WHERE status NOT IN ('delivered', 'cancelled')
        ORDER BY created_at DESC
      `);

      console.log(`📦 Updating ${packages.length} active packages...`);

      for (const pkg of packages) {
        try {
          await this.updatePackageStatus(pkg.tracking_number, pkg.courier);
          // Small delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error: any) {
          console.error(`❌ Failed to update package ${pkg.tracking_number}:`, error.message);
        }
      }
    } catch (error: any) {
      console.error('❌ Error updating packages:', error.message);
    }
  }

  /**
   * Update status for a specific package
   */
  async updatePackageStatus(trackingNumber: string, carrier: string): Promise<PackageStatus | null> {
    try {
      const carrierAPI = this.carrierAPIs.get(carrier.toLowerCase());
      if (!carrierAPI || !carrierAPI.enabled) {
        console.log(`⚠️  No API available for carrier: ${carrier}`);
        return null;
      }

      // Check rate limit
      if (!this.checkRateLimit(carrier)) {
        console.log(`⚠️  Rate limit exceeded for ${carrier}`);
        return null;
      }

      const status = await this.fetchTrackingData(trackingNumber, carrierAPI);
      if (status) {
        await this.storeTrackingUpdate(status);
        this.emit('packageUpdate', status);
        console.log(`✅ Updated package ${trackingNumber}: ${status.status}`);
      }

      return status;
    } catch (error: any) {
      console.error(`❌ Error updating package ${trackingNumber}:`, error.message);
      return null;
    }
  }

  /**
   * Fetch tracking data from carrier API
   */
  private async fetchTrackingData(trackingNumber: string, carrierAPI: CarrierAPI): Promise<PackageStatus | null> {
    try {
      let response;

      switch (carrierAPI.name) {
        case 'UPS':
          response = await this.fetchUPSTracking(trackingNumber, carrierAPI);
          break;
        case 'FedEx':
          response = await this.fetchFedExTracking(trackingNumber, carrierAPI);
          break;
        case 'USPS':
          response = await this.fetchUSPSTracking(trackingNumber, carrierAPI);
          break;
        default:
          console.log(`⚠️  Unsupported carrier: ${carrierAPI.name}`);
          return null;
      }

      return response;
    } catch (error: any) {
      console.error(`❌ API error for ${carrierAPI.name}:`, error.message);
      return null;
    }
  }

  /**
   * Fetch UPS tracking data
   */
  private async fetchUPSTracking(trackingNumber: string, api: CarrierAPI): Promise<PackageStatus | null> {
    try {
      const response = await axios.get(`${api.baseUrl}/${trackingNumber}`, {
        headers: {
          'AccessLicenseNumber': api.apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      // Parse UPS response format
      const trackResponse = response.data.trackResponse;
      if (!trackResponse || !trackResponse.shipment) {
        return null;
      }

      const shipment = trackResponse.shipment[0];
      const activities = shipment.package[0].activity || [];

      const events: TrackingEvent[] = activities.map((activity: any) => ({
        timestamp: new Date(activity.date + ' ' + activity.time),
        status: activity.status.description,
        location: `${activity.location.address.city}, ${activity.location.address.stateProvinceCode}`,
        description: activity.status.description,
        carrier: 'ups',
      }));

      return {
        trackingNumber,
        carrier: 'ups',
        status: this.normalizeStatus(activities[0]?.status?.description || 'unknown'),
        estimatedDelivery: shipment.deliveryDate ? new Date(shipment.deliveryDate) : undefined,
        currentLocation: events[0]?.location,
        events,
        lastUpdated: new Date(),
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`📦 Package ${trackingNumber} not found in UPS system`);
        return null;
      }
      throw error;
    }
  }

  /**
   * Fetch FedEx tracking data
   */
  private async fetchFedExTracking(trackingNumber: string, api: CarrierAPI): Promise<PackageStatus | null> {
    // TODO: Implement FedEx API integration
    console.log(`📦 FedEx tracking for ${trackingNumber} - API integration pending`);
    return null;
  }

  /**
   * Fetch USPS tracking data
   */
  private async fetchUSPSTracking(trackingNumber: string, api: CarrierAPI): Promise<PackageStatus | null> {
    // TODO: Implement USPS API integration
    console.log(`📦 USPS tracking for ${trackingNumber} - API integration pending`);
    return null;
  }

  /**
   * Normalize status across carriers
   */
  private normalizeStatus(carrierStatus: string): string {
    const status = carrierStatus.toLowerCase();
    
    if (status.includes('delivered')) return 'delivered';
    if (status.includes('out for delivery')) return 'out_for_delivery';
    if (status.includes('in transit')) return 'in_transit';
    if (status.includes('shipped') || status.includes('picked up')) return 'shipped';
    if (status.includes('processing') || status.includes('label created')) return 'processing';
    if (status.includes('exception') || status.includes('delayed')) return 'exception';
    
    return 'unknown';
  }

  /**
   * Check rate limit for carrier
   */
  private checkRateLimit(carrier: string): boolean {
    const now = Date.now();
    const limiter = this.rateLimiters.get(carrier);
    
    if (!limiter || now > limiter.resetTime) {
      this.rateLimiters.set(carrier, { count: 1, resetTime: now + 60000 });
      return true;
    }
    
    const carrierAPI = this.carrierAPIs.get(carrier);
    if (!carrierAPI) return false;
    
    if (limiter.count >= carrierAPI.rateLimit) {
      return false;
    }
    
    limiter.count++;
    return true;
  }

  /**
   * Store tracking update in database
   */
  private async storeTrackingUpdate(status: PackageStatus): Promise<void> {
    try {
      // Update package status
      await DatabaseService.execute(`
        UPDATE packages 
        SET status = ?, updated_at = ?, delivered_at = ?
        WHERE tracking_number = ?
      `, [
        status.status,
        new Date().toISOString(),
        status.actualDelivery?.toISOString() || null,
        status.trackingNumber,
      ]);

      // Store tracking events
      for (const event of status.events) {
        const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await DatabaseService.execute(`
          INSERT OR REPLACE INTO package_events (
            id, tracking_number, timestamp, status, location, description, carrier
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          eventId,
          status.trackingNumber,
          event.timestamp.toISOString(),
          event.status,
          event.location,
          event.description,
          event.carrier,
        ]);
      }
    } catch (error: any) {
      console.error('❌ Failed to store tracking update:', error.message);
    }
  }

  /**
   * Get package status
   */
  async getPackageStatus(trackingNumber: string): Promise<PackageStatus | null> {
    try {
      const pkg = await DatabaseService.queryOne(`
        SELECT * FROM packages WHERE tracking_number = ?
      `, [trackingNumber]);

      if (!pkg) return null;

      const events = await DatabaseService.query(`
        SELECT * FROM package_events 
        WHERE tracking_number = ?
        ORDER BY timestamp DESC
      `, [trackingNumber]);

      return {
        trackingNumber: pkg.tracking_number,
        carrier: pkg.courier,
        status: pkg.status,
        estimatedDelivery: pkg.estimated_delivery ? new Date(pkg.estimated_delivery) : undefined,
        actualDelivery: pkg.delivered_at ? new Date(pkg.delivered_at) : undefined,
        currentLocation: events[0]?.location,
        events: events.map((e: any) => ({
          timestamp: new Date(e.timestamp),
          status: e.status,
          location: e.location,
          description: e.description,
          carrier: e.carrier,
        })),
        lastUpdated: new Date(pkg.updated_at),
      };
    } catch (error: any) {
      console.error('❌ Error getting package status:', error.message);
      return null;
    }
  }

  /**
   * Get all packages for a user
   */
  async getUserPackages(userId: string): Promise<any[]> {
    try {
      return await DatabaseService.query(`
        SELECT * FROM packages 
        WHERE user_id = ?
        ORDER BY created_at DESC
      `, [userId]);
    } catch (error: any) {
      console.error('❌ Error getting user packages:', error.message);
      return [];
    }
  }
}

// Export singleton instance
export const packageTrackingService = PackageTrackingService.getInstance();
