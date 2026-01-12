'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { z } from 'zod';

const settingsSchema = z.object({
    orgName: z.string().min(2, 'Organization name must be at least 2 characters'),
    borrowLimit: z.number().int().min(1).max(365, 'Borrow limit must be between 1 and 365 days'),
    checkInterval: z.number().int().min(1).max(30, 'Check interval must be between 1 and 30 days'),
    maintenanceAlert: z.boolean(),
    allowRegistration: z.boolean(),
    footerText: z.string().max(100, 'Footer text must be under 100 characters').optional()
});

export async function getSettings() {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        let settings = await prisma.settings.findFirst();

        // Create default if doesn't exist
        if (!settings) {
            settings = await prisma.settings.create({
                data: {
                    orgName: 'IMS Corporation',
                    borrowLimit: 7,
                    checkInterval: 7,
                    maintenanceAlert: true,
                    allowRegistration: false,
                    footerText: 'IMS Asset Management System'
                }
            });
        }

        return { success: true, settings };
    } catch (error) {
        console.error('Failed to fetch settings:', error);
        return { error: 'Failed to fetch settings' };
    }
}

export async function updateSettings(id: number, data: any) {
    const session = await auth();
    // Only superadmin can change system settings
    const role = session?.user?.role as any;
    if (role !== 'superadmin') {
        return { error: 'Unauthorized - Superadmin only' };
    }

    try {
        // Validate
        const validated = settingsSchema.parse(data);

        // Update
        await prisma.settings.update({
            where: { id },
            data: validated
        });

        revalidatePath('/settings');
        return { success: true };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { error: error.issues[0].message };
        }
        console.error('Failed to update settings:', error);
        return { error: 'Failed to update settings' };
    }
}
