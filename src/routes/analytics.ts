import express from 'express';
import { getAnalytics } from '../controllers/analytics';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticate, getAnalytics);

export default router;
