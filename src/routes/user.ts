import express from 'express';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/user';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { logger } from '../utils/logger';

const router = express.Router();

logger.info('Registering user management routes');

// All routes require authentication
router.use(authenticate);

// All routes require ADMIN role
router.use(authorize(['ADMIN']));

// Get all users
router.get('/', getUsers);

// Create a new user
router.post('/', createUser);

// Update a user
router.put('/:id', updateUser);

// Delete a user
router.delete('/:id', deleteUser);

export default router;
