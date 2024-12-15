import { Router } from 'express';
import authRoutes from './auth';
import appointmentRoutes from './appointments';
import therapistRoutes from './therapists';
import serviceRoutes from './services';
import clientRoutes from './clients';
import dashboardRoutes from './dashboard';
import scheduleSettingsRoutes from './scheduleSettings';
import userRoutes from './user';
import { logger } from '../utils/logger';

const router = Router();

// Log all route registrations
logger.info('Registering API routes...');

router.use('/auth', authRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/therapists', therapistRoutes);
router.use('/services', serviceRoutes);
router.use('/clients', clientRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/schedule', scheduleSettingsRoutes);
router.use('/users', userRoutes);

// Log registered routes for debugging
logger.info('API routes registered:');
router.stack.forEach((r: any) => {
  if (r.route && r.route.path) {
    logger.info(`  ${Object.keys(r.route.methods)[0].toUpperCase()} ${r.route.path}`);
  } else if (r.name === 'router') {
    logger.info(`Router middleware mounted at: ${r.regexp}`);
  }
});

export default router;
