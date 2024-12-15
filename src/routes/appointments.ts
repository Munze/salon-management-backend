import express from 'express';
import { body } from 'express-validator';
import {
  getAllAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  checkAvailability,
  getUpcomingAppointments,
} from '../controllers/appointments';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all appointment routes
router.use(authenticate);

// Get all appointments
router.get('/', getAllAppointments);

// Get upcoming appointments
router.get('/upcoming', getUpcomingAppointments);

// Create appointment
router.post(
  '/',
  [
    body('startTime').isISO8601().toDate(),
    body('endTime').isISO8601().toDate(),
    body('clientId').isString(),
    body('therapistId').isString(),
    body('serviceId').isString(),
    body('notes').optional().isString(),
  ],
  createAppointment
);

// Update appointment
router.put(
  '/:id',
  [
    body('startTime').optional().isISO8601().toDate(),
    body('endTime').optional().isISO8601().toDate(),
    body('status').optional().isString(),
    body('notes').optional().isString(),
    body('clientId').optional().isString(),
    body('therapistId').optional().isString(),
    body('serviceId').optional().isString(),
  ],
  updateAppointment
);

// Delete appointment
router.delete('/:id', deleteAppointment);

// Check availability
router.get('/check-availability', checkAvailability);

export default router;
