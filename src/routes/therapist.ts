import express from 'express';
import { getAllTherapists, createTherapist, updateTherapist, deleteTherapist } from '../controllers/therapists';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/therapists', getAllTherapists);

// Protected routes
router.post('/therapists', authenticate, createTherapist);
router.put('/therapists/:id', authenticate, updateTherapist);
router.delete('/therapists/:id', authenticate, deleteTherapist);

export default router;
