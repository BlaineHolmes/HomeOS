import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SunIcon,
  CloudIcon,
  CloudArrowDownIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  BeakerIcon,
  MapPinIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ClockIcon,
  CalendarDaysIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  SparklesIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
} from '@heroicons/react/24/outline';
import { useWebSocket } from '../hooks/useWebSocket';
import type { WebSocketMessage } from '../hooks/useWebSocket';
import RainEffect from '../components/RainEffect';
import WaterDroplets from '../components/WaterDroplets';
import LightningEffect from '../components/LightningEffect';
import ArcSky from '../components/ArcSky';
import { useRainSound } from '../hooks/useRainSound';
import { GlassButton } from '../components/glass';

interface WeatherData {
  location: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  current: {
    temperature: number;
    condition: string;
    description: string;
    feels_like: number;
    humidity: number;
    wind_speed: number;
    wind_direction: number;
    pressure: number;
    uv_index: number;
    visibility: number;
    dew_point: number;
    air_quality: number;
  };
  hourly: Array<{
    time: string;
    temperature: number;
    condition: string;
    precipitation: number;
    wind_speed: number;
  }>;
  forecast: Array<{
    date: string;
    high: number;
    low: number;
    condition: string;
    description: string;
    precipitation: number;
    humidity: number;
    wind_speed: number;
  }>;
  alerts?: Array<{
    id: string;
    title: string;
    description: string;
    severity: string;
    start: string;
    end: string;
  }>;
  astronomy: {
    sunrise: string;
    sunset: string;
    moon_phase: string;
  };
}

// Mock weather data generator
const generateMockWeatherData = (): WeatherData => {
  const now = new Date();
  const hours = [];

  // Generate 24 hours of hourly data
  for (let i = 0; i < 24; i++) {
    const hour = new Date(now.getTime() + i * 60 * 60 * 1000);
    hours.push({
      time: hour.toLocaleTimeString('en-US', { hour: 'numeric' }),
      temperature: 72 + Math.sin(i / 4) * 8 + Math.random() * 4 - 2,
      condition: i < 6 || i > 18 ? 'clear' : 'partly-cloudy',
      precipitation: Math.random() * 20,
      wind_speed: 5 + Math.random() * 10,
    });
  }

  return {
    location: "San Francisco, CA",
    coordinates: { lat: 37.7749, lon: -122.4194 },
    current: {
      temperature: 65,
      condition: "thunderstorm",
      description: "Thunderstorm",
      feels_like: 68,
      humidity: 90,
      wind_speed: 18,
      wind_direction: 225,
      pressure: 1005,
      uv_index: 1,
      visibility: 4,
      dew_point: 62,
      air_quality: 70,
    },
    hourly: hours,
    forecast: [
      { date: "Today", high: 75, low: 62, condition: "partly-cloudy", description: "Partly Cloudy", precipitation: 10, humidity: 65, wind_speed: 8 },
      { date: "Tomorrow", high: 78, low: 64, condition: "sunny", description: "Sunny", precipitation: 0, humidity: 55, wind_speed: 6 },
      { date: "Wednesday", high: 73, low: 59, condition: "cloudy", description: "Cloudy", precipitation: 20, humidity: 75, wind_speed: 12 },
      { date: "Thursday", high: 69, low: 56, condition: "thunderstorm", description: "Thunderstorm", precipitation: 90, humidity: 90, wind_speed: 20 },
      { date: "Friday", high: 71, low: 58, condition: "partly-cloudy", description: "Partly Cloudy", precipitation: 15, humidity: 70, wind_speed: 9 },
      { date: "Saturday", high: 74, low: 61, condition: "sunny", description: "Sunny", precipitation: 5, humidity: 60, wind_speed: 7 },
      { date: "Sunday", high: 76, low: 63, condition: "partly-cloudy", description: "Partly Cloudy", precipitation: 10, humidity: 65, wind_speed: 8 },
    ],
    alerts: [],
    astronomy: {
      sunrise: "6:42 AM",
      sunset: "7:28 PM",
      moon_phase: "Waxing Crescent",
    }
  };
};

// Weather icon component with enhanced styling
const getWeatherIcon = (condition: string, className: string = "w-8 h-8") => {
  const iconClass = `${className} drop-shadow-lg`;

  switch (condition.toLowerCase()) {
    case 'sunny':
    case 'clear':
      return (
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          <SunIcon className={`${iconClass} text-yellow-400`} />
        </motion.div>
      );
    case 'partly-cloudy':
    case 'partly cloudy':
      return <CloudIcon className={`${iconClass} text-blue-300`} />;
    case 'cloudy':
    case 'overcast':
      return <CloudIcon className={`${iconClass} text-gray-400`} />;
    case 'rainy':
    case 'rain':
    case 'light rain':
      return (
        <motion.div
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <CloudArrowDownIcon className={`${iconClass} text-blue-500`} />
        </motion.div>
      );
    case 'stormy':
    case 'thunderstorm':
      return (
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            filter: ['brightness(1)', 'brightness(1.3)', 'brightness(1)']
          }}
          transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
        >
          <CloudArrowDownIcon className={`${iconClass} text-purple-400`} />
        </motion.div>
      );
    case 'snowy':
    case 'snow':
      return <CloudIcon className={`${iconClass} text-blue-100`} />;
    default:
      return <CloudIcon className={`${iconClass} text-gray-400`} />;
  }
};



const Weather: React.FC = () => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentHourIndex, setCurrentHourIndex] = useState(0);
  const [selectedDay, setSelectedDay] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // WebSocket connection for real-time weather updates
  const { isConnected } = useWebSocket({
    onMessage: (message: WebSocketMessage) => {
      if (message.type === 'weather_update' && message.data) {
        setWeatherData(message.data);
        setLastUpdate(new Date());
        setError(null);
      }
    },
    onConnect: () => {
      console.log('🌤️ Connected to weather WebSocket');
    },
    onDisconnect: () => {
      console.log('🌤️ Disconnected from weather WebSocket');
    },
  });

  // Load weather data
  const loadWeatherData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/weather/current');

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setWeatherData(data.data);
        } else {
          // Fallback to mock data
          setWeatherData(generateMockWeatherData());
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to load weather data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load weather data');
      // Use mock data as fallback
      setWeatherData(generateMockWeatherData());
    } finally {
      setLoading(false);
      setLastUpdate(new Date());
    }
  };

  useEffect(() => {
    loadWeatherData();

    // Auto-refresh every 10 minutes
    const interval = setInterval(loadWeatherData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);



  // Check weather conditions
  const getWeatherInfo = () => {
    const condition = weatherData?.current?.condition?.toLowerCase() || '';
    const isRaining = ['rainy', 'rain', 'light rain', 'heavy rain', 'stormy', 'thunderstorm'].includes(condition);
    const isThunderstorm = ['stormy', 'thunderstorm', 'storm'].includes(condition);

    let intensity: 'light' | 'moderate' | 'heavy' = 'moderate';
    if (condition.includes('light')) {
      intensity = 'light';
    } else if (condition.includes('heavy') || condition.includes('storm')) {
      intensity = 'heavy';
    }

    return { isRaining, isThunderstorm, intensity };
  };

  const { isRaining, isThunderstorm, intensity } = getWeatherInfo();

  // Rain sound effects
  const rainSound = useRainSound({
    enabled: true,
    intensity,
    volume: 0.2,
    autoPlay: false
  });

  // Handle lightning strikes (trigger thunder)
  const handleLightningStrike = () => {
    rainSound.triggerThunder();
  };

  // Control rain sounds based on weather
  useEffect(() => {
    if (isRaining && !rainSound.isPlaying) {
      rainSound.setIntensity(intensity);
      rainSound.play();
    } else if (!isRaining && rainSound.isPlaying) {
      rainSound.stop();
    }
  }, [isRaining, intensity, rainSound]);

  // Scroll hourly forecast
  const scrollHourlyForecast = (direction: 'left' | 'right') => {
    if (!weatherData || !weatherData.hourly) return;

    if (direction === 'right' && currentHourIndex < weatherData.hourly.length - 6) {
      setCurrentHourIndex(currentHourIndex + 1);
    } else if (direction === 'left' && currentHourIndex > 0) {
      setCurrentHourIndex(currentHourIndex - 1);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Weather Effects */}
      <RainEffect
        isRaining={isRaining}
        intensity={intensity}
        className="z-10"
      />
      <WaterDroplets
        isActive={isRaining}
        intensity={intensity === 'light' ? 0.3 : intensity === 'moderate' ? 0.6 : 1.0}
        className="z-20"
      />
      <LightningEffect
        isActive={isThunderstorm}
        intensity={intensity}
        className="z-30"
        onLightningStrike={handleLightningStrike}
      />

      <div className="relative z-10 max-w-7xl mx-auto p-6">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30">
              <MapPinIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white drop-shadow-lg">Weather</h1>
              <p className="text-white/80 text-lg">{weatherData?.location || 'Loading...'}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Sound Toggle Button */}
            {isRaining && (
              <GlassButton
                variant="ghost"
                size="sm"
                onClick={() => rainSound.isPlaying ? rainSound.stop() : rainSound.play()}
                className="!rounded-2xl text-white"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {rainSound.isPlaying ? (
                  <SpeakerWaveIcon className="w-5 h-5" />
                ) : (
                  <SpeakerXMarkIcon className="w-5 h-5" />
                )}
                <span className="font-medium text-sm">
                  {rainSound.isPlaying ? 'Sound On' : 'Sound Off'}
                </span>
              </GlassButton>
            )}

            {/* Weather Demo Toggle (for testing effects) */}
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={() => {
                const conditions = ['clear', 'rain', 'thunderstorm', 'cloudy'];
                const currentCondition = weatherData?.current?.condition || 'clear';
                const currentIndex = conditions.indexOf(currentCondition);
                const nextCondition = conditions[(currentIndex + 1) % conditions.length];

                setWeatherData(prev => prev ? {
                  ...prev,
                  current: {
                    ...prev.current,
                    condition: nextCondition,
                    description: nextCondition.charAt(0).toUpperCase() + nextCondition.slice(1)
                  }
                } : null);
              }}
              className="!rounded-2xl text-white"
            >
              <SparklesIcon className="w-5 h-5" />
              <span className="font-medium text-sm">Demo</span>
            </GlassButton>

            {/* Refresh Button */}
            <GlassButton
              variant="ghost"
              size="md"
              onClick={loadWeatherData}
              disabled={loading}
              loading={loading}
              className="!rounded-2xl text-white"
            >
              <ArrowPathIcon className="w-5 h-5" />
              <span className="font-medium">Refresh</span>
            </GlassButton>
          </div>
        </motion.div>

        {/* Celestial Sky Arc */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <ArcSky
            latitude={weatherData?.coordinates?.lat || 37.7749}
            longitude={weatherData?.coordinates?.lon || -122.4194}
            weatherCondition={weatherData?.current?.condition || 'clear'}
            showLabels={true}
            className="rounded-3xl border border-white/20 backdrop-blur-sm"
          />
        </motion.div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              className="flex items-center justify-center min-h-[400px]"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5 }}
            >
              <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-12 text-center border border-white/10">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="mb-6"
                >
                  <ArrowPathIcon className="w-20 h-20 text-white mx-auto" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-2">Loading Weather</h2>
                <p className="text-white/70">Getting the latest forecast...</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              {/* Main Weather Display Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Today's Weather Details */}
                <motion.div
                  className="xl:col-span-2 bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10 shadow-2xl"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <CalendarDaysIcon className="w-6 h-6 text-white/80" />
                      <h2 className="text-2xl font-bold text-white">Today's Weather</h2>
                    </div>
                    <div className="flex items-center space-x-2 text-white/60">
                      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                      <span className="text-sm">{isConnected ? 'Live' : 'Offline'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Temperature and Icon */}
                    <div className="flex items-center space-x-6">
                      <motion.div
                        className="relative"
                        whileHover={{ scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {getWeatherIcon(weatherData?.current?.condition || 'clear', 'w-24 h-24')}
                        <motion.div
                          className="absolute -inset-3 bg-white/10 rounded-full blur-xl"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 4, repeat: Infinity }}
                        />
                      </motion.div>

                      <div>
                        <motion.div
                          className="text-6xl font-bold text-white mb-1 drop-shadow-lg"
                          initial={{ scale: 0.5 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                        >
                          {Math.round(weatherData?.current?.temperature || 0)}°
                        </motion.div>
                        <div className="text-xl text-white/90 capitalize font-medium mb-1">
                          {weatherData?.current?.description || 'Unknown'}
                        </div>
                        <div className="text-white/70">
                          Feels like {Math.round(weatherData?.current?.feels_like || 0)}°
                        </div>
                      </div>
                    </div>

                    {/* Today's High/Low */}
                    <div className="flex flex-col justify-center space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <ArrowUpIcon className="w-5 h-5 text-red-400" />
                          <span className="text-white/80">High</span>
                        </div>
                        <span className="text-2xl font-bold text-white">
                          {Math.round(weatherData?.forecast[0]?.high || 0)}°
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <ArrowDownIcon className="w-5 h-5 text-blue-400" />
                          <span className="text-white/80">Low</span>
                        </div>
                        <span className="text-2xl font-bold text-white">
                          {Math.round(weatherData?.forecast[0]?.low || 0)}°
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CloudArrowDownIcon className="w-5 h-5 text-blue-400" />
                          <span className="text-white/80">Rain</span>
                        </div>
                        <span className="text-2xl font-bold text-blue-300">
                          {Math.round(weatherData?.forecast[0]?.precipitation || 0)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Last Update Info */}
                  <div className="mt-6 pt-4 border-t border-white/20">
                    <div className="flex items-center justify-between text-sm text-white/60">
                      <div className="flex items-center space-x-2">
                        <ClockIcon className="w-4 h-4" />
                        <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
                      </div>
                      {error && (
                        <div className="flex items-center space-x-2 text-red-300">
                          <ExclamationTriangleIcon className="w-4 h-4" />
                          <span>Using cached data</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Air Conditions Card */}
                <motion.div
                  className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 shadow-2xl"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                >
                  <div className="flex items-center space-x-3 mb-6">
                    <SparklesIcon className="w-6 h-6 text-white/80" />
                    <h3 className="text-xl font-bold text-white">Air Conditions</h3>
                  </div>

                  <div className="space-y-4">
                    <motion.div
                      className="bg-white/5 rounded-2xl p-4 backdrop-blur-sm border border-white/10"
                      whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.1)" }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <BeakerIcon className="w-5 h-5 text-blue-300" />
                          <span className="text-white/80">Humidity</span>
                        </div>
                        <span className="text-xl font-bold text-white">{weatherData?.current?.humidity || '--'}%</span>
                      </div>
                    </motion.div>

                    <motion.div
                      className="bg-white/5 rounded-2xl p-4 backdrop-blur-sm border border-white/10"
                      whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.1)" }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 text-green-300 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                              <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/>
                              <path d="M9.6 4.6A2 2 0 1 1 11 8H2"/>
                              <path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
                            </svg>
                          </div>
                          <span className="text-white/80">Wind</span>
                        </div>
                        <span className="text-xl font-bold text-white">{weatherData?.current?.wind_speed || '--'} mph</span>
                      </div>
                    </motion.div>

                    <motion.div
                      className="bg-white/5 rounded-2xl p-4 backdrop-blur-sm border border-white/10"
                      whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.1)" }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <EyeIcon className="w-5 h-5 text-purple-300" />
                          <span className="text-white/80">Visibility</span>
                        </div>
                        <span className="text-xl font-bold text-white">{weatherData?.current?.visibility || '--'} mi</span>
                      </div>
                    </motion.div>

                    <motion.div
                      className="bg-white/5 rounded-2xl p-4 backdrop-blur-sm border border-white/10"
                      whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.1)" }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <SunIcon className="w-5 h-5 text-yellow-300" />
                          <span className="text-white/80">UV Index</span>
                        </div>
                        <span className="text-xl font-bold text-white">{weatherData?.current?.uv_index || '--'}</span>
                      </div>
                    </motion.div>

                    <motion.div
                      className="bg-white/5 rounded-2xl p-4 backdrop-blur-sm border border-white/10"
                      whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.1)" }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <ArrowUpIcon className="w-5 h-5 text-orange-300" />
                          <span className="text-white/80">Pressure</span>
                        </div>
                        <span className="text-xl font-bold text-white">{weatherData?.current?.pressure || '--'} mb</span>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              </div>

              {/* Hourly Forecast */}
              <motion.div
                className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 shadow-2xl"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">24-Hour Forecast</h3>
                  <div className="flex items-center space-x-2">
                    <motion.button
                      onClick={() => scrollHourlyForecast('left')}
                      disabled={currentHourIndex === 0}
                      className="p-2 rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <ChevronLeftIcon className="w-5 h-5 text-white" />
                    </motion.button>
                    <motion.button
                      onClick={() => scrollHourlyForecast('right')}
                      disabled={!weatherData || !weatherData.hourly || currentHourIndex >= weatherData.hourly.length - 6}
                      className="p-2 rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <ChevronRightIcon className="w-5 h-5 text-white" />
                    </motion.button>
                  </div>
                </div>

                <div className="overflow-hidden">
                  <motion.div
                    className="flex space-x-4"
                    animate={{ x: -currentHourIndex * 120 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  >
                    {weatherData?.hourly?.map((hour, index) => (
                      <motion.div
                        key={index}
                        className="min-w-[110px] bg-white/5 rounded-2xl p-4 text-center backdrop-blur-sm border border-white/10"
                        whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 + index * 0.05 }}
                      >
                        <div className="text-white/80 text-sm mb-2">{hour.time}</div>
                        <div className="flex justify-center mb-2">
                          {getWeatherIcon(hour.condition, 'w-8 h-8')}
                        </div>
                        <div className="text-white font-bold text-lg mb-1">
                          {Math.round(hour.temperature)}°
                        </div>
                        <div className="text-blue-300 text-xs">
                          {Math.round(hour.precipitation)}%
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              </motion.div>

              {/* 7-Day Forecast */}
              <motion.div
                className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 shadow-2xl"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.8 }}
              >
                <h3 className="text-xl font-bold text-white mb-6">7-Day Forecast</h3>
                <div className="space-y-3">
                  {weatherData?.forecast?.map((day, index) => (
                    <motion.div
                      key={index}
                      className={`bg-white/5 rounded-2xl p-4 backdrop-blur-sm border border-white/10 cursor-pointer transition-all ${
                        selectedDay === index ? 'bg-white/10 border-white/20' : 'hover:bg-white/8'
                      }`}
                      onClick={() => setSelectedDay(index)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.9 + index * 0.1 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-white font-medium min-w-[80px]">
                            {index === 0 ? 'Today' : day.date}
                          </div>
                          <div className="flex items-center space-x-3">
                            {getWeatherIcon(day.condition, 'w-8 h-8')}
                            <div className="text-white/80 capitalize text-sm">
                              {day.description}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-6">
                          <div className="flex items-center space-x-2 text-blue-300">
                            <CloudArrowDownIcon className="w-4 h-4" />
                            <span className="text-sm">{Math.round(day.precipitation)}%</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-white/60 text-sm">{Math.round(day.low)}°</span>
                            <div className="w-16 h-1 bg-white/20 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-400 to-red-400 rounded-full"
                                style={{ width: `${((day.high - day.low) / 40) * 100}%` }}
                              />
                            </div>
                            <span className="text-white font-bold">{Math.round(day.high)}°</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Weather Alerts */}
              {weatherData?.alerts && weatherData.alerts.length > 0 && (
                <motion.div
                  className="bg-red-500/20 backdrop-blur-md rounded-3xl p-6 border border-red-400 shadow-2xl"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0, duration: 0.8 }}
                >
                  <div className="flex items-center space-x-3 mb-6">
                    <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
                    <h3 className="text-xl font-bold text-white">Weather Alerts</h3>
                  </div>
                  <div className="space-y-4">
                    {weatherData.alerts.map((alert, index) => (
                      <motion.div
                        key={alert.id}
                        className="bg-red-500/30 rounded-2xl p-4 border border-red-400/50"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.1 + index * 0.1 }}
                      >
                        <h4 className="font-bold text-white mb-2">{alert.title}</h4>
                        <p className="text-white/90 text-sm mb-3">{alert.description}</p>
                        <div className="flex items-center justify-between text-xs text-red-200">
                          <span>Severity: {alert.severity}</span>
                          <span>{alert.start} - {alert.end}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Astronomy Info */}
              <motion.div
                className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 shadow-2xl"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.8 }}
              >
                <h3 className="text-xl font-bold text-white mb-6">Sun & Moon</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <motion.div
                    className="bg-white/5 rounded-2xl p-4 text-center backdrop-blur-sm border border-white/10"
                    whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
                  >
                    <SunIcon className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                    <div className="text-white/80 text-sm mb-1">Sunrise</div>
                    <div className="text-white font-bold">{weatherData?.astronomy?.sunrise || '--'}</div>
                  </motion.div>

                  <motion.div
                    className="bg-white/5 rounded-2xl p-4 text-center backdrop-blur-sm border border-white/10"
                    whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
                  >
                    <SunIcon className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                    <div className="text-white/80 text-sm mb-1">Sunset</div>
                    <div className="text-white font-bold">{weatherData?.astronomy?.sunset || '--'}</div>
                  </motion.div>

                  <motion.div
                    className="bg-white/5 rounded-2xl p-4 text-center backdrop-blur-sm border border-white/10"
                    whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
                  >
                    <div className="w-8 h-8 bg-gray-300 rounded-full mx-auto mb-2" />
                    <div className="text-white/80 text-sm mb-1">Moon Phase</div>
                    <div className="text-white font-bold text-sm">{weatherData?.astronomy?.moon_phase || '--'}</div>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Weather;
