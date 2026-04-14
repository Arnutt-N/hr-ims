import { createRequest } from '../../controllers/requestController';
import prisma from '../../utils/prisma';

jest.mock('../../utils/prisma', () => ({
    __esModule: true,
    default: {
        $transaction: jest.fn((cb: any) => cb({
            request: {
                create: jest.fn(),
            },
            requestItem: {
                create: jest.fn(),
            },
            inventoryItem: {
                findUnique: jest.fn(),
            },
            stockLevel: {
                findUnique: jest.fn(),
                update: jest.fn(),
                create: jest.fn(),
            },
        })),
        warehouse: {
            findUnique: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
        },
    },
}));

jest.mock('../../services/notificationService', () => ({
    sendEmail: jest.fn().mockResolvedValue(undefined),
    sendTelegramAlert: jest.fn().mockResolvedValue(undefined),
    emailTemplates: {
        requestCreated: jest.fn().mockReturnValue('<html></html>'),
    },
    telegramTemplates: {
        newRequest: jest.fn().mockReturnValue('New request'),
    },
}));

const createRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('createRequest', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should reserve stock when creating a request with sufficient available stock', async () => {
        const txMock = {
            request: {
                create: jest.fn().mockResolvedValue({ id: 1, status: 'pending' }),
            },
            requestItem: {
                create: jest.fn().mockResolvedValue({}),
            },
            inventoryItem: {
                findUnique: jest.fn().mockResolvedValue({ id: 101, name: 'Pen' }),
            },
            stockLevel: {
                findUnique: jest.fn().mockResolvedValue({ quantity: 100, reserved: 20 }),
                update: jest.fn().mockResolvedValue({}),
                create: jest.fn(),
            },
        };

        (prisma.$transaction as jest.Mock).mockImplementation((cb: any) => cb(txMock));
        (prisma.warehouse.findUnique as jest.Mock).mockResolvedValue({ id: 10, code: 'WH-CENTRAL' });
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({ name: 'Test', email: 'test@example.com' });

        const req: any = {
            user: { userId: 1, department: 'Central' },
            body: { items: JSON.stringify([{ id: '101', quantity: 5 }]), type: 'withdraw' },
        };
        const res = createRes();

        await createRequest(req, res);

        expect(txMock.stockLevel.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: { reserved: { increment: 5 } },
            })
        );
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should reject request when available stock is insufficient', async () => {
        const txMock = {
            request: {
                create: jest.fn(),
            },
            requestItem: {
                create: jest.fn(),
            },
            inventoryItem: {
                findUnique: jest.fn().mockResolvedValue({ id: 101, name: 'Pen' }),
            },
            stockLevel: {
                findUnique: jest.fn().mockResolvedValue({ quantity: 10, reserved: 8 }),
                update: jest.fn(),
                create: jest.fn(),
            },
        };

        (prisma.$transaction as jest.Mock).mockImplementation((cb: any) => cb(txMock));
        (prisma.warehouse.findUnique as jest.Mock).mockResolvedValue({ id: 10, code: 'WH-CENTRAL' });
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({ name: 'Test', email: 'test@example.com' });

        const req: any = {
            user: { userId: 1, department: 'Central' },
            body: { items: JSON.stringify([{ id: '101', quantity: 5 }]), type: 'withdraw' },
        };
        const res = createRes();

        await createRequest(req, res);

        expect(txMock.stockLevel.update).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('Insufficient available stock') })
        );
    });
});
