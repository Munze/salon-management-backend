import express from 'express';
import { getAllClients, getClient, createClient, updateClient, deleteClient } from '../controllers/client';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all client routes
router.use(authenticate);

// Client routes
router.get('/', getAllClients);
router.get('/:id', getClient);
router.post('/', createClient);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);

export default router;
