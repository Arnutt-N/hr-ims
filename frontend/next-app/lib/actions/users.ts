'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { Role } from '@/lib/types/user-types';
import { logActivity } from '@/lib/actions/audit';


// Validation Schemas
const userSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
        .optional(),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    role: z.nativeEnum(Role),
    department: z.string().min(2, 'Department is required'),
    status: z.enum(['active', 'inactive'])
});

const createUserSchema = userSchema.required({ password: true });
const updateUserSchema = userSchema.partial();

// ... (imports remain same)

// ... (schemas remain same)

export async function getUsers() {
    const session = await auth();
    const role = session?.user?.role;
    if (!session || (role !== Role.superadmin as any && role !== Role.admin as any)) {
        return { error: 'Unauthorized - Admin only' };
    }

    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                department: true,
                status: true,
                avatar: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return { success: true, users };
    } catch (error) {
        console.error('Failed to fetch users:', error);
        return { error: 'Failed to fetch users' };
    }
}

export async function createUser(data: any) {
    const session = await auth();
    const currentUserRole = session?.user?.role;

    // 1. Basic Auth Check
    if (!session || (currentUserRole !== Role.superadmin as any && currentUserRole !== Role.admin as any)) {
        return { error: 'Unauthorized - Admin only' };
    }

    try {
        // Validate input
        const validated = createUserSchema.parse(data);

        // 2. Role Restriction: Only Superadmin can create Superadmin
        if (validated.role === Role.superadmin && currentUserRole !== Role.superadmin as any) {
            return { error: 'Forbidden: Only Superadmin can create another Superadmin' };
        }

        // Check if email already exists
        const existing = await prisma.user.findUnique({
            where: { email: validated.email }
        });

        if (existing) {
            return { error: 'Email already exists' };
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(validated.password, 10);

        // Create user
        await prisma.user.create({
            data: {
                email: validated.email,
                password: hashedPassword,
                name: validated.name,
                role: validated.role as any,
                department: validated.department,
                status: validated.status || 'active'
            }
        });

        // Log activity
        await logActivity(
            'USER_CREATE',
            'User',
            validated.email, // Use email as identifier since we don't return the new ID from create
            { name: validated.name, role: validated.role, department: validated.department }
        );

        revalidatePath('/users');
        return { success: true };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { error: error.issues[0].message };
        }
        console.error('Failed to create user:', error);
        return { error: 'Failed to create user' };
    }
}

export async function updateUser(id: number, data: any) {
    const session = await auth();
    const currentUserRole = session?.user?.role;

    // 1. Basic Auth Check
    if (!session || (currentUserRole !== Role.superadmin as any && currentUserRole !== Role.admin as any)) {
        return { error: 'Unauthorized - Admin only' };
    }

    try {
        // Validate input
        const validated = updateUserSchema.parse(data);

        // Get target user to check their current role
        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!targetUser) return { error: 'User not found' };

        // 2. Role Restriction: Only Superadmin can edit a Superadmin
        if (targetUser.role === Role.superadmin && currentUserRole !== Role.superadmin as any) {
            // Allow user to edit themselves? usually handled by profile update, currently this is admin function
            // If admin trying to edit superadmin -> Forbidden
            if (parseInt(session.user?.id!) !== id) {
                return { error: 'Forbidden: You cannot modify a Superadmin account' };
            }
        }

        // 3. Role Restriction: Only Superadmin can promote someone to Superadmin
        if (validated.role === Role.superadmin && currentUserRole !== Role.superadmin as any) {
            return { error: 'Forbidden: Only Superadmin can assign Superadmin role' };
        }

        // Prepare update data
        const updateData: any = { ...validated };

        // Hash new password if provided
        if (validated.password) {
            updateData.password = await bcrypt.hash(validated.password, 10);
        }

        // Update user
        await prisma.user.update({
            where: { id },
            data: updateData
        });

        // If password changed, revoke all sessions
        if (validated.password) {
            await prisma.user.update({
                where: { id },
                data: { tokenVersion: { increment: 1 } }
            });
        }

        // Log activity
        await logActivity(
            'USER_UPDATE',
            'User',
            id.toString(),
            {
                updates: updateData,
                targetUserEmail: targetUser.email
            }
        );

        revalidatePath('/users');
        return { success: true };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { error: error.issues[0].message };
        }
        console.error('Failed to update user:', error);
        return { error: 'Failed to update user' };
    }
}

export async function deleteUser(id: number) {
    const session = await auth();
    const currentUserRole = session?.user?.role;

    // 1. Basic Auth Check
    if (!session || (currentUserRole !== Role.superadmin as any && currentUserRole !== Role.admin as any)) {
        return { error: 'Unauthorized - Admin only' };
    }

    try {
        // Prevent deleting self
        if (parseInt(session.user?.id || '0') === id) {
            return { error: 'Cannot delete your own account' };
        }

        // Get target user
        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!targetUser) return { error: 'User not found' };

        // 2. Role Restriction: Only Superadmin can delete Master/Superadmin
        if (targetUser.role === Role.superadmin && currentUserRole !== Role.superadmin as any) {
            return { error: 'Forbidden: You cannot delete a Superadmin account' };
        }

        await prisma.user.delete({ where: { id } });

        // Log activity
        await logActivity(
            'USER_DELETE',
            'User',
            id.toString(),
            { deletedUserEmail: targetUser.email, deletedUserName: targetUser.name }
        );

        revalidatePath('/users');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete user:', error);
        return { error: 'Failed to delete user' };
    }
}

export async function revokeUserSessions(userId: number) {
    const session = await auth();
    const currentUserRole = session?.user?.role;

    if (!session || (currentUserRole !== Role.superadmin as any && currentUserRole !== Role.admin as any)) {
        return { error: 'Unauthorized' };
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { tokenVersion: { increment: 1 } }
        });

        await logActivity('USER_REVOKE_SESSION', 'User', userId.toString(), {});
        return { success: true, message: 'Sessions revoked successfully' };
    } catch (error) {
        console.error('Failed to revoke sessions:', error);
        return { error: 'Failed to revoke sessions' };
    }
}

export async function getUsersForAssignment() {
    const session = await auth();
    if (!session) return { error: 'Unauthorized' };

    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
            },
            where: { status: 'active' },
            orderBy: { name: 'asc' }
        });

        return { success: true, users };
    } catch (error) {
        console.error('Failed to fetch users for assignment:', error);
        return { error: 'Failed to fetch users' };
    }
}
