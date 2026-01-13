'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Warehouse, TrendingUp, Settings, Plus, Minus } from 'lucide-react';
import AdjustStockDialog from './AdjustStockDialog';
import SetLimitsDialog from './SetLimitsDialog';

export default function StockLevelsTab({
    itemId,
    stockLevels
}: {
    itemId: number,
    stockLevels: any[]
}) {
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role || 'user';

    // Check if user can adjust stock or set limits
    const canManageStock = ['superadmin', 'admin', 'approver'].includes(userRole);

    const [adjustDialog, setAdjustDialog] = useState<{ open: boolean; level: any | null }>({
        open: false,
        level: null
    });
    const [limitsDialog, setLimitsDialog] = useState<{ open: boolean; level: any | null }>({
        open: false,
        level: null
    });

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Warehouse className="h-5 w-5" />
                        Stock Levels by Warehouse
                    </CardTitle>
                    <CardDescription>
                        View and manage stock across different warehouses
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {stockLevels.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <Warehouse className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                            <p>No stock levels found</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Warehouse</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                    <TableHead className="text-center">Min Stock</TableHead>
                                    <TableHead className="text-center">Max Stock</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stockLevels.map((level) => {
                                    const isLow = level.minStock && level.quantity <= level.minStock;
                                    const isHigh = level.maxStock && level.quantity >= level.maxStock;

                                    return (
                                        <TableRow key={level.id}>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium text-slate-900">{level.warehouse.name}</div>
                                                    <div className="text-xs text-slate-500 font-mono">{level.warehouse.code}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-lg">
                                                {level.quantity}
                                            </TableCell>
                                            <TableCell className="text-center text-slate-600">
                                                {level.minStock ?? '-'}
                                            </TableCell>
                                            <TableCell className="text-center text-slate-600">
                                                {level.maxStock ?? '-'}
                                            </TableCell>
                                            <TableCell>
                                                {isLow ? (
                                                    <Badge variant="destructive">Low Stock</Badge>
                                                ) : isHigh ? (
                                                    <Badge variant="secondary">High Stock</Badge>
                                                ) : (
                                                    <Badge variant="success">Normal</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {canManageStock ? (
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => setAdjustDialog({ open: true, level })}
                                                        >
                                                            <TrendingUp className="mr-1 h-3 w-3" />
                                                            Adjust
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => setLimitsDialog({ open: true, level })}
                                                        >
                                                            <Settings className="mr-1 h-3 w-3" />
                                                            Limits
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="text-sm text-slate-400 italic">View only</div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <AdjustStockDialog
                open={adjustDialog.open}
                onOpenChange={(open) => setAdjustDialog({ open, level: null })}
                stockLevel={adjustDialog.level}
                itemId={itemId}
            />

            <SetLimitsDialog
                open={limitsDialog.open}
                onOpenChange={(open) => setLimitsDialog({ open, level: null })}
                stockLevel={limitsDialog.level}
                itemId={itemId}
            />
        </>
    );
}
