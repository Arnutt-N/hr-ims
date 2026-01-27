'use client';

import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';

export default function InventoryItemActions({ itemId }: { itemId: number }) {
    const router = useRouter();

    const handleEdit = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        router.push(`/inventory/${itemId}/edit`);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Implement delete logic or open dialog here
        console.log('Delete item', itemId);
    };

    const handleView = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        router.push(`/inventory/${itemId}`);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:cursor-pointer hover:bg-slate-200"
                    onClick={(e: React.MouseEvent) => {
                        // Crucial: Prevent the row Link from triggering
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                >
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4 text-slate-500" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleView} className="cursor-pointer">
                    View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
                    Edit Item
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-red-600 cursor-pointer">
                    Delete Item
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
