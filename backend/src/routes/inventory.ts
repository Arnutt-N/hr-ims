
import { Router } from 'express';
import { getInventory, createItem, updateItem, deleteItem } from '../controllers/inventoryController';
import { authenticateToken } from '../middleware/auth';
import { authorize } from '../middleware/rbac';

const router = Router();

router.use(authenticateToken);

router.get('/', getInventory);
router.post('/', authorize(['admin', 'hr']), createItem);
router.patch('/:id', authorize(['admin', 'hr']), updateItem);
router.delete('/:id', authorize(['admin']), deleteItem);

export default router;
