"use client";

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Warehouse {
    id: number;
    name: string;
    code: string;
    type: string;
    isActive: boolean;
    _count?: {
        stockLevels: number;
    };
}

interface WarehouseSelectorProps {
    value?: number;
    onChange: (warehouseId: number) => void;
    type?: 'central' | 'division' | 'all';
    disabled?: boolean;
    placeholder?: string;
}

export default function WarehouseSelector({
    value,
    onChange,
    type = 'all',
    disabled = false,
    placeholder = 'เลือกคลังพัสดุ'
}: WarehouseSelectorProps) {
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWarehouses();
    }, []);

    const fetchWarehouses = async () => {
        try {
            const res = await fetch('/api/warehouses');
            const data = await res.json();

            // Filter by type if specified
            const filtered = type === 'all'
                ? data
                : data.filter((wh: Warehouse) => wh.type === type);

            setWarehouses(filtered);
        } catch (error) {
            console.error('Failed to fetch warehouses:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Select disabled>
                <SelectTrigger>
                    <SelectValue placeholder="กำลังโหลด..." />
                </SelectTrigger>
            </Select>
        );
    }

    return (
        <Select
            value={value?.toString()}
            onValueChange={(val) => onChange(parseInt(val))}
            disabled={disabled}
        >
            <SelectTrigger>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                        <div className="flex items-center gap-2">
                            <span className="font-medium">{warehouse.name}</span>
                            <span className="text-xs text-gray-500">({warehouse.code})</span>
                            {warehouse._count && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                    {warehouse._count.stockLevels} รายการ
                                </span>
                            )}
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
