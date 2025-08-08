import axios from 'axios';
import { EventEmitter } from 'events';
import { DatabaseService } from './database.js';

// ============================================================================
// MICROSOFT 365 CALENDAR SERVICE - GRAPH API INTEGRATION
// ============================================================================

export interface MicrosoftCalendarConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  redirectUri: string;
}

export interface MicrosoftTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface MicrosoftCalendar {
  id: string;
  name: string;
  color: string;
  isDefaultCalendar: boolean;
  canEdit: boolean;
  canShare: boolean;
  canViewPrivateItems: boolean;
  owner: {
    name: string;
    address: string;
  };
}

export interface MicrosoftEvent {
  id: string;
  subject: string;
  body: {
    contentType: string;
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location: {
    displayName: string;
    address?: any;
  };
  attendees: Array<{
    emailAddress: {
      address: string;
      name: string;
    };
    status: {
      response: string;
      time: string;
    };
  }>;
  organizer: {
    emailAddress: {
      address: string;
      name: string;
    };
  };
  isAllDay: boolean;
  isCancelled: boolean;
  isOrganizer: boolean;
  recurrence?: any;
  lastModifiedDateTime: string;
  createdDateTime: string;
}

export class MicrosoftCalendarService extends EventEmitter {
  private static instance: MicrosoftCalendarService | null = null;
  private config: MicrosoftCalendarConfig | null = null;
  private baseUrl = 'https://graph.microsoft.com/v1.0';
  private authUrl = 'https://login.microsoftonline.com';

  constructor() {
    super();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): MicrosoftCalendarService {
    if (!this.instance) {
      this.instance = new MicrosoftCalendarService();
    }
    return this.instance;
  }

  /**
   * Initialize Microsoft Calendar service
   */
  initialize(config: MicrosoftCalendarConfig): void {
    this.config = config;
    console.log('📅 Microsoft 365 Calendar service initialized');
  }

  /**
   * Get OAuth2 authorization URL
   */
  getAuthUrl(state?: string): string {
    if (!this.config) throw new Error('Microsoft Calendar service not initialized');

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      scope: 'https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/User.Read offline_access',
      response_mode: 'query',
      state: state || 'microsoft365_calendar',
    });

    return `${this.authUrl}/${this.config.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<MicrosoftTokens> {
    if (!this.config) throw new Error('Microsoft Calendar service not initialized');

    try {
      const response = await axios.post(
        `${this.authUrl}/${this.config.tenantId}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code,
          redirect_uri: this.config.redirectUri,
          grant_type: 'authorization_code',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to exchange code for tokens:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Microsoft 365');
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<MicrosoftTokens> {
    if (!this.config) throw new Error('Microsoft Calendar service not initialized');

    try {
      const response = await axios.post(
        `${this.authUrl}/${this.config.tenantId}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to refresh access token:', error.response?.data || error.message);
      throw new Error('Failed to refresh Microsoft 365 access token');
    }
  }

  /**
   * Get user profile information
   */
  async getUserProfile(accessToken: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to get user profile:', error.response?.data || error.message);
      throw new Error('Failed to get Microsoft 365 user profile');
    }
  }

  /**
   * Get user's calendars
   */
  async getCalendars(accessToken: string): Promise<MicrosoftCalendar[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/me/calendars`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data.value;
    } catch (error: any) {
      console.error('❌ Failed to get calendars:', error.response?.data || error.message);
      throw new Error('Failed to get Microsoft 365 calendars');
    }
  }

  /**
   * Get events from a specific calendar
   */
  async getEvents(
    accessToken: string,
    calendarId: string = 'primary',
    startTime?: Date,
    endTime?: Date
  ): Promise<MicrosoftEvent[]> {
    try {
      let url = `${this.baseUrl}/me/calendars/${calendarId}/events`;
      
      const params = new URLSearchParams();
      if (startTime) {
        params.append('$filter', `start/dateTime ge '${startTime.toISOString()}'`);
      }
      if (endTime) {
        const filter = params.get('$filter');
        const endFilter = `end/dateTime le '${endTime.toISOString()}'`;
        if (filter) {
          params.set('$filter', `${filter} and ${endFilter}`);
        } else {
          params.append('$filter', endFilter);
        }
      }
      
      params.append('$orderby', 'start/dateTime');
      params.append('$top', '250');

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data.value;
    } catch (error: any) {
      console.error('❌ Failed to get events:', error.response?.data || error.message);
      throw new Error('Failed to get Microsoft 365 events');
    }
  }

  /**
   * Create a new event
   */
  async createEvent(
    accessToken: string,
    calendarId: string,
    event: Partial<MicrosoftEvent>
  ): Promise<MicrosoftEvent> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/me/calendars/${calendarId}/events`,
        event,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to create event:', error.response?.data || error.message);
      throw new Error('Failed to create Microsoft 365 event');
    }
  }

  /**
   * Update an existing event
   */
  async updateEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    event: Partial<MicrosoftEvent>
  ): Promise<MicrosoftEvent> {
    try {
      const response = await axios.patch(
        `${this.baseUrl}/me/calendars/${calendarId}/events/${eventId}`,
        event,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to update event:', error.response?.data || error.message);
      throw new Error('Failed to update Microsoft 365 event');
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<void> {
    try {
      await axios.delete(`${this.baseUrl}/me/calendars/${calendarId}/events/${eventId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch (error: any) {
      console.error('❌ Failed to delete event:', error.response?.data || error.message);
      throw new Error('Failed to delete Microsoft 365 event');
    }
  }

  /**
   * Validate access token
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      await this.getUserProfile(accessToken);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const microsoftCalendarService = MicrosoftCalendarService.getInstance();
