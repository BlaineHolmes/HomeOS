import axios from 'axios';
import { EventEmitter } from 'events';
import { DatabaseService } from './database.js';

// ============================================================================
// GOOGLE CALENDAR SERVICE - CALENDAR API INTEGRATION
// ============================================================================

export interface GoogleCalendarConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  timeZone: string;
  colorId?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  accessRole: string;
  primary?: boolean;
}

export interface GoogleEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus: string;
    organizer?: boolean;
  }>;
  organizer: {
    email: string;
    displayName?: string;
  };
  creator: {
    email: string;
    displayName?: string;
  };
  status: string;
  visibility?: string;
  recurrence?: string[];
  recurringEventId?: string;
  created: string;
  updated: string;
}

export class GoogleCalendarService extends EventEmitter {
  private static instance: GoogleCalendarService | null = null;
  private config: GoogleCalendarConfig | null = null;
  private baseUrl = 'https://www.googleapis.com/calendar/v3';
  private authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  private tokenUrl = 'https://oauth2.googleapis.com/token';

  constructor() {
    super();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): GoogleCalendarService {
    if (!this.instance) {
      this.instance = new GoogleCalendarService();
    }
    return this.instance;
  }

  /**
   * Initialize Google Calendar service
   */
  initialize(config: GoogleCalendarConfig): void {
    this.config = config;
    console.log('📅 Google Calendar service initialized');
  }

  /**
   * Get OAuth2 authorization URL
   */
  getAuthUrl(state?: string): string {
    if (!this.config) throw new Error('Google Calendar service not initialized');

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email',
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      state: state || 'google_calendar',
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
    if (!this.config) throw new Error('Google Calendar service not initialized');

    try {
      const response = await axios.post(
        this.tokenUrl,
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
      throw new Error('Failed to authenticate with Google Calendar');
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
    if (!this.config) throw new Error('Google Calendar service not initialized');

    try {
      const response = await axios.post(
        this.tokenUrl,
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
      throw new Error('Failed to refresh Google Calendar access token');
    }
  }

  /**
   * Get user profile information
   */
  async getUserProfile(accessToken: string): Promise<any> {
    try {
      const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to get user profile:', error.response?.data || error.message);
      throw new Error('Failed to get Google user profile');
    }
  }

  /**
   * Get user's calendars
   */
  async getCalendars(accessToken: string): Promise<GoogleCalendar[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/users/me/calendarList`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data.items || [];
    } catch (error: any) {
      console.error('❌ Failed to get calendars:', error.response?.data || error.message);
      throw new Error('Failed to get Google calendars');
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
  ): Promise<GoogleEvent[]> {
    try {
      const params = new URLSearchParams({
        orderBy: 'startTime',
        singleEvents: 'true',
        maxResults: '250',
      });

      if (startTime) {
        params.append('timeMin', startTime.toISOString());
      }
      if (endTime) {
        params.append('timeMax', endTime.toISOString());
      }

      const response = await axios.get(
        `${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return response.data.items || [];
    } catch (error: any) {
      console.error('❌ Failed to get events:', error.response?.data || error.message);
      throw new Error('Failed to get Google Calendar events');
    }
  }

  /**
   * Create a new event
   */
  async createEvent(
    accessToken: string,
    calendarId: string,
    event: Partial<GoogleEvent>
  ): Promise<GoogleEvent> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events`,
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
      throw new Error('Failed to create Google Calendar event');
    }
  }

  /**
   * Update an existing event
   */
  async updateEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    event: Partial<GoogleEvent>
  ): Promise<GoogleEvent> {
    try {
      const response = await axios.put(
        `${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
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
      throw new Error('Failed to update Google Calendar event');
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<void> {
    try {
      await axios.delete(
        `${this.baseUrl}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
    } catch (error: any) {
      console.error('❌ Failed to delete event:', error.response?.data || error.message);
      throw new Error('Failed to delete Google Calendar event');
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
export const googleCalendarService = GoogleCalendarService.getInstance();
