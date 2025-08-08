import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircleIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';
import { GlassButton, GlassInput } from '../glass';

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

interface GroceryItemProps {
  item: GroceryItem;
  onToggleComplete: (id: string, completed: boolean) => void;
  onUpdate: (id: string, updates: Partial<GroceryItem>) => void;
  onDelete: (id: string) => void;
  isEditing?: boolean;
  onEditToggle?: (id: string | null) => void;
  bulkSelectMode?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}

const categoryIcons: Record<string, string> = {
  produce: '🥬',
  dairy: '🥛',
  meat: '🥩',
  pantry: '🥫',
  frozen: '🧊',
  household: '🧽',
  other: '📦',
};

const GroceryItemComponent: React.FC<GroceryItemProps> = ({
  item,
  onToggleComplete,
  onUpdate,
  onDelete,
  isEditing = false,
  onEditToggle,
  bulkSelectMode = false,
  isSelected = false,
  onSelect,
}) => {
  const [editForm, setEditForm] = useState({
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    category: item.category,
  });

  const handleSave = () => {
    onUpdate(item.id, editForm);
    onEditToggle?.(null);
  };

  const handleCancel = () => {
    setEditForm({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
    });
    onEditToggle?.(null);
  };

  const categoryIcon = categoryIcons[item.category] || categoryIcons.other;

  if (isEditing) {
    return (
      <motion.div
        layout
        className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4 mb-3"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{categoryIcon}</span>
            <GlassInput
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="Item name"
              className="flex-1"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <GlassInput
              type="number"
              value={editForm.quantity}
              onChange={(e) => setEditForm({ ...editForm, quantity: parseInt(e.target.value) || 1 })}
              className="w-20"
              min="1"
            />
            <GlassInput
              value={editForm.unit}
              onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
              placeholder="unit"
              className="w-24"
            />
            <select
              value={editForm.category}
              onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50 [&>option]:bg-white [&>option]:text-gray-900 dark:[&>option]:bg-gray-800 dark:[&>option]:text-white"
            >
              <option value="produce" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">🥬 Produce</option>
              <option value="dairy" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">🥛 Dairy</option>
              <option value="meat" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">🥩 Meat</option>
              <option value="pantry" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">🥫 Pantry</option>
              <option value="frozen" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">🧊 Frozen</option>
              <option value="household" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">🧽 Household</option>
              <option value="other" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-white">📦 Other</option>
            </select>
          </div>
          
          <div className="flex justify-end space-x-2">
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="text-gray-400 hover:text-white"
            >
              <XMarkIcon className="w-4 h-4" />
              Cancel
            </GlassButton>
            <GlassButton
              variant="primary"
              size="sm"
              onClick={handleSave}
              className="text-green-400 hover:text-green-300"
            >
              <CheckCircleIcon className="w-4 h-4" />
              Save
            </GlassButton>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      className={`
        bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4 mb-3
        transition-all duration-200 hover:bg-white/15 hover:border-white/30
        ${item.is_completed ? 'opacity-60' : ''}
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          {/* Bulk Selection Checkbox */}
          {bulkSelectMode && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSelect?.(item.id, e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
          )}

          {/* Completion Toggle */}
          <button
            onClick={() => onToggleComplete(item.id, !item.is_completed)}
            className="flex-shrink-0 transition-colors duration-200"
          >
            {item.is_completed ? (
              <CheckCircleIconSolid className="w-6 h-6 text-green-500" />
            ) : (
              <CheckCircleIcon className="w-6 h-6 text-gray-400 hover:text-green-400" />
            )}
          </button>

          {/* Category Icon */}
          <span className="text-2xl flex-shrink-0">{categoryIcon}</span>

          {/* Item Details */}
          <div className="flex-1 min-w-0">
            <div className={`
              font-medium text-white transition-all duration-200
              ${item.is_completed ? 'line-through text-gray-400' : ''}
            `}>
              {item.name}
            </div>
            <div className="text-sm text-gray-400">
              {item.quantity} {item.unit}
              {item.added_by_name && (
                <span className="ml-2">• Added by {item.added_by_name}</span>
              )}
              {item.is_completed && item.completed_by_name && (
                <span className="ml-2">• Completed by {item.completed_by_name}</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={() => onEditToggle?.(item.id)}
            className="p-2 text-gray-400 hover:text-blue-400 transition-colors duration-200"
            title="Edit item"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="p-2 text-gray-400 hover:text-red-400 transition-colors duration-200"
            title="Delete item"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default GroceryItemComponent;
