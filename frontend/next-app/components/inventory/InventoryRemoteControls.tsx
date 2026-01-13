"use client";

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import WarehouseSelector from '@/components/warehouse/WarehouseSelector';

export default function InventoryRemoteControls() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', '1');
        if (term) {
            params.set('query', term);
        } else {
            params.delete('query');
        }
        replace(`${pathname}?${params.toString()}`);
    }, 300);

    const handleWarehouseChange = (warehouseId: number) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', '1');
        params.set('warehouse', warehouseId.toString());
        replace(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="flex flex-col md:flex-row gap-4 w-full">
            {/* Search */}
            <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                    placeholder="Search items..."
                    className="pl-9 bg-slate-50 border-slate-200"
                    onChange={(e) => handleSearch(e.target.value)}
                    defaultValue={searchParams.get('query')?.toString()}
                />
            </div>

            {/* Warehouse Filter */}
            <div className="w-full md:w-[250px]">
                <WarehouseSelector
                    value={searchParams.get('warehouse') ? parseInt(searchParams.get('warehouse')!) : undefined}
                    onChange={handleWarehouseChange}
                    placeholder="Filter by Warehouse"
                    type="all"
                />
            </div>
        </div>
    );
}
