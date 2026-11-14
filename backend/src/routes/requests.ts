
import { Router } from 'express';
import prisma from '../utils/prisma';
import { getRequests, createRequest, updateRequestStatus } from '../controllers/requestController';
import { requireAuth, requireRole } from '../middleware/auth';
import { assertWarehouseAccess, isAdminTier, NotFoundError, parsePositiveInt } from '../lib/authz';

const router = Router();

router.use(requireAuth);

const scopeRequestWarehouse = async (req: any, res: any, next: any) => {
    try {
        const user = req.user;
        if (!user || isAdminTier(user)) return next();

        const requestId = parsePositiveInt(req.params.id);
        if (!requestId) {
            return res.status(400).json({ error: 'Invalid request ID' });
        }
        const existing = await prisma.request.findUnique({
            where: { id: requestId },
            select: { id: true, warehouseId: true, userId: true }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Request not found' });
        }

        if (existing.warehouseId === null) {
            // A request with no warehouse has no scope to check against, so
            // nobody but an admin tier may transition it (V21, decided
            // 2026-11-14).
            //
            // Previously this fell through to `next()` for every non-owner, so
            // any approver could approve or reject a warehouse-less request
            // from any other user. Two things make that unsafe rather than
            // merely untidy:
            // - `updateRequestStatus` throws 'Request warehouse not found' when
            //   approving without a warehouse, so the transition cannot succeed
            //   anyway — it is a guaranteed 400 dressed up as an authorization
            //   pass.
            // - The owner check below returns 404 to the owner, which meant the
            //   one person with a legitimate interest was the only one refused.
            //
            // 404 (not 403) keeps the response indistinguishable from a missing
            // request, so the endpoint does not confirm that an out-of-scope id
            // exists.
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
