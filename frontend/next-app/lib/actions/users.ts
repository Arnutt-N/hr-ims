'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { Role } from '@/lib/types/user-types';


// Validation Schemas
const userSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    role: z.nativeEnum(Role),
    department: z.string().min(2, 'Department is required'),
    status: z.enum(['active', 'inactive'])
});

const createUserSchema = userSchema.required({ password: true });
const updateUserSchema = userSchema.partial();

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
    const role = session?.user?.role;
    if (!session || (role !== Role.superadmin as any && role !== Role.admin as any)) {
        return { error: 'Unauthorized - Admin only' };
    }

    try {
        // Validate input
        const validated = createUserSchema.parse(data);

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
    const role = session?.user?.role;
    if (!session || (role !== Role.superadmin as any && role !== Role.admin as any)) {
        return { error: 'Unauthorized - Admin only' };
    }

    try {
        // Validate input
        const validated = updateUserSchema.parse(data);

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
    const role = session?.user?.role;
    if (!session || (role !== Role.superadmin as any && role !== Role.admin as any)) {
        return { error: 'Unauthorized - Admin only' };
    }

    try {
        // Prevent deleting self
        if (parseInt(session.user?.id || '0') === id) {
            return { error: 'Cannot delete your own account' };
        }

        await prisma.user.delete({ where: { id } });

        revalidatePath('/users');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete user:', error);
        return { error: 'Failed to delete user' };
    }
}
