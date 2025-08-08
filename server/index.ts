import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import calendarRoutes from './routes/calendar.js';
import packageRoutes from './routes/packages.js';
import choreRoutes from './routes/chores.js';
import groceryRoutes from './routes/grocery.js';
import networkRoutes from './routes/network.js';
import generatorRoutes from './routes/generator.js';
import weatherRoutes from './routes/weather.js';
import energyRoutes from './routes/energy.js';
import settingsRoutes from './routes/settings.js';
import accountsRoutes from './routes/accounts.js';
import emporiaRoutes from './routes/emporia.js';

// Import services
import { DatabaseService } from './services/database.js';
import { generatorService } from './services/generator.js';
import { weatherMonitorService } from './services/weather-service.js';
// Trigger restart to reload .env changes
import { emailService } from './services/email.js';
import { EnergyService } from './services/energy.js';
import { webSocketService } from './services/websocket.js';
import { packageTrackingService } from './services/package-tracking.js';
import { calendarSyncService } from './services/calendar-sync.js';
import { microsoftCalendarService } from './services/microsoft-calendar.js';
import { googleCalendarService } from './services/google-calendar.js';
import { accountManagerService } from './services/account-manager.js';
import { energyMonitorService } from './services/energy-monitor.js';
import { weatherMonitorService } from './services/weather-service.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const server = createServer(app);

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ============================================================================
// API ROUTES
// ============================================================================

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/chores', choreRoutes);
app.use('/api/grocery', groceryRoutes);
app.use('/api/network', networkRoutes);
app.use('/api/generator', generatorRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/energy', energyRoutes);
app.use('/api/emporia', emporiaRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/accounts', accountsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ============================================================================
// STATIC FILE SERVING (PRODUCTION)
// ============================================================================

if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React app build directory
  app.use(express.static(path.join(__dirname, '../../dist')));

  // Catch all handler: send back React's index.html file for client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../dist/index.html'));
  });
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    path: req.path,
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer() {
  try {
    // Initialize database
    console.log('🔄 Initializing database...');
    await DatabaseService.initialize();
    console.log('✅ Database initialized');

    // Initialize services
    console.log('🔄 Starting background services...');

    // Initialize WebSocket service
    webSocketService.initialize(server);

    // Initialize and start generator monitoring if enabled
    if (process.env.GENERATOR_ENABLED === 'true') {
      try {
        await generatorService.initialize({
          brand: (process.env.GENERATOR_BRAND as any) || 'mebay',
          model: process.env.GENERATOR_MODEL || 'DC9xD',
          modbus: {
            type: (process.env.GENERATOR_MODBUS_TYPE as any) || 'tcp',
            host: process.env.GENERATOR_MODBUS_HOST || '192.168.1.100',
            port: parseInt(process.env.GENERATOR_MODBUS_PORT || '502'),
            unitId: parseInt(process.env.GENERATOR_MODBUS_UNIT_ID || '1'),
            timeout: parseInt(process.env.GENERATOR_MODBUS_TIMEOUT || '5000'),
            retryDelay: parseInt(process.env.GENERATOR_MODBUS_RETRY_DELAY || '5000'),
            maxRetries: parseInt(process.env.GENERATOR_MODBUS_MAX_RETRIES || '3'),
          },
          maintenanceInterval: parseInt(process.env.GENERATOR_MAINTENANCE_INTERVAL || '200'),
          fuelCapacity: parseInt(process.env.GENERATOR_FUEL_CAPACITY || '100'),
          ratedPower: parseInt(process.env.GENERATOR_RATED_POWER || '20'),
        });

        await generatorService.startMonitoring();
        console.log('✅ Generator monitoring started');
      } catch (error: any) {
        console.error('❌ Failed to start generator monitoring:', error.message);
      }
    } else {
      console.log('ℹ️  Generator monitoring disabled in configuration');
    }
    
    // Start weather updates
    weatherMonitorService.startMonitoring();
    console.log('✅ Weather service started');
    
    // Initialize and start email monitoring if enabled
    if (process.env.EMAIL_MONITORING_ENABLED === 'true') {
      try {
        await emailService.initialize({
          imap: {
            host: process.env.EMAIL_IMAP_HOST || 'imap.gmail.com',
            port: parseInt(process.env.EMAIL_IMAP_PORT || '993'),
            secure: process.env.EMAIL_IMAP_SECURE === 'true',
            auth: {
              user: process.env.EMAIL_USER || '',
              pass: process.env.EMAIL_PASSWORD || '',
            },
          },
          folders: {
            inbox: process.env.EMAIL_INBOX_FOLDER || 'INBOX',
            processed: process.env.EMAIL_PROCESSED_FOLDER || 'HomeOS/Processed',
          },
        });

        await emailService.startMonitoring();
        console.log('✅ Email monitoring started');
      } catch (error: any) {
        console.error('❌ Failed to start email monitoring:', error.message);
      }
    } else {
      console.log('ℹ️  Email monitoring disabled in configuration');
    }

    // Start package tracking updates
    packageTrackingService.startUpdates();
    console.log('✅ Package tracking started');

    // Initialize calendar services
    if (process.env.MICROSOFT_CALENDAR_ENABLED === 'true') {
      microsoftCalendarService.initialize({
        clientId: process.env.MICROSOFT_CLIENT_ID || '',
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
        tenantId: process.env.MICROSOFT_TENANT_ID || '',
        redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3001/api/calendar/auth/callback',
      });
      console.log('✅ Microsoft 365 Calendar service initialized');
    }

    if (process.env.GOOGLE_CALENDAR_ENABLED === 'true') {
      googleCalendarService.initialize({
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/calendar/auth/callback',
      });
      console.log('✅ Google Calendar service initialized');
    }

    // Start calendar synchronization
    calendarSyncService.startSync();
    console.log('✅ Calendar sync started');

    // Start energy monitoring
    EnergyService.startMonitoring();
    console.log('✅ Energy monitoring started');

    // Start the server
    server.listen(PORT, () => {
      console.log(`🚀 HomeOS Server running on port ${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 API available at: http://localhost:${PORT}/api`);
      console.log(`🔌 WebSocket available at: ws://localhost:${PORT}/ws`);

      if (process.env.NODE_ENV !== 'production') {
        console.log(`🎨 Frontend dev server should be running on: http://localhost:5173`);
      }
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 Received SIGTERM, shutting down gracefully...');
  
  // Stop services
  await generatorService.stopMonitoring();
  WeatherService.stopUpdates();
  await emailService.stopMonitoring();
  packageTrackingService.stopUpdates();
  calendarSyncService.stopSync();
  EnergyService.stopMonitoring();
  webSocketService.stop();
  
  // Close database connections
  await DatabaseService.close();
  
  console.log('✅ Server shut down complete');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 Received SIGINT, shutting down gracefully...');
  
  // Stop services
  await generatorService.stopMonitoring();
  WeatherService.stopUpdates();
  await emailService.stopMonitoring();
  packageTrackingService.stopUpdates();
  calendarSyncService.stopSync();
  EnergyService.stopMonitoring();
  webSocketService.stop();
  
  // Close database connections
  await DatabaseService.close();
  
  console.log('✅ Server shut down complete');
  process.exit(0);
});

// Start the server
startServer();
