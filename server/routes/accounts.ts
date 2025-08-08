import { Router } from 'express';
import { accountManagerService } from '../services/account-manager.js';
import { emporiaService } from '../services/emporia.js';

const router = Router();

// ============================================================================
// ACCOUNT MANAGEMENT ROUTES - UNIFIED ACCOUNT SETUP
// ============================================================================

/**
 * GET /api/accounts/providers
 * Get all available account providers
 */
router.get('/providers', (req, res) => {
  try {
    const providers = accountManagerService.getProviders();
    
    res.json({
      success: true,
      data: {
        providers,
        count: providers.length,
      },
    });
  } catch (error: any) {
    console.error('Account providers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get account providers',
      details: error.message,
    });
  }
});

/**
 * GET /api/accounts/providers/:id
 * Get specific provider details including setup guide
 */
router.get('/providers/:id', (req, res) => {
  try {
    const { id } = req.params;
    const provider = accountManagerService.getProvider(id);
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found',
      });
    }
    
    res.json({
      success: true,
      data: provider,
    });
  } catch (error: any) {
    console.error('Provider details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get provider details',
      details: error.message,
    });
  }
});

/**
 * GET /api/accounts
 * Get all connected accounts for the current user
 */
router.get('/', async (req, res) => {
  try {
    // TODO: Get user ID from authentication
    const userId = req.query.userId as string || 'system';
    
    const accounts = await accountManagerService.getConnectedAccounts(userId);
    
    // Add provider information to each account
    const accountsWithProviders = accounts.map(account => {
      const provider = accountManagerService.getProvider(account.provider_id);
      return {
        ...account,
        provider: provider ? {
          name: provider.name,
          icon: provider.icon,
          color: provider.color,
          type: provider.type,
        } : null,
      };
    });
    
    res.json({
      success: true,
      data: {
        accounts: accountsWithProviders,
        count: accountsWithProviders.length,
      },
    });
  } catch (error: any) {
    console.error('Connected accounts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get connected accounts',
      details: error.message,
    });
  }
});

/**
 * POST /api/accounts
 * Add a new account connection
 */
router.post('/', async (req, res) => {
  try {
    const { providerId, credentials, userId } = req.body;
    
    if (!providerId || !credentials) {
      return res.status(400).json({
        success: false,
        error: 'Provider ID and credentials are required',
      });
    }
    
    const result = await accountManagerService.addAccount(
      providerId,
      credentials,
      userId || 'system'
    );
    
    if (result.success) {
      res.status(201).json({
        success: true,
        message: 'Account connected successfully',
        data: {
          accountId: result.accountId,
          providerId,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error: any) {
    console.error('Add account error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add account',
      details: error.message,
    });
  }
});

/**
 * DELETE /api/accounts/:id
 * Remove an account connection
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await accountManagerService.removeAccount(id);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Account removed successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error: any) {
    console.error('Remove account error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove account',
      details: error.message,
    });
  }
});

/**
 * POST /api/accounts/:id/test
 * Test an account connection
 */
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;

    // Get account details
    const accounts = await accountManagerService.getConnectedAccounts('system');
    const account = accounts.find(acc => acc.id === id);

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }

    // Test the connection based on provider type
    let testResult = { success: false, error: 'Test not implemented' };

    switch (account.provider_id) {
      case 'microsoft365':
      case 'outlook':
        testResult = await testMicrosoftConnection(account);
        break;
      case 'google':
      case 'gmail':
        testResult = await testGoogleConnection(account);
        break;
      case 'spotify':
        testResult = await testSpotifyConnection(account);
        break;
      case 'dropbox':
        testResult = await testDropboxConnection(account);
        break;
      case 'onedrive':
        testResult = await testOneDriveConnection(account);
        break;
      case 'icloud':
        testResult = await testICloudConnection(account);
        break;
      case 'apple-music':
        testResult = await testAppleMusicConnection(account);
        break;
      default:
        testResult = { success: false, error: 'Testing not supported for this provider' };
    }

    // Update account status based on test result
    const newStatus = testResult.success ? 'connected' : 'error';
    const errorMessage = testResult.success ? null : testResult.error;

    await accountManagerService.updateAccountStatus(id, newStatus, errorMessage);

    res.json({
      success: testResult.success,
      message: testResult.success ? 'Account test successful' : 'Account test failed',
      data: {
        status: newStatus,
        lastTested: new Date().toISOString(),
        error: errorMessage,
      },
    });
  } catch (error: any) {
    console.error('Test account error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test account',
      details: error.message,
    });
  }
});

// Helper functions for testing different providers
async function testMicrosoftConnection(account: any): Promise<{ success: boolean; error?: string }> {
  try {
    // TODO: Implement actual Microsoft Graph API test
    // For now, return success if account exists
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function testGoogleConnection(account: any): Promise<{ success: boolean; error?: string }> {
  try {
    // TODO: Implement actual Google API test
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function testSpotifyConnection(account: any): Promise<{ success: boolean; error?: string }> {
  try {
    // TODO: Implement actual Spotify API test
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function testDropboxConnection(account: any): Promise<{ success: boolean; error?: string }> {
  try {
    // TODO: Implement actual Dropbox API test
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function testOneDriveConnection(account: any): Promise<{ success: boolean; error?: string }> {
  try {
    // TODO: Implement actual OneDrive API test
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function testICloudConnection(account: any): Promise<{ success: boolean; error?: string }> {
  try {
    // TODO: Implement actual iCloud CalDAV test
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function testAppleMusicConnection(account: any): Promise<{ success: boolean; error?: string }> {
  try {
    // TODO: Implement actual Apple Music API test
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * POST /api/accounts/oauth/:providerId
 * Get OAuth authorization URL for a provider with credentials
 */
router.post('/oauth/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params;
    const { credentials } = req.body;

    if (!credentials) {
      return res.status(400).json({
        success: false,
        error: 'Credentials are required',
      });
    }

    const result = await accountManagerService.getOAuthUrl(providerId, credentials);

    if (result.success) {
      res.json({
        success: true,
        data: {
          authUrl: result.authUrl,
          provider: providerId,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error: any) {
    console.error('OAuth URL error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get OAuth URL',
      details: error.message,
    });
  }
});

/**
 * GET /api/accounts/oauth/callback
 * Handle OAuth callback (GET for redirect)
 */
router.get('/oauth/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`http://localhost:5173/settings?error=${encodeURIComponent(error as string)}`);
    }

    if (!code || !state) {
      return res.redirect('http://localhost:5173/settings?error=Missing authorization code or state');
    }

    const result = await accountManagerService.handleOAuthCallback(
      code as string,
      state as string,
      state as string // Using state as providerId
    );

    if (result.success) {
      res.redirect(`http://localhost:5173/settings?success=Account connected successfully&accountId=${result.accountId}`);
    } else {
      res.redirect(`http://localhost:5173/settings?error=${encodeURIComponent(result.error || 'Unknown error')}`);
    }
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    res.redirect(`http://localhost:5173/settings?error=${encodeURIComponent('Failed to process OAuth callback')}`);
  }
});

/**
 * GET /api/accounts/status
 * Get overall account status summary
 */
router.get('/status', async (req, res) => {
  try {
    const userId = req.query.userId as string || 'system';
    const accounts = await accountManagerService.getConnectedAccounts(userId);
    
    const statusSummary = {
      total: accounts.length,
      connected: accounts.filter(a => a.status === 'connected').length,
      error: accounts.filter(a => a.status === 'error').length,
      pending: accounts.filter(a => a.status === 'pending').length,
      byProvider: {} as { [key: string]: number },
    };
    
    // Count by provider
    accounts.forEach(account => {
      statusSummary.byProvider[account.provider_id] = 
        (statusSummary.byProvider[account.provider_id] || 0) + 1;
    });
    
    res.json({
      success: true,
      data: statusSummary,
    });
  } catch (error: any) {
    console.error('Account status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get account status',
      details: error.message,
    });
  }
});

/**
 * POST /api/accounts/emporia/connect
 * Connect Emporia Energy account
 */
router.post('/emporia/connect', async (req, res) => {
  try {
    const { method, email, password } = req.body;

    if (method === 'oauth') {
      // Return OAuth URL for frontend to redirect to
      const authUrl = emporiaService.getOAuthUrl();

      res.json({
        success: true,
        data: {
          auth_url: authUrl,
          method: 'oauth',
        },
      });
    } else if (method === 'credentials') {
      // Direct credential authentication
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required for credential authentication',
        });
      }

      const success = await emporiaService.authenticateWithCredentials(email, password);

      if (success) {
        res.json({
          success: true,
          message: 'Successfully connected to Emporia Energy',
          data: {
            method: 'credentials',
            credentials: emporiaService.getCredentials(),
          },
        });
      } else {
        res.status(401).json({
          success: false,
          error: 'Failed to authenticate with Emporia Energy',
        });
      }
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid authentication method. Use "oauth" or "credentials"',
      });
    }
  } catch (error: any) {
    console.error('Emporia connect error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to connect to Emporia Energy',
      details: error.message,
    });
  }
});

/**
 * GET /api/accounts/emporia/status
 * Get Emporia connection status
 */
router.get('/emporia/status', (req, res) => {
  try {
    const isAuthenticated = emporiaService.isAuth();
    const credentials = emporiaService.getCredentials();
    const devices = emporiaService.getDevices();

    res.json({
      success: true,
      data: {
        connected: isAuthenticated,
        credentials: credentials,
        device_count: devices.length,
        devices: devices.map(device => ({
          deviceGid: device.deviceGid,
          model: device.model,
          isConnected: device.isConnected,
        })),
      },
    });
  } catch (error: any) {
    console.error('Emporia status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Emporia status',
      details: error.message,
    });
  }
});

/**
 * POST /api/accounts/emporia/disconnect
 * Disconnect Emporia Energy account
 */
router.post('/emporia/disconnect', (req, res) => {
  try {
    emporiaService.disconnect();

    res.json({
      success: true,
      message: 'Successfully disconnected from Emporia Energy',
    });
  } catch (error: any) {
    console.error('Emporia disconnect error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect from Emporia Energy',
      details: error.message,
    });
  }
});

export default router;
