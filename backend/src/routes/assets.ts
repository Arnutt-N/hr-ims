
import { Router } from 'express';
import { getMyAssets } from '../controllers/assetsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getMyAssets);

export default router;
