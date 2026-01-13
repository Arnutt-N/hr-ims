'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { adjustStockQuantity } from '@/lib/actions/stock-management';
import { Loader2, Plus, Minus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdjustStockDialog({
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
    const [adjustment, setAdjustment] = useState<number>(0);
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!stockLevel || adjustment === 0) return;

        setIsSubmitting(true);
        try {
            const result = await adjustStockQuantity(
                stockLevel.warehouseId,
                itemId,
                adjustment,
                note,
                1 // Mock user ID
            );

            if (result.success) {
                toast({
                    title: 'Success',
                    description: result.message,
                });
                onOpenChange(false);
                setAdjustment(0);
                setNote('');
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

    const newQuantity = stockLevel ? stockLevel.quantity + adjustment : 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Adjust Stock Quantity</DialogTitle>
                    <DialogDescription>
                        {stockLevel && `${stockLevel.warehouse.name} - Current: ${stockLevel.quantity}`}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Adjustment</Label>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setAdjustment(Math.max(-stockLevel?.quantity || 0, adjustment - 1))}
                                disabled={!stockLevel}
                            >
                                <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                                type="number"
                                value={adjustment}
                                onChange={(e) => setAdjustment(parseInt(e.target.value) || 0)}
                                className="text-center font-medium text-lg"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setAdjustment(adjustment + 1)}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="text-sm text-slate-500">
                            New quantity: <span className="font-medium text-slate-900">{newQuantity}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="note">Note (Optional)</Label>
                        <Textarea
                            id="note"
                            placeholder="Reason for adjustment..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting || adjustment === 0}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Adjusting...
                            </>
                        ) : (
                            'Confirm Adjustment'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
