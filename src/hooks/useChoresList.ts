import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

// ============================================================================
// CHORES LIST HOOK - SMART CHORE MANAGEMENT WITH CACHING
// ============================================================================

interface ChoreItem {
  id: string;
  title: string;
  description?: string;
  assigned_to: string;
  assigned_to_name?: string;
  due_date?: Date;
  is_completed: boolean;
  completed_at?: Date;
  completed_by?: string;
  completed_by_name?: string;
  points: number;
  category: string;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    end_date?: Date;
    count?: number;
  };
  created_at: Date;
  updated_at: Date;
}

interface ChoreCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  total: number;
  completed: number;
  pending: number;
}

interface ChoreData {
  chores: ChoreItem[];
  categories: ChoreCategory[];
  total: number;
  completed: number;
  totalPoints: number;
  completedPoints: number;
}

interface ChoreAssignment {
  user_id: string;
  user_name: string;
  total_chores: number;
  completed_chores: number;
  total_points: number;
  completed_points: number;
  completion_rate: number;
}

interface UseChoresListOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableOfflineMode?: boolean;
}

const CACHE_KEY = 'homeos_chores_cache';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

export const useChoresList = (options: UseChoresListOptions = {}) => {
  const {
    autoRefresh = false,
    refreshInterval = 30000,
    enableOfflineMode = true,
  } = options;

  // State management
  const [choreData, setChoreData] = useState<ChoreData | null>(null);
  const [assignments, setAssignments] = useState<ChoreAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  // Cache management
  const getCachedData = useCallback(() => {
    if (!enableOfflineMode) return null;

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const isExpired = Date.now() - timestamp > CACHE_EXPIRY;

      if (isExpired) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  }, [enableOfflineMode]);

  const setCachedData = useCallback((data: ChoreData) => {
    if (!enableOfflineMode) return;

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Error writing cache:', error);
    }
  }, [enableOfflineMode]);

  // Load chores data
  const loadChoreData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!isOnline) {
        const cached = getCachedData();
        if (cached) {
          setChoreData(cached);
          toast.success('Loaded chores from cache (offline mode)');
          return;
        } else {
          throw new Error('No cached data available offline');
        }
      }

      const response = await fetch('/api/chores');
      const result = await response.json();

      if (result.success) {
        const processedData: ChoreData = {
          chores: result.data.chores.map((chore: any) => ({
            ...chore,
            due_date: chore.due_date ? new Date(chore.due_date) : undefined,
            completed_at: chore.completed_at ? new Date(chore.completed_at) : undefined,
            created_at: new Date(chore.created_at),
            updated_at: new Date(chore.updated_at),
          })),
          categories: result.data.categories || [],
          total: result.data.total || 0,
          completed: result.data.completed || 0,
          totalPoints: result.data.total_points || 0,
          completedPoints: result.data.completed_points || 0,
        };

        setChoreData(processedData);
        setCachedData(processedData);
      } else {
        throw new Error(result.message || 'Failed to load chores');
      }
    } catch (error: any) {
      console.error('Error loading chores:', error);
      setError(error.message);
      
      if (!isOnline) {
        const cached = getCachedData();
        if (cached) {
          setChoreData(cached);
          toast.error('Using cached data - ' + error.message);
        } else {
          toast.error('Failed to load chores: ' + error.message);
        }
      } else {
        toast.error('Failed to load chores: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  }, [isOnline, getCachedData, setCachedData]);

  // Load assignments data
  const loadAssignments = useCallback(async () => {
    try {
      if (!isOnline) return;

      const response = await fetch('/api/chores/assignments');
      const result = await response.json();

      if (result.success) {
        setAssignments(result.data || []);
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
  }, [isOnline]);

  // Add chore
  const addChore = useCallback(async (chore: {
    title: string;
    description?: string;
    assigned_to: string;
    due_date?: Date;
    points: number;
    category: string;
    recurrence?: {
      frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
      interval: number;
      end_date?: Date;
      count?: number;
    };
  }) => {
    try {
      if (!isOnline) {
        toast.error('Cannot add chores while offline');
        return false;
      }

      const response = await fetch('/api/chores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...chore,
          due_date: chore.due_date?.toISOString(),
          created_by: 'system', // TODO: Use actual user ID from auth context
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Chore added successfully!');
        await loadChoreData();
        await loadAssignments();
        return true;
      } else {
        throw new Error(result.message || 'Failed to add chore');
      }
    } catch (error: any) {
      console.error('Error adding chore:', error);
      toast.error('Failed to add chore: ' + error.message);
      return false;
    }
  }, [isOnline, loadChoreData, loadAssignments]);

  // Toggle chore completion
  const toggleComplete = useCallback(async (id: string, completed: boolean) => {
    try {
      if (!isOnline) {
        toast.error('Cannot update chores while offline');
        return false;
      }

      const response = await fetch(`/api/chores/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_completed: completed,
          completed_by: completed ? 'system' : undefined, // TODO: Use actual user ID
          completed_at: completed ? new Date().toISOString() : undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(completed ? 'Chore completed! 🎉' : 'Chore marked as pending');
        await loadChoreData();
        await loadAssignments();
        return true;
      } else {
        throw new Error(result.message || 'Failed to update chore');
      }
    } catch (error: any) {
      console.error('Error updating chore:', error);
      toast.error('Failed to update chore: ' + error.message);
      return false;
    }
  }, [isOnline, loadChoreData, loadAssignments]);

  // Update chore
  const updateChore = useCallback(async (id: string, updates: Partial<ChoreItem>) => {
    try {
      if (!isOnline) {
        toast.error('Cannot update chores while offline');
        return false;
      }

      const response = await fetch(`/api/chores/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...updates,
          due_date: updates.due_date?.toISOString(),
          updated_by: 'system', // TODO: Use actual user ID
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Chore updated successfully!');
        await loadChoreData();
        await loadAssignments();
        return true;
      } else {
        throw new Error(result.message || 'Failed to update chore');
      }
    } catch (error: any) {
      console.error('Error updating chore:', error);
      toast.error('Failed to update chore: ' + error.message);
      return false;
    }
  }, [isOnline, loadChoreData, loadAssignments]);

  // Delete chore
  const deleteChore = useCallback(async (id: string) => {
    try {
      if (!isOnline) {
        toast.error('Cannot delete chores while offline');
        return false;
      }

      const response = await fetch(`/api/chores/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Chore deleted successfully!');
        await loadChoreData();
        await loadAssignments();
        return true;
      } else {
        throw new Error(result.message || 'Failed to delete chore');
      }
    } catch (error: any) {
      console.error('Error deleting chore:', error);
      toast.error('Failed to delete chore: ' + error.message);
      return false;
    }
  }, [isOnline, loadChoreData, loadAssignments]);

  // Family member management
  const addFamilyMember = useCallback(async (member: {
    name: string;
    role: 'admin' | 'user' | 'child';
    email?: string;
  }) => {
    try {
      if (!isOnline) {
        toast.error('Cannot add family members while offline');
        return false;
      }

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: member.name,
          email: member.email || `${member.name.toLowerCase().replace(/\s+/g, '')}@family.local`,
          password: 'temp123', // TODO: Implement proper password setup
          role: member.role,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Family member added successfully!');
        await loadAssignments();
        return true;
      } else {
        throw new Error(result.message || 'Failed to add family member');
      }
    } catch (error: any) {
      console.error('Error adding family member:', error);
      toast.error('Failed to add family member: ' + error.message);
      return false;
    }
  }, [isOnline, loadAssignments]);

  const updateFamilyMember = useCallback(async (id: string, updates: {
    name?: string;
    role?: 'admin' | 'user' | 'child';
    email?: string;
  }) => {
    try {
      if (!isOnline) {
        toast.error('Cannot update family members while offline');
        return false;
      }

      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: updates.name,
          email: updates.email,
          role: updates.role,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Family member updated successfully!');
        await loadAssignments();
        return true;
      } else {
        throw new Error(result.message || 'Failed to update family member');
      }
    } catch (error: any) {
      console.error('Error updating family member:', error);
      toast.error('Failed to update family member: ' + error.message);
      return false;
    }
  }, [isOnline, loadAssignments]);

  const deleteFamilyMember = useCallback(async (id: string) => {
    try {
      if (!isOnline) {
        toast.error('Cannot delete family members while offline');
        return false;
      }

      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Family member removed successfully!');
        await loadChoreData();
        await loadAssignments();
        return true;
      } else {
        throw new Error(result.message || 'Failed to remove family member');
      }
    } catch (error: any) {
      console.error('Error removing family member:', error);
      toast.error('Failed to remove family member: ' + error.message);
      return false;
    }
  }, [isOnline, loadChoreData, loadAssignments]);

  // Initial load
  useEffect(() => {
    loadChoreData();
    loadAssignments();
  }, [loadChoreData, loadAssignments]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh && isOnline) {
      const interval = setInterval(() => {
        loadChoreData();
        loadAssignments();
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, isOnline, loadChoreData, loadAssignments]);

  return {
    // Data
    choreData,
    assignments,
    loading,
    error,
    isOnline,

    // Actions
    loadChoreData,
    loadAssignments,
    addChore,
    toggleComplete,
    updateChore,
    deleteChore,

    // Family member management
    addFamilyMember,
    updateFamilyMember,
    deleteFamilyMember,

    // Utilities
    refresh: () => {
      loadChoreData();
      loadAssignments();
    },
    clearCache: () => localStorage.removeItem(CACHE_KEY),
  };
};
