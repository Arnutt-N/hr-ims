'use client';

import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import InventoryItemActions from './InventoryItemActions';
import { useRouter } from 'next/navigation';

interface InventoryItem {
    id: number;
    name: string;
    serial: string | null;
    category: string;
    type: string;
    status: string;
    stock: number;
}

export default function InventoryTableRow({ item }: { item: InventoryItem }) {
    const router = useRouter();

    const handleRowClick = () => {
        router.push(`/inventory/${item.id}`);
    };

    return (
        <TableRow
            className="hover:bg-slate-50/50 cursor-pointer transition-colors"
            onClick={handleRowClick}
        >
            <TableCell className="font-mono text-xs text-slate-500">#{item.id}</TableCell>
            <TableCell>
                <div>
                    <div className="font-medium text-slate-900">{item.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{item.serial || '-'}</div>
                </div>
            </TableCell>
            <TableCell>
                <span className="text-xs font-medium px-2 py-1 bg-slate-100 rounded-md text-slate-600">
                    {item.category}
                </span>
            </TableCell>
            <TableCell className="capitalize text-slate-600">{item.type}</TableCell>
            <TableCell>
                <Badge
                    variant={
                        item.status === 'available'
                            ? 'success'
                            : item.status === 'maintenance'
                                ? 'destructive'
                                : 'secondary'
                    }
                    className="rounded-md capitalize"
                >
                    {item.status}
                </Badge>
            </TableCell>
            <TableCell className="text-right font-medium">{item.stock}</TableCell>
            <TableCell>
                <InventoryItemActions itemId={item.id} />
            </TableCell>
        </TableRow>
    );
}
