import crypto from 'crypto';
import { EventEmitter } from 'events';
import { DatabaseService } from './database.js';
import { microsoftCalendarService } from './microsoft-calendar.js';
import { googleCalendarService } from './google-calendar.js';

// ============================================================================
// ACCOUNT MANAGER SERVICE - UNIFIED ACCOUNT MANAGEMENT
// ============================================================================

export interface AccountProvider {
  id: string;
  name: string;
  type: 'calendar' | 'music' | 'email' | 'storage' | 'shopping' | 'business' | 'energy';
  icon: string;
  color: string;
  description: string;
  setupGuide: SetupGuide;
  requiredFields: string[];
  optionalFields: string[];
  redirectUri: string;
}

export interface SetupGuide {
  title: string;
  description: string;
  steps: SetupStep[];
  registrationUrl: string;
  documentationUrl: string;
}

export interface SetupStep {
  title: string;
  description: string;
  image?: string;
  code?: string;
  settings: { [key: string]: string };
}

export interface AccountCredentials {
  id: string;
  provider_id: string;
  user_id: string;
  account_name: string;
  account_email: string;
  credentials: { [key: string]: string }; // Encrypted
  status: 'pending' | 'connected' | 'error' | 'expired';
  last_validated: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export class AccountManagerService extends EventEmitter {
  private static instance: AccountManagerService | null = null;
  private encryptionKey: string;
  private providers: Map<string, AccountProvider> = new Map();

  constructor() {
    super();
    this.encryptionKey = process.env.ENCRYPTION_KEY || this.generateEncryptionKey();
    this.initializeProviders();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AccountManagerService {
    if (!this.instance) {
      this.instance = new AccountManagerService();
    }
    return this.instance;
  }

  /**
   * Initialize supported providers
   */
  private initializeProviders(): void {
    // Microsoft 365 Calendar
    this.providers.set('microsoft365', {
      id: 'microsoft365',
      name: 'Microsoft 365',
      type: 'calendar',
      icon: '🏢',
      color: '#0078d4',
      description: 'Business calendar and email integration',
      setupGuide: {
        title: 'Microsoft 365 Setup',
        description: 'Connect your Microsoft 365 business account for calendar sync',
        registrationUrl: 'https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
        documentationUrl: 'https://docs.microsoft.com/en-us/azure/active-directory/develop/',
        steps: [
          {
            title: 'Create Azure App Registration',
            description: 'Register a new application in Azure Active Directory',
            settings: {
              'Application Name': 'HomeOS Calendar Integration',
              'Supported Account Types': 'Accounts in this organizational directory only',
              'Redirect URI': 'http://localhost:3001/api/calendar/auth/callback',
            },
          },
          {
            title: 'Configure API Permissions',
            description: 'Add required Microsoft Graph permissions',
            settings: {
              'Calendars.ReadWrite': 'Read and write calendars',
              'User.Read': 'Read user profile',
              'offline_access': 'Maintain access to data',
            },
          },
          {
            title: 'Create Client Secret',
            description: 'Generate a client secret for authentication',
            settings: {
              'Secret Description': 'HomeOS Integration',
              'Expires': '24 months',
            },
          },
        ],
      },
      requiredFields: ['clientId', 'clientSecret', 'tenantId'],
      optionalFields: ['redirectUri'],
      redirectUri: 'http://localhost:3001/api/calendar/auth/callback',
    });

    // Google Calendar
    this.providers.set('google', {
      id: 'google',
      name: 'Google Calendar',
      type: 'calendar',
      icon: '📅',
      color: '#4285f4',
      description: 'Personal and family calendar integration',
      setupGuide: {
        title: 'Google Calendar Setup',
        description: 'Connect your Google account for calendar sync',
        registrationUrl: 'https://console.cloud.google.com/apis/credentials',
        documentationUrl: 'https://developers.google.com/calendar/api',
        steps: [
          {
            title: 'Create Google Cloud Project',
            description: 'Create a new project in Google Cloud Console',
            settings: {
              'Project Name': 'HomeOS Calendar Integration',
              'Organization': 'Your Organization (optional)',
            },
          },
          {
            title: 'Enable Calendar API',
            description: 'Enable the Google Calendar API for your project',
            settings: {
              'API': 'Google Calendar API',
              'Status': 'Enabled',
            },
          },
          {
            title: 'Create OAuth 2.0 Credentials',
            description: 'Create OAuth 2.0 client credentials',
            settings: {
              'Application Type': 'Web application',
              'Name': 'HomeOS Calendar',
              'Authorized Redirect URIs': 'http://localhost:3001/api/calendar/auth/callback',
            },
          },
        ],
      },
      requiredFields: ['clientId', 'clientSecret'],
      optionalFields: ['redirectUri'],
      redirectUri: 'http://localhost:3001/api/calendar/auth/callback',
    });

    // Spotify
    this.providers.set('spotify', {
      id: 'spotify',
      name: 'Spotify',
      type: 'music',
      icon: '🎵',
      color: '#1db954',
      description: 'Whole-house music control and playlists',
      setupGuide: {
        title: 'Spotify Setup',
        description: 'Connect Spotify for whole-house music control',
        registrationUrl: 'https://developer.spotify.com/dashboard/applications',
        documentationUrl: 'https://developer.spotify.com/documentation/web-api/',
        steps: [
          {
            title: 'Create Spotify App',
            description: 'Create a new app in Spotify Developer Dashboard',
            settings: {
              'App Name': 'HomeOS Music Control',
              'App Description': 'Smart home music integration',
              'Website': 'http://localhost:3001',
              'Redirect URIs': 'http://localhost:3001/api/spotify/auth/callback',
            },
          },
          {
            title: 'Configure App Settings',
            description: 'Set up the required scopes and permissions',
            settings: {
              'Scopes': 'user-read-playback-state, user-modify-playback-state, playlist-read-private',
              'Users': 'Add family member emails for access',
            },
          },
        ],
      },
      requiredFields: ['clientId', 'clientSecret'],
      optionalFields: ['redirectUri'],
      redirectUri: 'http://localhost:3001/api/spotify/auth/callback',
    });

    // Outlook (Microsoft Personal)
    this.providers.set('outlook', {
      id: 'outlook',
      name: 'Outlook Personal',
      type: 'email',
      icon: '📧',
      color: '#0078d4',
      description: 'Personal Outlook email and calendar integration',
      setupGuide: {
        title: 'Outlook Personal Setup',
        description: 'Connect your personal Outlook account for email and calendar sync',
        registrationUrl: 'https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
        documentationUrl: 'https://docs.microsoft.com/en-us/graph/auth/',
        steps: [
          {
            title: 'Create Azure App Registration',
            description: 'Register a new application for personal Microsoft accounts',
            settings: {
              'Application Name': 'HomeOS Outlook Integration',
              'Supported Account Types': 'Personal Microsoft accounts only',
              'Redirect URI': 'http://localhost:3001/api/accounts/oauth/callback',
            },
          },
          {
            title: 'Configure API Permissions',
            description: 'Add required Microsoft Graph permissions',
            settings: {
              'Mail.Read': 'Read user mail',
              'Mail.Send': 'Send mail as user',
              'Calendars.ReadWrite': 'Read and write calendars',
              'User.Read': 'Read user profile',
            },
          },
        ],
      },
      requiredFields: ['clientId', 'clientSecret'],
      optionalFields: ['redirectUri'],
      redirectUri: 'http://localhost:3001/api/accounts/oauth/callback',
    });

    // iCloud
    this.providers.set('icloud', {
      id: 'icloud',
      name: 'iCloud',
      type: 'calendar',
      icon: '☁️',
      color: '#007aff',
      description: 'Apple iCloud calendar and contacts integration',
      setupGuide: {
        title: 'iCloud Setup',
        description: 'Connect your iCloud account for calendar and contacts sync',
        registrationUrl: 'https://developer.apple.com/account/',
        documentationUrl: 'https://developer.apple.com/documentation/eventkit',
        steps: [
          {
            title: 'Enable App-Specific Password',
            description: 'Create an app-specific password for HomeOS',
            settings: {
              'Apple ID': 'Your Apple ID email',
              'Two-Factor Authentication': 'Must be enabled',
              'App-Specific Password': 'Generate for HomeOS',
            },
          },
          {
            title: 'Configure CalDAV Access',
            description: 'Set up CalDAV for calendar synchronization',
            settings: {
              'Server': 'caldav.icloud.com',
              'Port': '443',
              'SSL': 'Required',
              'Username': 'Your Apple ID',
              'Password': 'App-specific password',
            },
          },
        ],
      },
      requiredFields: ['appleId', 'appPassword'],
      optionalFields: ['server'],
      redirectUri: 'http://localhost:3001/api/accounts/oauth/callback',
    });

    // Dropbox
    this.providers.set('dropbox', {
      id: 'dropbox',
      name: 'Dropbox',
      type: 'storage',
      icon: '📦',
      color: '#0061ff',
      description: 'Cloud storage and file synchronization',
      setupGuide: {
        title: 'Dropbox Setup',
        description: 'Connect Dropbox for cloud storage integration',
        registrationUrl: 'https://www.dropbox.com/developers/apps',
        documentationUrl: 'https://www.dropbox.com/developers/documentation',
        steps: [
          {
            title: 'Create Dropbox App',
            description: 'Create a new app in Dropbox App Console',
            settings: {
              'App Type': 'Scoped access',
              'Access Type': 'Full Dropbox',
              'App Name': 'HomeOS Storage Integration',
              'Redirect URI': 'http://localhost:3001/api/accounts/oauth/callback',
            },
          },
          {
            title: 'Configure Permissions',
            description: 'Set required scopes for file access',
            settings: {
              'files.metadata.read': 'Read file metadata',
              'files.content.read': 'Read file content',
              'files.content.write': 'Write file content',
            },
          },
        ],
      },
      requiredFields: ['clientId', 'clientSecret'],
      optionalFields: ['redirectUri'],
      redirectUri: 'http://localhost:3001/api/accounts/oauth/callback',
    });

    // OneDrive
    this.providers.set('onedrive', {
      id: 'onedrive',
      name: 'OneDrive',
      type: 'storage',
      icon: '☁️',
      color: '#0078d4',
      description: 'Microsoft OneDrive cloud storage',
      setupGuide: {
        title: 'OneDrive Setup',
        description: 'Connect OneDrive for cloud storage integration',
        registrationUrl: 'https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
        documentationUrl: 'https://docs.microsoft.com/en-us/onedrive/developer/',
        steps: [
          {
            title: 'Create Azure App Registration',
            description: 'Register application for OneDrive access',
            settings: {
              'Application Name': 'HomeOS OneDrive Integration',
              'Supported Account Types': 'Accounts in any organizational directory and personal Microsoft accounts',
              'Redirect URI': 'http://localhost:3001/api/accounts/oauth/callback',
            },
          },
          {
            title: 'Configure API Permissions',
            description: 'Add OneDrive permissions',
            settings: {
              'Files.ReadWrite': 'Read and write files',
              'Files.ReadWrite.All': 'Read and write all files',
              'User.Read': 'Read user profile',
            },
          },
        ],
      },
      requiredFields: ['clientId', 'clientSecret'],
      optionalFields: ['redirectUri'],
      redirectUri: 'http://localhost:3001/api/accounts/oauth/callback',
    });

    // Gmail (separate from Google Calendar)
    this.providers.set('gmail', {
      id: 'gmail',
      name: 'Gmail',
      type: 'email',
      icon: '✉️',
      color: '#ea4335',
      description: 'Gmail email integration and automation',
      setupGuide: {
        title: 'Gmail Setup',
        description: 'Connect Gmail for email integration and automation',
        registrationUrl: 'https://console.cloud.google.com/apis/credentials',
        documentationUrl: 'https://developers.google.com/gmail/api',
        steps: [
          {
            title: 'Create Google Cloud Project',
            description: 'Create a new project for Gmail integration',
            settings: {
              'Project Name': 'HomeOS Gmail Integration',
              'Organization': 'Your Organization (optional)',
            },
          },
          {
            title: 'Enable Gmail API',
            description: 'Enable the Gmail API for your project',
            settings: {
              'API': 'Gmail API',
              'Status': 'Enabled',
            },
          },
          {
            title: 'Create OAuth 2.0 Credentials',
            description: 'Create OAuth credentials for Gmail access',
            settings: {
              'Application Type': 'Web application',
              'Name': 'HomeOS Gmail',
              'Authorized Redirect URIs': 'http://localhost:3001/api/accounts/oauth/callback',
            },
          },
        ],
      },
      requiredFields: ['clientId', 'clientSecret'],
      optionalFields: ['redirectUri'],
      redirectUri: 'http://localhost:3001/api/accounts/oauth/callback',
    });

    // Apple Music
    this.providers.set('apple-music', {
      id: 'apple-music',
      name: 'Apple Music',
      type: 'music',
      icon: '🎵',
      color: '#fa233b',
      description: 'Apple Music integration for whole-house audio',
      setupGuide: {
        title: 'Apple Music Setup',
        description: 'Connect Apple Music for music streaming integration',
        registrationUrl: 'https://developer.apple.com/account/',
        documentationUrl: 'https://developer.apple.com/documentation/applemusicapi',
        steps: [
          {
            title: 'Create Apple Developer Account',
            description: 'Sign up for Apple Developer Program',
            settings: {
              'Developer Account': 'Required ($99/year)',
              'Team ID': 'Your Apple Developer Team ID',
            },
          },
          {
            title: 'Create MusicKit Identifier',
            description: 'Create a MusicKit identifier for your app',
            settings: {
              'Identifier': 'com.homeos.music',
              'Description': 'HomeOS Music Integration',
              'MusicKit': 'Enabled',
            },
          },
          {
            title: 'Generate Private Key',
            description: 'Create a private key for MusicKit authentication',
            settings: {
              'Key Name': 'HomeOS MusicKit Key',
              'Services': 'MusicKit',
              'Download': 'Save .p8 file securely',
            },
          },
        ],
      },
      requiredFields: ['teamId', 'keyId', 'privateKey'],
      optionalFields: [],
      redirectUri: 'http://localhost:3001/api/accounts/oauth/callback',
    });

    // Amazon Personal
    this.providers.set('amazon', {
      id: 'amazon',
      name: 'Amazon Personal',
      type: 'shopping',
      icon: '📦',
      color: '#ff9900',
      description: 'Personal Amazon account for package tracking and order management',
      setupGuide: {
        title: 'Amazon Personal Setup',
        description: 'Connect your personal Amazon account for package tracking and order management',
        registrationUrl: 'https://developer.amazon.com/apps-and-games',
        documentationUrl: 'https://developer.amazon.com/docs/login-with-amazon/documentation-overview.html',
        steps: [
          {
            title: 'Create Amazon Developer Account',
            description: 'Sign up for Amazon Developer Console',
            settings: {
              'Account Type': 'Individual Developer',
              'Developer Name': 'Your Name',
              'Company Name': 'Personal Use',
            },
          },
          {
            title: 'Create Security Profile',
            description: 'Create a new security profile for Login with Amazon',
            settings: {
              'Security Profile Name': 'HomeOS Package Tracking',
              'Security Profile Description': 'Smart home package tracking integration',
              'Privacy Notice URL': 'http://localhost:3001/privacy',
              'Logo Image': 'Optional - Upload your logo',
            },
          },
          {
            title: 'Configure Web Settings',
            description: 'Set up web configuration for your security profile',
            settings: {
              'Allowed Origins': 'http://localhost:3001',
              'Allowed Return URLs': 'http://localhost:3001/api/accounts/oauth/callback',
              'Client ID': 'Copy from security profile',
              'Client Secret': 'Copy from security profile',
            },
          },
          {
            title: 'Enable Required Permissions',
            description: 'Configure the required API permissions',
            settings: {
              'Profile Scope': 'profile (access to name and email)',
              'Postal Code': 'postal_code (for delivery location)',
              'Order History': 'Custom permission for order tracking',
            },
          },
        ],
      },
      requiredFields: ['clientId', 'clientSecret'],
      optionalFields: ['redirectUri'],
      redirectUri: 'http://localhost:3001/api/accounts/oauth/callback',
    });

    // Amazon Business
    this.providers.set('amazon-business', {
      id: 'amazon-business',
      name: 'Amazon Business',
      type: 'business',
      icon: '🏢',
      color: '#232f3e',
      description: 'Amazon Business account for enterprise package tracking and procurement',
      setupGuide: {
        title: 'Amazon Business Setup',
        description: 'Connect your Amazon Business account for enterprise package tracking and procurement management',
        registrationUrl: 'https://developer.amazon.com/apps-and-games',
        documentationUrl: 'https://developer.amazon.com/docs/amazon-business-api/overview.html',
        steps: [
          {
            title: 'Create Amazon Business Developer Account',
            description: 'Register for Amazon Business API access',
            settings: {
              'Account Type': 'Business Developer',
              'Business Name': 'Your Company Name',
              'Business Registration': 'Required for API access',
              'Tax Information': 'Business tax details',
            },
          },
          {
            title: 'Apply for Amazon Business API',
            description: 'Request access to Amazon Business API',
            settings: {
              'Application Type': 'Package Tracking Integration',
              'Use Case': 'Smart office package management',
              'Expected Volume': 'Number of monthly API calls',
              'Business Justification': 'Automated package tracking for office efficiency',
            },
          },
          {
            title: 'Create Security Profile',
            description: 'Set up security profile for Amazon Business',
            settings: {
              'Security Profile Name': 'HomeOS Business Package Tracking',
              'Security Profile Description': 'Enterprise package tracking and procurement',
              'Privacy Notice URL': 'http://localhost:3001/privacy',
              'Terms of Service URL': 'http://localhost:3001/terms',
            },
          },
          {
            title: 'Configure API Credentials',
            description: 'Set up API credentials and permissions',
            settings: {
              'Client ID': 'Copy from Amazon Business console',
              'Client Secret': 'Copy from Amazon Business console',
              'Allowed Origins': 'http://localhost:3001',
              'Redirect URIs': 'http://localhost:3001/api/accounts/oauth/callback',
              'Scopes': 'business:orders, business:shipments, business:profile',
            },
          },
        ],
      },
      requiredFields: ['clientId', 'clientSecret', 'businessId'],
      optionalFields: ['redirectUri', 'apiKey'],
      redirectUri: 'http://localhost:3001/api/accounts/oauth/callback',
    });

    // Emporia Energy
    this.providers.set('emporia-energy', {
      id: 'emporia-energy',
      name: 'Emporia Energy',
      type: 'energy' as any, // Add energy type
      icon: '⚡',
      color: '#10b981',
      description: 'Real-time energy monitoring and usage analytics',
      setupGuide: {
        title: 'Emporia Energy Setup',
        description: 'Connect your Emporia Energy account for real-time energy monitoring',
        registrationUrl: 'https://console.cloud.google.com/',
        documentationUrl: 'https://developers.google.com/identity/protocols/oauth2',
        steps: [
          {
            title: 'Create Google Cloud Project',
            description: 'Set up a Google Cloud project for OAuth authentication',
            settings: {
              'Project Name': 'HomeOS Emporia Integration',
              'APIs to Enable': 'Google+ API, OAuth2 API',
              'OAuth Consent Screen': 'Configure for external users',
            },
          },
          {
            title: 'Create OAuth 2.0 Credentials',
            description: 'Generate OAuth credentials for Emporia authentication',
            settings: {
              'Application Type': 'Web application',
              'Name': 'HomeOS Emporia Energy',
              'Authorized Redirect URIs': 'http://localhost:3001/api/emporia/oauth/callback',
              'Authorized JavaScript Origins': 'http://localhost:3001, http://localhost:5173',
            },
          },
          {
            title: 'Configure Environment Variables',
            description: 'Add the OAuth credentials to your HomeOS environment',
            code: `# Add to your .env file
EMPORIA_CLIENT_ID=your-google-oauth-client-id
EMPORIA_CLIENT_SECRET=your-google-oauth-client-secret
EMPORIA_REDIRECT_URI=http://localhost:3001/api/emporia/oauth/callback`,
            settings: {
              'Client ID': 'Copy from Google Cloud Console',
              'Client Secret': 'Copy from Google Cloud Console',
              'Redirect URI': 'http://localhost:3001/api/emporia/oauth/callback',
            },
          },
        ],
      },
      requiredFields: ['clientId', 'clientSecret'],
      optionalFields: ['redirectUri'],
      redirectUri: 'http://localhost:3001/api/emporia/oauth/callback',
    });

    console.log('✅ Account providers initialized');
  }

  /**
   * Get all available providers
   */
  getProviders(): AccountProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get provider by ID
   */
  getProvider(providerId: string): AccountProvider | null {
    return this.providers.get(providerId) || null;
  }

  /**
   * Get all connected accounts
   */
  async getConnectedAccounts(userId: string = 'system'): Promise<AccountCredentials[]> {
    try {
      const accounts = await DatabaseService.query(`
        SELECT id, provider_id, user_id, account_name, account_email,
               status, last_validated, error_message, created_at, updated_at
        FROM account_credentials 
        WHERE user_id = ?
        ORDER BY created_at ASC
      `, [userId]);

      return accounts;
    } catch (error: any) {
      console.error('❌ Failed to get connected accounts:', error.message);
      return [];
    }
  }

  /**
   * Add new account credentials
   */
  async addAccount(
    providerId: string,
    credentials: { [key: string]: string },
    userId: string = 'system'
  ): Promise<{ success: boolean; accountId?: string; error?: string }> {
    try {
      const provider = this.getProvider(providerId);
      if (!provider) {
        return { success: false, error: 'Unknown provider' };
      }

      // Validate required fields
      for (const field of provider.requiredFields) {
        if (!credentials[field]) {
          return { success: false, error: `Missing required field: ${field}` };
        }
      }

      // Test the credentials
      const validation = await this.validateCredentials(providerId, credentials);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Encrypt credentials
      const encryptedCredentials = this.encryptCredentials(credentials);

      // Store in database
      const accountId = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const now = new Date().toISOString();

      await DatabaseService.execute(`
        INSERT INTO account_credentials (
          id, provider_id, user_id, account_name, account_email,
          credentials, status, last_validated, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        accountId,
        providerId,
        userId,
        validation.accountName || 'Unknown Account',
        validation.accountEmail || '',
        encryptedCredentials,
        'connected',
        now,
        now,
        now,
      ]);

      // Initialize the service
      await this.initializeService(providerId, credentials);

      this.emit('accountAdded', { providerId, accountId, userId });

      return { success: true, accountId };
    } catch (error: any) {
      console.error('❌ Failed to add account:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove account
   */
  async removeAccount(accountId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await DatabaseService.execute(`
        DELETE FROM account_credentials WHERE id = ?
      `, [accountId]);

      this.emit('accountRemoved', { accountId });

      return { success: true };
    } catch (error: any) {
      console.error('❌ Failed to remove account:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get OAuth authorization URL for a provider
   */
  async getOAuthUrl(providerId: string, accountCredentials: { [key: string]: string }): Promise<{ success: boolean; authUrl?: string; error?: string }> {
    try {
      const provider = this.getProvider(providerId);
      if (!provider) {
        return { success: false, error: 'Unknown provider' };
      }

      switch (providerId) {
        case 'microsoft365':
        case 'outlook':
          const msAuthUrl = `https://login.microsoftonline.com/${accountCredentials.tenantId || 'common'}/oauth2/v2.0/authorize?` +
            `client_id=${accountCredentials.clientId}&` +
            `response_type=code&` +
            `redirect_uri=${encodeURIComponent(provider.redirectUri)}&` +
            `scope=${encodeURIComponent('https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/User.Read offline_access')}&` +
            `state=${providerId}`;
          return { success: true, authUrl: msAuthUrl };

        case 'google':
        case 'gmail':
          const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${accountCredentials.clientId}&` +
            `response_type=code&` +
            `redirect_uri=${encodeURIComponent(provider.redirectUri)}&` +
            `scope=${encodeURIComponent('https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email')}&` +
            `access_type=offline&` +
            `prompt=consent&` +
            `state=${providerId}`;
          return { success: true, authUrl: googleAuthUrl };

        case 'spotify':
          const spotifyAuthUrl = `https://accounts.spotify.com/authorize?` +
            `client_id=${accountCredentials.clientId}&` +
            `response_type=code&` +
            `redirect_uri=${encodeURIComponent(provider.redirectUri)}&` +
            `scope=${encodeURIComponent('user-read-playback-state user-modify-playback-state playlist-read-private')}&` +
            `state=${providerId}`;
          return { success: true, authUrl: spotifyAuthUrl };

        case 'dropbox':
          const dropboxAuthUrl = `https://www.dropbox.com/oauth2/authorize?` +
            `client_id=${accountCredentials.clientId}&` +
            `response_type=code&` +
            `redirect_uri=${encodeURIComponent(provider.redirectUri)}&` +
            `state=${providerId}`;
          return { success: true, authUrl: dropboxAuthUrl };

        case 'onedrive':
          const onedriveAuthUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
            `client_id=${accountCredentials.clientId}&` +
            `response_type=code&` +
            `redirect_uri=${encodeURIComponent(provider.redirectUri)}&` +
            `scope=${encodeURIComponent('https://graph.microsoft.com/Files.ReadWrite https://graph.microsoft.com/User.Read offline_access')}&` +
            `state=${providerId}`;
          return { success: true, authUrl: onedriveAuthUrl };

        default:
          return { success: false, error: 'OAuth not supported for this provider' };
      }
    } catch (error: any) {
      console.error('❌ Failed to generate OAuth URL:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(code: string, state: string, providerId: string): Promise<{ success: boolean; accountId?: string; error?: string }> {
    try {
      // TODO: Exchange code for tokens and store account
      // This would involve making HTTP requests to each provider's token endpoint
      // For now, return a placeholder response

      const accountId = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const now = new Date().toISOString();

      // Store placeholder account
      await DatabaseService.execute(`
        INSERT INTO account_credentials (
          id, provider_id, user_id, account_name, account_email,
          credentials, status, last_validated, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        accountId,
        providerId,
        'system',
        'OAuth Account',
        'oauth@example.com',
        this.encryptCredentials({ code, state }),
        'connected',
        now,
        now,
        now,
      ]);

      this.emit('accountAdded', { providerId, accountId, userId: 'system' });

      return { success: true, accountId };
    } catch (error: any) {
      console.error('❌ Failed to handle OAuth callback:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update account status
   */
  async updateAccountStatus(accountId: string, status: string, errorMessage?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date().toISOString();

      await DatabaseService.execute(`
        UPDATE account_credentials
        SET status = ?, error_message = ?, last_validated = ?, updated_at = ?
        WHERE id = ?
      `, [status, errorMessage || null, now, now, accountId]);

      this.emit('accountStatusUpdated', { accountId, status, errorMessage });

      return { success: true };
    } catch (error: any) {
      console.error('❌ Failed to update account status:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate credentials for a provider
   */
  private async validateCredentials(
    providerId: string,
    credentials: { [key: string]: string }
  ): Promise<{ valid: boolean; error?: string; accountName?: string; accountEmail?: string }> {
    try {
      switch (providerId) {
        case 'microsoft365':
          microsoftCalendarService.initialize({
            clientId: credentials.clientId,
            clientSecret: credentials.clientSecret,
            tenantId: credentials.tenantId,
            redirectUri: credentials.redirectUri || this.providers.get(providerId)!.redirectUri,
          });
          return { valid: true };

        case 'google':
          googleCalendarService.initialize({
            clientId: credentials.clientId,
            clientSecret: credentials.clientSecret,
            redirectUri: credentials.redirectUri || this.providers.get(providerId)!.redirectUri,
          });
          return { valid: true };

        case 'spotify':
          // TODO: Add Spotify validation
          return { valid: true };

        default:
          return { valid: false, error: 'Unsupported provider' };
      }
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Initialize service with credentials
   */
  private async initializeService(providerId: string, credentials: { [key: string]: string }): Promise<void> {
    switch (providerId) {
      case 'microsoft365':
        microsoftCalendarService.initialize({
          clientId: credentials.clientId,
          clientSecret: credentials.clientSecret,
          tenantId: credentials.tenantId,
          redirectUri: credentials.redirectUri || this.providers.get(providerId)!.redirectUri,
        });
        break;

      case 'google':
        googleCalendarService.initialize({
          clientId: credentials.clientId,
          clientSecret: credentials.clientSecret,
          redirectUri: credentials.redirectUri || this.providers.get(providerId)!.redirectUri,
        });
        break;

      case 'spotify':
        // TODO: Initialize Spotify service
        break;
    }
  }

  /**
   * Encrypt credentials
   */
  private encryptCredentials(credentials: { [key: string]: string }): string {
    const algorithm = 'aes-256-cbc';
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt credentials
   */
  private decryptCredentials(encryptedData: string): { [key: string]: string } {
    const algorithm = 'aes-256-cbc';
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  /**
   * Generate encryption key
   */
  private generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

// Export singleton instance
export const accountManagerService = AccountManagerService.getInstance();
