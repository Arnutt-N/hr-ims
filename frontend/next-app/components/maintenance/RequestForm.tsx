'use client';

import { useEffect, useState, useTransition } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { TagInput } from './TagInput';
import { DepartmentSelect } from './DepartmentSelect';
import {
    SEVERITY_LEVELS,
    PRIORITY_LEVELS,
    CATEGORIES,
    type Severity,
    type Priority,
    type Category,
} from '@/lib/maintenance/types';

interface InventoryItemLite {
    id: number;
    name: string;
    serial?: string | null;
}

interface RequestFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultItemIds?: number[];
    onSuccess?: () => void;
}

const SEVERITY_LABELS: Record<Severity, string> = {
    low: 'ต่ำ',
    medium: 'กลาง',
    high: 'สูง',
    critical: 'วิกฤต',
};

const PRIORITY_LABELS: Record<Priority, string> = {
    low: 'ต่ำ',
    normal: 'ปกติ',
    high: 'เร่งด่วน',
    urgent: 'ด่วนมาก',
};

const CATEGORY_LABELS: Record<Category, string> = {
    electrical: 'ไฟฟ้า',
    mechanical: 'เครื่องกล',
    software: 'ซอฟต์แวร์',
    physical: 'กายภาพ',
    other: 'อื่นๆ',
};

export function RequestForm({ open, onOpenChange, defaultItemIds, onSuccess }: RequestFormProps) {
    const [items, setItems] = useState<InventoryItemLite[]>([]);
    const [selectedItemIds, setSelectedItemIds] = useState<number[]>(defaultItemIds ?? []);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [severity, setSeverity] = useState<Severity>('medium');
    const [priority, setPriority] = useState<Priority>('normal');
    const [category, setCategory] = useState<Category>('other');
    const [tags, setTags] = useState<string[]>([]);
    const [locationId, setLocationId] = useState<number | null>(null);
    const [estimatedCost, setEstimatedCost] = useState('');
    const [pending, startTransition] = useTransition();
    const itemPickerLocked = (defaultItemIds?.length ?? 0) > 0;

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        async function loadItems() {
            try {
                const { fetchInventoryItems } = await import('@/lib/actions/inventory');
                const result = await fetchInventoryItems('', 1, 'all');
                if (cancelled) return;
                if (result && Array.isArray(result)) {
                    setItems(
                        result.map((i: { id: number; name: string; serial?: string | null }) => ({
                            id: i.id,
                            name: i.name,
                            serial: i.serial,
                        })),
                    );
                }
            } catch {
                // silently degrade — item picker will be empty
            }
        }
        void loadItems();
        return () => {
            cancelled = true;
        };
    }, [open]);

    useEffect(() => {
        if (open && defaultItemIds) setSelectedItemIds(defaultItemIds);
    }, [open, defaultItemIds]);

    const reset = () => {
        setSelectedItemIds(defaultItemIds ?? []);
        setTitle('');
        setDescription('');
        setSeverity('medium');
        setPriority('normal');
        setCategory('other');
        setTags([]);
        setLocationId(null);
        setEstimatedCost('');
    };

    const handleSubmit = () => {
        if (selectedItemIds.length === 0) {
            toast.error('กรุณาเลือกอุปกรณ์อย่างน้อย 1 รายการ');
            return;
        }
        if (!title.trim()) {
            toast.error('กรุณากรอกหัวข้อ');
            return;
        }
        if (!description.trim()) {
            toast.error('กรุณากรอกรายละเอียด');
            return;
        }

        startTransition(async () => {
            try {
                const { createMaintenanceRequest } = await import('@/lib/actions/maintenance');
                const result = await createMaintenanceRequest({
                    itemIds: selectedItemIds,
                    title: title.trim(),
                    description: description.trim(),
                    severity,
                    priority,
                    category,
                    tags: tags.length > 0 ? tags : undefined,
                    locationId: locationId ?? undefined,
                    estimatedCost: estimatedCost ? Number.parseFloat(estimatedCost) : undefined,
                });
                if (result && 'success' in result && result.success) {
                    toast.success('แจ้งซ่อมเรียบร้อย');
                    reset();
                    onOpenChange(false);
                    onSuccess?.();
                } else {
                    toast.error(('error' in result && result.error) || 'แจ้งซ่อมไม่สำเร็จ');
                }
            } catch (err) {
                toast.error(err instanceof Error ? err.message : 'แจ้งซ่อมไม่สำเร็จ');
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>แจ้งซ่อมอุปกรณ์</DialogTitle>
                    <DialogDescription>
                        เลือกอุปกรณ์ + กรอกรายละเอียด ระบบจะส่งให้ผู้ดูแลตรวจรับ
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Items picker */}
                    <div className="grid gap-2">
                        <Label>อุปกรณ์ที่เสีย ({selectedItemIds.length} รายการ)</Label>
                        {itemPickerLocked ? (
                            <p className="text-sm text-slate-600">
                                {items
                                    .filter((i) => selectedItemIds.includes(i.id))
                                    .map((i) => i.name)
                                    .join(', ') || 'กำลังโหลด...'}
                            </p>
                        ) : (
                            <select
                                multiple
                                value={selectedItemIds.map(String)}
                                onChange={(e) => {
                                    const opts = Array.from(e.target.selectedOptions).map((o) =>
                                        Number.parseInt(o.value, 10),
                                    );
                                    setSelectedItemIds(opts.slice(0, 20));
                                }}
                                disabled={pending}
                                className="h-32 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                {items.map((i) => (
                                    <option key={i.id} value={i.id}>
                                        {i.name}
                                        {i.serial ? ` (${i.serial})` : ''}
                                    </option>
                                ))}
                            </select>
                        )}
                        <p className="text-xs text-slate-500">เลือกได้สูงสุด 20 รายการ</p>
                    </div>

                    {/* Title */}
                    <div className="grid gap-2">
                        <Label htmlFor="mr-title">หัวข้อ</Label>
                        <Input
                            id="mr-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="เช่น จอภาพไม่ติด"
                            disabled={pending}
                            maxLength={200}
                        />
                    </div>

                    {/* Description */}
                    <div className="grid gap-2">
                        <Label htmlFor="mr-desc">รายละเอียด</Label>
                        <Textarea
                            id="mr-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="อาการ + ขั้นตอนทำซ้ำ"
                            disabled={pending}
                            rows={3}
                            maxLength={5000}
                        />
                    </div>

                    {/* Severity + Priority + Category — 3 selects */}
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="grid gap-2">
                            <Label htmlFor="mr-sev">ผลกระทบ</Label>
                            <select
                                id="mr-sev"
                                value={severity}
                                onChange={(e) => setSeverity(e.target.value as Severity)}
                                disabled={pending}
                                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                {SEVERITY_LEVELS.map((s) => (
                                    <option key={s} value={s}>
                                        {SEVERITY_LABELS[s]}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="mr-pri">ความเร่งด่วน</Label>
                            <select
                                id="mr-pri"
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as Priority)}
                                disabled={pending}
                                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                {PRIORITY_LEVELS.map((p) => (
                                    <option key={p} value={p}>
                                        {PRIORITY_LABELS[p]}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="mr-cat">ประเภท</Label>
                            <select
                                id="mr-cat"
                                value={category}
                                onChange={(e) => setCategory(e.target.value as Category)}
                                disabled={pending}
                                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                {CATEGORIES.map((c) => (
                                    <option key={c} value={c}>
                                        {CATEGORY_LABELS[c]}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="grid gap-2">
                        <Label>ป้าย (ไม่บังคับ)</Label>
                        <TagInput value={tags} onChange={setTags} disabled={pending} />
                    </div>

                    {/* Location */}
                    <div className="grid gap-2">
                        <Label>หน่วยงาน (ไม่บังคับ)</Label>
                        <DepartmentSelect value={locationId} onChange={setLocationId} disabled={pending} />
                    </div>

                    {/* Estimated cost */}
                    <div className="grid gap-2">
                        <Label htmlFor="mr-cost">ประมาณค่าใช้จ่าย (บาท, ไม่บังคับ)</Label>
                        <Input
                            id="mr-cost"
                            type="number"
                            min="0"
                            step="0.01"
                            value={estimatedCost}
                            onChange={(e) => setEstimatedCost(e.target.value)}
                            placeholder="0.00"
                            disabled={pending}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                        ยกเลิก
                    </Button>
                    <Button onClick={handleSubmit} disabled={pending}>
                        {pending ? 'กำลังส่ง...' : 'ส่งคำขอแจ้งซ่อม'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
