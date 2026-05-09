'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { getSessionRoles, requireRole, ADMIN_ROLES } from '@/lib/auth-guards';
import prisma from '@/lib/prisma';

/**
 * Return Department records from the org-structure table.
 * Used by maintenance request location picker (PRP v6 Q6) and any other
 * UI needing the actual Department FK options (not the deprecated
 * User.department free-text column).
 *
 * Auth: any logged-in user (read-only reference data).
 */
export async function getDepartments() {
    const session = await auth();
    if (!session?.user) return { error: 'Unauthorized' };

    try {
        const departments = await prisma.department.findMany({
            select: { id: true, name: true, abbr: true },
            orderBy: { name: 'asc' },
        });
        return { success: true, departments };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('getDepartments failed:', message);
        return { error: message };
    }
}

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'test-internal-key';

function backendHeaders(session: { user: { id: string; role: string; roles?: string[] } }): Record<string, string> {
    const roles = getSessionRoles(session);
    return {
        'x-user-id': session.user.id,
        'x-user-role': roles.join(',') || session.user.role,
        'x-internal-key': INTERNAL_API_KEY,
    };
}

export async function getDepartmentMappings() {
    const session = await requireRole(...ADMIN_ROLES);
    if (!session) return [];

    try {
        const response = await fetch(`${BACKEND_URL}/api/departments/mappings`, {
            headers: backendHeaders(session),
            cache: 'no-store'
        });

        if (!response.ok) throw new Error('Failed to fetch mappings');
        return await response.json();
    } catch (error) {
        console.error('Error in getDepartmentMappings:', error);
        return [];
    }
}

export async function getUniqueDepartments() {
    const session = await requireRole(...ADMIN_ROLES);
    if (!session) return [];

    try {
        const response = await fetch(`${BACKEND_URL}/api/departments/unique`, {
            headers: backendHeaders(session),
            cache: 'no-store'
        });

        if (!response.ok) throw new Error('Failed to fetch departments');
        return await response.json();
    } catch (error) {
        console.error('Error in getUniqueDepartments:', error);
        return [];
    }
}

export async function getMyMapping() {
    const session = await auth();
    if (!session?.user?.id) return { warehouse: null };

    try {
        const response = await fetch(`${BACKEND_URL}/api/departments/my-mapping`, {
            headers: backendHeaders(session),
            cache: 'no-store'
        });

        if (!response.ok) return { warehouse: null };
        return await response.json();
    } catch (error) {
        console.error('Error in getMyMapping:', error);
        return { warehouse: null };
    }
}

export async function saveDepartmentMapping(department: string, warehouseId: number) {
    const session = await requireRole(...ADMIN_ROLES);
    if (!session) return { success: false, message: 'Unauthorized' };

    try {
        const response = await fetch(`${BACKEND_URL}/api/departments/mappings`, {
            method: 'POST',
            headers: { ...backendHeaders(session), 'Content-Type': 'application/json' },
            body: JSON.stringify({ department, warehouseId })
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, message: error.error || 'Failed to save mapping' };
        }

        revalidatePath('/settings/departments');
        return { success: true, message: 'Mapping saved successfully' };
    } catch (error) {
        console.error('Error in saveDepartmentMapping:', error);
        return { success: false, message: 'Failed to save mapping' };
    }
}

export async function deleteDepartmentMapping(id: number) {
    const session = await requireRole(...ADMIN_ROLES);
    if (!session) return { success: false, message: 'Unauthorized' };

    try {
        const response = await fetch(`${BACKEND_URL}/api/departments/mappings/${id}`, {
            method: 'DELETE',
            headers: backendHeaders(session),
        });

        if (!response.ok) {
            return { success: false, message: 'Failed to delete mapping' };
        }

        revalidatePath('/settings/departments');
        return { success: true, message: 'Mapping deleted successfully' };
    } catch (error) {
        console.error('Error in deleteDepartmentMapping:', error);
        return { success: false, message: 'Failed to delete mapping' };
    }
}
