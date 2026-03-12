'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { requireRole, ADMIN_ROLES } from '@/lib/auth-guards';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

function backendHeaders(session: { user: { id: string; role: string } }): Record<string, string> {
    return {
        'x-user-id': session.user.id,
        'x-user-role': session.user.role,
        'x-internal-key': process.env.INTERNAL_API_KEY || '',
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
