// ============================================================================
// SHARED TYPES FOR HOMEOS
// ============================================================================

// User Management
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'child';
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  timezone: string;
  notifications: NotificationSettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  sound: boolean;
  deliveries: boolean;
  generator: boolean;
  weather: boolean;
}

// Calendar Events
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  allDay: boolean;
  location?: string;
  color: string;
  category: EventCategory;
  reminders: Reminder[];
  recurrence?: RecurrenceRule;
  userId: string;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type EventCategory = 'personal' | 'work' | 'school' | 'family' | 'health' | 'other';

export interface Reminder {
  id: string;
  minutes: number; // Minutes before event
  type: 'notification' | 'email' | 'sound';
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: Date;
  count?: number;
}

// Package Tracking
export interface Package {
  id: string;
  vendor: string;
  courier: string;
  trackingNumber: string;
  description: string;
  status: PackageStatus;
  estimatedDelivery?: Date;
  deliveredAt?: Date;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PackageStatus = 'ordered' | 'shipped' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception';

// Generator Monitoring
export interface GeneratorStatus {
  id: string;
  name: string;
  isRunning: boolean;
  isLoaded: boolean;
  isCooldown: boolean;
  isReady: boolean;
  mainsAvailable: boolean;
  metrics: GeneratorMetrics;
  lastUpdated: Date;
}

export interface GeneratorMetrics {
  outputVoltage: number;
  frequency: number;
  oilTemperature: number;
  coolantTemperature: number;
  rpm: number;
  oilPressure: number;
  mainsVoltage: number;
  runtime: number; // Hours
  fuelLevel?: number; // Percentage
}

// Chores and Tasks
export interface Chore {
  id: string;
  title: string;
  description?: string;
  assignedTo: string; // User ID
  dueDate?: Date;
  isCompleted: boolean;
  completedAt?: Date;
  points: number;
  category: ChoreCategory;
  recurrence?: RecurrenceRule;
  createdAt: Date;
  updatedAt: Date;
}

export type ChoreCategory = 'cleaning' | 'kitchen' | 'laundry' | 'outdoor' | 'pets' | 'other';

// Grocery List
export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: GroceryCategory;
  isCompleted: boolean;
  addedBy: string; // User ID
  completedBy?: string; // User ID
  createdAt: Date;
  updatedAt: Date;
}

export type GroceryCategory = 'produce' | 'dairy' | 'meat' | 'pantry' | 'frozen' | 'household' | 'other';

// Weather Data
export interface WeatherData {
  current: CurrentWeather;
  forecast: WeatherForecast[];
  alerts: WeatherAlert[];
  lastUpdated: Date;
}

export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  visibility: number;
  uvIndex: number;
  condition: string;
  icon: string;
}

export interface WeatherForecast {
  date: Date;
  high: number;
  low: number;
  condition: string;
  icon: string;
  precipitationChance: number;
  windSpeed: number;
}

export interface WeatherAlert {
  id: string;
  title: string;
  description: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  startTime: Date;
  endTime: Date;
}

// Energy Monitoring
export interface EnergyData {
  timestamp: Date;
  totalUsage: number; // kWh
  currentPower: number; // Watts
  voltage: number;
  circuits: CircuitData[];
}

export interface CircuitData {
  id: string;
  name: string;
  power: number; // Watts
  voltage: number;
  current: number; // Amps
}

// System Settings
export interface SystemSettings {
  id: string;
  timezone: string;
  location: {
    latitude: number;
    longitude: number;
    city: string;
    state: string;
    country: string;
  };
  weather: {
    apiKey: string;
    updateInterval: number; // Minutes
  };
  generator: {
    modbusConfig: ModbusConfig;
    pollInterval: number; // Seconds
  };
  email: {
    accounts: EmailAccount[];
  };
  spotify: {
    clientId: string;
    clientSecret: string;
  };
  updatedAt: Date;
}

export interface ModbusConfig {
  host: string;
  port: number;
  unitId: number;
  timeout: number;
}

export interface EmailAccount {
  id: string;
  email: string;
  provider: 'gmail' | 'outlook' | 'imap';
  imapConfig?: {
    host: string;
    port: number;
    secure: boolean;
  };
  isActive: boolean;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Navigation
export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  order: number;
  isActive: boolean;
}

// Dashboard Widgets
export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config: Record<string, any>;
  isVisible: boolean;
}

export type WidgetType = 
  | 'clock'
  | 'weather'
  | 'calendar'
  | 'packages'
  | 'chores'
  | 'grocery'
  | 'generator'
  | 'energy'
  | 'devotional'
  | 'spotify';
