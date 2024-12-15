import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth';
import {
  getAllTherapists,
  createTherapist,
  updateTherapist,
  deleteTherapist,
  getTherapistById
} from '../controllers/therapists';

const router = express.Router();

// Public routes
router.get('/', getAllTherapists);
router.get('/:id', getTherapistById);

// Protected routes
router.post(
  '/',
  authenticate,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').optional().trim(),
    body('specialties').optional().isArray(),
    body('bio').optional().trim(),
  ],
  createTherapist
);

router.put(
  '/:id',
  authenticate,
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('phone').optional().trim(),
    body('specialties').optional().isArray(),
    body('bio').optional().trim(),
  ],
  updateTherapist
);

router.delete('/:id', authenticate, deleteTherapist);

export default router;
