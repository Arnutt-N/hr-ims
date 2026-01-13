'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Trash, Package, ArrowRight, Check } from 'lucide-react';
import { receiveGoods } from '@/lib/actions/stock-transaction';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
    warehouseId: z.string().min(1, 'Warehouse is required'),
    referenceId: z.string().optional(),
    note: z.string().optional(),
    items: z.array(z.object({
        itemId: z.string().min(1, 'Item is required'),
        quantity: z.number().min(1, 'Quantity must be at least 1')
    })).min(1, 'At least one item is required')
});

type FormValues = z.infer<typeof formSchema>;

export default function GoodsReceiptForm({
    warehouses,
    inventoryItems
}: {
    warehouses: any[],
    inventoryItems: any[]
}) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            items: [{ itemId: '', quantity: 1 }]
        }
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'items'
    });

    const onSubmit = async (data: FormValues) => {
        setIsSubmitting(true);
        try {
            const payload = {
                warehouseId: parseInt(data.warehouseId),
                referenceId: data.referenceId,
                note: data.note,
                items: data.items.map(item => ({
                    itemId: parseInt(item.itemId),
                    quantity: item.quantity
                })),
                userId: 1, // Mock user ID, ideally simple mock for now or fetched from env
            };

            const result = await receiveGoods(payload);

            if (result.success) {
                toast({
                    title: 'Success',
                    description: result.message,
                });
                form.reset();
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
        <Card className="w-full max-w-4xl mx-auto shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Package className="h-6 w-6 text-primary" />
                    Receive Goods
                </CardTitle>
                <CardDescription>
                    Record inbound stock from suppliers or initial stock entry.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Destination Warehouse</Label>
                            <Select
                                onValueChange={(val) => form.setValue('warehouseId', val)}
                                defaultValue={form.getValues('warehouseId')}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select warehouse..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {warehouses.map(wh => (
                                        <SelectItem key={wh.id} value={wh.id.toString()}>
                                            {wh.name} ({wh.code})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {form.formState.errors.warehouseId && (
                                <p className="text-sm text-red-500">{form.formState.errors.warehouseId.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Reference No. (Optional)</Label>
                            <Input {...form.register('referenceId')} placeholder="PO-123456" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Items</Label>
                        <div className="max-h-[400px] overflow-y-auto space-y-3 p-1">
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex gap-3 items-end p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
                                    <div className="flex-1 space-y-2">
                                        <Label className="text-xs text-muted-foreground">Item Name</Label>
                                        <Select
                                            onValueChange={(val) => form.setValue(`items.${index}.itemId`, val)}
                                            defaultValue={field.itemId}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select item..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {inventoryItems.map(item => (
                                                    <SelectItem key={item.id} value={item.id.toString()}>
                                                        {item.name} ({item.category})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="w-32 space-y-2">
                                        <Label className="text-xs text-muted-foreground">Quantity</Label>
                                        <Input
                                            type="number"
                                            {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive"
                                        onClick={() => remove(index)}
                                        disabled={fields.length === 1}
                                    >
                                        <Trash className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => append({ itemId: '', quantity: 1 })}
                        >
                            <Plus className="mr-2 h-4 w-4" /> Add Item
                        </Button>
                        {form.formState.errors.items && (
                            <p className="text-sm text-red-500">{form.formState.errors.items.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Note (Optional)</Label>
                        <Textarea {...form.register('note')} placeholder="Additional details..." />
                    </div>

                    <div className="pt-4 border-t flex justify-end">
                        <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                                </>
                            ) : (
                                <>
                                    <Check className="mr-2 h-4 w-4" /> Confirm Receipt
                                </>
                            )}
                        </Button>
                    </div>

                </form>
            </CardContent>
        </Card>
    );
}
