import Pagination from '@/components/ui/pagination';
import Search from '@/components/ui/search';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { fetchInventoryItems, fetchInventoryPages } from '@/lib/actions/inventory';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';

export default async function InventoryPage({
    searchParams,
}: {
    searchParams?: {
        query?: string;
        page?: string;
    };
}) {
    const query = searchParams?.query || '';
    const currentPage = Number(searchParams?.page) || 1;

    const totalPages = await fetchInventoryPages(query);
    const items = await fetchInventoryItems(query, currentPage);

    return (
        <div className="w-full space-y-4">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Inventory</h2>
                <div className="flex items-center space-x-2">
                    <Link href="/inventory/create">
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="flex items-center justify-between gap-2 bg-white p-4 rounded-lg border shadow-sm">
                <div className="w-full md:w-1/3">
                    <Search placeholder="Search items..." />
                </div>
            </div>

            <div className="rounded-md border bg-white shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Serial</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Stock</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                                    No items found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.id}</TableCell>
                                    <TableCell>{item.name}</TableCell>
                                    <TableCell>{item.category}</TableCell>
                                    <TableCell className="capitalize">{item.type}</TableCell>
                                    <TableCell>{item.serial || '-'}</TableCell>
                                    <TableCell>
                                        <Badge variant={item.status === 'available' ? 'success' : item.status === 'maintenance' ? 'destructive' : 'secondary'}>
                                            {item.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{item.stock}</TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex justify-center">
                <Pagination totalPages={totalPages} />
            </div>
        </div>
    );
}
