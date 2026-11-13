import request from 'supertest';

const mockPrisma: any = {
    warehouse: { findMany: jest.fn() },
    departmentMapping: { findFirst: jest.fn() },
    stockTransfer: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
    stockLevel: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
    },
    stockTransaction: {
        create: jest.fn(),
        findMany: jest.fn(),
    },
    request: {
        findUnique: jest.fn(),
        update: jest.fn(),
    },
    inventoryItem: {
        update: jest.fn(),
    },
    history: {
        create: jest.fn(),
    },
    settings: {
        findFirst: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn((cb: any) => cb(mockPrisma)),
};

jest.mock('../../utils/settings', () => ({
    isFeatureEnabled: jest.fn().mockResolvedValue(false),
    getSettings: jest.fn().mockResolvedValue({}),
}));

jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock('../../utils/prisma', () => ({
    __esModule: true,
    default: mockPrisma,
}));

jest.mock('../../services/notificationService', () => ({
    sendEmail: jest.fn().mockResolvedValue(undefined),
    sendTelegramAlert: jest.fn().mockResolvedValue(undefined),
    checkAndAlertLowStock: jest.fn().mockResolvedValue(undefined),
    emailTemplates: { requestStatusChanged: jest.fn().mockReturnValue('<html></html>') },
    telegramTemplates: {},
}));

import { app } from '../../index';

const INTERNAL_KEY = process.env.INTERNAL_API_KEY;

function proxyHeaders(id: number, role: string) {
    return {
        'x-user-id': String(id),
        'x-user-role': role,
        ...(INTERNAL_KEY ? { 'x-internal-key': INTERNAL_KEY } : {}),
    };
}

describe('Object-level authorization (IDOR remediation)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPrisma.warehouse.findMany.mockResolvedValue([]);
        mockPrisma.departmentMapping.findFirst.mockResolvedValue(null);
    });

    it('rejects anonymous GET /api/stock-transfers and /api/stock-levels with 401', async () => {
        const res1 = await request(app).get('/api/stock-transfers');
        expect(res1.status).toBe(401);

        const res2 = await request(app).get('/api/stock-levels');
        expect(res2.status).toBe(401);

        const res3 = await request(app).get('/api/stock-levels/1/1');
        expect(res3.status).toBe(401);
    });

    it('returns 404 on cross-warehouse PATCH /api/stock-levels/:warehouseId/:itemId/adjust', async () => {
        mockPrisma.warehouse.findMany.mockResolvedValue([{ id: 1 }]);

        const res = await request(app)
            .patch('/api/stock-levels/99/1/adjust')
            .set(proxyHeaders(5, 'approver'))
            .send({ adjustment: 5, note: 'cross-wh' });

        expect(res.status).toBe(404);
    });

    it('ignores body-spoofed requestedBy on POST /api/stock-transfers', async () => {
        mockPrisma.stockLevel.findUnique.mockResolvedValue({ quantity: 20 });
        mockPrisma.stockTransfer.create.mockImplementation(({ data }: any) =>
            Promise.resolve({ id: 1, ...data })
        );

        const res = await request(app)
            .post('/api/stock-transfers')
            .set(proxyHeaders(42, 'user'))
            .send({
                fromWarehouseId: 1,
                toWarehouseId: 2,
                itemId: 10,
                quantity: 2,
                requestedBy: 999,
            });

        expect(res.status).toBe(201);
        expect(mockPrisma.stockTransfer.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ requestedBy: 42 }),
            })
        );
    });

    it('ignores body-spoofed approvedBy on PATCH /api/stock-transfers/:id', async () => {
        mockPrisma.stockTransfer.findUnique
            .mockResolvedValueOnce({
                id: 1,
                status: 'pending',
                fromWarehouseId: 1,
                toWarehouseId: 2,
                itemId: 10,
                quantity: 2,
            })
            .mockResolvedValueOnce({ id: 1, status: 'rejected', approvedBy: 7 });
        mockPrisma.stockTransfer.update.mockResolvedValue({ id: 1, status: 'rejected', approvedBy: 7 });

        const res = await request(app)
            .patch('/api/stock-transfers/1')
            .set(proxyHeaders(7, 'admin'))
            .send({ status: 'rejected', approvedBy: 999 });

        expect(res.status).toBe(200);
        expect(mockPrisma.stockTransfer.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ approvedBy: 7 }),
            })
        );
    });

    it('returns 404 on cross-warehouse PATCH /api/requests/:id/status for approver', async () => {
        mockPrisma.warehouse.findMany.mockResolvedValue([{ id: 1 }]);
        mockPrisma.request.findUnique.mockResolvedValue({
            id: 1,
            warehouseId: 99,
            userId: 88,
        });

        const res = await request(app)
            .patch('/api/requests/1/status')
            .set(proxyHeaders(5, 'approver'))
            .send({ status: 'approved' });

        expect(res.status).toBe(404);
    });

    it('denies self-approval on warehouse-null request for non-admin approver', async () => {
        mockPrisma.request.findUnique.mockResolvedValueOnce({ id: 1, warehouseId: null, userId: 5 });

        const res = await request(app)
            .patch('/api/requests/1/status')
            .set(proxyHeaders(5, 'approver'))
            .send({ status: 'pending' });

        expect(res.status).toBe(404);
    });

    it('allows warehouse-null request when non-admin approver is not the requester', async () => {
        mockPrisma.request.findUnique
            .mockResolvedValueOnce({ id: 1, warehouseId: null, userId: 99 })
            .mockResolvedValueOnce({
                id: 1,
                warehouseId: null,
                userId: 99,
                type: 'return',
                user: { name: 'Requester', email: null },
                requestItems: [],
            });
        mockPrisma.request.update.mockResolvedValue({ id: 1, status: 'pending', type: 'return' });

        const res = await request(app)
            .patch('/api/requests/1/status')
            .set(proxyHeaders(5, 'approver'))
            .send({ status: 'pending' });

        expect(res.status).toBe(200);
    });
});
