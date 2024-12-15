import express from 'express';
import { getAllUsers, createUser, updateUser, deleteUser } from '../controllers/users';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Get all users
router.get('/', authenticate, getAllUsers);

// Create a new user
router.post('/', authenticate, createUser);

// Update a user
router.put('/:id', authenticate, updateUser);

// Delete a user
router.delete('/:id', authenticate, deleteUser);

export default router;
