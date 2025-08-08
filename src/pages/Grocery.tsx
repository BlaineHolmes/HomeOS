import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCartIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  CloudIcon,
} from '@heroicons/react/24/outline';
import { GlassCard, GlassButton } from '../components/glass';
import { GroceryItem, AddGroceryItem, CategoryFilter, ShoppingAssistant } from '../components/grocery';
import { useGroceryList } from '../hooks/useGroceryList';

// ============================================================================
// GROCERY LIST PAGE - FAMILY SHOPPING LIST WITH SMART FEATURES
// ============================================================================

interface GroceryItemType {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  is_completed: boolean;
  added_by: string;
  completed_by?: string;
  added_by_name?: string;
  completed_by_name?: string;
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
}

// Note: Category, GroceryData and Suggestions interfaces are defined in the useGroceryList hook

const Grocery: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Use the grocery list hook with smart features
  const {
    groceryData,
    suggestions,
    loading,
    error,
    isOnline,
    loadGroceryData,
    loadSuggestions,
    addItem,
    toggleComplete,
    updateItem,
    deleteItem,
    bulkAction,
    refresh,
  } = useGroceryList({
    autoRefresh: true,
    refreshInterval: 30000,
    enableOfflineMode: true,
  });

  // Load data when filters change
  useEffect(() => {
    loadGroceryData({ category: selectedCategory, showCompleted });
  }, [selectedCategory, showCompleted, loadGroceryData]);

  // Handle adding items (with refresh)
  const handleAddItem = async (item: {
    name: string;
    quantity: number;
    unit: string;
    category: string;
  }) => {
    const success = await addItem(item);
    if (success) {
      loadGroceryData({ category: selectedCategory, showCompleted });
    }
  };

  // Handle toggling completion (with refresh)
  const handleToggleComplete = async (id: string, completed: boolean) => {
    const success = await toggleComplete(id, completed);
    if (success) {
      loadGroceryData({ category: selectedCategory, showCompleted });
    }
  };

  // Handle updating items (with refresh)
  const handleUpdateItem = async (id: string, updates: Partial<GroceryItemType>) => {
    const success = await updateItem(id, updates);
    if (success) {
      loadGroceryData({ category: selectedCategory, showCompleted });
    }
  };

  // Handle deleting items (with refresh)
  const handleDeleteItem = async (id: string) => {
    const success = await deleteItem(id);
    if (success) {
      loadGroceryData({ category: selectedCategory, showCompleted });
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action: 'complete' | 'delete') => {
    if (selectedItems.size === 0) return;

    const success = await bulkAction(action, Array.from(selectedItems));
    if (success) {
      setSelectedItems(new Set());
      setBulkSelectMode(false);
      loadGroceryData({ category: selectedCategory, showCompleted });
    }
  };

  // Handle item selection for bulk actions
  const handleItemSelect = (id: string, selected: boolean) => {
    const newSelectedItems = new Set(selectedItems);
    if (selected) {
      newSelectedItems.add(id);
    } else {
      newSelectedItems.delete(id);
    }
    setSelectedItems(newSelectedItems);
  };

  const filteredItems = groceryData?.items.filter(item => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) {
      return false;
    }
    if (!showCompleted && item.is_completed) {
      return false;
    }
    return true;
  }) || [];

  const pendingItems = filteredItems.filter(item => !item.is_completed);
  const completedItems = filteredItems.filter(item => item.is_completed);

  return (
    <motion.div
      className="p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <ShoppingCartIcon className="w-8 h-8 text-green-600" />
            <div>
              <h1 className="text-3xl font-bold text-white">
                Family Grocery List
              </h1>
              {groceryData && (
                <p className="text-gray-400 mt-1">
                  {groceryData.total - groceryData.completed} items to buy
                  {groceryData.completed > 0 && ` • ${groceryData.completed} completed`}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Offline Indicator */}
            {!isOnline && (
              <div className="flex items-center space-x-1 text-orange-400">
                <CloudIcon className="w-4 h-4" />
                <span className="text-sm">Offline</span>
              </div>
            )}

            {/* Bulk Actions */}
            {bulkSelectMode && selectedItems.size > 0 && (
              <div className="flex items-center space-x-2">
                <GlassButton
                  onClick={() => handleBulkAction('complete')}
                  variant="secondary"
                  size="sm"
                  className="text-green-400"
                  disabled={!isOnline}
                >
                  <CheckCircleIcon className="w-4 h-4 mr-1" />
                  Complete ({selectedItems.size})
                </GlassButton>
                <GlassButton
                  onClick={() => handleBulkAction('delete')}
                  variant="secondary"
                  size="sm"
                  className="text-red-400"
                  disabled={!isOnline}
                >
                  <TrashIcon className="w-4 h-4 mr-1" />
                  Delete ({selectedItems.size})
                </GlassButton>
              </div>
            )}

            <GlassButton
              onClick={() => {
                setBulkSelectMode(!bulkSelectMode);
                setSelectedItems(new Set());
              }}
              variant={bulkSelectMode ? "secondary" : "ghost"}
              size="sm"
            >
              {bulkSelectMode ? 'Cancel' : 'Select'}
            </GlassButton>

            <GlassButton
              onClick={refresh}
              variant="ghost"
              size="sm"
              disabled={loading}
            >
              <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </GlassButton>
          </div>
        </div>

        {/* Add New Item */}
        <AddGroceryItem
          onAdd={handleAddItem}
          suggestions={suggestions || undefined}
          onGetSuggestions={loadSuggestions}
          isLoading={loading}
        />

        {/* Smart Shopping Assistant */}
        {groceryData && groceryData.items.length > 0 && (
          <ShoppingAssistant
            groceryData={groceryData}
            onAddSuggestion={handleAddItem}
          />
        )}

        {/* Category Filter */}
        {groceryData && (
          <CategoryFilter
            categories={groceryData.categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            showCompleted={showCompleted}
            onToggleCompleted={() => setShowCompleted(!showCompleted)}
          />
        )}

        {/* Loading State */}
        {loading && !groceryData && (
          <div className="flex items-center justify-center py-12">
            <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}

        {/* Empty State */}
        {!loading && groceryData && filteredItems.length === 0 && (
          <GlassCard className="p-8 text-center">
            <ShoppingCartIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              {selectedCategory === 'all' ? 'No items in your list' : 'No items in this category'}
            </h2>
            <p className="text-gray-400">
              {selectedCategory === 'all'
                ? 'Add your first grocery item to get started!'
                : 'Try selecting a different category or add a new item.'
              }
            </p>
          </GlassCard>
        )}

        {/* Grocery Items */}
        {!loading && groceryData && filteredItems.length > 0 && (
          <div className="space-y-6">
            {/* Pending Items */}
            {pendingItems.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <span className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></span>
                  To Buy ({pendingItems.length})
                </h2>
                <AnimatePresence>
                  {pendingItems.map((item) => (
                    <GroceryItem
                      key={item.id}
                      item={item}
                      onToggleComplete={handleToggleComplete}
                      onUpdate={handleUpdateItem}
                      onDelete={handleDeleteItem}
                      isEditing={editingItemId === item.id}
                      onEditToggle={setEditingItemId}
                      bulkSelectMode={bulkSelectMode}
                      isSelected={selectedItems.has(item.id)}
                      onSelect={handleItemSelect}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Completed Items */}
            {showCompleted && completedItems.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <span className="w-3 h-3 bg-green-400 rounded-full mr-2"></span>
                  Completed ({completedItems.length})
                </h2>
                <AnimatePresence>
                  {completedItems.map((item) => (
                    <GroceryItem
                      key={item.id}
                      item={item}
                      onToggleComplete={handleToggleComplete}
                      onUpdate={handleUpdateItem}
                      onDelete={handleDeleteItem}
                      isEditing={editingItemId === item.id}
                      onEditToggle={setEditingItemId}
                      bulkSelectMode={bulkSelectMode}
                      isSelected={selectedItems.has(item.id)}
                      onSelect={handleItemSelect}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {!loading && error && !groceryData && (
          <GlassCard className="p-8 text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Failed to Load Grocery List
            </h2>
            <p className="text-gray-400 mb-4">
              {error}
            </p>
            <div className="flex justify-center space-x-3">
              <GlassButton onClick={refresh} variant="primary">
                Try Again
              </GlassButton>
              {!isOnline && (
                <GlassButton
                  onClick={() => window.location.reload()}
                  variant="ghost"
                >
                  Reload Page
                </GlassButton>
              )}
            </div>
          </GlassCard>
        )}
      </div>
    </motion.div>
  );
};

export default Grocery;
