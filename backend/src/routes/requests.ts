
import { Router } from 'express';
import { getRequests, createRequest, updateRequestStatus } from '../controllers/requestController';
import { authenticateToken } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

router.use(authenticateToken);

router.get('/', getRequests);
router.post('/', createRequest);
router.patch('/:id/status', authorize(['admin', 'hr']), updateRequestStatus);

export default router;
