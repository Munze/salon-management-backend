import express from 'express';
import { body } from 'express-validator';
import { getClients, getClient, createClient, updateClient, deleteClient, getClientHistory } from '../controllers/clients';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all clients
router.get('/', getClients);

// Get single client
router.get('/:id', getClient);

// Create new client
router.post('/', [
  body('name').notEmpty().withMessage('Name is required'),
  body('phone').notEmpty().withMessage('Phone is required')
], createClient);

// Update client
router.put('/:id', [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('phone').optional().notEmpty().withMessage('Phone cannot be empty')
], updateClient);

// Delete client
router.delete('/:id', deleteClient);

// Get client history
router.get('/:id/history', getClientHistory);

export default router;
