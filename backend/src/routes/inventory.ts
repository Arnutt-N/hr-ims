
import { Router } from 'express';
import { getInventory, createItem, updateItem, deleteItem } from '../controllers/inventoryController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// [2026-11-13] Modified by Antigravity: requireAuth on GET / (V21)
router.get('/', requireAuth, getInventory);
router.post('/', requireAuth, requireRole(['superadmin', 'admin']), createItem);
router.patch('/:id', requireAuth, requireRole(['superadmin', 'admin']), updateItem);
router.delete('/:id', requireAuth, requireRole(['superadmin']), deleteItem);

export default router;
