'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { updateStockLimits } from '@/lib/actions/stock-management';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SetLimitsDialog({
    open,
    onOpenChange,
    stockLevel,
    itemId
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    stockLevel: any | null;
    itemId: number;
}) {
    const router = useRouter();
    const { toast } = useToast();
    const [minStock, setMinStock] = useState<number | undefined>(undefined);
    const [maxStock, setMaxStock] = useState<number | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (stockLevel) {
            setMinStock(stockLevel.minStock ?? undefined);
            setMaxStock(stockLevel.maxStock ?? undefined);
        }
    }, [stockLevel]);

    const handleSubmit = async () => {
        if (!stockLevel) return;

        setIsSubmitting(true);
        try {
            const result = await updateStockLimits(
                stockLevel.warehouseId,
                itemId,
                minStock,
                maxStock
            );

            if (result.success) {
                toast({
                    title: 'Success',
                    description: result.message,
                });
                onOpenChange(false);
                router.refresh();
            } else {
                toast({
                    title: 'Error',
                    description: result.message,
                    variant: 'destructive'
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Something went wrong',
                variant: 'destructive'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Set Stock Limits</DialogTitle>
                    <DialogDescription>
                        {stockLevel && `Configure alerts for ${stockLevel.warehouse.name}`}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="minStock">Minimum Stock</Label>
                        <Input
                            id="minStock"
                            type="number"
                            placeholder="e.g. 10"
                            value={minStock ?? ''}
                            onChange={(e) => setMinStock(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                        <p className="text-xs text-slate-500">
                            Alert when stock falls below this level
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="maxStock">Maximum Stock</Label>
                        <Input
                            id="maxStock"
                            type="number"
                            placeholder="e.g. 100"
                            value={maxStock ?? ''}
                            onChange={(e) => setMaxStock(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                        <p className="text-xs text-slate-500">
                            Alert when stock exceeds this level
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Limits'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
