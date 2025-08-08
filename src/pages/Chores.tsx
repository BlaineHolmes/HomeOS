import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  TrophyIcon,
  WifiIcon,
  CloudIcon,
  FunnelIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { GlassCard, GlassButton } from '../components/glass';
import { ChoreItem, AddChore, CategoryFilter, ChoreAssignment, FamilyMemberModal } from '../components/chores';
import { useChoresList } from '../hooks/useChoresList';
import toast from 'react-hot-toast';

// ============================================================================
// CHORES PAGE - FAMILY CHORE MANAGEMENT WITH GAMIFICATION
// ============================================================================

interface ChoreItemType {
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
  chores: ChoreItemType[];
  categories: ChoreCategory[];
  total: number;
  completed: number;
  totalPoints: number;
  completedPoints: number;
}

interface ChoreAssignmentType {
  user_id: string;
  user_name: string;
  total_chores: number;
  completed_chores: number;
  total_points: number;
  completed_points: number;
  completion_rate: number;
}

const Chores: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAssignee, setSelectedAssignee] = useState('all');
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingChoreId, setEditingChoreId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'chores' | 'assignments'>('chores');
  const [showFilters, setShowFilters] = useState(false);
  const [showFamilyModal, setShowFamilyModal] = useState(false);

  // Use the chores list hook with smart features
  const {
    choreData,
    assignments,
    loading,
    error,
    isOnline,
    loadChoreData,
    loadAssignments,
    addChore,
    toggleComplete,
    updateChore,
    deleteChore,
    addFamilyMember,
    updateFamilyMember,
    deleteFamilyMember,
    refresh,
  } = useChoresList({
    autoRefresh: true,
    refreshInterval: 30000,
    enableOfflineMode: true,
  });

  // Filter chores based on selected filters
  const filteredChores = choreData?.chores.filter((chore) => {
    // Category filter
    if (selectedCategory !== 'all' && chore.category !== selectedCategory) {
      return false;
    }

    // Assignee filter
    if (selectedAssignee !== 'all' && chore.assigned_to !== selectedAssignee) {
      return false;
    }

    // Completion filter
    if (!showCompleted && chore.is_completed) {
      return false;
    }

    return true;
  }) || [];

  // Separate pending and completed chores
  const pendingChores = filteredChores.filter(chore => !chore.is_completed);
  const completedChores = filteredChores.filter(chore => chore.is_completed);

  // Handle chore addition
  const handleAddChore = async (choreData: {
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
    const success = await addChore(choreData);
    if (success) {
      // Show celebration for high-point chores
      if (choreData.points >= 50) {
        toast.success('🎉 High-value chore created!');
      }
    }
    return success;
  };

  // Handle chore completion toggle
  const handleToggleComplete = async (id: string, completed: boolean) => {
    const success = await toggleComplete(id, completed);
    if (success && completed) {
      // Find the chore to get points for celebration
      const chore = choreData?.chores.find(c => c.id === id);
      if (chore && chore.points >= 20) {
        toast.success(`🎉 +${chore.points} points earned!`);
      }
    }
    return success;
  };

  // Handle chore update
  const handleUpdateChore = async (id: string, updates: Partial<ChoreItemType>) => {
    return await updateChore(id, updates);
  };

  // Handle chore deletion
  const handleDeleteChore = async (id: string) => {
    return await deleteChore(id);
  };

  return (
    <motion.div
      className="p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <CheckCircleIcon className="w-8 h-8 text-purple-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Family Chores
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage household tasks and track progress
              </p>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center space-x-3">
            {/* Online Status */}
            <div className={`flex items-center space-x-1 text-sm ${
              isOnline ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {isOnline ? (
                <WifiIcon className="w-4 h-4" />
              ) : (
                <CloudIcon className="w-4 h-4" />
              )}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-white/20 dark:bg-white/10 rounded-lg p-1">
              <GlassButton
                onClick={() => setViewMode('chores')}
                variant={viewMode === 'chores' ? 'primary' : 'ghost'}
                size="sm"
              >
                Chores
              </GlassButton>
              <GlassButton
                onClick={() => setViewMode('assignments')}
                variant={viewMode === 'assignments' ? 'primary' : 'ghost'}
                size="sm"
              >
                <TrophyIcon className="w-4 h-4 mr-1" />
                Leaderboard
              </GlassButton>
            </div>

            {/* Family Members Button */}
            <GlassButton
              onClick={() => setShowFamilyModal(true)}
              variant="ghost"
              size="sm"
            >
              <UserGroupIcon className="w-4 h-4" />
            </GlassButton>

            {/* Filter Toggle */}
            {viewMode === 'chores' && (
              <GlassButton
                onClick={() => setShowFilters(!showFilters)}
                variant={showFilters ? 'primary' : 'ghost'}
                size="sm"
              >
                <FunnelIcon className="w-4 h-4" />
              </GlassButton>
            )}

            {/* Refresh Button */}
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

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <GlassCard variant="elevated" className="p-4 border-red-500/50">
              <div className="flex items-center space-x-3">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
                <div>
                  <h3 className="font-medium text-red-700 dark:text-red-400">
                    Error Loading Chores
                  </h3>
                  <p className="text-red-600 dark:text-red-300 text-sm">
                    {error}
                  </p>
                </div>
                <GlassButton
                  onClick={refresh}
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                >
                  Retry
                </GlassButton>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Content based on view mode */}
        <AnimatePresence mode="wait">
          {viewMode === 'assignments' ? (
            // Assignments/Leaderboard View
            <motion.div
              key="assignments"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ChoreAssignment
                assignments={assignments}
                onUserSelect={setSelectedAssignee}
                selectedUserId={selectedAssignee}
                showLeaderboard={true}
              />
            </motion.div>
          ) : (
            // Chores View
            <motion.div
              key="chores"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Filters */}
              <AnimatePresence>
                {showFilters && choreData && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <GlassCard variant="elevated" className="p-6">
                      <CategoryFilter
                        categories={choreData.categories}
                        selectedCategory={selectedCategory}
                        onCategoryChange={setSelectedCategory}
                        showCompleted={showCompleted}
                        onToggleCompleted={() => setShowCompleted(!showCompleted)}
                        selectedAssignee={selectedAssignee}
                        onAssigneeChange={setSelectedAssignee}
                        assignees={assignments.map(a => ({
                          id: a.user_id,
                          name: a.user_name,
                          total: a.total_chores,
                          completed: a.completed_chores,
                        }))}
                      />
                    </GlassCard>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Add New Chore */}
              <AddChore
                onAdd={handleAddChore}
                isLoading={loading}
                users={assignments.map(a => ({ id: a.user_id, name: a.user_name }))}
              />

              {/* Loading State */}
              {loading && !choreData && (
                <div className="flex items-center justify-center py-12">
                  <ArrowPathIcon className="w-8 h-8 animate-spin text-purple-500" />
                </div>
              )}

              {/* Empty State */}
              {!loading && choreData && choreData.chores.length === 0 && (
                <GlassCard variant="subtle" className="p-12 text-center">
                  <CheckCircleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    No Chores Yet
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Create your first chore to get started with family task management!
                  </p>
                </GlassCard>
              )}

              {/* Chores List */}
              {!loading && choreData && filteredChores.length > 0 && (
                <div className="space-y-6">
                  {/* Pending Chores */}
                  {pendingChores.length > 0 && (
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <span className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></span>
                        Pending Chores ({pendingChores.length})
                      </h2>
                      <AnimatePresence>
                        {pendingChores.map((chore) => (
                          <ChoreItem
                            key={chore.id}
                            chore={chore}
                            onToggleComplete={handleToggleComplete}
                            onUpdate={handleUpdateChore}
                            onDelete={handleDeleteChore}
                            isEditing={editingChoreId === chore.id}
                            onEditToggle={setEditingChoreId}
                            showAssignee={selectedAssignee === 'all'}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Completed Chores */}
                  {showCompleted && completedChores.length > 0 && (
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <span className="w-3 h-3 bg-green-400 rounded-full mr-2"></span>
                        Completed Chores ({completedChores.length})
                      </h2>
                      <AnimatePresence>
                        {completedChores.map((chore) => (
                          <ChoreItem
                            key={chore.id}
                            chore={chore}
                            onToggleComplete={handleToggleComplete}
                            onUpdate={handleUpdateChore}
                            onDelete={handleDeleteChore}
                            isEditing={editingChoreId === chore.id}
                            onEditToggle={setEditingChoreId}
                            showAssignee={selectedAssignee === 'all'}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              )}

              {/* No Results */}
              {!loading && choreData && choreData.chores.length > 0 && filteredChores.length === 0 && (
                <GlassCard variant="subtle" className="p-8 text-center">
                  <FunnelIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Chores Match Your Filters
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Try adjusting your category or assignee filters to see more chores.
                  </p>
                  <GlassButton
                    onClick={() => {
                      setSelectedCategory('all');
                      setSelectedAssignee('all');
                      setShowCompleted(true);
                    }}
                    variant="primary"
                    size="sm"
                  >
                    Clear Filters
                  </GlassButton>
                </GlassCard>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Family Member Management Modal */}
        <FamilyMemberModal
          isOpen={showFamilyModal}
          onClose={() => setShowFamilyModal(false)}
          members={assignments.map(a => ({
            id: a.user_id,
            name: a.user_name,
            role: 'user' as const, // Default role, could be enhanced
            email: undefined, // Could be added to assignments data
          }))}
          onAddMember={addFamilyMember}
          onUpdateMember={updateFamilyMember}
          onDeleteMember={deleteFamilyMember}
        />
      </div>
    </motion.div>
  );
};

export default Chores;
