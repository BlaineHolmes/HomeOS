import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CogIcon as SettingsIcon,
  UserIcon as User,
  BellIcon as Bell,
  ShieldCheckIcon as Shield,
  SwatchIcon as Palette,
  WifiIcon as Wifi,
  PlusIcon as Plus,
  CheckIcon as Check,
  ExclamationCircleIcon as AlertCircle,
  ArrowTopRightOnSquareIcon as ExternalLink,
  TrashIcon as Trash2,
  ArrowPathIcon as RefreshCw,
  BoltIcon
} from '@heroicons/react/24/outline';
import ThemeSettings from '../components/ThemeSettings';
import EmporiaAuth from '../components/energy/EmporiaAuth';

// ============================================================================
// SETTINGS PAGE - UNIFIED ACCOUNT MANAGEMENT
// ============================================================================

interface AccountProvider {
  id: string;
  name: string;
  type: 'calendar' | 'music' | 'email' | 'storage' | 'energy';
  icon: string;
  color: string;
  description: string;
  setupGuide: {
    title: string;
    description: string;
    steps: Array<{
      title: string;
      description: string;
      settings: { [key: string]: string };
    }>;
    registrationUrl: string;
    documentationUrl: string;
  };
  requiredFields: string[];
  optionalFields: string[];
  redirectUri: string;
}

interface ConnectedAccount {
  id: string;
  provider_id: string;
  account_name: string;
  account_email: string;
  status: 'pending' | 'connected' | 'error' | 'expired';
  last_validated: string;
  error_message?: string;
  provider: {
    name: string;
    icon: string;
    color: string;
    type: string;
  };
}

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('accounts');
  const [providers, setProviders] = useState<AccountProvider[]>([]);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [showSetupModal, setShowSetupModal] = useState<string | null>(null);
  const [showCredentialsForm, setShowCredentialsForm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [credentials, setCredentials] = useState<{ [key: string]: string }>({});
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [showEmporiaAuth, setShowEmporiaAuth] = useState(false);

  const tabs = [
    { id: 'accounts', label: 'Accounts', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'network', label: 'Network', icon: Wifi },
  ];

  useEffect(() => {
    loadAccountData();

    // Check for OAuth callback parameters
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    // const accountId = urlParams.get('accountId'); // TODO: Use for account-specific settings

    if (success) {
      alert(success);
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      alert(`Error: ${error}`);
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const loadAccountData = async () => {
    try {
      setLoading(true);
      
      // Load providers
      const providersResponse = await fetch('/api/accounts/providers');
      const providersData = await providersResponse.json();
      
      // Load connected accounts
      const accountsResponse = await fetch('/api/accounts');
      const accountsData = await accountsResponse.json();
      
      if (providersData.success) {
        setProviders(providersData.data.providers);
      }
      
      if (accountsData.success) {
        setConnectedAccounts(accountsData.data.accounts);
      }
    } catch (error) {
      console.error('Failed to load account data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAccountStatus = (providerId: string) => {
    return connectedAccounts.find(acc => acc.provider_id === providerId);
  };

  const handleSetupAccount = (providerId: string) => {
    if (providerId === 'emporia-energy') {
      setShowEmporiaAuth(true);
    } else {
      setShowSetupModal(providerId);
    }
  };

  const handleShowCredentialsForm = (providerId: string) => {
    setShowCredentialsForm(providerId);
    setShowSetupModal(null);
    setCredentials({});
    setValidationErrors({});
  };

  const handleEmporiaSuccess = () => {
    setShowEmporiaAuth(false);
    // Refresh connected accounts to show the new Emporia connection
    loadAccountData();
  };

  const handleCredentialChange = (field: string, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateCredentials = (provider: AccountProvider): boolean => {
    const errors: { [key: string]: string } = {};

    provider.requiredFields.forEach(field => {
      if (!credentials[field] || credentials[field].trim() === '') {
        errors[field] = `${field} is required`;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitCredentials = async (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;

    if (!validateCredentials(provider)) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          providerId,
          credentials,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setShowCredentialsForm(null);
        setCredentials({});
        await loadAccountData();
        // Show success message
        alert('Account connected successfully!');
      } else {
        alert(`Failed to connect account: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to submit credentials:', error);
      alert('Failed to connect account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOAuthFlow = async (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return;

    if (!validateCredentials(provider)) {
      return;
    }

    setSubmitting(true);
    try {
      // Get OAuth URL
      const response = await fetch(`/api/accounts/oauth/${providerId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credentials,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Open OAuth popup
        const popup = window.open(
          result.data.authUrl,
          'oauth-popup',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );

        // Listen for popup close or message
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            setSubmitting(false);
            // Reload account data to check if connection was successful
            loadAccountData();
          }
        }, 1000);

        // Listen for OAuth completion message
        const messageListener = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;

          if (event.data.type === 'oauth-success') {
            popup?.close();
            clearInterval(checkClosed);
            setShowCredentialsForm(null);
            setCredentials({});
            loadAccountData();
            alert('Account connected successfully!');
            window.removeEventListener('message', messageListener);
            setSubmitting(false);
          } else if (event.data.type === 'oauth-error') {
            popup?.close();
            clearInterval(checkClosed);
            alert(`OAuth failed: ${event.data.error}`);
            window.removeEventListener('message', messageListener);
            setSubmitting(false);
          }
        };

        window.addEventListener('message', messageListener);
      } else {
        alert(`Failed to start OAuth flow: ${result.error}`);
        setSubmitting(false);
      }
    } catch (error) {
      console.error('Failed to start OAuth flow:', error);
      alert('Failed to start OAuth flow. Please try again.');
      setSubmitting(false);
    }
  };

  const supportsOAuth = (providerId: string): boolean => {
    return ['microsoft365', 'outlook', 'google', 'gmail', 'spotify', 'dropbox', 'onedrive'].includes(providerId);
  };

  const handleTestConnection = async (accountId: string) => {
    try {
      const response = await fetch(`/api/accounts/${accountId}/test`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        alert('Connection test successful!');
        await loadAccountData();
      } else {
        alert(`Connection test failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to test connection:', error);
      alert('Failed to test connection. Please try again.');
    }
  };

  const handleRemoveAccount = async (accountId: string) => {
    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await loadAccountData();
      }
    } catch (error) {
      console.error('Failed to remove account:', error);
    }
  };

  const renderAccountsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Connected Accounts
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your calendar, music, and other service integrations
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers.map((provider) => {
            const account = getAccountStatus(provider.id);
            
            return (
              <motion.div
                key={provider.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-glass p-6 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                      style={{ backgroundColor: provider.color + '20' }}
                    >
                      {provider.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {provider.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                        {provider.type}
                      </p>
                    </div>
                  </div>
                  
                  {account ? (
                    <div className="flex items-center space-x-2">
                      {account.status === 'connected' && (
                        <Check className="w-5 h-5 text-green-500" />
                      )}
                      {account.status === 'error' && (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                      {account.status === 'pending' && (
                        <RefreshCw className="w-5 h-5 text-yellow-500 animate-spin" />
                      )}
                    </div>
                  ) : null}
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {provider.description}
                </p>

                {account ? (
                  <div className="space-y-3">
                    <div className="text-sm">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {account.account_name}
                      </p>
                      {account.account_email && (
                        <p className="text-gray-500 dark:text-gray-400">
                          {account.account_email}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        account.status === 'connected'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : account.status === 'error'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {account.status}
                      </span>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleTestConnection(account.id)}
                          className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                          title="Test Connection"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveAccount(account.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          title="Remove Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {account.error_message && (
                      <p className="text-xs text-red-500 dark:text-red-400">
                        {account.error_message}
                      </p>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => handleSetupAccount(provider.id)}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Connect Account</span>
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderSetupModal = () => {
    const provider = providers.find(p => p.id === showSetupModal);
    if (!provider) return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={() => setShowSetupModal(null)}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="card-glass max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ backgroundColor: provider.color + '20' }}
                >
                  {provider.icon}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {provider.setupGuide.title}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {provider.setupGuide.description}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSetupModal(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-6">
              <div className="flex items-center space-x-4 mb-4">
                <a
                  href={provider.setupGuide.registrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Registration Page</span>
                </a>
                <a
                  href={provider.setupGuide.documentationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Documentation</span>
                </a>
              </div>
            </div>

            <div className="space-y-6">
              {provider.setupGuide.steps.map((step, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Step {index + 1}: {step.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {step.description}
                  </p>
                  
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Required Settings:
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(step.settings).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {key}:
                          </span>
                          <code className="text-sm bg-white dark:bg-gray-800 px-2 py-1 rounded border">
                            {value}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
                After Registration:
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-300 mb-4">
                Once you've completed the registration and have your credentials,
                click the button below to enter them.
              </p>
              <button
                onClick={() => handleShowCredentialsForm(provider.id)}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Enter Credentials</span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const renderCredentialsForm = () => {
    const provider = providers.find(p => p.id === showCredentialsForm);
    if (!provider) return null;

    const getFieldLabel = (field: string): string => {
      const labels: { [key: string]: string } = {
        clientId: 'Client ID',
        clientSecret: 'Client Secret',
        tenantId: 'Tenant ID',
        redirectUri: 'Redirect URI',
        appleId: 'Apple ID',
        appPassword: 'App-Specific Password',
        server: 'Server URL',
        teamId: 'Team ID',
        keyId: 'Key ID',
        privateKey: 'Private Key',
      };
      return labels[field] || field.charAt(0).toUpperCase() + field.slice(1);
    };

    const getFieldType = (field: string): string => {
      if (field.toLowerCase().includes('password') || field.toLowerCase().includes('secret') || field.toLowerCase().includes('key')) {
        return 'password';
      }
      return 'text';
    };

    const getFieldPlaceholder = (field: string): string => {
      const placeholders: { [key: string]: string } = {
        clientId: 'Enter your client ID from the app registration',
        clientSecret: 'Enter your client secret',
        tenantId: 'Enter your Azure tenant ID',
        redirectUri: provider.redirectUri,
        appleId: 'your.email@icloud.com',
        appPassword: 'xxxx-xxxx-xxxx-xxxx',
        server: 'caldav.icloud.com',
        teamId: 'Your Apple Developer Team ID',
        keyId: 'Your MusicKit Key ID',
        privateKey: 'Paste your private key content here',
      };
      return placeholders[field] || `Enter your ${getFieldLabel(field).toLowerCase()}`;
    };

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={() => setShowCredentialsForm(null)}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="card-glass max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ backgroundColor: provider.color + '20' }}
                >
                  {provider.icon}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Connect {provider.name}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Enter your credentials to connect this account
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCredentialsForm(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="p-6">
            <form onSubmit={(e) => { e.preventDefault(); handleSubmitCredentials(provider.id); }}>
              <div className="space-y-4">
                {provider.requiredFields.map((field) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {getFieldLabel(field)} *
                    </label>
                    {field === 'privateKey' ? (
                      <textarea
                        value={credentials[field] || ''}
                        onChange={(e) => handleCredentialChange(field, e.target.value)}
                        placeholder={getFieldPlaceholder(field)}
                        rows={4}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                          validationErrors[field] ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                    ) : (
                      <input
                        type={getFieldType(field)}
                        value={credentials[field] || ''}
                        onChange={(e) => handleCredentialChange(field, e.target.value)}
                        placeholder={getFieldPlaceholder(field)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                          validationErrors[field] ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                    )}
                    {validationErrors[field] && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors[field]}</p>
                    )}
                  </div>
                ))}

                {provider.optionalFields.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Optional Settings
                    </h4>
                    {provider.optionalFields.map((field) => (
                      <div key={field} className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {getFieldLabel(field)}
                        </label>
                        <input
                          type={getFieldType(field)}
                          value={credentials[field] || ''}
                          onChange={(e) => handleCredentialChange(field, e.target.value)}
                          placeholder={getFieldPlaceholder(field)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowCredentialsForm(null)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <div className="flex items-center space-x-3">
                  {supportsOAuth(provider.id) && (
                    <button
                      type="button"
                      onClick={() => handleOAuthFlow(provider.id)}
                      disabled={submitting}
                      className="flex items-center space-x-2 px-6 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg transition-colors"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Authorizing...</span>
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-4 h-4" />
                          <span>OAuth Connect</span>
                        </>
                      )}
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center space-x-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-colors"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Manual Connect</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <motion.div
      className="min-h-screen p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <SettingsIcon className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Settings
            </h1>
          </div>

          {/* HolmesOS Branding */}
          <div className="flex items-center space-x-3 opacity-60">
            <img
              src="/src/logo/HolmesOS-lightgray.png"
              alt="HolmesOS"
              className="w-8 h-8 object-contain"
            />
            <div className="text-right hidden sm:block">
              <p className="text-lg font-bold text-gray-900 dark:text-white">HolmesOS</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Smart Home Management</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'accounts' && renderAccountsTab()}
                {activeTab === 'notifications' && (
                  <div className="text-center py-12">
                    <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Notifications Settings
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Coming soon - Configure your notification preferences
                    </p>
                  </div>
                )}
                {activeTab === 'security' && (
                  <div className="text-center py-12">
                    <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Security Settings
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Coming soon - Manage your security preferences
                    </p>
                  </div>
                )}
                {activeTab === 'appearance' && (
                  <div className="max-w-4xl">
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Appearance Settings
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400">
                        Customize your theme, glass effects, and visual preferences
                      </p>
                    </div>
                    <ThemeSettings />
                  </div>
                )}
                {activeTab === 'network' && (
                  <div className="text-center py-12">
                    <Wifi className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Network Settings
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Coming soon - Configure network and connectivity
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showSetupModal && renderSetupModal()}
        {showCredentialsForm && renderCredentialsForm()}
      </AnimatePresence>
    </motion.div>
  );
};

export default Settings;
