import React from 'react';
import { motion } from 'framer-motion';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { GlassButton } from '../glass';
import { cn } from '../../utils/cn';

// ============================================================================
// CATEGORY FILTER COMPONENT - FILTER CHORES BY CATEGORY AND STATUS
// ============================================================================

interface ChoreCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  total: number;
  completed: number;
  pending: number;
}

interface CategoryFilterProps {
  categories: ChoreCategory[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  showCompleted: boolean;
  onToggleCompleted: () => void;
  selectedAssignee?: string;
  onAssigneeChange?: (assignee: string) => void;
  assignees?: Array<{ id: string; name: string; total: number; completed: number; }>;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onCategoryChange,
  showCompleted,
  onToggleCompleted,
  selectedAssignee = 'all',
  onAssigneeChange,
  assignees = [],
}) => {
  // Category colors mapping
  const getCategoryColorClasses = (color: string, isSelected: boolean) => {
    const colors = {
      blue: isSelected 
        ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
        : 'border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700',
      green: isSelected
        ? 'bg-green-100 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-300'
        : 'border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700',
      purple: isSelected
        ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-500 text-purple-700 dark:text-purple-300'
        : 'border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700',
      yellow: isSelected
        ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500 text-yellow-700 dark:text-yellow-300'
        : 'border-yellow-200 dark:border-yellow-800 hover:border-yellow-300 dark:hover:border-yellow-700',
      pink: isSelected
        ? 'bg-pink-100 dark:bg-pink-900/30 border-pink-500 text-pink-700 dark:text-pink-300'
        : 'border-pink-200 dark:border-pink-800 hover:border-pink-300 dark:hover:border-pink-700',
      gray: isSelected
        ? 'bg-gray-100 dark:bg-gray-900/30 border-gray-500 text-gray-700 dark:text-gray-300'
        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700',
    };
    return colors[color as keyof typeof colors] || colors.gray;
  };

  // Add "All" category to the beginning
  const allCategories = [
    {
      id: 'all',
      name: 'All',
      icon: '📋',
      color: 'gray',
      total: categories.reduce((sum, cat) => sum + cat.total, 0),
      completed: categories.reduce((sum, cat) => sum + cat.completed, 0),
      pending: categories.reduce((sum, cat) => sum + cat.pending, 0),
    },
    ...categories,
  ];

  return (
    <div className="space-y-4">
      {/* Category Filters */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Filter by Category
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {allCategories.map((category) => {
            const isSelected = selectedCategory === category.id;
            const completionRate = category.total > 0 
              ? Math.round((category.completed / category.total) * 100) 
              : 0;

            return (
              <motion.button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={cn(
                  'p-3 rounded-lg border-2 transition-all duration-200',
                  'flex flex-col items-center space-y-1 text-sm font-medium',
                  'backdrop-blur-md',
                  getCategoryColorClasses(category.color, isSelected),
                  !isSelected && 'bg-white/50 dark:bg-white/5 hover:bg-white/70 dark:hover:bg-white/10'
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-lg">{category.icon}</span>
                <span className="text-xs">{category.name}</span>
                
                {/* Stats */}
                <div className="text-xs opacity-75">
                  <div>{category.pending} pending</div>
                  {category.total > 0 && (
                    <div className="text-green-600 dark:text-green-400">
                      {completionRate}% done
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Assignee Filter */}
      {assignees.length > 0 && onAssigneeChange && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Filter by Assignee
          </h3>
          <div className="flex flex-wrap gap-2">
            <GlassButton
              onClick={() => onAssigneeChange('all')}
              variant={selectedAssignee === 'all' ? 'primary' : 'ghost'}
              size="sm"
            >
              All ({assignees.reduce((sum, a) => sum + a.total, 0)})
            </GlassButton>
            
            {assignees.map((assignee) => {
              const completionRate = assignee.total > 0 
                ? Math.round((assignee.completed / assignee.total) * 100) 
                : 0;

              return (
                <GlassButton
                  key={assignee.id}
                  onClick={() => onAssigneeChange(assignee.id)}
                  variant={selectedAssignee === assignee.id ? 'primary' : 'ghost'}
                  size="sm"
                  className="flex flex-col items-center py-2"
                >
                  <span>{assignee.name}</span>
                  <span className="text-xs opacity-75">
                    {assignee.total} chores ({completionRate}%)
                  </span>
                </GlassButton>
              );
            })}
          </div>
        </div>
      )}

      {/* View Options */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          View Options
        </h3>
        
        <GlassButton
          onClick={onToggleCompleted}
          variant="ghost"
          size="sm"
          className="flex items-center space-x-2"
        >
          {showCompleted ? (
            <>
              <EyeSlashIcon className="w-4 h-4" />
              <span>Hide Completed</span>
            </>
          ) : (
            <>
              <EyeIcon className="w-4 h-4" />
              <span>Show Completed</span>
            </>
          )}
        </GlassButton>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/50 dark:bg-white/5 backdrop-blur-md rounded-lg p-3 border border-white/30 dark:border-white/15">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {allCategories[0].total}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Chores
          </div>
        </div>

        <div className="bg-white/50 dark:bg-white/5 backdrop-blur-md rounded-lg p-3 border border-white/30 dark:border-white/15">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {allCategories[0].pending}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Pending
          </div>
        </div>

        <div className="bg-white/50 dark:bg-white/5 backdrop-blur-md rounded-lg p-3 border border-white/30 dark:border-white/15">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {allCategories[0].completed}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Completed
          </div>
        </div>

        <div className="bg-white/50 dark:bg-white/5 backdrop-blur-md rounded-lg p-3 border border-white/30 dark:border-white/15">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {allCategories[0].total > 0 
              ? Math.round((allCategories[0].completed / allCategories[0].total) * 100)
              : 0}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Complete
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryFilter;
