import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  CalendarIcon, 
  BoltIcon, 
  ArchiveBoxIcon,
  CheckCircleIcon,
  ShoppingCartIcon,
  MusicalNoteIcon,
  CloudIcon,
  CogIcon
} from '@heroicons/react/24/outline';
// Define NavigationItem interface locally
interface NavigationItem {
  id: string;
  name: string;
  icon: string; // Icon key for iconMap
  path: string;
}

interface TurnstyleNavProps {
  items: NavigationItem[];
  currentPage: number;
  onPageChange: (page: number) => void;
}

// Icon mapping
const iconMap = {
  home: HomeIcon,
  calendar: CalendarIcon,
  bolt: BoltIcon,
  package: ArchiveBoxIcon,
  'check-circle': CheckCircleIcon,
  'shopping-cart': ShoppingCartIcon,
  music: MusicalNoteIcon,
  cloud: CloudIcon,
  cog: CogIcon,
};

const TurnstyleNav: React.FC<TurnstyleNavProps> = ({ items, currentPage, onPageChange }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [, setIsDragging] = useState(false);
  const [rotation, setRotation] = useState(0);

  // Calculate rotation based on current page
  const itemAngle = 360 / items.length;
  const targetRotation = -currentPage * itemAngle;

  useEffect(() => {
    setRotation(targetRotation);
  }, [targetRotation]);

  // Update current page based on route
  useEffect(() => {
    const currentIndex = items.findIndex(item => item.path === location.pathname);
    if (currentIndex !== -1 && currentIndex !== currentPage) {
      onPageChange(currentIndex);
    }
  }, [location.pathname, items, currentPage, onPageChange]);

  const handleItemClick = (index: number, path: string) => {
    if (index !== currentPage) {
      onPageChange(index);
      navigate(path);
    }
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    
    const dragDistance = info.offset.x;
    const threshold = 50;
    
    if (Math.abs(dragDistance) > threshold) {
      const direction = dragDistance > 0 ? -1 : 1;
      const newPage = (currentPage + direction + items.length) % items.length;
      onPageChange(newPage);
      navigate(items[newPage].path);
    }
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    const newPage = direction === 'left' 
      ? (currentPage + 1) % items.length
      : (currentPage - 1 + items.length) % items.length;
    
    onPageChange(newPage);
    navigate(items[newPage].path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      {/* Background blur */}
      <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700" />
      
      {/* Navigation container */}
      <div className="relative h-24 flex items-center justify-center">
        {/* Rotary dial container */}
        <motion.div
          className="relative w-80 h-80 -mb-40"
          animate={{ rotate: rotation }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 30,
            duration: 0.3
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={handleDragEnd}
          whileDrag={{ scale: 1.05 }}
        >
          {/* Navigation items */}
          {items.map((item, index) => {
            const angle = (index * itemAngle) - 90; // Start from top
            const radian = (angle * Math.PI) / 180;
            const radius = 120;
            const x = Math.cos(radian) * radius;
            const y = Math.sin(radian) * radius;
            
            const isActive = index === currentPage;
            const IconComponent = iconMap[item.icon as keyof typeof iconMap] || HomeIcon;

            return (
              <motion.button
                key={item.id}
                className={`absolute w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-glow scale-125 z-10'
                    : 'bg-white/90 dark:bg-gray-800/90 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-lg'
                }`}
                style={{
                  left: `calc(50% + ${x}px - 2rem)`,
                  top: `calc(50% + ${y}px - 2rem)`,
                }}
                onClick={() => handleItemClick(index, item.path)}
                whileHover={{ scale: isActive ? 1.25 : 1.1 }}
                whileTap={{ scale: isActive ? 1.15 : 1.05 }}
                animate={{
                  rotate: -rotation, // Counter-rotate to keep icons upright
                  scale: isActive ? 1.25 : 1,
                }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 30 
                }}
              >
                <IconComponent className="w-6 h-6" />
                
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 }}
                  />
                )}
              </motion.button>
            );
          })}

          {/* Center hub */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full shadow-inner" />
        </motion.div>

        {/* Page indicator */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
          {items.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentPage
                  ? 'bg-primary-600 scale-125'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Swipe indicators */}
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500">
          <motion.div
            className="w-8 h-8 flex items-center justify-center"
            whileHover={{ scale: 1.1, x: -2 }}
            onClick={() => handleSwipe('right')}
          >
            ←
          </motion.div>
        </div>
        
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500">
          <motion.div
            className="w-8 h-8 flex items-center justify-center"
            whileHover={{ scale: 1.1, x: 2 }}
            onClick={() => handleSwipe('left')}
          >
            →
          </motion.div>
        </div>

        {/* Current page label */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            className="absolute top-2 left-1/2 transform -translate-x-1/2 text-sm font-medium text-gray-700 dark:text-gray-300"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {items[currentPage]?.label}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TurnstyleNav;
