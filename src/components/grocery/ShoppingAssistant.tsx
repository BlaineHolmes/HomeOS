import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SparklesIcon,
  LightBulbIcon,
  ClockIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { GlassCard, GlassButton } from '../glass';

interface ShoppingAssistantProps {
  groceryData: {
    items: Array<{
      id: string;
      name: string;
      category: string;
      is_completed: boolean;
      created_at: Date;
    }>;
    categories: Array<{
      id: string;
      name: string;
      total: number;
      completed: number;
    }>;
  };
  onAddSuggestion: (item: {
    name: string;
    quantity: number;
    unit: string;
    category: string;
  }) => void;
}

interface SmartSuggestion {
  type: 'recurring' | 'seasonal' | 'complementary' | 'reminder';
  title: string;
  description: string;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    category: string;
    confidence: number;
  }>;
  priority: number;
}

const ShoppingAssistant: React.FC<ShoppingAssistantProps> = ({
  groceryData,
  onAddSuggestion,
}) => {
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  // Generate smart suggestions based on patterns
  useEffect(() => {
    const generateSuggestions = () => {
      const newSuggestions: SmartSuggestion[] = [];
      const now = new Date();
      const dayOfWeek = now.getDay();
      const month = now.getMonth();

      // Recurring items suggestion (items added frequently)
      const itemFrequency = groceryData.items.reduce((acc, item) => {
        const key = item.name.toLowerCase();
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const frequentItems = Object.entries(itemFrequency)
        .filter(([_, count]) => count >= 3)
        .map(([name, count]) => {
          const lastItem = groceryData.items
            .filter(item => item.name.toLowerCase() === name)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
          
          return {
            name: name.charAt(0).toUpperCase() + name.slice(1),
            quantity: 1,
            unit: 'item',
            category: lastItem?.category || 'other',
            confidence: Math.min(count / 10, 1),
          };
        })
        .slice(0, 3);

      if (frequentItems.length > 0) {
        newSuggestions.push({
          type: 'recurring',
          title: 'Frequently Bought Items',
          description: 'Items you buy regularly that might be running low',
          items: frequentItems,
          priority: 8,
        });
      }

      // Seasonal suggestions
      const seasonalItems = getSeasonalSuggestions(month);
      if (seasonalItems.length > 0) {
        newSuggestions.push({
          type: 'seasonal',
          title: 'Seasonal Suggestions',
          description: 'Items that are in season or commonly needed this time of year',
          items: seasonalItems,
          priority: 6,
        });
      }

      // Complementary items (items that go together)
      const complementaryItems = getComplementaryItems(groceryData.items);
      if (complementaryItems.length > 0) {
        newSuggestions.push({
          type: 'complementary',
          title: 'You Might Also Need',
          description: 'Items that often go with what you already have',
          items: complementaryItems,
          priority: 7,
        });
      }

      // Weekend/weekday specific suggestions
      if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend
        newSuggestions.push({
          type: 'reminder',
          title: 'Weekend Essentials',
          description: 'Items commonly needed for weekend activities',
          items: [
            { name: 'Snacks', quantity: 1, unit: 'bag', category: 'pantry', confidence: 0.7 },
            { name: 'Ice cream', quantity: 1, unit: 'container', category: 'frozen', confidence: 0.6 },
            { name: 'Beverages', quantity: 1, unit: 'pack', category: 'other', confidence: 0.8 },
          ],
          priority: 5,
        });
      }

      // Sort by priority and filter dismissed
      const filteredSuggestions = newSuggestions
        .filter(suggestion => !dismissedSuggestions.has(suggestion.title))
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 3);

      setSuggestions(filteredSuggestions);
    };

    generateSuggestions();
  }, [groceryData, dismissedSuggestions]);

  const getSeasonalSuggestions = (month: number) => {
    const seasonalMap: Record<number, Array<{
      name: string;
      quantity: number;
      unit: string;
      category: string;
      confidence: number;
    }>> = {
      0: [ // January
        { name: 'Soup ingredients', quantity: 1, unit: 'set', category: 'pantry', confidence: 0.8 },
        { name: 'Hot chocolate', quantity: 1, unit: 'box', category: 'pantry', confidence: 0.7 },
      ],
      2: [ // March
        { name: 'Fresh herbs', quantity: 1, unit: 'bunch', category: 'produce', confidence: 0.7 },
        { name: 'Spring vegetables', quantity: 1, unit: 'bag', category: 'produce', confidence: 0.8 },
      ],
      5: [ // June
        { name: 'BBQ sauce', quantity: 1, unit: 'bottle', category: 'pantry', confidence: 0.8 },
        { name: 'Grilling meat', quantity: 1, unit: 'pack', category: 'meat', confidence: 0.9 },
      ],
      11: [ // December
        { name: 'Holiday spices', quantity: 1, unit: 'set', category: 'pantry', confidence: 0.8 },
        { name: 'Baking supplies', quantity: 1, unit: 'set', category: 'pantry', confidence: 0.9 },
      ],
    };

    return seasonalMap[month] || [];
  };

  const getComplementaryItems = (items: any[]) => {
    const complementaryMap: Record<string, Array<{
      name: string;
      quantity: number;
      unit: string;
      category: string;
      confidence: number;
    }>> = {
      'pasta': [
        { name: 'Pasta sauce', quantity: 1, unit: 'jar', category: 'pantry', confidence: 0.9 },
        { name: 'Parmesan cheese', quantity: 1, unit: 'container', category: 'dairy', confidence: 0.8 },
      ],
      'bread': [
        { name: 'Butter', quantity: 1, unit: 'stick', category: 'dairy', confidence: 0.8 },
        { name: 'Jam', quantity: 1, unit: 'jar', category: 'pantry', confidence: 0.7 },
      ],
      'cereal': [
        { name: 'Milk', quantity: 1, unit: 'gallon', category: 'dairy', confidence: 0.9 },
        { name: 'Bananas', quantity: 1, unit: 'bunch', category: 'produce', confidence: 0.7 },
      ],
    };

    const suggestions: any[] = [];
    items.forEach(item => {
      const key = item.name.toLowerCase();
      if (complementaryMap[key]) {
        suggestions.push(...complementaryMap[key]);
      }
    });

    return suggestions.slice(0, 3);
  };

  const dismissSuggestion = (title: string) => {
    setDismissedSuggestions(prev => new Set([...prev, title]));
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'recurring': return ClockIcon;
      case 'seasonal': return SparklesIcon;
      case 'complementary': return LightBulbIcon;
      case 'reminder': return UserGroupIcon;
      default: return SparklesIcon;
    }
  };

  if (suggestions.length === 0) return null;

  return (
    <motion.div
      className="mb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <SparklesIcon className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Smart Suggestions</h3>
          </div>
          <GlassButton
            onClick={() => setIsExpanded(!isExpanded)}
            variant="subtle"
            size="sm"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </GlassButton>
        </div>

        <AnimatePresence>
          {(isExpanded || suggestions.length === 1) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              {suggestions.map((suggestion, index) => {
                const Icon = getSuggestionIcon(suggestion.type);
                
                return (
                  <motion.div
                    key={suggestion.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white/5 rounded-lg p-4 border border-white/10"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Icon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <div>
                          <h4 className="font-medium text-white">{suggestion.title}</h4>
                          <p className="text-sm text-gray-400">{suggestion.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => dismissSuggestion(suggestion.title)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {suggestion.items.map((item, itemIndex) => (
                        <button
                          key={itemIndex}
                          onClick={() => onAddSuggestion(item)}
                          className="text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10 hover:border-white/20"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-white font-medium">{item.name}</span>
                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-gray-400">
                                {Math.round(item.confidence * 100)}%
                              </span>
                              <div 
                                className="w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor: item.confidence > 0.8 ? '#10b981' : 
                                                 item.confidence > 0.6 ? '#f59e0b' : '#6b7280'
                                }}
                              />
                            </div>
                          </div>
                          <div className="text-sm text-gray-400">
                            {item.quantity} {item.unit}
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {!isExpanded && suggestions.length > 1 && (
          <div className="text-center">
            <GlassButton
              onClick={() => setIsExpanded(true)}
              variant="subtle"
              size="sm"
              className="text-blue-400"
            >
              View {suggestions.length - 1} more suggestions
            </GlassButton>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
};

export default ShoppingAssistant;
