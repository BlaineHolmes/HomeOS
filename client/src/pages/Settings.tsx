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
  ArrowPathIcon as RefreshCw
} from '@heroicons/react/24/outline';

// ============================================================================
// SETTINGS PAGE - UNIFIED ACCOUNT MANAGEMENT
// ============================================================================

interface AccountProvider {
  id: string;
  name: string;
  type: 'calendar' | 'music' | 'email' | 'storage';
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
  const [loading, setLoading] = useState(true);

  const tabs = [
    { id: 'accounts', label: 'Accounts', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'network', label: 'Network', icon: Wifi },
  ];

  useEffect(() => {
    loadAccountData();
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
    setShowSetupModal(providerId);
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
                className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200"
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
                      
                      <button
                        onClick={() => handleRemoveAccount(account.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
          className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
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
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Once you've completed the registration and have your credentials, 
                you can add them using the form below or return to this page later.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center space-x-3 mb-8">
          <SettingsIcon className="w-8 h-8 text-blue-500" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
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
                  <div className="text-center py-12">
                    <Palette className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Appearance Settings
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Coming soon - Customize your theme and layout
                    </p>
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
      </AnimatePresence>
    </div>
  );
};

export default Settings;
