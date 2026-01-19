import { getWarehouses } from '@/lib/actions/warehouse';
import { WarehouseClient } from '@/components/settings/warehouse-client';
import { Skeleton } from '@/components/ui/skeleton';
import { Suspense } from 'react';

export const metadata = {
    title: 'Warehouse Management | IMS',
    description: 'Configure warehouses and assign managers.',
};

export default async function WarehousesPage() {
    const res = await getWarehouses();
    const warehouses = res.success ? res.warehouses : [];

    return (
        <Suspense fallback={<WarehouseSkeleton />}>
            <WarehouseClient initialWarehouses={warehouses} />
        </Suspense>
    );
}

function WarehouseSkeleton() {
    return (
        <div className="space-y-6 max-w-5xl mx-auto p-6">
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>
            <div className="border rounded-lg h-[400px]">
                <div className="p-4 border-b">
                    <Skeleton className="h-8 w-full" />
                </div>
                <div className="p-4 space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
            </div>
        </div>
    );
}
