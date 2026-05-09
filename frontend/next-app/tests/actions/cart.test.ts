import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { prismaMock, resetPrismaMock } from './__mocks__/prisma';
import { sessionFor } from './__mocks__/auth';

vi.mock('@/lib/prisma', () => ({ default: prismaMock }));
vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

describe('cart Server Actions', () => {
    let cart: typeof import('@/lib/actions/cart');
    let authMock: Mock;

    beforeEach(async () => {
        resetPrismaMock();
        ({ auth: authMock } = (await import('@/auth')) as { auth: Mock });
        authMock.mockReset();
        cart = await import('@/lib/actions/cart');
    });

    describe('getCart', () => {
        it('returns cart items for authenticated user', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            prismaMock.user.findUnique.mockResolvedValue({
                id: 8,
                email: 'user@demo.com',
                cartItems: [{ id: 1, itemId: 10, quantity: 2, item: { id: 10, name: 'Pen' } }],
            } as any);

            const result = await cart.getCart();

            expect(result).toMatchObject({ success: true });
            expect((result as any).cart).toHaveLength(1);
        });

        it('rejects unauthenticated', async () => {
            authMock.mockResolvedValue(null);
            const result = await cart.getCart();
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('returns error if user not in DB', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            prismaMock.user.findUnique.mockResolvedValue(null);
            const result = await cart.getCart();
            expect(result).toEqual({ error: 'User not found' });
        });

        it('returns generic error on DB failure', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            const err = vi.spyOn(console, 'error').mockImplementation(() => {});
            prismaMock.user.findUnique.mockRejectedValue(new Error('boom'));
            const result = await cart.getCart();
            expect(result).toEqual({ error: 'Failed to fetch cart' });
            err.mockRestore();
        });
    });

    describe('addToCart', () => {
        it('creates a new cart item when none exists', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            prismaMock.user.findUnique.mockResolvedValue({ id: 8 } as any);
            prismaMock.inventoryItem.findUnique.mockResolvedValue({
                id: 10,
                stock: 5,
                type: 'consumable',
            } as any);
            prismaMock.cartItem.findUnique.mockResolvedValue(null);
            prismaMock.cartItem.create.mockResolvedValue({} as any);

            const result = await cart.addToCart(10, 2);

            expect(result).toEqual({ success: true });
            expect(prismaMock.cartItem.create).toHaveBeenCalledWith({
                data: { userId: 8, itemId: 10, quantity: 2 },
            });
        });

        it('increments quantity if cart item exists', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            prismaMock.user.findUnique.mockResolvedValue({ id: 8 } as any);
            prismaMock.inventoryItem.findUnique.mockResolvedValue({
                id: 10,
                stock: 5,
                type: 'durable',
            } as any);
            prismaMock.cartItem.findUnique.mockResolvedValue({ id: 99, quantity: 3 } as any);
            prismaMock.cartItem.update.mockResolvedValue({} as any);

            await cart.addToCart(10, 2);

            expect(prismaMock.cartItem.update).toHaveBeenCalledWith({
                where: { id: 99 },
                data: { quantity: 5 },
            });
            expect(prismaMock.cartItem.create).not.toHaveBeenCalled();
        });

        it('rejects unauthenticated', async () => {
            authMock.mockResolvedValue(null);
            const result = await cart.addToCart(10, 1);
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('returns error when user missing', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            prismaMock.user.findUnique.mockResolvedValue(null);
            const result = await cart.addToCart(10, 1);
            expect(result).toEqual({ error: 'User not found' });
        });

        it('returns error when item missing', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            prismaMock.user.findUnique.mockResolvedValue({ id: 8 } as any);
            prismaMock.inventoryItem.findUnique.mockResolvedValue(null);
            const result = await cart.addToCart(10, 1);
            expect(result).toEqual({ error: 'Item not found' });
        });
    });

    describe('removeFromCart', () => {
        it('deletes the cart item for authenticated user', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            prismaMock.cartItem.delete.mockResolvedValue({} as any);

            const result = await cart.removeFromCart(99);

            expect(result).toEqual({ success: true });
            expect(prismaMock.cartItem.delete).toHaveBeenCalledWith({ where: { id: 99 } });
        });

        it('rejects unauthenticated', async () => {
            authMock.mockResolvedValue(null);
            const result = await cart.removeFromCart(99);
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('returns error when delete fails', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            prismaMock.cartItem.delete.mockRejectedValue(new Error('boom'));
            const result = await cart.removeFromCart(99);
            expect(result).toEqual({ error: 'Failed to delete item' });
        });
    });

    describe('submitCart', () => {
        const userWithCart = (cartItems: any[], department: string | null = 'Eng') => ({
            id: 8,
            email: 'user@demo.com',
            department,
            cartItems,
        });

        it('rejects unauthenticated', async () => {
            authMock.mockResolvedValue(null);
            const result = await cart.submitCart();
            expect(result).toEqual({ error: 'Unauthorized' });
        });

        it('returns "Cart is empty" when no cart items', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            prismaMock.user.findUnique.mockResolvedValue(userWithCart([]) as any);

            const result = await cart.submitCart();
            expect(result).toEqual({ error: 'Cart is empty' });
        });

        it('creates withdraw request only when cart has consumable', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            prismaMock.user.findUnique.mockResolvedValue(
                userWithCart([
                    { itemId: 1, quantity: 3, item: { type: 'consumable' } },
                ]) as any,
            );
            prismaMock.departmentMapping.findUnique.mockResolvedValue({ warehouseId: 7 } as any);
            prismaMock.request.create.mockResolvedValue({} as any);
            prismaMock.cartItem.deleteMany.mockResolvedValue({} as any);

            await cart.submitCart();

            expect(prismaMock.request.create).toHaveBeenCalledTimes(1);
            const call = prismaMock.request.create.mock.calls[0][0];
            expect(call.data.type).toBe('withdraw');
            expect(call.data.warehouseId).toBe(7);
        });

        it('creates borrow request only when cart has durable', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            prismaMock.user.findUnique.mockResolvedValue(
                userWithCart([{ itemId: 2, quantity: 1, item: { type: 'durable' } }]) as any,
            );
            prismaMock.departmentMapping.findUnique.mockResolvedValue(null);
            prismaMock.request.create.mockResolvedValue({} as any);
            prismaMock.cartItem.deleteMany.mockResolvedValue({} as any);

            await cart.submitCart();

            expect(prismaMock.request.create).toHaveBeenCalledTimes(1);
            const call = prismaMock.request.create.mock.calls[0][0];
            expect(call.data.type).toBe('borrow');
            expect(call.data.warehouseId).toBeNull();
        });

        it('creates both requests when cart mixes consumable and durable', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            prismaMock.user.findUnique.mockResolvedValue(
                userWithCart([
                    { itemId: 1, quantity: 1, item: { type: 'consumable' } },
                    { itemId: 2, quantity: 1, item: { type: 'durable' } },
                ]) as any,
            );
            prismaMock.departmentMapping.findUnique.mockResolvedValue({ warehouseId: 7 } as any);
            prismaMock.request.create.mockResolvedValue({} as any);
            prismaMock.cartItem.deleteMany.mockResolvedValue({} as any);

            await cart.submitCart();

            expect(prismaMock.request.create).toHaveBeenCalledTimes(2);
        });

        it('clears cart after submission', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            prismaMock.user.findUnique.mockResolvedValue(
                userWithCart([{ itemId: 1, quantity: 1, item: { type: 'consumable' } }]) as any,
            );
            prismaMock.departmentMapping.findUnique.mockResolvedValue(null);
            prismaMock.request.create.mockResolvedValue({} as any);
            prismaMock.cartItem.deleteMany.mockResolvedValue({} as any);

            await cart.submitCart();

            expect(prismaMock.cartItem.deleteMany).toHaveBeenCalledWith({ where: { userId: 8 } });
        });

        it('returns error string when DB fails', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            const err = vi.spyOn(console, 'error').mockImplementation(() => {});
            prismaMock.user.findUnique.mockRejectedValue(new Error('boom'));

            const result = await cart.submitCart();
            expect(result).toEqual({ error: 'Failed to submit request' });
            err.mockRestore();
        });
    });
});
