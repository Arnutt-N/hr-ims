import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, ArrowLeft, Edit, TrendingUp, Settings } from 'lucide-react';
import Link from 'next/link';
import StockLevelsTab from './StockLevelsTab';
import StockHistoryTab from './StockHistoryTab';
import ItemHeaderActions from './ItemHeaderActions';
import Image from 'next/image';

export const metadata = {
    title: 'Item Details | HR-IMS',
};

async function ItemDetailData({ id }: { id: number }) {
    const item = await prisma.inventoryItem.findUnique({
        where: { id },
        include: {
            stockLevels: {
                include: { warehouse: true }
            }
        }
    });

    if (!item) {
        notFound();
    }

    const totalStock = item.stockLevels.reduce((sum, level) => sum + level.quantity, 0);

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <Card className="shadow-lg border-slate-200">
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <div className="flex gap-4">
                            {item.image ? (
                                <div className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-slate-200">
                                    <Image src={item.image} alt={item.name} fill className="object-cover" />
                                </div>
                            ) : (
                                <div className="w-20 h-20 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg flex items-center justify-center border-2 border-slate-200">
                                    <Package className="h-10 w-10 text-indigo-400" />
                                </div>
                            )}
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <CardTitle className="text-2xl text-slate-800">{item.name}</CardTitle>
                                    <ItemHeaderActions item={item} />
                                </div>
                                <div className="flex gap-2 items-center">
                                    <Badge variant="outline" className="font-mono text-xs">
                                        #{item.id}
                                    </Badge>
                                    <Badge className="capitalize">
                                        {item.type}
                                    </Badge>
                                    <Badge
                                        variant={item.status === 'available' ? 'success' : item.status === 'maintenance' ? 'destructive' : 'secondary'}
                                        className="capitalize"
                                    >
                                        {item.status}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-slate-500 mb-1">Total Stock</div>
                            <div className="text-3xl font-bold text-indigo-600">{totalStock}</div>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-slate-100">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="stock-levels">Stock Levels</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Package className="h-5 w-5" />
                                Item Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-sm font-medium text-slate-500">Category</div>
                                    <div className="text-base text-slate-900">{item.category}</div>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-slate-500">Serial Number</div>
                                    <div className="text-base text-slate-900 font-mono">{item.serial || 'N/A'}</div>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-slate-500">Created At</div>
                                    <div className="text-base text-slate-900">
                                        {new Date(item.createdAt).toLocaleDateString('th-TH')}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-slate-500">Last Updated</div>
                                    <div className="text-base text-slate-900">
                                        {new Date(item.updatedAt).toLocaleDateString('th-TH')}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="stock-levels" className="mt-6">
                    <StockLevelsTab itemId={id} stockLevels={item.stockLevels} />
                </TabsContent>

                <TabsContent value="history" className="mt-6">
                    <Suspense fallback={<HistorySkeleton />}>
                        <StockHistoryTab itemId={id} />
                    </Suspense>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function HistorySkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

export default async function InventoryDetailPage({ params }: { params: { id: string } }) {
    const id = parseInt(params.id);

    return (
        <div className="container mx-auto py-6 space-y-4">
            <div className="flex items-center gap-4">
                <Link href="/inventory">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Inventory
                    </Button>
                </Link>
            </div>

            <Suspense fallback={<DetailSkeleton />}>
                <ItemDetailData id={id} />
            </Suspense>
        </div>
    );
}

function DetailSkeleton() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between">
                        <div className="flex gap-4">
                            <Skeleton className="w-20 h-20 rounded-lg" />
                            <div className="space-y-2">
                                <Skeleton className="h-8 w-64" />
                                <Skeleton className="h-5 w-48" />
                            </div>
                        </div>
                        <Skeleton className="h-12 w-24" />
                    </div>
                </CardHeader>
            </Card>
            <Skeleton className="h-96 w-full" />
        </div>
    );
}
