'use client';

import { useState, useTransition } from 'react';
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

/**
 * Reusable confirm dialogs for the maintenance workflow.
 * Each is small + opinionated: one async action, optional reason field,
 * loading state via useTransition.
 * PRP v6 Phase 3 commit #5.
 */

// ----- ResolveItemDialog -----

interface ResolveItemDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    requestId: number;
    itemId: number; // MaintenanceRequestItem.id
    expectedVersion: number;
    onSuccess?: () => void;
}

export function ResolveItemDialog(props: ResolveItemDialogProps) {
    const { open, onOpenChange, requestId, itemId, expectedVersion, onSuccess } = props;
    const [resolution, setResolution] = useState('');
    const [actualCost, setActualCost] = useState('');
    const [pending, startTransition] = useTransition();

    const submit = () => {
        if (!resolution.trim()) {
            toast.error('กรุณากรอกรายละเอียดการซ่อม');
            return;
        }
        startTransition(async () => {
            const { updateMaintenanceItemStatus } = await import('@/lib/actions/maintenance');
            const r = await updateMaintenanceItemStatus({
                requestId,
                itemId,
                expectedVersion,
                newStatus: 'resolved',
                resolution: resolution.trim(),
                actualCost: actualCost ? Number.parseFloat(actualCost) : undefined,
            });
            if ('success' in r && r.success) {
                toast.success('บันทึกการซ่อม รอผู้แจ้งตรวจรับ');
                setResolution('');
                setActualCost('');
                onOpenChange(false);
                onSuccess?.();
            } else {
                toast.error(('error' in r && r.error) || 'บันทึกไม่สำเร็จ');
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>บันทึกการซ่อมเสร็จ</DialogTitle>
                    <DialogDescription>
                        ผู้แจ้งจะได้รับการแจ้งเตือนเพื่อตรวจรับ
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="resolve-text">รายละเอียดการซ่อม</Label>
                        <Textarea
                            id="resolve-text"
                            value={resolution}
                            onChange={(e) => setResolution(e.target.value)}
                            placeholder="อธิบายว่าซ่อมอะไร เปลี่ยนอะไร"
                            rows={3}
                            disabled={pending}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="resolve-cost">ค่าใช้จ่ายจริง (บาท, ไม่บังคับ)</Label>
                        <Input
                            id="resolve-cost"
                            type="number"
                            min="0"
                            step="0.01"
                            value={actualCost}
                            onChange={(e) => setActualCost(e.target.value)}
                            disabled={pending}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                        ยกเลิก
                    </Button>
                    <Button onClick={submit} disabled={pending}>
                        {pending ? 'กำลังบันทึก...' : 'บันทึก'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ----- RejectItemDialog -----

interface RejectItemDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    requestId: number;
    itemId: number;
    expectedVersion: number;
    onSuccess?: () => void;
}

export function RejectItemDialog(props: RejectItemDialogProps) {
    const { open, onOpenChange, requestId, itemId, expectedVersion, onSuccess } = props;
    const [reason, setReason] = useState('');
    const [pending, startTransition] = useTransition();

    const submit = () => {
        if (!reason.trim()) {
            toast.error('กรุณาระบุเหตุผล');
            return;
        }
        startTransition(async () => {
            const { rejectItemResolution } = await import('@/lib/actions/maintenance');
            const r = await rejectItemResolution({
                requestId,
                itemId,
                expectedVersion,
                reason: reason.trim(),
            });
            if ('success' in r && r.success) {
                toast.success('ปฏิเสธการซ่อม ส่งกลับช่างแล้ว');
                setReason('');
                onOpenChange(false);
                onSuccess?.();
            } else {
                toast.error(('error' in r && r.error) || 'ปฏิเสธไม่สำเร็จ');
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>ปฏิเสธการซ่อม</DialogTitle>
                    <DialogDescription className="text-amber-700">
                        ⚠️ งานจะถูกส่งกลับไปให้ช่างซ่อมต่อพร้อมเหตุผล
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2 py-4">
                    <Label htmlFor="reject-reason">เหตุผลการปฏิเสธ</Label>
                    <Textarea
                        id="reject-reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="เช่น ปัญหายังเกิดอยู่ / ซ่อมไม่ครบ"
                        rows={3}
                        disabled={pending}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                        ยกเลิก
                    </Button>
                    <Button variant="destructive" onClick={submit} disabled={pending}>
                        {pending ? 'กำลังส่ง...' : 'ปฏิเสธ + ส่งกลับช่าง'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ----- CancelRequestDialog -----

interface CancelRequestDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    requestId: number;
    hasResolvedItems?: boolean;
    onSuccess?: () => void;
}

export function CancelRequestDialog(props: CancelRequestDialogProps) {
    const { open, onOpenChange, requestId, hasResolvedItems, onSuccess } = props;
    const [reason, setReason] = useState('');
    const [pending, startTransition] = useTransition();

    const submit = () => {
        if (!reason.trim()) {
            toast.error('กรุณาระบุเหตุผล');
            return;
        }
        startTransition(async () => {
            const { cancelMaintenanceRequest } = await import('@/lib/actions/maintenance');
            const r = await cancelMaintenanceRequest({ requestId, reason: reason.trim() });
            if ('success' in r && r.success) {
                toast.success('ยกเลิกคำขอแล้ว');
                setReason('');
                onOpenChange(false);
                onSuccess?.();
            } else {
                toast.error(('error' in r && r.error) || 'ยกเลิกไม่สำเร็จ');
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>ยกเลิกคำขอแจ้งซ่อม</DialogTitle>
                    <DialogDescription className={hasResolvedItems ? 'text-amber-700' : undefined}>
                        {hasResolvedItems
                            ? '⚠️ บางอุปกรณ์ปิดงานแล้ว — จะคงสถานะเดิม; เฉพาะอุปกรณ์ที่ยังไม่จบจะถูกยกเลิก'
                            : 'อุปกรณ์ทั้งหมดในคำขอจะกลับสู่สถานะพร้อมใช้งาน'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2 py-4">
                    <Label htmlFor="cancel-reason">เหตุผล</Label>
                    <Textarea
                        id="cancel-reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                        disabled={pending}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                        ไม่ยกเลิก
                    </Button>
                    <Button variant="destructive" onClick={submit} disabled={pending}>
                        {pending ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิก'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ----- DeleteRequestDialog (admin only) -----

interface DeleteRequestDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    requestId: number;
    onSuccess?: () => void;
}

export function DeleteRequestDialog(props: DeleteRequestDialogProps) {
    const { open, onOpenChange, requestId, onSuccess } = props;
    const [reason, setReason] = useState('');
    const [pending, startTransition] = useTransition();

    const submit = () => {
        if (!reason.trim()) {
            toast.error('กรุณาระบุเหตุผล');
            return;
        }
        startTransition(async () => {
            const { deleteMaintenanceRequest } = await import('@/lib/actions/maintenance');
            const r = await deleteMaintenanceRequest({ requestId, reason: reason.trim() });
            if ('success' in r && r.success) {
                toast.success('ลบคำขอแล้ว ผู้แจ้งจะได้รับการแจ้งเตือน');
                setReason('');
                onOpenChange(false);
                onSuccess?.();
            } else {
                toast.error(('error' in r && r.error) || 'ลบไม่สำเร็จ');
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>ลบคำขอแจ้งซ่อม (Admin)</DialogTitle>
                    <DialogDescription className="text-red-700">
                        ⚠️ คำขอจะถูกซ่อนจากรายการปกติ ผู้แจ้งจะได้รับการแจ้งเตือนพร้อมเหตุผล Admin สามารถกู้คืนได้ภายหลัง
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2 py-4">
                    <Label htmlFor="delete-reason">เหตุผลการลบ</Label>
                    <Textarea
                        id="delete-reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="เช่น ซ้ำกับ #123 / ทดสอบ"
                        rows={3}
                        disabled={pending}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                        ยกเลิก
                    </Button>
                    <Button variant="destructive" onClick={submit} disabled={pending}>
                        {pending ? 'กำลังลบ...' : 'ยืนยันลบ'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
