import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon,
  XMarkIcon,
  CalendarIcon,
  UserIcon,
  StarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { GlassCard, GlassButton, GlassInput } from '../glass';
import { cn } from '../../utils/cn';

// ============================================================================
// ADD CHORE COMPONENT - CREATE NEW CHORES WITH SMART FEATURES
// ============================================================================

interface AddChoreProps {
  onAdd: (chore: {
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
  }) => Promise<boolean>;
  isLoading?: boolean;
  users?: Array<{ id: string; name: string; }>;
}

const AddChore: React.FC<AddChoreProps> = ({
  onAdd,
  isLoading = false,
  users = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    assigned_to: '',
    due_date: '',
    points: 10,
    category: 'other',
    has_recurrence: false,
    recurrence_frequency: 'weekly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    recurrence_interval: 1,
    recurrence_end_date: '',
  });

  // Categories with icons and colors
  const categories = [
    { id: 'cleaning', name: 'Cleaning', icon: '🧹', color: 'blue' },
    { id: 'kitchen', name: 'Kitchen', icon: '🍽️', color: 'green' },
    { id: 'laundry', name: 'Laundry', icon: '👕', color: 'purple' },
    { id: 'outdoor', name: 'Outdoor', icon: '🌱', color: 'yellow' },
    { id: 'pets', name: 'Pets', icon: '🐕', color: 'pink' },
    { id: 'other', name: 'Other', icon: '📋', color: 'gray' },
  ];

  // Mock users if none provided
  const availableUsers = users.length > 0 ? users : [
    { id: 'user1', name: 'Dad' },
    { id: 'user2', name: 'Mom' },
    { id: 'user3', name: 'Asher' },
    { id: 'user4', name: 'Abram' },
  ];

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.title.trim() || !form.assigned_to) {
      return;
    }

    setIsSubmitting(true);

    const choreData = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      assigned_to: form.assigned_to,
      due_date: form.due_date ? new Date(form.due_date) : undefined,
      points: form.points,
      category: form.category,
      recurrence: form.has_recurrence ? {
        frequency: form.recurrence_frequency,
        interval: form.recurrence_interval,
        end_date: form.recurrence_end_date ? new Date(form.recurrence_end_date) : undefined,
      } : undefined,
    };

    const success = await onAdd(choreData);
    
    if (success) {
      // Reset form
      setForm({
        title: '',
        description: '',
        assigned_to: '',
        due_date: '',
        points: 10,
        category: 'other',
        has_recurrence: false,
        recurrence_frequency: 'weekly',
        recurrence_interval: 1,
        recurrence_end_date: '',
      });
      setIsExpanded(false);
    }
    
    setIsSubmitting(false);
  };

  // Handle form reset
  const handleCancel = () => {
    setForm({
      title: '',
      description: '',
      assigned_to: '',
      due_date: '',
      points: 10,
      category: 'other',
      has_recurrence: false,
      recurrence_frequency: 'weekly',
      recurrence_interval: 1,
      recurrence_end_date: '',
    });
    setIsExpanded(false);
  };

  return (
    <motion.div
      layout
      className="mb-6"
    >
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          // Collapsed State - Add Button
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <GlassButton
              onClick={() => setIsExpanded(true)}
              className="w-full justify-center py-4 text-lg font-medium"
              variant="primary"
            >
              <PlusIcon className="w-6 h-6 mr-2" />
              Add New Chore
            </GlassButton>
          </motion.div>
        ) : (
          // Expanded State - Form
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <GlassCard variant="elevated" className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Create New Chore
                </h3>
                <GlassButton
                  onClick={handleCancel}
                  variant="ghost"
                  size="sm"
                  disabled={isSubmitting}
                >
                  <XMarkIcon className="w-5 h-5" />
                </GlassButton>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <GlassInput
                  label="Chore Title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Take out trash, Clean bathroom..."
                  required
                />

                {/* Description */}
                <GlassInput
                  label="Description (Optional)"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Additional details or instructions..."
                />

                {/* Category Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Category
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setForm({ ...form, category: category.id })}
                        className={cn(
                          'p-3 rounded-lg border-2 transition-all duration-200',
                          'flex flex-col items-center space-y-1 text-sm font-medium',
                          form.category === category.id
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        )}
                      >
                        <span className="text-lg">{category.icon}</span>
                        <span>{category.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Assignee and Points Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Assignee */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Assign To
                    </label>
                    <select
                      value={form.assigned_to}
                      onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                      className={cn(
                        'w-full px-4 py-2.5 rounded-lg border backdrop-blur-md',
                        'bg-white/70 dark:bg-white/5 border-white/30 dark:border-white/15',
                        'focus:bg-white/80 dark:focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary-500/50',
                        'text-gray-900 dark:text-white',
                        // Fix dropdown options styling
                        '[&>option]:bg-white [&>option]:text-gray-900',
                        'dark:[&>option]:bg-gray-800 dark:[&>option]:text-white'
                      )}
                      required
                    >
                      <option value="" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">
                        Select person...
                      </option>
                      {availableUsers.map((user) => (
                        <option
                          key={user.id}
                          value={user.id}
                          className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white"
                        >
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Points */}
                  <GlassInput
                    label="Points"
                    type="number"
                    value={form.points}
                    onChange={(e) => setForm({ ...form, points: parseInt(e.target.value) || 0 })}
                    min="1"
                    max="100"
                    icon={<StarIcon className="w-5 h-5" />}
                  />
                </div>

                {/* Due Date */}
                <GlassInput
                  label="Due Date (Optional)"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  icon={<CalendarIcon className="w-5 h-5" />}
                />

                {/* Recurrence */}
                <div>
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    <input
                      type="checkbox"
                      checked={form.has_recurrence}
                      onChange={(e) => setForm({ ...form, has_recurrence: e.target.checked })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <ClockIcon className="w-4 h-4" />
                    <span>Recurring Chore</span>
                  </label>

                  {form.has_recurrence && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Frequency
                        </label>
                        <select
                          value={form.recurrence_frequency}
                          onChange={(e) => setForm({ ...form, recurrence_frequency: e.target.value as any })}
                          className={cn(
                            'w-full px-3 py-2 rounded-lg border backdrop-blur-md text-sm',
                            'bg-white/70 dark:bg-white/5 border-white/30 dark:border-white/15',
                            'focus:bg-white/80 dark:focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary-500/50',
                            'text-gray-900 dark:text-white',
                            // Fix dropdown options styling
                            '[&>option]:bg-white [&>option]:text-gray-900',
                            'dark:[&>option]:bg-gray-800 dark:[&>option]:text-white'
                          )}
                        >
                          <option value="daily" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">Daily</option>
                          <option value="weekly" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">Weekly</option>
                          <option value="monthly" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">Monthly</option>
                          <option value="yearly" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">Yearly</option>
                        </select>
                      </div>

                      <GlassInput
                        label="Every"
                        type="number"
                        value={form.recurrence_interval}
                        onChange={(e) => setForm({ ...form, recurrence_interval: parseInt(e.target.value) || 1 })}
                        min="1"
                        size="sm"
                      />

                      <GlassInput
                        label="End Date"
                        type="date"
                        value={form.recurrence_end_date}
                        onChange={(e) => setForm({ ...form, recurrence_end_date: e.target.value })}
                        size="sm"
                      />
                    </div>
                  )}
                </div>

                {/* Submit Buttons */}
                <div className="flex space-x-3 pt-4">
                  <GlassButton
                    type="submit"
                    variant="primary"
                    disabled={!form.title.trim() || !form.assigned_to || isSubmitting}
                    loading={isSubmitting}
                    className="flex-1"
                  >
                    Create Chore
                  </GlassButton>
                  
                  <GlassButton
                    type="button"
                    onClick={handleCancel}
                    variant="ghost"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </GlassButton>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AddChore;
