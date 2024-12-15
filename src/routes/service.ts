import { Router } from 'express';
import { getAllServices, createService, updateService, deleteService } from '../controllers/service';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', getAllServices);
router.post('/', authenticate, createService);
router.put('/:id', authenticate, updateService);
router.delete('/:id', authenticate, deleteService);

export default router;
