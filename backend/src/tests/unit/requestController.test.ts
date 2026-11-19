import { updateRequestStatus } from '../../controllers/requestController';
import prisma from '../../utils/prisma';
import * as notificationService from '../../services/notificationService';

jest.mock('../../utils/prisma', () => ({
    __esModule: true,
    default: {
        $transaction: jest.fn((cb: any) => cb({
            request: {
                findUnique: jest.fn(),
                update: jest.fn(),
                updateMany: jest.fn(),
            },
            stockLevel: {
                findUnique: jest.fn(),
                update: jest.fn(),
            },
            inventoryItem: {
                update: jest.fn(),
            },
            stockTransaction: {
                create: jest.fn(),
            },
            history: {
                create: jest.fn(),
            },
        })),
    },
}));

jest.mock('../../services/notificationService', () => ({
    sendEmail: jest.fn().mockResolvedValue(undefined),
    checkAndAlertLowStock: jest.fn().mockResolvedValue(undefined),
    emailTemplates: {
        requestStatusChanged: jest.fn().mockReturnValue('<html></html>'),
    },
}));

const createRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('updateRequestStatus', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should convert reservation to actual deduction on approved', async () => {
        const txMock = {
            request: {
                findUnique: jest.fn()
                    .mockResolvedValueOnce({
                        id: 1,
                        warehouseId: 10,
                        userId: 99,
                        type: 'withdraw',
                        status: 'pending',
                        user: { name: 'Test', email: 'test@example.com' },
                        requestItems: [
                            { itemId: 101, quantity: 5, item: { name: 'Pen' } },
                        ],
                    })
                    .mockResolvedValueOnce({ id: 1, status: 'approved' }),
                update: jest.fn().mockResolvedValue({ id: 1, status: 'approved' }),
                updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
            stockLevel: {
                findUnique: jest.fn().mockResolvedValue({ quantity: 100, reserved: 5 }),
                update: jest.fn().mockResolvedValue({}),
            },
            inventoryItem: {
                update: jest.fn().mockResolvedValue({}),
            },
            stockTransaction: {
                create: jest.fn().mockResolvedValue({}),
            },
            history: {
                create: jest.fn().mockResolvedValue({}),
            },
        };

        (prisma.$transaction as jest.Mock).mockImplementation((cb: any) => cb(txMock));

        const req: any = { params: { id: '1' }, body: { status: 'approved' } };
        const res = createRes();

        await updateRequestStatus(req, res);

        expect(txMock.stockLevel.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: { quantity: { decrement: 5 }, reserved: { decrement: 5 } },
            })
        );
        expect(txMock.inventoryItem.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 101 },
                data: { stock: { decrement: 5 } },
            })
        );
        expect(txMock.stockTransaction.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    warehouseId: 10,
                    itemId: 101,
                    quantity: -5,
                    type: 'outbound',
                    referenceId: 'Request:1',
                }),
            })
        );
        expect(txMock.history.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ status: 'approved', item: 'Pen' }),
            })
        );
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'approved' }));
    });

    it('should increase stock and record inbound on approved return', async () => {
        const txMock = {
            request: {
                findUnique: jest.fn()
                    .mockResolvedValueOnce({
                        id: 9,
                        warehouseId: 10,
                        userId: 99,
                        type: 'return',
                        status: 'pending',
                        user: { name: 'Test', email: 'test@example.com' },
                        requestItems: [
                            { itemId: 101, quantity: 3, item: { name: 'Pen' } },
                        ],
                    })
                    .mockResolvedValueOnce({ id: 9, status: 'approved' }),
                updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
            stockLevel: {
                findUnique: jest.fn().mockResolvedValue({ quantity: 10, reserved: 0 }),
                update: jest.fn().mockResolvedValue({}),
            },
            inventoryItem: { update: jest.fn().mockResolvedValue({}) },
            stockTransaction: { create: jest.fn().mockResolvedValue({}) },
            history: { create: jest.fn().mockResolvedValue({}) },
        };
        (prisma.$transaction as jest.Mock).mockImplementation((cb: any) => cb(txMock));

        const req: any = {
            params: { id: '9' },
            body: { status: 'approved' },
            user: { id: 5, userId: 5 },
        };
        const res = createRes();
        await updateRequestStatus(req, res);

        expect(txMock.stockLevel.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { quantity: { increment: 3 } } })
        );
        expect(txMock.stockTransaction.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    quantity: 3,
                    type: 'inbound',
                    referenceId: 'Request:9',
                    userId: 5,
                }),
            })
        );
    });

    it.each(['rejected', 'cancelled'])('should release reservation on %s', async (status) => {
        const txMock = {
            request: {
                findUnique: jest.fn()
                    .mockResolvedValueOnce({
                        id: 2,
                        warehouseId: 20,
                        userId: 88,
                        type: 'borrow',
                        status: 'pending',
                        user: { name: 'User', email: 'user@example.com' },
                        requestItems: [
                            { itemId: 202, quantity: 3, item: { name: 'Notebook' } },
                        ],
                    })
                    .mockResolvedValueOnce({ id: 2, status }),
                update: jest.fn().mockResolvedValue({ id: 2, status }),
                updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
            stockLevel: {
                findUnique: jest.fn().mockResolvedValue({ quantity: 100, reserved: 3 }),
                update: jest.fn().mockResolvedValue({}),
            },
            inventoryItem: {
                update: jest.fn().mockResolvedValue({}),
            },
            stockTransaction: {
                create: jest.fn().mockResolvedValue({}),
            },
            history: {
                create: jest.fn().mockResolvedValue({}),
            },
        };

        (prisma.$transaction as jest.Mock).mockImplementation((cb: any) => cb(txMock));

        const req: any = { params: { id: '2' }, body: { status } };
        const res = createRes();

        await updateRequestStatus(req, res);

        expect(txMock.stockLevel.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: { reserved: { decrement: 3 } },
            })
        );
        expect(txMock.inventoryItem.update).not.toHaveBeenCalled();
        expect(txMock.history.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ status, item: 'Notebook' }),
            })
        );
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status }));
    });

    it('should not decrement reserved below zero', async () => {
        const txMock = {
            request: {
                findUnique: jest.fn()
                    .mockResolvedValueOnce({
                        id: 4,
                        warehouseId: 20,
                        userId: 88,
                        type: 'borrow',
                        status: 'pending',
                        user: { name: 'User', email: 'user@example.com' },
                        requestItems: [
                            { itemId: 202, quantity: 3, item: { name: 'Notebook' } },
                        ],
                    })
                    .mockResolvedValueOnce({ id: 4, status: 'rejected' }),
                update: jest.fn().mockResolvedValue({ id: 4, status: 'rejected' }),
                updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
            stockLevel: {
                findUnique: jest.fn().mockResolvedValue({ quantity: 100, reserved: 1 }),
                update: jest.fn().mockResolvedValue({}),
            },
            inventoryItem: {
                update: jest.fn().mockResolvedValue({}),
            },
            stockTransaction: {
                create: jest.fn().mockResolvedValue({}),
            },
            history: {
                create: jest.fn().mockResolvedValue({}),
            },
        };

        (prisma.$transaction as jest.Mock).mockImplementation((cb: any) => cb(txMock));

        const req: any = { params: { id: '4' }, body: { status: 'rejected' } };
        const res = createRes();

        await updateRequestStatus(req, res);

        expect(txMock.stockLevel.update).not.toHaveBeenCalled();
        expect(txMock.history.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ status: 'rejected', item: 'Notebook' }),
            })
        );
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'rejected' }));
    });

    it('should throw when stock level is missing on approved', async () => {
        const txMock = {
            request: {
                findUnique: jest.fn().mockResolvedValue({
                    id: 3,
                    warehouseId: 30,
                    userId: 77,
                    type: 'withdraw',
                    status: 'pending',
                    user: { name: 'User', email: 'user@example.com' },
                    requestItems: [
                        { itemId: 303, quantity: 50, item: { name: 'Stapler' } },
                    ],
                }),
                update: jest.fn(),
                updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
            stockLevel: {
                findUnique: jest.fn().mockResolvedValue(null),
                update: jest.fn(),
            },
            inventoryItem: {
                update: jest.fn(),
            },
            stockTransaction: {
                create: jest.fn(),
            },
            history: {
                create: jest.fn(),
            },
        };

        (prisma.$transaction as jest.Mock).mockImplementation((cb: any) => cb(txMock));

        const req: any = { params: { id: '3' }, body: { status: 'approved' } };
        const res = createRes();

        await updateRequestStatus(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('Stock level not found') })
        );
    });

    it('should throw when reserved stock is lower than requested on approved', async () => {
        const txMock = {
            request: {
                findUnique: jest.fn().mockResolvedValue({
                    id: 5,
                    warehouseId: 30,
                    userId: 77,
                    type: 'withdraw',
                    status: 'pending',
                    user: { name: 'User', email: 'user@example.com' },
                    requestItems: [
                        { itemId: 303, quantity: 5, item: { name: 'Stapler' } },
                    ],
                }),
                update: jest.fn(),
                updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
            stockLevel: {
                findUnique: jest.fn().mockResolvedValue({ quantity: 50, reserved: 2 }),
                update: jest.fn(),
            },
            inventoryItem: {
                update: jest.fn(),
            },
            stockTransaction: {
                create: jest.fn(),
            },
            history: {
                create: jest.fn(),
            },
        };

        (prisma.$transaction as jest.Mock).mockImplementation((cb: any) => cb(txMock));

        const req: any = { params: { id: '5' }, body: { status: 'approved' } };
        const res = createRes();

        await updateRequestStatus(req, res);

        expect(txMock.stockLevel.update).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('Reserved stock mismatch') })
        );
    });
});
