"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Package, ArrowRight } from 'lucide-react';
import WarehouseSelector from './WarehouseSelector';

interface InventoryItem {
    id: number;
    name: string;
    category: string;
    serial?: string;
}

interface StockLevel {
    warehouseId: number;
    itemId: number;
    quantity: number;
    item: InventoryItem;
}

interface StockTransferFormProps {
    userId: number;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export default function StockTransferForm({ userId, onSuccess, onCancel }: StockTransferFormProps) {
    const [fromWarehouseId, setFromWarehouseId] = useState<number>();
    const [toWarehouseId, setToWarehouseId] = useState<number>();
    const [itemId, setItemId] = useState<number>();
    const [quantity, setQuantity] = useState<number>(1);
    const [note, setNote] = useState('');

    const [availableItems, setAvailableItems] = useState<StockLevel[]>([]);
    const [selectedStock, setSelectedStock] = useState<StockLevel | null>(null);
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(false);

    // Fetch available items when source warehouse changes
    useEffect(() => {
        if (fromWarehouseId) {
            fetchAvailableItems(fromWarehouseId);
        } else {
            setAvailableItems([]);
            setItemId(undefined);
        }
    }, [fromWarehouseId]);

    // Update selected stock when item changes
    useEffect(() => {
        if (itemId) {
            const stock = availableItems.find(s => s.itemId === itemId);
            setSelectedStock(stock || null);
        } else {
            setSelectedStock(null);
        }
    }, [itemId, availableItems]);

    const fetchAvailableItems = async (warehouseId: number) => {
        try {
            const res = await fetch(`/api/stock-levels?warehouseId=${warehouseId}`);
            const data = await res.json();
            setAvailableItems(data.filter((s: StockLevel) => s.quantity > 0));
        } catch (err) {
            console.error('Failed to fetch items:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!fromWarehouseId || !toWarehouseId || !itemId) {
            setError('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }

        if (fromWarehouseId === toWarehouseId) {
            setError('ไม่สามารถโอนภายในคลังเดียวกันได้');
            return;
        }

        if (selectedStock && quantity > selectedStock.quantity) {
            setError(`จำนวนคงเหลือไม่เพียงพอ (มีอยู่ ${selectedStock.quantity} ชิ้น)`);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/stock-transfers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromWarehouseId,
                    toWarehouseId,
                    itemId,
                    quantity,
                    note,
                    requestedBy: userId
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create transfer request');
            }

            // Reset form
            setFromWarehouseId(undefined);
            setToWarehouseId(undefined);
            setItemId(undefined);
            setQuantity(1);
            setNote('');

            onSuccess?.();
        } catch (err: any) {
            setError(err.message || 'เกิดข้อผิดพลาดในการส่งคำขอ');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* From Warehouse */}
                <div className="space-y-2">
                    <Label htmlFor="from-warehouse">คลังต้นทาง *</Label>
                    <WarehouseSelector
                        value={fromWarehouseId}
                        onChange={setFromWarehouseId}
                        type="all"
                        placeholder="เลือกคลังต้นทาง"
                    />
                </div>

                {/* To Warehouse */}
                <div className="space-y-2">
                    <Label htmlFor="to-warehouse">คลังปลายทาง *</Label>
                    <WarehouseSelector
                        value={toWarehouseId}
                        onChange={setToWarehouseId}
                        type="all"
                        placeholder="เลือกคลังปลายทาง"
                    />
                </div>
            </div>

            {/* Item Selection */}
            <div className="space-y-2">
                <Label htmlFor="item">รายการพัสดุ *</Label>
                <Select
                    value={itemId?.toString()}
                    onValueChange={(val) => setItemId(parseInt(val))}
                    disabled={!fromWarehouseId || availableItems.length === 0}
                >
                    <SelectTrigger>
                        <SelectValue placeholder={
                            !fromWarehouseId
                                ? "เลือกคลังต้นทางก่อน"
                                : availableItems.length === 0
                                    ? "ไม่มีสินค้าในคลังนี้"
                                    : "เลือกรายการพัสดุ"
                        } />
                    </SelectTrigger>
                    <SelectContent>
                        {availableItems.map((stock) => (
                            <SelectItem key={stock.itemId} value={stock.itemId.toString()}>
                                <div className="flex justify-between items-center w-full">
                                    <span>{stock.item.name}</span>
                                    <span className="text-xs text-gray-500 ml-4">
                                        คงเหลือ: {stock.quantity}
                                    </span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
                <Label htmlFor="quantity">
                    จำนวนที่ต้องการโอน *
                    {selectedStock && (
                        <span className="text-sm text-gray-500 ml-2">
                            (คงเหลือ: {selectedStock.quantity})
                        </span>
                    )}
                </Label>
                <Input
                    id="quantity"
                    type="number"
                    min={1}
                    max={selectedStock?.quantity || 999}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value))}
                    disabled={!itemId}
                />
            </div>

            {/* Note */}
            <div className="space-y-2">
                <Label htmlFor="note">หมายเหตุ</Label>
                <Textarea
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="ระบุเหตุผลหรือรายละเอียดเพิ่มเติม..."
                    rows={3}
                />
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
                {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel}>
                        ยกเลิก
                    </Button>
                )}
                <Button type="submit" disabled={loading}>
                    {loading ? '  กำลังส่งคำขอ...' : 'ส่งคำขอโอนพัสดุ'}
                </Button>
            </div>
        </form>
    );
}
