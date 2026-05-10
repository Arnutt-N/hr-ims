'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { StatusBadge } from './StatusBadge';
import { ResolveItemDialog, RejectItemDialog } from './dialogs';
import type { ItemStatus } from '@/lib/maintenance/types';

interface RequestItemRowProps {
    requestId: number;
    item: {
        id: number; // MaintenanceRequestItem.id
        status: ItemStatus;
        version: number;
        resolution: string | null;
        rejectionReason: string | null;
        actualCost: number | null;
        item: { id: number; name: string; serial: string | null };
    };
    isAssignee: boolean;
    isReporter: boolean;
    isAdmin: boolean;
    onChange?: () => void;
}

/**
 * Per-item row inside /maintenance/[id] detail page. Action buttons
 * are gated by current state + actor (assignee, reporter, admin).
 * PRP v6 Phase 3 commit #5.
 */
export function RequestItemRow(props: RequestItemRowProps) {
    const { requestId, item, isAssignee, isReporter, isAdmin, onChange } = props;
    const [resolveOpen, setResolveOpen] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [pending, startTransition] = useTransition();
    const canActAsAssignee = isAssignee || isAdmin;
    const canActAsReporter = isReporter || isAdmin;

    const transitionItem = (newStatus: 'in_progress' | 'awaiting_parts' | 'cancelled') => {
        startTransition(async () => {
            const { updateMaintenanceItemStatus } = await import('@/lib/actions/maintenance');
            const r = await updateMaintenanceItemStatus({
                requestId,
                itemId: item.id,
                expectedVersion: item.version,
                newStatus,
            });
            if ('success' in r && r.success) {
                toast.success('อัปเดตสถานะแล้ว');
                onChange?.();
            } else {
                toast.error(('error' in r && r.error) || 'อัปเดตไม่สำเร็จ');
            }
        });
    };

    const approveItem = () => {
        startTransition(async () => {
            const { approveItemResolution } = await import('@/lib/actions/maintenance');
            const r = await approveItemResolution({
                requestId,
                itemId: item.id,
                expectedVersion: item.version,
            });
            if ('success' in r && r.success) {
                toast.success('ตรวจรับเรียบร้อย ปิดงานแล้ว');
                onChange?.();
            } else {
                toast.error(('error' in r && r.error) || 'ตรวจรับไม่สำเร็จ');
            }
        });
    };

    return (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            {/* Header: name + status */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900">{item.item.name}</div>
                    {item.item.serial && (
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{item.item.serial}</div>
                    )}
                </div>
                <StatusBadge status={item.status} level="item" />
            </div>

            {/* Resolution / rejection display */}
            {(item.resolution || item.rejectionReason) && (
                <div className="mt-3 space-y-1.5 text-sm">
                    {item.resolution && (
                        <div className="rounded-md bg-emerald-50 p-2 text-emerald-900 ring-1 ring-emerald-100">
                            <span className="font-medium">การซ่อม:</span> {item.resolution}
                            {item.actualCost !== null && (
                                <span className="ml-2 text-xs text-emerald-700">
                                    (ค่าใช้จ่าย {item.actualCost.toLocaleString()} บาท)
                                </span>
                            )}
                        </div>
                    )}
                    {item.rejectionReason && (
                        <div className="rounded-md bg-amber-50 p-2 text-amber-900 ring-1 ring-amber-100">
                            <span className="font-medium">เหตุผลที่ปฏิเสธก่อนหน้า:</span> {item.rejectionReason}
                        </div>
                    )}
                </div>
            )}

            {/* Action buttons */}
            <div className="mt-3 flex flex-wrap gap-2">
                {/* Assignee actions */}
                {canActAsAssignee && item.status === 'open' && (
                    <Button size="sm" onClick={() => transitionItem('in_progress')} disabled={pending}>
                        เริ่มซ่อม
                    </Button>
                )}
                {canActAsAssignee && item.status === 'in_progress' && (
                    <>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => transitionItem('awaiting_parts')}
                            disabled={pending}
                        >
                            รออะไหล่
                        </Button>
                        <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => setResolveOpen(true)}
                            disabled={pending}
                        >
                            บันทึกซ่อมเสร็จ
                        </Button>
                    </>
                )}
                {canActAsAssignee && item.status === 'awaiting_parts' && (
                    <>
                        <Button size="sm" onClick={() => transitionItem('in_progress')} disabled={pending}>
                            กลับมาทำงานต่อ
                        </Button>
                        <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => setResolveOpen(true)}
                            disabled={pending}
                        >
                            บันทึกซ่อมเสร็จ
                        </Button>
                    </>
                )}

                {/* Reporter actions on resolved items */}
                {canActAsReporter && item.status === 'resolved' && (
                    <>
                        <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={approveItem}
                            disabled={pending}
                        >
                            ตรวจรับ (ปิดงาน)
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setRejectOpen(true)}
                            disabled={pending}
                        >
                            ปฏิเสธ
                        </Button>
                    </>
                )}

                {/* Cancel item — assignee/admin */}
                {canActAsAssignee && !['closed', 'cancelled'].includes(item.status) && (
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => transitionItem('cancelled')}
                        disabled={pending}
                    >
                        ยกเลิกอุปกรณ์นี้
                    </Button>
                )}
            </div>

            <ResolveItemDialog
                open={resolveOpen}
                onOpenChange={setResolveOpen}
                requestId={requestId}
                itemId={item.id}
                expectedVersion={item.version}
                onSuccess={onChange}
            />
            <RejectItemDialog
                open={rejectOpen}
                onOpenChange={setRejectOpen}
                requestId={requestId}
                itemId={item.id}
                expectedVersion={item.version}
                onSuccess={onChange}
            />
        </div>
    );
}
