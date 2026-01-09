
import { Router } from 'express';
import { getHistory } from '../controllers/historyController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);
router.get('/', getHistory);

export default router;
