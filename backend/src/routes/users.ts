
import { Router } from 'express';
import { getUsers } from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

router.use(authenticateToken);
router.use(authorize(['admin', 'hr'])); // Only Admin/HR can view user list

router.get('/', getUsers);

export default router;
