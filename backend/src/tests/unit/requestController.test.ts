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
            },
            stockLevel: {
                findUnique: jest.fn(),
                update: jest.fn(),
            },
            inventoryItem: {
                update: jest.fn(),
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
                findUnique: jest.fn().mockResolvedValue({
                    id: 1,
                    warehouseId: 10,
                    userId: 99,
                    type: 'withdraw',
                    user: { name: 'Test', email: 'test@example.com' },
                    requestItems: [
                        { itemId: 101, quantity: 5, item: { name: 'Pen' } },
                    ],
                }),
                update: jest.fn().mockResolvedValue({ id: 1, status: 'approved' }),
            },
            stockLevel: {
                findUnique: jest.fn().mockResolvedValue({ quantity: 100, reserved: 5 }),
                update: jest.fn().mockResolvedValue({}),
            },
            inventoryItem: {
                update: jest.fn().mockResolvedValue({}),
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
        expect(txMock.history.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ status: 'approved', item: 'Pen' }),
            })
        );
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'approved' }));
    });

    it('should release reservation on rejected', async () => {
        const txMock = {
            request: {
                findUnique: jest.fn().mockResolvedValue({
                    id: 2,
                    warehouseId: 20,
                    userId: 88,
                    type: 'borrow',
                    user: { name: 'User', email: 'user@example.com' },
                    requestItems: [
                        { itemId: 202, quantity: 3, item: { name: 'Notebook' } },
                    ],
                }),
                update: jest.fn().mockResolvedValue({ id: 2, status: 'rejected' }),
            },
            stockLevel: {
                findUnique: jest.fn().mockResolvedValue({ quantity: 100, reserved: 3 }),
                update: jest.fn().mockResolvedValue({}),
            },
            inventoryItem: {
                update: jest.fn().mockResolvedValue({}),
            },
            history: {
                create: jest.fn().mockResolvedValue({}),
            },
        };

        (prisma.$transaction as jest.Mock).mockImplementation((cb: any) => cb(txMock));

        const req: any = { params: { id: '2' }, body: { status: 'rejected' } };
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
                    user: { name: 'User', email: 'user@example.com' },
                    requestItems: [
                        { itemId: 303, quantity: 50, item: { name: 'Stapler' } },
                    ],
                }),
                update: jest.fn(),
            },
            stockLevel: {
                findUnique: jest.fn().mockResolvedValue(null),
                update: jest.fn(),
            },
            inventoryItem: {
                update: jest.fn(),
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
});
