import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArchiveBoxIcon,
  TruckIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  UserIcon,
  CalendarIcon,
  ArrowPathIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PhotoIcon,
  BellIcon
} from '@heroicons/react/24/outline';

// ============================================================================
// PACKAGE TRACKING DASHBOARD - COMPREHENSIVE DELIVERY MANAGEMENT
// ============================================================================

interface Package {
  id: string;
  tracking_number: string;
  carrier: 'ups' | 'fedex' | 'usps' | 'amazon' | 'dhl';
  status: 'ordered' | 'shipped' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception';
  title: string;
  description: string;
  recipient: string;
  sender: string;
  estimated_delivery: string;
  actual_delivery?: string;
  delivery_address: string;
  current_location?: string;
  delivery_photo?: string;
  timeline: PackageEvent[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  value?: number;
  weight?: number;
  dimensions?: string;
  created_at: string;
  updated_at: string;
}

interface PackageEvent {
  id: string;
  timestamp: string;
  status: string;
  description: string;
  location: string;
  carrier_code?: string;
}

const Packages: React.FC = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'delivered'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [showAddPackage, setShowAddPackage] = useState(false);

  // Load packages data
  useEffect(() => {
    loadPackages();
    const interval = setInterval(loadPackages, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadPackages = async () => {
    try {
      setLoading(true);

      // TODO: Replace with actual API call
      const mockPackages: Package[] = [
        {
          id: 'pkg_001',
          tracking_number: '1Z999AA1234567890',
          carrier: 'ups',
          status: 'out_for_delivery',
          title: 'MacBook Pro 16"',
          description: 'Apple MacBook Pro 16-inch with M3 Pro chip',
          recipient: 'John Doe',
          sender: 'Apple Store',
          estimated_delivery: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          delivery_address: '123 Main St, Anytown, ST 12345',
          current_location: 'Local Delivery Facility',
          priority: 'high',
          value: 2499.00,
          weight: 4.7,
          dimensions: '14.0 x 9.8 x 0.66 in',
          timeline: [
            {
              id: 'evt_001',
              timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'ordered',
              description: 'Order placed',
              location: 'Apple Store Online',
            },
            {
              id: 'evt_002',
              timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'shipped',
              description: 'Package shipped',
              location: 'Cupertino, CA',
            },
            {
              id: 'evt_003',
              timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'in_transit',
              description: 'In transit to destination',
              location: 'Louisville, KY',
            },
            {
              id: 'evt_004',
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              status: 'out_for_delivery',
              description: 'Out for delivery',
              location: 'Local Delivery Facility',
            },
          ],
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'pkg_002',
          tracking_number: '9400111899562123456789',
          carrier: 'usps',
          status: 'in_transit',
          title: 'Home Security Camera',
          description: 'Ring Video Doorbell Pro 2',
          recipient: 'Jane Smith',
          sender: 'Amazon',
          estimated_delivery: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
          delivery_address: '123 Main St, Anytown, ST 12345',
          current_location: 'Regional Distribution Center',
          priority: 'medium',
          value: 249.99,
          timeline: [
            {
              id: 'evt_005',
              timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'ordered',
              description: 'Order confirmed',
              location: 'Amazon Fulfillment Center',
            },
            {
              id: 'evt_006',
              timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'shipped',
              description: 'Package shipped',
              location: 'Phoenix, AZ',
            },
            {
              id: 'evt_007',
              timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
              status: 'in_transit',
              description: 'In transit',
              location: 'Regional Distribution Center',
            },
          ],
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'pkg_003',
          tracking_number: 'TBA123456789',
          carrier: 'amazon',
          status: 'delivered',
          title: 'Coffee Beans',
          description: 'Blue Bottle Coffee - Three Africas Blend',
          recipient: 'John Doe',
          sender: 'Blue Bottle Coffee',
          estimated_delivery: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          actual_delivery: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          delivery_address: '123 Main St, Anytown, ST 12345',
          delivery_photo: '/api/packages/photos/pkg_003.jpg',
          priority: 'low',
          value: 24.99,
          timeline: [
            {
              id: 'evt_008',
              timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'ordered',
              description: 'Order placed',
              location: 'Blue Bottle Coffee',
            },
            {
              id: 'evt_009',
              timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'shipped',
              description: 'Package shipped',
              location: 'Oakland, CA',
            },
            {
              id: 'evt_010',
              timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'delivered',
              description: 'Delivered to front door',
              location: '123 Main St, Anytown, ST 12345',
            },
          ],
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      setPackages(mockPackages);
    } catch (error) {
      console.error('Failed to load packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCarrierIcon = (carrier: string) => {
    switch (carrier) {
      case 'ups': return '🚚';
      case 'fedex': return '📦';
      case 'usps': return '📮';
      case 'amazon': return '📦';
      case 'dhl': return '✈️';
      default: return '📦';
    }
  };

  const getCarrierColor = (carrier: string): string => {
    switch (carrier) {
      case 'ups': return 'bg-yellow-500';
      case 'fedex': return 'bg-purple-500';
      case 'usps': return 'bg-blue-500';
      case 'amazon': return 'bg-orange-500';
      case 'dhl': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ordered': return <ClockIcon className="w-5 h-5" />;
      case 'shipped': return <TruckIcon className="w-5 h-5" />;
      case 'in_transit': return <TruckIcon className="w-5 h-5" />;
      case 'out_for_delivery': return <TruckIcon className="w-5 h-5" />;
      case 'delivered': return <CheckCircleIcon className="w-5 h-5" />;
      case 'exception': return <ExclamationTriangleIcon className="w-5 h-5" />;
      default: return <ClockIcon className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'ordered': return 'text-blue-500';
      case 'shipped': return 'text-yellow-500';
      case 'in_transit': return 'text-orange-500';
      case 'out_for_delivery': return 'text-green-500';
      case 'delivered': return 'text-green-600';
      case 'exception': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const filteredPackages = packages.filter(pkg => {
    const matchesFilter = filter === 'all' ||
      (filter === 'active' && !['delivered', 'exception'].includes(pkg.status)) ||
      (filter === 'delivered' && pkg.status === 'delivered');

    const matchesSearch = searchQuery === '' ||
      pkg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pkg.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pkg.recipient.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const activePackages = packages.filter(pkg => !['delivered', 'exception'].includes(pkg.status));
  const deliveredToday = packages.filter(pkg =>
    pkg.status === 'delivered' &&
    pkg.actual_delivery &&
    new Date(pkg.actual_delivery).toDateString() === new Date().toDateString()
  );
  const outForDelivery = packages.filter(pkg => pkg.status === 'out_for_delivery');

  const renderPackageStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <motion.div
        className="card-glass p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-4">
          <TruckIcon className="w-8 h-8 text-blue-500" />
          <span className="text-sm text-gray-500 dark:text-gray-400">Active</span>
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            {activePackages.length}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Packages in transit</p>
        </div>
      </motion.div>

      <motion.div
        className="card-glass p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <TruckIcon className="w-8 h-8 text-green-500" />
          <span className="text-sm text-gray-500 dark:text-gray-400">Today</span>
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            {outForDelivery.length}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Out for delivery</p>
        </div>
      </motion.div>

      <motion.div
        className="card-glass p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <CheckCircleIcon className="w-8 h-8 text-green-600" />
          <span className="text-sm text-gray-500 dark:text-gray-400">Delivered</span>
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            {deliveredToday.length}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Delivered today</p>
        </div>
      </motion.div>

      <motion.div
        className="card-glass p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center justify-between mb-4">
          <ArchiveBoxIcon className="w-8 h-8 text-purple-500" />
          <span className="text-sm text-gray-500 dark:text-gray-400">Total</span>
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            {packages.length}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">All packages</p>
        </div>
      </motion.div>
    </div>
  );

  const renderPackageCard = (pkg: Package, index: number) => (
    <motion.div
      key={pkg.id}
      className="card-glass p-6 cursor-pointer hover:shadow-lg transition-shadow"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * index }}
      onClick={() => setSelectedPackage(pkg)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 ${getCarrierColor(pkg.carrier)} rounded-lg flex items-center justify-center text-white text-xl`}>
            {getCarrierIcon(pkg.carrier)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {pkg.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {pkg.tracking_number}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(pkg.priority)}`}>
            {pkg.priority.toUpperCase()}
          </span>
          {pkg.status === 'out_for_delivery' && (
            <BellIcon className="w-5 h-5 text-green-500 animate-pulse" />
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <div className={getStatusColor(pkg.status)}>
            {getStatusIcon(pkg.status)}
          </div>
          <span className={`font-medium ${getStatusColor(pkg.status)}`}>
            {pkg.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <UserIcon className="w-4 h-4" />
          <span>For {pkg.recipient}</span>
        </div>

        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <CalendarIcon className="w-4 h-4" />
          <span>
            {pkg.status === 'delivered' && pkg.actual_delivery
              ? `Delivered ${new Date(pkg.actual_delivery).toLocaleDateString()}`
              : `Expected ${new Date(pkg.estimated_delivery).toLocaleDateString()}`
            }
          </span>
        </div>

        {pkg.current_location && (
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <MapPinIcon className="w-4 h-4" />
            <span>{pkg.current_location}</span>
          </div>
        )}

        {pkg.delivery_photo && (
          <div className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
            <PhotoIcon className="w-4 h-4" />
            <span>Delivery photo available</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>Progress</span>
          <span>{getProgressPercentage(pkg.status)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <motion.div
            className={`h-2 rounded-full ${getProgressColor(pkg.status)}`}
            initial={{ width: 0 }}
            animate={{ width: `${getProgressPercentage(pkg.status)}%` }}
            transition={{ duration: 1, delay: 0.2 * index }}
          />
        </div>
      </div>
    </motion.div>
  );

  const getProgressPercentage = (status: string): number => {
    switch (status) {
      case 'ordered': return 20;
      case 'shipped': return 40;
      case 'in_transit': return 60;
      case 'out_for_delivery': return 80;
      case 'delivered': return 100;
      case 'exception': return 50;
      default: return 0;
    }
  };

  const getProgressColor = (status: string): string => {
    switch (status) {
      case 'delivered': return 'bg-green-500';
      case 'out_for_delivery': return 'bg-green-400';
      case 'in_transit': return 'bg-yellow-500';
      case 'shipped': return 'bg-blue-500';
      case 'ordered': return 'bg-gray-400';
      case 'exception': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const renderPackageDetail = () => (
    selectedPackage && (
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setSelectedPackage(null)}
      >
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className={`w-16 h-16 ${getCarrierColor(selectedPackage.carrier)} rounded-lg flex items-center justify-center text-white text-2xl`}>
                  {getCarrierIcon(selectedPackage.carrier)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedPackage.title}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedPackage.description}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    Tracking: {selectedPackage.tracking_number}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPackage(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            {/* Status and Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className={getStatusColor(selectedPackage.status)}>
                    {getStatusIcon(selectedPackage.status)}
                  </div>
                  <div>
                    <p className={`font-semibold ${getStatusColor(selectedPackage.status)}`}>
                      {selectedPackage.status.replace('_', ' ').toUpperCase()}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Current Status
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Recipient:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedPackage.recipient}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Sender:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedPackage.sender}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Priority:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedPackage.priority)}`}>
                      {selectedPackage.priority.toUpperCase()}
                    </span>
                  </div>
                  {selectedPackage.value && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Value:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        ${selectedPackage.value.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Delivery Address
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedPackage.delivery_address}
                  </p>
                </div>

                {selectedPackage.current_location && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Current Location
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedPackage.current_location}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {selectedPackage.status === 'delivered' ? 'Delivered' : 'Estimated Delivery'}
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedPackage.status === 'delivered' && selectedPackage.actual_delivery
                      ? new Date(selectedPackage.actual_delivery).toLocaleString()
                      : new Date(selectedPackage.estimated_delivery).toLocaleString()
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Delivery Photo */}
            {selectedPackage.delivery_photo && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Delivery Photo
                </h3>
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center">
                  <PhotoIcon className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Delivery photo captured at {selectedPackage.delivery_address}
                  </p>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Tracking Timeline
              </h3>
              <div className="space-y-4">
                {selectedPackage.timeline.map((event, index) => (
                  <motion.div
                    key={event.id}
                    className="flex items-start space-x-4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className={`w-3 h-3 rounded-full mt-2 ${getProgressColor(event.status)}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {event.description}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-500">
                          {new Date(event.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {event.location}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )
  );

  return (
    <motion.div
      className="min-h-screen p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <ArchiveBoxIcon className="w-8 h-8 text-orange-500" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Package Tracking
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Track all your deliveries from Amazon, UPS, FedEx, and more
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowAddPackage(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Add Package</span>
            </button>

            <button
              onClick={loadPackages}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        {renderPackageStats()}

        {/* Filters and Search */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
              {[
                { key: 'active' as const, label: 'Active', count: activePackages.length },
                { key: 'all' as const, label: 'All', count: packages.length },
                { key: 'delivered' as const, label: 'Delivered', count: packages.filter(p => p.status === 'delivered').length },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    filter === key
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <span>{label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    filter === key ? 'bg-blue-400' : 'bg-gray-200 dark:bg-gray-700'
                  }`}>
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search packages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button className="flex items-center space-x-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <FunnelIcon className="w-4 h-4" />
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* Package List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : filteredPackages.length === 0 ? (
          <div className="card-glass p-12 text-center">
            <ArchiveBoxIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No packages found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchQuery ? 'Try adjusting your search terms' : 'Add your first package to get started'}
            </p>
            <button
              onClick={() => setShowAddPackage(true)}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              Add Package
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPackages.map((pkg, index) => renderPackageCard(pkg, index))}
          </div>
        )}

        {/* Package Detail Modal */}
        <AnimatePresence>
          {renderPackageDetail()}
        </AnimatePresence>

        {/* Add Package Modal */}
        <AnimatePresence>
          {showAddPackage && (
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddPackage(false)}
            >
              <motion.div
                className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Add New Package
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tracking Number
                    </label>
                    <input
                      type="text"
                      placeholder="Enter tracking number"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Carrier
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="">Select carrier</option>
                      <option value="ups">UPS</option>
                      <option value="fedex">FedEx</option>
                      <option value="usps">USPS</option>
                      <option value="amazon">Amazon</option>
                      <option value="dhl">DHL</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Package Description
                    </label>
                    <input
                      type="text"
                      placeholder="What's in this package?"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowAddPackage(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowAddPackage(false)}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    Add Package
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default Packages;
