import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BoltIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { GlassCard, GlassButton, GlassInput, GlassModal } from '../glass';
import toast from 'react-hot-toast';

// ============================================================================
// EMPORIA AUTHENTICATION COMPONENT - OAUTH & CREDENTIAL LOGIN
// ============================================================================

interface EmporiaAuthProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface AuthStatus {
  is_authenticated: boolean;
  credentials: {
    email: string;
    customer?: {
      firstName: string;
      lastName: string;
      customerGid: number;
    };
  } | null;
}

const EmporiaAuth: React.FC<EmporiaAuthProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [authMethod, setAuthMethod] = useState<'oauth' | 'credentials'>('oauth');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<AuthStatus | null>(null);
  
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });

  // Check authentication status
  const checkStatus = async () => {
    try {
      const response = await fetch('/api/emporia/status');
      const result = await response.json();
      
      if (result.success) {
        setStatus(result.data);
        if (result.data.is_authenticated) {
          onSuccess();
        }
      }
    } catch (error) {
      console.error('Failed to check Emporia status:', error);
    }
  };

  // Handle OAuth authentication
  const handleOAuthLogin = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/emporia/oauth/url');
      const result = await response.json();
      
      if (result.success) {
        // Open OAuth URL in new window
        const authWindow = window.open(
          result.data.auth_url,
          'emporia-auth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        // Poll for authentication completion
        const pollForAuth = setInterval(async () => {
          try {
            if (authWindow?.closed) {
              clearInterval(pollForAuth);
              setLoading(false);
              
              // Check if authentication was successful
              await checkStatus();
            }
          } catch (error) {
            console.error('Auth polling error:', error);
          }
        }, 1000);

        // Cleanup after 5 minutes
        setTimeout(() => {
          clearInterval(pollForAuth);
          if (authWindow && !authWindow.closed) {
            authWindow.close();
          }
          setLoading(false);
        }, 5 * 60 * 1000);
        
      } else {
        toast.error('Failed to get OAuth URL');
        setLoading(false);
      }
    } catch (error: any) {
      console.error('OAuth login error:', error);
      toast.error('Failed to start OAuth login');
      setLoading(false);
    }
  };

  // Handle credential-based authentication
  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credentials.email || !credentials.password) {
      toast.error('Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/emporia/auth/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Successfully connected to Emporia Energy!');
        setCredentials({ email: '', password: '' });
        onSuccess();
        onClose();
      } else {
        toast.error(result.error || 'Authentication failed');
      }
    } catch (error: any) {
      console.error('Credential login error:', error);
      toast.error('Failed to authenticate with Emporia');
    } finally {
      setLoading(false);
    }
  };

  // Handle disconnect
  const handleDisconnect = async () => {
    try {
      const response = await fetch('/api/emporia/disconnect', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        setStatus(null);
        toast.success('Disconnected from Emporia Energy');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Failed to disconnect');
    }
  };

  // Check status on mount
  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  // Handle URL parameters for OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authResult = urlParams.get('auth');
    
    if (authResult === 'success') {
      toast.success('Successfully authenticated with Emporia Energy!');
      onSuccess();
      onClose();
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (authResult === 'error') {
      toast.error('Authentication failed');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [onSuccess, onClose]);

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Connect to Emporia Energy"
      size="md"
    >
      <div className="space-y-6">
        {/* Current Status */}
        {status?.is_authenticated ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Connected to Emporia Energy
            </h3>
            {status.credentials?.customer && (
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Welcome, {status.credentials.customer.firstName} {status.credentials.customer.lastName}
              </p>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Email: {status.credentials?.email}
            </p>
            
            <div className="flex space-x-3">
              <GlassButton
                onClick={onClose}
                variant="primary"
                className="flex-1"
              >
                Continue
              </GlassButton>
              <GlassButton
                onClick={handleDisconnect}
                variant="ghost"
                className="text-red-500 hover:text-red-600"
              >
                Disconnect
              </GlassButton>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Authentication Method Selection */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Choose Authentication Method
              </h3>
              
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => setAuthMethod('oauth')}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    authMethod === 'oauth'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">🔐</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      Google OAuth
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Recommended
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setAuthMethod('credentials')}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    authMethod === 'credentials'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">🔑</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      Credentials
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Direct login
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* OAuth Method */}
            <AnimatePresence mode="wait">
              {authMethod === 'oauth' ? (
                <motion.div
                  key="oauth"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="text-center"
                >
                  <BoltIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Connect with Google
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Use the same Google account you use to log into the Emporia web app.
                  </p>
                  
                  <GlassButton
                    onClick={handleOAuthLogin}
                    variant="primary"
                    disabled={loading}
                    loading={loading}
                    className="w-full"
                  >
                    {loading ? 'Connecting...' : 'Connect with Google'}
                  </GlassButton>
                </motion.div>
              ) : (
                <motion.div
                  key="credentials"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <form onSubmit={handleCredentialLogin} className="space-y-4">
                    <GlassInput
                      label="Email"
                      type="email"
                      value={credentials.email}
                      onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                      placeholder="Enter your Emporia email"
                      required
                    />
                    
                    <div className="relative">
                      <GlassInput
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        value={credentials.password}
                        onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                        placeholder="Enter your Emporia password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showPassword ? (
                          <EyeSlashIcon className="w-5 h-5" />
                        ) : (
                          <EyeIcon className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                        <div className="text-sm text-yellow-700 dark:text-yellow-300">
                          <strong>Note:</strong> This method requires your Emporia account credentials.
                          OAuth is recommended for better security.
                        </div>
                      </div>
                    </div>
                    
                    <GlassButton
                      type="submit"
                      variant="primary"
                      disabled={loading || !credentials.email || !credentials.password}
                      loading={loading}
                      className="w-full"
                    >
                      {loading ? 'Connecting...' : 'Connect to Emporia'}
                    </GlassButton>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </GlassModal>
  );
};

export default EmporiaAuth;
