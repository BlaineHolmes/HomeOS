import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  CalendarIcon,
  StarIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';
import { GlassCard, GlassButton, GlassInput } from '../glass';
import { cn } from '../../utils/cn';

// ============================================================================
// CHORE ITEM COMPONENT - INDIVIDUAL CHORE DISPLAY AND INTERACTION
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

interface ChoreItemProps {
  chore: ChoreItem;
  onToggleComplete: (id: string, completed: boolean) => Promise<boolean>;
  onUpdate: (id: string, updates: Partial<ChoreItem>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  isEditing: boolean;
  onEditToggle: (id: string | null) => void;
  showAssignee?: boolean;
}

const ChoreItemComponent: React.FC<ChoreItemProps> = ({
  chore,
  onToggleComplete,
  onUpdate,
  onDelete,
  isEditing,
  onEditToggle,
  showAssignee = true,
}) => {
  const [editForm, setEditForm] = useState({
    title: chore.title,
    description: chore.description || '',
    points: chore.points,
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Category colors and icons
  const getCategoryInfo = (category: string) => {
    const categories = {
      cleaning: { color: 'blue', icon: '🧹', name: 'Cleaning' },
      kitchen: { color: 'green', icon: '🍽️', name: 'Kitchen' },
      laundry: { color: 'purple', icon: '👕', name: 'Laundry' },
      outdoor: { color: 'yellow', icon: '🌱', name: 'Outdoor' },
      pets: { color: 'pink', icon: '🐕', name: 'Pets' },
      other: { color: 'gray', icon: '📋', name: 'Other' },
    };
    return categories[category as keyof typeof categories] || categories.other;
  };

  const categoryInfo = getCategoryInfo(chore.category);

  // Due date status
  const getDueDateStatus = () => {
    if (!chore.due_date) return null;
    
    const now = new Date();
    const dueDate = new Date(chore.due_date);
    const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 0) return { status: 'overdue', color: 'red' };
    if (diffHours < 24) return { status: 'due-soon', color: 'yellow' };
    return { status: 'upcoming', color: 'green' };
  };

  const dueDateStatus = getDueDateStatus();

  // Handle completion toggle
  const handleToggleComplete = async () => {
    const success = await onToggleComplete(chore.id, !chore.is_completed);
    if (success && !chore.is_completed) {
      // Show celebration animation for completion
      // Could add confetti or other celebration effects here
    }
  };

  // Handle edit save
  const handleSaveEdit = async () => {
    setIsUpdating(true);
    const success = await onUpdate(chore.id, {
      title: editForm.title,
      description: editForm.description,
      points: editForm.points,
    });
    
    if (success) {
      onEditToggle(null);
    }
    setIsUpdating(false);
  };

  // Handle edit cancel
  const handleCancelEdit = () => {
    setEditForm({
      title: chore.title,
      description: chore.description || '',
      points: chore.points,
    });
    onEditToggle(null);
  };

  // Handle delete
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this chore?')) {
      await onDelete(chore.id);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <GlassCard
        variant="default"
        className={cn(
          'p-4 mb-3 transition-all duration-300',
          chore.is_completed && 'opacity-75',
          dueDateStatus?.status === 'overdue' && !chore.is_completed && 'ring-2 ring-red-500/50'
        )}
        hover={!isEditing}
      >
        {isEditing ? (
          // Edit Mode
          <div className="space-y-4">
            <GlassInput
              label="Title"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              placeholder="Enter chore title"
            />
            
            <GlassInput
              label="Description"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="Enter description (optional)"
            />
            
            <GlassInput
              label="Points"
              type="number"
              value={editForm.points}
              onChange={(e) => setEditForm({ ...editForm, points: parseInt(e.target.value) || 0 })}
              placeholder="Points value"
            />
            
            <div className="flex space-x-2">
              <GlassButton
                onClick={handleSaveEdit}
                variant="primary"
                size="sm"
                disabled={isUpdating || !editForm.title.trim()}
                loading={isUpdating}
              >
                Save
              </GlassButton>
              <GlassButton
                onClick={handleCancelEdit}
                variant="ghost"
                size="sm"
                disabled={isUpdating}
              >
                Cancel
              </GlassButton>
            </div>
          </div>
        ) : (
          // Display Mode
          <div className="flex items-start space-x-4">
            {/* Completion Toggle */}
            <button
              onClick={handleToggleComplete}
              className={cn(
                'flex-shrink-0 w-6 h-6 rounded-full border-2 transition-all duration-200',
                'hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary-500/50',
                chore.is_completed
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
              )}
            >
              {chore.is_completed ? (
                <CheckCircleIconSolid className="w-full h-full" />
              ) : (
                <div className="w-full h-full" />
              )}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className={cn(
                    'font-medium text-gray-900 dark:text-white',
                    chore.is_completed && 'line-through text-gray-500'
                  )}>
                    {chore.title}
                  </h3>
                  
                  {chore.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {chore.description}
                    </p>
                  )}
                </div>

                {/* Points Badge */}
                <div className="flex items-center space-x-1 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded-full">
                  <StarIcon className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                    {chore.points}
                  </span>
                </div>
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                {/* Category */}
                <div className="flex items-center space-x-1">
                  <span>{categoryInfo.icon}</span>
                  <span>{categoryInfo.name}</span>
                </div>

                {/* Assignee */}
                {showAssignee && chore.assigned_to_name && (
                  <div className="flex items-center space-x-1">
                    <UserIcon className="w-4 h-4" />
                    <span>{chore.assigned_to_name}</span>
                  </div>
                )}

                {/* Due Date */}
                {chore.due_date && (
                  <div className={cn(
                    'flex items-center space-x-1',
                    dueDateStatus?.status === 'overdue' && 'text-red-500',
                    dueDateStatus?.status === 'due-soon' && 'text-yellow-500'
                  )}>
                    <CalendarIcon className="w-4 h-4" />
                    <span>
                      Due {new Date(chore.due_date).toLocaleDateString()}
                    </span>
                    {dueDateStatus?.status === 'overdue' && (
                      <ExclamationTriangleIcon className="w-4 h-4" />
                    )}
                  </div>
                )}

                {/* Recurrence */}
                {chore.recurrence && (
                  <div className="flex items-center space-x-1">
                    <ClockIcon className="w-4 h-4" />
                    <span>
                      {chore.recurrence.frequency}
                      {chore.recurrence.interval > 1 && ` (every ${chore.recurrence.interval})`}
                    </span>
                  </div>
                )}
              </div>

              {/* Completion Info */}
              {chore.is_completed && chore.completed_at && (
                <div className="mt-2 text-sm text-green-600 dark:text-green-400">
                  ✅ Completed {new Date(chore.completed_at).toLocaleDateString()}
                  {chore.completed_by_name && ` by ${chore.completed_by_name}`}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex space-x-1">
              <GlassButton
                onClick={() => onEditToggle(chore.id)}
                variant="ghost"
                size="sm"
                title="Edit chore"
              >
                <PencilIcon className="w-4 h-4" />
              </GlassButton>
              
              <GlassButton
                onClick={handleDelete}
                variant="ghost"
                size="sm"
                title="Delete chore"
                className="text-red-500 hover:text-red-600"
              >
                <TrashIcon className="w-4 h-4" />
              </GlassButton>
            </div>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
};

export default ChoreItemComponent;
