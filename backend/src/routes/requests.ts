
import { Router } from 'express';
import prisma from '../utils/prisma';
import { getRequests, createRequest, updateRequestStatus } from '../controllers/requestController';
import { requireAuth, requireRole } from '../middleware/auth';
import { assertWarehouseAccess, isAdminTier, NotFoundError } from '../lib/authz';

const router = Router();

// [2026-11-13] Modified by Antigravity: requireAuth (proxy-style) + APPROVER_TIER + warehouse scope (V5/V15)
router.use(requireAuth);

const scopeRequestWarehouse = async (req: any, res: any, next: any) => {
    try {
        const user = req.user;
        if (!user || isAdminTier(user)) return next();

        const requestId = parseInt(req.params.id);
        const existing = await prisma.request.findUnique({
            where: { id: requestId },
            select: { id: true, warehouseId: true, userId: true }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Request not found' });
        }

        if (existing.warehouseId === null) {
            if (existing.userId === Number(user.id)) {
                return next();
            }
            return res.status(404).json({ error: 'Request not found' });
        }

        await assertWarehouseAccess(prisma, user, existing.warehouseId);
        return next();
    } catch (err) {
        if (err instanceof NotFoundError) {
            return res.status(404).json({ error: 'Request not found' });
        }
        return res.status(500).json({ error: 'Failed to verify request access' });
    }
};

router.get('/', getRequests);
router.post('/', createRequest);
router.patch('/:id/status', requireRole(['superadmin', 'admin', 'approver']), scopeRequestWarehouse, updateRequestStatus);

export default router;
