import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';
import { EventEmitter } from 'events';
import { DatabaseService } from './database.js';

// ============================================================================
// EMAIL SERVICE - ADVANCED MONITORING AND PARSING
// ============================================================================

export interface EmailConfig {
  imap: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  folders: {
    inbox: string;
    processed: string;
  };
}

export interface ParsedEmail {
  id: string;
  messageId: string;
  from: string;
  to: string;
  subject: string;
  date: Date;
  body: string;
  html?: string;
  attachments: any[];
  parsed: {
    type: 'package' | 'calendar' | 'unknown';
    data: any;
  };
}

export interface PackageInfo {
  carrier: 'ups' | 'fedex' | 'amazon' | 'usps' | 'dhl' | 'unknown';
  trackingNumber: string;
  vendor: string;
  description: string;
  status: string;
  estimatedDelivery?: Date;
  deliveryAddress?: string;
  recipient?: string;
  emailId: string;
}

export class EmailService extends EventEmitter {
  private static instance: EmailService | null = null;
  private config: EmailConfig | null = null;
  private imapClient: ImapFlow | null = null;
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastCheckTime: Date = new Date(0);

  constructor() {
    super();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): EmailService {
    if (!this.instance) {
      this.instance = new EmailService();
    }
    return this.instance;
  }

  /**
   * Initialize email service
   */
  async initialize(config: EmailConfig): Promise<void> {
    this.config = config;
    console.log('📧 Email service initialized');
  }

  /**
   * Start email monitoring
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('⚠️  Email monitoring already running');
      return;
    }

    if (process.env.EMAIL_MONITORING_ENABLED !== 'true') {
      console.log('ℹ️  Email monitoring disabled in configuration');
      return;
    }

    if (!this.config) {
      throw new Error('Email service not initialized');
    }

    this.isMonitoring = true;
    console.log('📧 Starting email monitoring...');

    // Connect to IMAP
    await this.connectIMAP();

    // Start periodic checking
    this.monitoringInterval = setInterval(async () => {
      await this.checkForNewEmails();
    }, parseInt(process.env.EMAIL_CHECK_INTERVAL || '60000'));

    // Initial check
    await this.checkForNewEmails();
  }

  /**
   * Stop email monitoring
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

    if (this.imapClient) {
      await this.imapClient.logout();
      this.imapClient = null;
    }

    console.log('🛑 Email monitoring stopped');
  }

  /**
   * Connect to IMAP server
   */
  private async connectIMAP(): Promise<void> {
    if (!this.config) throw new Error('Email config not set');

    try {
      this.imapClient = new ImapFlow({
        host: this.config.imap.host,
        port: this.config.imap.port,
        secure: this.config.imap.secure,
        auth: this.config.imap.auth,
        logger: false, // Disable logging for production
      });

      await this.imapClient.connect();
      console.log('✅ Connected to IMAP server');
    } catch (error: any) {
      console.error('❌ Failed to connect to IMAP:', error.message);
      throw error;
    }
  }

  /**
   * Check for new emails
   */
  private async checkForNewEmails(): Promise<void> {
    if (!this.imapClient || !this.config) return;

    try {
      // Select inbox
      const lock = await this.imapClient.getMailboxLock(this.config.folders.inbox);

      try {
        // Search for emails since last check
        const searchCriteria = {
          since: this.lastCheckTime,
          unseen: false, // Get all emails, not just unseen
        };

        const messages = this.imapClient.fetch(searchCriteria, {
          envelope: true,
          bodyStructure: true,
          source: true,
        });

        for await (const message of messages) {
          await this.processEmail(message);
        }

        this.lastCheckTime = new Date();
      } finally {
        lock.release();
      }
    } catch (error: any) {
      console.error('❌ Error checking emails:', error.message);
    }
  }

  /**
   * Process individual email
   */
  private async processEmail(message: any): Promise<void> {
    try {
      const parsedEmail = await this.parseEmailMessage(message);

      // Check if it's a package tracking email
      if (parsedEmail.parsed.type === 'package') {
        const packageInfo = parsedEmail.parsed.data as PackageInfo;
        await this.handlePackageEmail(packageInfo);
        this.emit('packageEmail', packageInfo);
      }

      // Store email in database
      await this.storeEmail(parsedEmail);

    } catch (error: any) {
      console.error('❌ Error processing email:', error.message);
    }
  }

  /**
   * Parse email message
   */
  private async parseEmailMessage(message: any): Promise<ParsedEmail> {
    const envelope = message.envelope;
    const source = message.source.toString();

    // Extract basic email info
    const parsedEmail: ParsedEmail = {
      id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      messageId: envelope.messageId || '',
      from: envelope.from?.[0]?.address || '',
      to: envelope.to?.[0]?.address || '',
      subject: envelope.subject || '',
      date: envelope.date || new Date(),
      body: this.extractTextFromSource(source),
      html: this.extractHtmlFromSource(source),
      attachments: [],
      parsed: {
        type: 'unknown',
        data: {},
      },
    };

    // Determine email type and parse accordingly
    if (this.isPackageEmail(parsedEmail)) {
      parsedEmail.parsed.type = 'package';
      parsedEmail.parsed.data = this.parsePackageEmail(parsedEmail);
    } else if (this.isCalendarEmail(parsedEmail)) {
      parsedEmail.parsed.type = 'calendar';
      parsedEmail.parsed.data = this.parseCalendarEmail(parsedEmail);
    }

    return parsedEmail;
  }

  /**
   * Check if email is package-related
   */
  private isPackageEmail(email: ParsedEmail): boolean {
    const packageKeywords = [
      'tracking', 'shipment', 'delivery', 'package', 'order',
      'shipped', 'delivered', 'out for delivery', 'in transit',
      'ups', 'fedex', 'amazon', 'usps', 'dhl'
    ];

    const text = (email.subject + ' ' + email.body + ' ' + email.from).toLowerCase();
    return packageKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Check if email is calendar-related
   */
  private isCalendarEmail(email: ParsedEmail): boolean {
    const calendarKeywords = [
      'meeting', 'appointment', 'event', 'calendar', 'invite',
      'reminder', 'schedule', 'conference', 'zoom', 'teams'
    ];

    const text = (email.subject + ' ' + email.body + ' ' + email.from).toLowerCase();
    return calendarKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Parse package tracking information
   */
  private parsePackageEmail(email: ParsedEmail): PackageInfo {
    const text = email.subject + ' ' + email.body;

    // Detect carrier
    const carrier = this.detectCarrier(email.from, text);

    // Extract tracking number
    const trackingNumber = this.extractTrackingNumber(text, carrier);

    // Extract other package info
    const vendor = this.extractVendor(email.from, text);
    const description = this.extractDescription(text);
    const status = this.extractStatus(text);
    const estimatedDelivery = this.extractDeliveryDate(text);

    return {
      carrier,
      trackingNumber,
      vendor,
      description,
      status,
      estimatedDelivery,
      emailId: email.id,
    };
  }

  /**
   * Detect shipping carrier from email
   */
  private detectCarrier(from: string, text: string): PackageInfo['carrier'] {
    const fromLower = from.toLowerCase();
    const textLower = text.toLowerCase();

    if (fromLower.includes('ups') || textLower.includes('ups.com')) return 'ups';
    if (fromLower.includes('fedex') || textLower.includes('fedex.com')) return 'fedex';
    if (fromLower.includes('amazon') || textLower.includes('amazon.com')) return 'amazon';
    if (fromLower.includes('usps') || textLower.includes('usps.com')) return 'usps';
    if (fromLower.includes('dhl') || textLower.includes('dhl.com')) return 'dhl';

    return 'unknown';
  }

  /**
   * Extract tracking number based on carrier
   */
  private extractTrackingNumber(text: string, carrier: PackageInfo['carrier']): string {
    const patterns = {
      ups: /\b1Z[0-9A-Z]{16}\b/g,
      fedex: /\b(\d{12}|\d{14}|\d{20})\b/g,
      amazon: /\b(TBA\d{9,12}|1Z[0-9A-Z]{16})\b/g,
      usps: /\b(\d{20}|\d{22}|9[0-9]{21}|420\d{5}9[0-9]{21})\b/g,
      dhl: /\b(\d{10}|\d{11})\b/g,
      unknown: /\b([A-Z0-9]{8,30})\b/g,
    };

    const pattern = patterns[carrier];
    const matches = text.match(pattern);

    if (matches && matches.length > 0) {
      return matches[0];
    }

    // Fallback: look for common tracking patterns
    const fallbackPatterns = [
      /tracking\s*(?:number|#)?\s*:?\s*([A-Z0-9]{8,30})/i,
      /shipment\s*(?:number|#)?\s*:?\s*([A-Z0-9]{8,30})/i,
      /order\s*(?:number|#)?\s*:?\s*([A-Z0-9]{8,30})/i,
    ];

    for (const pattern of fallbackPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return '';
  }

  /**
   * Extract vendor/retailer name
   */
  private extractVendor(from: string, text: string): string {
    // Common vendor patterns
    const vendorPatterns = [
      /from\s+([A-Za-z\s]+)/i,
      /order\s+from\s+([A-Za-z\s]+)/i,
      /shipped\s+by\s+([A-Za-z\s]+)/i,
    ];

    for (const pattern of vendorPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Extract from email domain
    const domain = from.split('@')[1];
    if (domain) {
      const domainName = domain.split('.')[0];
      return domainName.charAt(0).toUpperCase() + domainName.slice(1);
    }

    return 'Unknown Vendor';
  }

  /**
   * Extract package description
   */
  private extractDescription(text: string): string {
    const descriptionPatterns = [
      /item\s*:?\s*([^\n\r]{10,100})/i,
      /product\s*:?\s*([^\n\r]{10,100})/i,
      /description\s*:?\s*([^\n\r]{10,100})/i,
      /order\s*:?\s*([^\n\r]{10,100})/i,
    ];

    for (const pattern of descriptionPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return 'Package';
  }

  /**
   * Extract delivery status
   */
  private extractStatus(text: string): string {
    const statusPatterns = [
      { pattern: /delivered/i, status: 'delivered' },
      { pattern: /out for delivery/i, status: 'out_for_delivery' },
      { pattern: /in transit/i, status: 'in_transit' },
      { pattern: /shipped/i, status: 'shipped' },
      { pattern: /processing/i, status: 'processing' },
      { pattern: /order placed/i, status: 'ordered' },
    ];

    for (const { pattern, status } of statusPatterns) {
      if (pattern.test(text)) {
        return status;
      }
    }

    return 'unknown';
  }

  /**
   * Extract estimated delivery date
   */
  private extractDeliveryDate(text: string): Date | undefined {
    const datePatterns = [
      /delivery\s+(?:date|by)\s*:?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
      /estimated\s+delivery\s*:?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
      /arrive\s+(?:by|on)\s*:?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const date = new Date(match[1]);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract text content from email source
   */
  private extractTextFromSource(source: string): string {
    // Simple text extraction - in production, use a proper email parser
    const textMatch = source.match(/Content-Type: text\/plain[\s\S]*?\n\n([\s\S]*?)(?=\n--|\nContent-Type|\n\.\n|$)/i);
    return textMatch ? textMatch[1].trim() : '';
  }

  /**
   * Extract HTML content from email source
   */
  private extractHtmlFromSource(source: string): string {
    const htmlMatch = source.match(/Content-Type: text\/html[\s\S]*?\n\n([\s\S]*?)(?=\n--|\nContent-Type|\n\.\n|$)/i);
    return htmlMatch ? htmlMatch[1].trim() : '';
  }

  /**
   * Parse calendar email (placeholder)
   */
  private parseCalendarEmail(email: ParsedEmail): any {
    // TODO: Implement calendar email parsing
    return {
      type: 'calendar',
      title: email.subject,
      date: email.date,
    };
  }

  /**
   * Handle package email
   */
  private async handlePackageEmail(packageInfo: PackageInfo): Promise<void> {
    try {
      // Store package in database
      const packageId = `pkg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      await DatabaseService.execute(`
        INSERT INTO packages (
          id, vendor, courier, tracking_number, description, status,
          estimated_delivery, user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        packageId,
        packageInfo.vendor,
        packageInfo.carrier,
        packageInfo.trackingNumber,
        packageInfo.description,
        packageInfo.status,
        packageInfo.estimatedDelivery?.toISOString() || null,
        'system', // TODO: Determine user from email
        now,
        now,
      ]);

      console.log(`📦 New package tracked: ${packageInfo.trackingNumber} from ${packageInfo.vendor}`);
    } catch (error: any) {
      console.error('❌ Failed to store package:', error.message);
    }
  }

  /**
   * Store email in database
   */
  private async storeEmail(email: ParsedEmail): Promise<void> {
    try {
      const now = new Date().toISOString();

      await DatabaseService.execute(`
        INSERT OR REPLACE INTO emails (
          id, message_id, from_address, to_address, subject, date,
          body, html, parsed_type, parsed_data, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        email.id,
        email.messageId,
        email.from,
        email.to,
        email.subject,
        email.date.toISOString(),
        email.body,
        email.html || null,
        email.parsed.type,
        JSON.stringify(email.parsed.data),
        now,
      ]);
    } catch (error: any) {
      console.error('❌ Failed to store email:', error.message);
    }
  }

  /**
   * Get recent package emails
   */
  async getRecentPackageEmails(days: number = 30): Promise<any[]> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const emails = await DatabaseService.query(`
        SELECT * FROM emails
        WHERE parsed_type = 'package' AND date >= ?
        ORDER BY date DESC
      `, [since]);

      return emails.map(email => ({
        ...email,
        parsed_data: JSON.parse(email.parsed_data || '{}'),
      }));
    } catch (error: any) {
      console.error('❌ Failed to get package emails:', error.message);
      return [];
    }
  }

  /**
   * Get email configuration status
   */
  getStatus(): any {
    return {
      configured: !!this.config,
      monitoring: this.isMonitoring,
      connected: !!this.imapClient,
      lastCheck: this.lastCheckTime,
    };
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance();
