import React from 'react';
import { motion } from 'framer-motion';
import { GlassButton } from '../glass';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  total: number;
  completed: number;
  pending: number;
}

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  showCompleted: boolean;
  onToggleCompleted: () => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onCategoryChange,
  showCompleted,
  onToggleCompleted,
}) => {
  const allCategory = {
    id: 'all',
    name: 'All',
    icon: '📋',
    color: '#6b7280',
    total: categories.reduce((sum, cat) => sum + cat.total, 0),
    completed: categories.reduce((sum, cat) => sum + cat.completed, 0),
    pending: categories.reduce((sum, cat) => sum + cat.pending, 0),
  };

  const allCategories = [allCategory, ...categories];

  return (
    <div className="mb-6 space-y-4">
      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {allCategories.map((category) => (
          <motion.button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`
              relative px-4 py-3 rounded-lg border transition-all duration-200
              flex items-center space-x-2 min-w-0
              ${selectedCategory === category.id
                ? 'bg-white/20 border-white/40 text-white shadow-lg'
                : 'bg-white/5 border-white/20 text-gray-400 hover:bg-white/10 hover:border-white/30 hover:text-white'
              }
            `}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="text-lg flex-shrink-0">{category.icon}</span>
            <div className="flex flex-col items-start min-w-0">
              <span className="font-medium text-sm truncate">{category.name}</span>
              <div className="flex items-center space-x-1 text-xs">
                {category.pending > 0 && (
                  <span className="text-yellow-400">{category.pending}</span>
                )}
                {category.completed > 0 && (
                  <span className="text-green-400">✓{category.completed}</span>
                )}
              </div>
            </div>
            
            {/* Active indicator */}
            {selectedCategory === category.id && (
              <motion.div
                className="absolute inset-0 rounded-lg border-2 border-blue-400/50"
                layoutId="categoryIndicator"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* Filter Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <GlassButton
            onClick={onToggleCompleted}
            variant={showCompleted ? "default" : "subtle"}
            size="sm"
            className={showCompleted ? "text-green-400" : "text-gray-400"}
          >
            {showCompleted ? "Hide Completed" : "Show Completed"}
          </GlassButton>
        </div>

        {/* Summary Stats */}
        <div className="flex items-center space-x-4 text-sm text-gray-400">
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
            <span>{allCategory.pending} pending</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            <span>{allCategory.completed} completed</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryFilter;
