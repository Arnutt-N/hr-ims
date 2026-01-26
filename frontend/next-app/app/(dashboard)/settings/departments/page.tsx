import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDepartmentMappings, getUniqueDepartments, deleteDepartmentMapping } from '@/lib/actions/departments';
import AddMappingDialog from './AddMappingDialog';
import DeleteMappingButton from './DeleteMappingButton';
import MappingClient from './mapping-client';

// Fetch warehouses directly from API for the dropdown
async function getWarehouses() {
    try {
        const res = await fetch('http://localhost:3001/api/warehouses', { cache: 'no-store' });
        if (!res.ok) return [];
        return await res.json();
    } catch (e) {
        return [];
    }
}

export default async function DepartmentMappingsPage() {
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
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">Department Mapping</h2>
                    <p className="text-slate-500">Configure default warehouses for each department.</p>
                </div>
                <AddMappingDialog uniqueDepartments={availableDepartments} warehouses={warehouses} />
            </div>

            <MappingClient initialMappings={mappings} />
        </div>
    );
}
