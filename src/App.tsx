import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';

// Import background image
import crossMountainBg from './images/cross-mountain.jpg';

// Import components
import TurnstyleNav from './components/TurnstyleNav';
import TopBar from './components/TopBar';
import LoadingScreen from './components/LoadingScreen';

// Import pages
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Energy from './pages/Energy';
import Generator from './pages/Generator';
import Packages from './pages/Packages';
import Chores from './pages/Chores';
import Grocery from './pages/Grocery';
import Network from './pages/Network';
import Spotify from './pages/Spotify';
import Weather from './pages/Weather';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

// Import contexts
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';

// Define NavigationItem interface locally
interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  order: number;
  isActive: boolean;
}

// Navigation configuration
const navigationItems: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home', path: '/', order: 0, isActive: true },
  { id: 'calendar', label: 'Calendar', icon: 'calendar', path: '/calendar', order: 1, isActive: true },
  { id: 'energy', label: 'Energy', icon: 'bolt', path: '/energy', order: 2, isActive: true },
  { id: 'generator', label: 'Generator', icon: 'bolt', path: '/generator', order: 3, isActive: true }, // Fixed icon
  { id: 'packages', label: 'Packages', icon: 'package', path: '/packages', order: 4, isActive: true },
  { id: 'chores', label: 'Chores', icon: 'check-circle', path: '/chores', order: 5, isActive: true },
  { id: 'grocery', label: 'Grocery', icon: 'shopping-cart', path: '/grocery', order: 6, isActive: true },
  { id: 'network', label: 'Network', icon: 'wifi', path: '/network', order: 7, isActive: true },
  { id: 'spotify', label: 'Music', icon: 'music', path: '/spotify', order: 8, isActive: true },
  { id: 'weather', label: 'Weather', icon: 'cloud', path: '/weather', order: 9, isActive: true },
  { id: 'settings', label: 'Settings', icon: 'cog', path: '/settings', order: 10, isActive: true },
];

// Transform for TurnstyleNav (which expects 'name' instead of 'label')
const turnstyleNavItems = navigationItems
  .filter(item => item.isActive)
  .sort((a, b) => a.order - b.order)
  .map(item => ({
    id: item.id,
    name: item.label,
    icon: item.icon,
    path: item.path
  }));

// Main App Content Component
const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const { getGlassClasses } = useTheme();

  return (
    <Router>
      <div
        className="min-h-screen transition-colors duration-300 relative bg-mountain"
        style={{
          backgroundImage: `url(${crossMountainBg})`
        }}
      >
        {/* Background overlay for better readability */}
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40 transition-colors duration-300"></div>

        {/* Content wrapper */}
        <div className="relative z-10">
            {/* Top Bar */}
            <TopBar />

            {/* Main Content Area */}
            <main className="pb-24 pt-16">
              <AnimatePresence mode="wait">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/energy" element={<Energy />} />
                  <Route path="/generator" element={<Generator />} />
                  <Route path="/packages" element={<Packages />} />
                  <Route path="/chores" element={<Chores />} />
                  <Route path="/grocery" element={<Grocery />} />
                  <Route path="/network" element={<Network />} />
                  <Route path="/spotify" element={<Spotify />} />
                  <Route path="/weather" element={<Weather />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AnimatePresence>
            </main>

            {/* Rotary Navigation */}
            <TurnstyleNav
              items={turnstyleNavItems}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />

            {/* Toast Notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                className: 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-lg',
              }}
            />
        </div>
      </div>
    </Router>
  );
};

// Main App Component
function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
