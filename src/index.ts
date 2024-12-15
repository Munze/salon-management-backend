import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import appointmentRoutes from './routes/appointments';
import clientRoutes from './routes/clients';
import therapistRoutes from './routes/therapists';
import scheduleRoutes from './routes/schedule';
import servicesRoutes from './routes/services';
import dashboardRoutes from './routes/dashboard';
import analyticsRoutes from './routes/analytics';
import userRoutes from './routes/users';
import { startReminderScheduler } from './services/scheduler';
import { logger } from './utils/logger';
import { prisma } from './config/database';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware to log all requests
app.use((req, res, next) => {
  logger.info(`[DEBUG] ${req.method} ${req.path}`);
  logger.debug('Request headers:', req.headers);
  logger.debug('Request body:', req.body);
  next();
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running correctly' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/therapists', therapistRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);

// Error handling middleware
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Successfully connected to the database');

    // Start reminder scheduler
    startReminderScheduler();

    // Start server
    const server = app.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
      logger.info(`Server URL: http://localhost:${port}`);
      logger.info(`Client URL: ${process.env.CLIENT_URL || 'http://localhost:3001'}`);
      logger.info('Available routes:');
      app._router.stack
        .filter((r: any) => r.route)
        .forEach((r: any) => {
          logger.info(`${Object.keys(r.route.methods).join(', ').toUpperCase()} ${r.route.path}`);
        });
    });

    // Handle server shutdown gracefully
    process.on('SIGTERM', () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
