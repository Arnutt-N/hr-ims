import { getDepartmentMappings, getUniqueDepartments } from '@/lib/actions/departments';
import AddMappingDialog from './AddMappingDialog';
import MappingClient from './mapping-client';
import { getServerT } from '@/lib/i18n/server';

// Fetch warehouses directly from API for the dropdown
async function getWarehouses() {
    try {
        const res = await fetch('http://localhost:3001/api/warehouses', { cache: 'no-store' });
        if (!res.ok) return [];
        return await res.json();
    } catch {
        return [];
    }
}

export default async function DepartmentMappingsPage() {
    const { t } = await getServerT();
    const mappings = await getDepartmentMappings();
    const uniqueDepartments = await getUniqueDepartments();
    const warehouses = await getWarehouses();

    // Filter out departments that are already mapped
    const mappedDepartments = new Set(mappings.map((m: any) => m.department));
    const availableDepartments = uniqueDepartments.filter((d: string) => !mappedDepartments.has(d));

    return (
        <div className="container mx-auto py-10 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">{t('settings.departments.title')}</h2>
                    <p className="text-slate-500">{t('settings.departments.subtitle')}</p>
                </div>
                <AddMappingDialog uniqueDepartments={availableDepartments} warehouses={warehouses} />
            </div>

            <MappingClient initialMappings={mappings} warehouses={warehouses} />
        </div>
    );
}
