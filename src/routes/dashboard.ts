import express from 'express';
import { getDashboardStats } from '../controllers/dashboard';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all dashboard routes
router.use(authenticate);

router.get('/stats', getDashboardStats);

export default router;
