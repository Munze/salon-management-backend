import express from 'express';
import { getScheduleSettings, updateScheduleSettings } from '../controllers/scheduleSettings';
import { getWorkingHours, updateWorkingHours } from '../controllers/schedule';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware
router.use(authenticate);

// Schedule settings routes
router.get('/settings', getScheduleSettings);
router.put('/settings', updateScheduleSettings);

// Working hours routes
router.get('/working-hours', getWorkingHours);
router.put('/working-hours', updateWorkingHours);

export default router;
