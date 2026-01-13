import { getStockHistory } from '@/lib/actions/stock-management';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { History, ArrowUp, ArrowDown, RefreshCw, Package } from 'lucide-react';
import Link from 'next/link';

const typeIcons = {
    inbound: <ArrowDown className="h-4 w-4 text-green-600" />,
    outbound: <ArrowUp className="h-4 w-4 text-red-600" />,
    transfer_in: <ArrowDown className="h-4 w-4 text-blue-600" />,
    transfer_out: <ArrowUp className="h-4 w-4 text-orange-600" />,
    adjustment: <RefreshCw className="h-4 w-4 text-purple-600" />,
};

const typeLabels = {
    inbound: 'Received',
    outbound: 'Issued',
    transfer_in: 'Transfer In',
    transfer_out: 'Transfer Out',
    adjustment: 'Adjustment',
};

const typeColors = {
    inbound: 'success',
    outbound: 'destructive',
    transfer_in: 'default',
    transfer_out: 'secondary',
    adjustment: 'outline',
} as const;

export default async function StockHistoryTab({
    itemId,
    page = 1
}: {
    itemId: number;
    page?: number;
}) {
    const { transactions, pagination } = await getStockHistory(itemId, page, 20);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Stock Movement History
                </CardTitle>
                <CardDescription>
                    Complete audit trail of all stock changes
                </CardDescription>
            </CardHeader>
            <CardContent>
                {transactions.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        <History className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                        <p>No transaction history found</p>
                    </div>
                ) : (
                    <>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                    <TableHead>Warehouse</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Reference/Note</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map((txn) => (
                                    <TableRow key={txn.id}>
                                        <TableCell className="font-mono text-xs text-slate-600">
                                            {new Date(txn.createdAt).toLocaleString('th-TH', {
                                                dateStyle: 'short',
                                                timeStyle: 'short'
                                            })}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {typeIcons[txn.type as keyof typeof typeIcons]}
                                                <Badge variant={typeColors[txn.type as keyof typeof typeColors]}>
                                                    {typeLabels[txn.type as keyof typeof typeLabels]}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            <span className={txn.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                                                {txn.quantity > 0 ? '+' : ''}{txn.quantity}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <div className="text-sm font-medium">{txn.warehouse.name}</div>
                                                <div className="text-xs text-slate-500 font-mono">{txn.warehouse.code}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">{txn.user.name || txn.user.email}</div>
                                        </TableCell>
                                        <TableCell className="max-w-xs">
                                            <div className="text-sm text-slate-600 truncate">
                                                {txn.referenceId && (
                                                    <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
                                                        {txn.referenceId}
                                                    </span>
                                                )}
                                                {txn.note && (
                                                    <span className="text-xs ml-2">{txn.note}</span>
                                                )}
                                                {!txn.referenceId && !txn.note && '-'}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                <div className="text-sm text-slate-600">
                                    Showing {((pagination.page - 1) * pagination.perPage) + 1} to{' '}
                                    {Math.min(pagination.page * pagination.perPage, pagination.total)} of{' '}
                                    {pagination.total} transactions
                                </div>
                                <div className="flex gap-2">
                                    <Link
                                        href={`/inventory/${itemId}?tab=history&page=${pagination.page - 1}`}
                                        scroll={false}
                                    >
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={pagination.page === 1}
                                        >
                                            Previous
                                        </Button>
                                    </Link>
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                            let pageNum;
                                            if (pagination.totalPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (pagination.page <= 3) {
                                                pageNum = i + 1;
                                            } else if (pagination.page >= pagination.totalPages - 2) {
                                                pageNum = pagination.totalPages - 4 + i;
                                            } else {
                                                pageNum = pagination.page - 2 + i;
                                            }

                                            return (
                                                <Link
                                                    key={pageNum}
                                                    href={`/inventory/${itemId}?tab=history&page=${pageNum}`}
                                                    scroll={false}
                                                >
                                                    <Button
                                                        variant={pagination.page === pageNum ? 'default' : 'outline'}
                                                        size="sm"
                                                    >
                                                        {pageNum}
                                                    </Button>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                    <Link
                                        href={`/inventory/${itemId}?tab=history&page=${pagination.page + 1}`}
                                        scroll={false}
                                    >
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={pagination.page === pagination.totalPages}
                                        >
                                            Next
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
