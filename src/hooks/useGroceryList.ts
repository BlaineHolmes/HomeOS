import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

// ============================================================================
// GROCERY LIST HOOK - SMART GROCERY MANAGEMENT WITH CACHING
// ============================================================================

interface GroceryItem {
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

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  total: number;
  completed: number;
  pending: number;
}

interface GroceryData {
  items: GroceryItem[];
  categories: Category[];
  total: number;
  completed: number;
}

interface Suggestions {
  frequent: Array<{
    name: string;
    frequency: number;
    avg_quantity: number;
    category: string;
    unit: string;
  }>;
  recent: Array<{
    name: string;
    quantity: number;
    category: string;
    unit: string;
  }>;
}

interface UseGroceryListOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableOfflineMode?: boolean;
}

export const useGroceryList = (options: UseGroceryListOptions = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 30000,
    enableOfflineMode = true,
  } = options;

  const [groceryData, setGroceryData] = useState<GroceryData | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Cache management
  const CACHE_KEY = 'homeos_grocery_cache';
  const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

  // Load from cache
  const loadFromCache = useCallback(() => {
    if (!enableOfflineMode) return null;
    
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_EXPIRY) {
          return data;
        }
      }
    } catch (error) {
      console.warn('Failed to load from cache:', error);
    }
    return null;
  }, [enableOfflineMode]);

  // Save to cache
  const saveToCache = useCallback((data: GroceryData) => {
    if (!enableOfflineMode) return;
    
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.warn('Failed to save to cache:', error);
    }
  }, [enableOfflineMode]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load grocery data
  const loadGroceryData = useCallback(async (filters: {
    category?: string;
    showCompleted?: boolean;
  } = {}) => {
    try {
      setError(null);
      
      // Try cache first if offline
      if (!isOnline) {
        const cached = loadFromCache();
        if (cached) {
          setGroceryData(cached);
          setLoading(false);
          return;
        }
      }

      const params = new URLSearchParams();
      if (filters.category && filters.category !== 'all') {
        params.append('category', filters.category);
      }
      if (filters.showCompleted === false) {
        params.append('completed', 'false');
      }

      const response = await fetch(`/api/grocery?${params}`);
      const result = await response.json();

      if (result.success) {
        setGroceryData(result.data);
        saveToCache(result.data);
      } else {
        throw new Error(result.message || 'Failed to load grocery data');
      }
    } catch (error) {
      console.error('Error loading grocery data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load grocery data');
      
      // Try cache as fallback
      const cached = loadFromCache();
      if (cached) {
        setGroceryData(cached);
        toast.error('Using offline data - some items may be outdated');
      } else {
        toast.error('Failed to load grocery list');
      }
    } finally {
      setLoading(false);
    }
  }, [isOnline, loadFromCache, saveToCache]);

  // Load suggestions
  const loadSuggestions = useCallback(async (query: string) => {
    try {
      const response = await fetch(`/api/grocery/suggestions?query=${encodeURIComponent(query)}`);
      const result = await response.json();

      if (result.success) {
        setSuggestions(result.data);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  }, []);

  // Add grocery item
  const addItem = useCallback(async (item: {
    name: string;
    quantity: number;
    unit: string;
    category: string;
  }) => {
    try {
      if (!isOnline) {
        toast.error('Cannot add items while offline');
        return false;
      }

      const response = await fetch('/api/grocery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...item,
          added_by: 'system', // TODO: Use actual user ID from auth context
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Item added to grocery list!');
        return true;
      } else {
        throw new Error(result.message || 'Failed to add item');
      }
    } catch (error) {
      console.error('Error adding grocery item:', error);
      toast.error('Failed to add item');
      return false;
    }
  }, [isOnline]);

  // Toggle item completion
  const toggleComplete = useCallback(async (id: string, completed: boolean) => {
    try {
      if (!isOnline) {
        toast.error('Cannot update items while offline');
        return false;
      }

      const response = await fetch(`/api/grocery/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_completed: completed,
          completed_by: completed ? 'system' : undefined, // TODO: Use actual user ID
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(completed ? 'Item completed!' : 'Item marked as pending');
        return true;
      } else {
        throw new Error(result.message || 'Failed to update item');
      }
    } catch (error) {
      console.error('Error updating grocery item:', error);
      toast.error('Failed to update item');
      return false;
    }
  }, [isOnline]);

  // Update item
  const updateItem = useCallback(async (id: string, updates: Partial<GroceryItem>) => {
    try {
      if (!isOnline) {
        toast.error('Cannot update items while offline');
        return false;
      }

      const response = await fetch(`/api/grocery/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Item updated!');
        return true;
      } else {
        throw new Error(result.message || 'Failed to update item');
      }
    } catch (error) {
      console.error('Error updating grocery item:', error);
      toast.error('Failed to update item');
      return false;
    }
  }, [isOnline]);

  // Delete item
  const deleteItem = useCallback(async (id: string) => {
    try {
      if (!isOnline) {
        toast.error('Cannot delete items while offline');
        return false;
      }

      const response = await fetch(`/api/grocery/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Item deleted!');
        return true;
      } else {
        throw new Error(result.message || 'Failed to delete item');
      }
    } catch (error) {
      console.error('Error deleting grocery item:', error);
      toast.error('Failed to delete item');
      return false;
    }
  }, [isOnline]);

  // Bulk operations
  const bulkAction = useCallback(async (action: 'complete' | 'delete', itemIds: string[]) => {
    try {
      if (!isOnline) {
        toast.error('Cannot perform bulk actions while offline');
        return false;
      }

      const response = await fetch('/api/grocery/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          items: itemIds,
          user_id: 'system', // TODO: Use actual user ID
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`${result.data.affected_count} items ${action}d!`);
        return true;
      } else {
        throw new Error(result.message || `Failed to ${action} items`);
      }
    } catch (error) {
      console.error(`Error in bulk ${action}:`, error);
      toast.error(`Failed to ${action} items`);
      return false;
    }
  }, [isOnline]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh && isOnline) {
      const interval = setInterval(() => {
        loadGroceryData();
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, isOnline, loadGroceryData]);

  return {
    // Data
    groceryData,
    suggestions,
    loading,
    error,
    isOnline,
    
    // Actions
    loadGroceryData,
    loadSuggestions,
    addItem,
    toggleComplete,
    updateItem,
    deleteItem,
    bulkAction,
    
    // Utilities
    refresh: () => loadGroceryData(),
    clearCache: () => localStorage.removeItem(CACHE_KEY),
  };
};
