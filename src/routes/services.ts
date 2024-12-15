import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth';
import {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} from '../controllers/services';

const router = express.Router();

// Service validation middleware
const serviceValidation = [
  body('name').trim().notEmpty().withMessage('Service name is required'),
  body('duration').isInt({ min: 1 }).withMessage('Duration must be a positive number'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('description').optional().trim(),
  body('isActive').optional().isBoolean(),
];

// Public routes
router.get('/', getAllServices);
router.get('/:id', getServiceById);

// Protected routes
router.post('/', authenticate, serviceValidation, createService);
router.put('/:id', authenticate, serviceValidation, updateService);
router.delete('/:id', authenticate, deleteService);

export default router;
