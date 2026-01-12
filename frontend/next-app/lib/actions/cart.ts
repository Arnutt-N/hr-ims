'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

// Get Cart Items
export async function getCart() {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { cartItems: { include: { item: true } } }
        });

        if (!user) return { error: 'User not found' };

        return { success: true, cart: user.cartItems };
    } catch (error) {
        console.error('Failed to get cart:', error);
        return { error: 'Failed to fetch cart' };
    }
}

// Add Item to Cart
export async function addToCart(itemId: number, quantity: number = 1) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) return { error: 'User not found' };

        // Check stock?
        const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
        if (!item) return { error: 'Item not found' };
        if (item.stock < quantity && item.type === 'consumable') { // Durable logic might be different
            // return { error: 'Not enough stock' }; 
            // Allow adding to cart but warn later?
        }

        // Upsert cart item
        const existing = await prisma.cartItem.findUnique({
            where: {
                userId_itemId: {
                    userId: user.id,
                    itemId: itemId
                }
            }
        });

        if (existing) {
            await prisma.cartItem.update({
                where: { id: existing.id },
                data: { quantity: existing.quantity + quantity }
            });
        } else {
            await prisma.cartItem.create({
                data: {
                    userId: user.id,
                    itemId: itemId,
                    quantity: quantity
                }
            });
        }

        revalidatePath('/cart');
        return { success: true };
    } catch (error) {
        console.error('Failed to add to cart:', error);
        return { error: 'Failed to add item' };
    }
}

// Remove from Cart
export async function removeFromCart(cartItemId: number) {
    const session = await auth();
    if (!session) return { error: 'Unauthorized' };

    try {
        await prisma.cartItem.delete({ where: { id: cartItemId } });
        revalidatePath('/cart');
        return { success: true };
    } catch (error) {
        return { error: 'Failed to delete item' };
    }
}

// Submit Cart as Request
export async function submitCart() {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { cartItems: { include: { item: true } } }
        });

        if (!user || user.cartItems.length === 0) return { error: 'Cart is empty' };

        // Group by type (borrow vs withdraw) or create separate requests?
        // Logic: Consumable -> Withdraw, Durable -> Borrow.
        // We can create one request per type if mixed, or just mixed?
        // React app separated them in UI.
        // Let's iterate and group.

        const withdrawItems = user.cartItems.filter(i => i.item.type === 'consumable');
        const borrowItems = user.cartItems.filter(i => i.item.type === 'durable');

        // Create Withdraw Request
        if (withdrawItems.length > 0) {
            await prisma.request.create({
                data: {
                    userId: user.id,
                    type: 'withdraw',
                    status: 'pending',
                    requestItems: {
                        create: withdrawItems.map(i => ({
                            itemId: i.itemId,
                            quantity: i.quantity
                        }))
                    }
                }
            });
        }

        // Create Borrow Request
        if (borrowItems.length > 0) {
            await prisma.request.create({
                data: {
                    userId: user.id,
                    type: 'borrow',
                    status: 'pending',
                    requestItems: {
                        create: borrowItems.map(i => ({
                            itemId: i.itemId,
                            quantity: i.quantity
                        }))
                    }
                }
            });
        }

        // Clear Cart
        await prisma.cartItem.deleteMany({ where: { userId: user.id } });

        revalidatePath('/cart');
        revalidatePath('/requests');
        return { success: true };

    } catch (error) {
        console.error('Submit cart error:', error);
        return { error: 'Failed to submit request' };
    }
}
