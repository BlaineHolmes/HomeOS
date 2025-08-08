import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon,
  MicrophoneIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { GlassButton, GlassInput, GlassCard } from '../glass';

interface AddGroceryItemProps {
  onAdd: (item: {
    name: string;
    quantity: number;
    unit: string;
    category: string;
  }) => void;
  suggestions?: {
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
  };
  onGetSuggestions?: (query: string) => void;
  isLoading?: boolean;
}

const categories = [
  { id: 'produce', name: 'Produce', icon: '🥬' },
  { id: 'dairy', name: 'Dairy', icon: '🥛' },
  { id: 'meat', name: 'Meat', icon: '🥩' },
  { id: 'pantry', name: 'Pantry', icon: '🥫' },
  { id: 'frozen', name: 'Frozen', icon: '🧊' },
  { id: 'household', name: 'Household', icon: '🧽' },
  { id: 'other', name: 'Other', icon: '📦' },
];

const AddGroceryItem: React.FC<AddGroceryItemProps> = ({
  onAdd,
  suggestions,
  onGetSuggestions,
  isLoading = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [form, setForm] = useState({
    name: '',
    quantity: 1,
    unit: 'item',
    category: 'other',
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  useEffect(() => {
    if (form.name.length > 1) {
      onGetSuggestions?.(form.name);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [form.name, onGetSuggestions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    onAdd(form);
    setForm({
      name: '',
      quantity: 1,
      unit: 'item',
      category: 'other',
    });
    setIsExpanded(false);
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion: any) => {
    setForm({
      name: suggestion.name,
      quantity: Math.round(suggestion.avg_quantity || suggestion.quantity || 1),
      unit: suggestion.unit || 'item',
      category: suggestion.category || 'other',
    });
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const startVoiceInput = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setForm(prev => ({ ...prev, name: transcript }));
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    }
  };

  if (!isExpanded) {
    return (
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <GlassButton
          onClick={() => setIsExpanded(true)}
          className="w-full justify-center py-4 text-lg font-medium"
          variant="primary"
        >
          <PlusIcon className="w-6 h-6 mr-2" />
          Add Grocery Item
        </GlassButton>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="mb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <GlassCard className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <PlusIcon className="w-5 h-5 mr-2" />
              Add New Item
            </h3>
            <button
              type="button"
              onClick={() => {
                setIsExpanded(false);
                setForm({ name: '', quantity: 1, unit: 'item', category: 'other' });
                setShowSuggestions(false);
              }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Item Name Input */}
          <div className="relative">
            <div className="flex items-center space-x-2">
              <GlassInput
                ref={inputRef}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="What do you need?"
                className="flex-1"
                required
              />
              <GlassButton
                type="button"
                onClick={startVoiceInput}
                variant="ghost"
                size="sm"
                className={`${isListening ? 'text-red-400 animate-pulse' : 'text-gray-400'}`}

              >
                <MicrophoneIcon className="w-5 h-5" />
              </GlassButton>
            </div>

            {/* Suggestions Dropdown */}
            <AnimatePresence>
              {showSuggestions && suggestions && (suggestions.frequent.length > 0 || suggestions.recent.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 z-50 mt-2"
                >
                  <GlassCard className="p-4 max-h-64 overflow-y-auto">
                    {suggestions.frequent.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center text-sm text-gray-400 mb-2">
                          <SparklesIcon className="w-4 h-4 mr-1" />
                          Frequently Added
                        </div>
                        <div className="space-y-1">
                          {suggestions.frequent.slice(0, 3).map((item, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleSuggestionClick(item)}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-white"
                            >
                              <div className="flex items-center justify-between">
                                <span>{item.name}</span>
                                <span className="text-sm text-gray-400">
                                  {Math.round(item.avg_quantity)} {item.unit}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {suggestions.recent.length > 0 && (
                      <div>
                        <div className="text-sm text-gray-400 mb-2">Recent</div>
                        <div className="space-y-1">
                          {suggestions.recent.slice(0, 3).map((item, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleSuggestionClick(item)}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-white"
                            >
                              <div className="flex items-center justify-between">
                                <span>{item.name}</span>
                                <span className="text-sm text-gray-400">
                                  {item.quantity} {item.unit}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quantity and Unit */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-400">Qty:</label>
              <GlassInput
                type="number"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
                className="w-20"
                min="1"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-400">Unit:</label>
              <GlassInput
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="unit"
                className="w-24"
              />
            </div>
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Category:</label>
            <div className="grid grid-cols-4 gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setForm({ ...form, category: category.id })}
                  className={`
                    p-3 rounded-lg border transition-all duration-200 text-center
                    ${form.category === category.id
                      ? 'bg-blue-500/20 border-blue-400 text-blue-300'
                      : 'bg-white/5 border-white/20 text-gray-400 hover:bg-white/10 hover:border-white/30'
                    }
                  `}
                >
                  <div className="text-lg mb-1">{category.icon}</div>
                  <div className="text-xs">{category.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4">
            <GlassButton
              type="button"
              variant="ghost"
              onClick={() => {
                setIsExpanded(false);
                setForm({ name: '', quantity: 1, unit: 'item', category: 'other' });
                setShowSuggestions(false);
              }}
            >
              Cancel
            </GlassButton>
            <GlassButton
              type="submit"
              variant="primary"
              disabled={!form.name.trim() || isLoading}
              className="bg-green-500/20 border-green-400 text-green-300 hover:bg-green-500/30"
            >
              {isLoading ? 'Adding...' : 'Add Item'}
            </GlassButton>
          </div>
        </form>
      </GlassCard>
    </motion.div>
  );
};

export default AddGroceryItem;
