import { Suspense } from 'react';
import prisma from '@/lib/prisma';
import GoodsReceiptForm from './GoodsReceiptForm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
    title: 'Receive Goods | HR-IMS',
    description: 'Inbound stock management',
};

async function GoodsReceiptData() {
    const [warehouses, items] = await Promise.all([
        prisma.warehouse.findMany({
            where: { isActive: true },
            orderBy: { id: 'asc' }
        }),
        prisma.inventoryItem.findMany({
            select: { id: true, name: true, category: true, type: true },
            orderBy: { name: 'asc' }
        })
    ]);

    return <GoodsReceiptForm warehouses={warehouses} inventoryItems={items} />;
}

export default function ReceiveGoodsPage() {
    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold tracking-tight">Inbound Management</h1>
                <p className="text-muted-foreground">
                    Receive goods into warehouse inventory.
                </p>
            </div>

            <Suspense fallback={<GoodsReceiptSkeleton />}>
                <GoodsReceiptData />
            </Suspense>
        </div>
    );
}

function GoodsReceiptSkeleton() {
    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-96 mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-10 w-32 ml-auto" />
            </CardContent>
        </Card>
    );
}
