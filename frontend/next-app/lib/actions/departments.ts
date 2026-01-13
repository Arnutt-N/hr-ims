'use server';

import { revalidatePath } from 'next/cache';

// Fetch all department mappings
export async function getDepartmentMappings() {
    try {
        const response = await fetch('http://localhost:3001/api/departments/mappings', {
            headers: {
                'x-user-id': '1', // System/Admin ID
                'x-user-role': 'admin'
            },
            cache: 'no-store'
        });

        if (!response.ok) throw new Error('Failed to fetch mappings');
        return await response.json();
    } catch (error) {
        console.error('Error in getDepartmentMappings:', error);
        return [];
    }
}

// Fetch unique departments from users
export async function getUniqueDepartments() {
    try {
        const response = await fetch('http://localhost:3001/api/departments/unique', {
            headers: {
                'x-user-id': '1',
                'x-user-role': 'admin'
            },
            cache: 'no-store'
        });

        if (!response.ok) throw new Error('Failed to fetch departments');
        return await response.json();
    } catch (error) {
        console.error('Error in getUniqueDepartments:', error);
        return [];
    }
}

// Fetch mapping for current user
export async function getMyMapping() {
    try {
        const { auth } = await import('@/auth');
        const session = await auth();

        if (!session?.user?.id) return { warehouse: null };

        const response = await fetch('http://localhost:3001/api/departments/my-mapping', {
            headers: {
                'x-user-id': session.user.id,
                'x-user-role': session.user.role || 'user'
            },
            cache: 'no-store'
        });

        if (!response.ok) return { warehouse: null };
        return await response.json();
    } catch (error) {
        console.error('Error in getMyMapping:', error);
        return { warehouse: null };
    }
}

// Create or update mapping
export async function saveDepartmentMapping(department: string, warehouseId: number) {
    try {
        const response = await fetch('http://localhost:3001/api/departments/mappings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': '1',
                'x-user-role': 'admin'
            },
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

// Delete mapping
export async function deleteDepartmentMapping(id: number) {
    try {
        const response = await fetch(`http://localhost:3001/api/departments/mappings/${id}`, {
            method: 'DELETE',
            headers: {
                'x-user-id': '1',
                'x-user-role': 'admin'
            }
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
