import express from 'express';
import {
  getWorkingHours,
  updateWorkingHours,
  getScheduleExceptions,
  createScheduleException,
  updateScheduleException,
  deleteScheduleException,
  checkAvailability,
} from '../controllers/schedule';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Working Hours routes
router.get('/working-hours', authenticate, getWorkingHours);
router.put('/working-hours', authenticate, updateWorkingHours);

// Schedule Exceptions routes
router.get('/exceptions', authenticate, getScheduleExceptions);
router.post('/exceptions', authenticate, createScheduleException);
router.put('/exceptions/:id', authenticate, updateScheduleException);
router.delete('/exceptions/:id', authenticate, deleteScheduleException);

// Availability check
router.post('/check-availability', authenticate, checkAvailability);

export default router;
