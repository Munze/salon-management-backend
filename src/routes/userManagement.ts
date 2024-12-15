import express from 'express';
import { body } from 'express-validator';
import { createUser, getAllUsers, updateUser, deleteUser } from '../controllers/userManagement';
import { checkRole } from '../middleware/checkRole';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(checkRole(['ADMIN']));

// Create new user
router.post(
  '/',
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('name').trim().not().isEmpty().withMessage('Name is required'),
    body('role').isIn(['ADMIN', 'THERAPIST']).withMessage('Invalid role'),
  ],
  createUser
);

// Get all users
router.get('/', getAllUsers);

// Update user
router.put(
  '/:id',
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('name').trim().not().isEmpty().withMessage('Name is required'),
    body('role').isIn(['ADMIN', 'THERAPIST']).withMessage('Invalid role'),
  ],
  updateUser
);

// Delete user
router.delete('/:id', deleteUser);

export default router;
