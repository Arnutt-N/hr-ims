
import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController';
import { authenticateToken } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

router.use(authenticateToken);

router.get('/', getSettings);
router.patch('/', authorize(['admin']), updateSettings);

export default router;
