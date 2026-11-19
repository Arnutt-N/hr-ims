'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
    createStockCountRound,
    recordStockCount,
    approveStockCount,
    applyStockCount
} from '@/lib/actions/stock-count';

interface Line {
    id: number;
    itemId: number;
    systemQuantity: number;
    countedQuantity: number | null;
    variance: number | null;
    note: string | null;
    item: { name: string };
}

interface Round {
    id: number;
    status: string;
    warehouseId: number;
    warehouse: { name: string; code: string };
    assignedTo: { name: string | null };
    lines: Line[];
}

export function StockCountActions({
    warehouses,
    rounds
}: {
    warehouses: Array<{ id: number; name: string; code: string }>;
    rounds: Round[];
}) {
    const router = useRouter();
    const [busy, setBusy] = useState<number | null>(null);
    const [warehouseId, setWarehouseId] = useState('');
    const [assignedToId, setAssignedToId] = useState('');
    const [counts, setCounts] = useState<Record<number, string>>({});

    async function run(key: number, fn: () => Promise<{ success: boolean; message?: string }>) {
        setBusy(key);
        const result = await fn();
        setBusy(null);
        if (result.success) {
            toast.success('บันทึกเรียบร้อย');
            router.refresh();
        } else {
            toast.error(result.message ?? 'เกิดข้อผิดพลาด');
        }
    }

    return (
        <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="font-semibold">เปิดรอบตรวจนับใหม่</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <select
                        value={warehouseId}
                        onChange={e => setWarehouseId(e.target.value)}
                        className="rounded border border-slate-300 p-2 text-sm"
                    >
                        <option value="">เลือกคลัง</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                    <input
                        type="number"
                        min="1"
                        placeholder="รหัสผู้ตรวจนับ"
                        value={assignedToId}
                        onChange={e => setAssignedToId(e.target.value)}
                        className="rounded border border-slate-300 p-2 text-sm"
                    />
                    <button
                        type="button"
                        disabled={!warehouseId || !assignedToId || busy !== null}
                        onClick={() => run(0, () => createStockCountRound({
                            warehouseId: Number(warehouseId),
                            assignedToId: Number(assignedToId)
                        }))}
                        className="rounded bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                    >
                        เปิดรอบ
                    </button>
                </div>
            </div>

            {rounds.map(round => (
                <div key={round.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h3 className="font-semibold">รอบ #{round.id} · {round.warehouse.name}</h3>
                            <p className="text-sm text-slate-500">
                                ผู้ตรวจ: {round.assignedTo.name ?? '—'} · สถานะ: {round.status}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {round.status === 'counting' ? (
                                <button
                                    type="button"
                                    disabled={busy !== null}
                                    onClick={() => run(round.id, () => recordStockCount(
                                        round.id,
                                        round.lines.map(line => ({
                                            lineId: line.id,
                                            countedQuantity: Number(counts[line.id] ?? line.systemQuantity)
                                        }))
                                    ))}
                                    className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                                >
                                    บันทึกผลตรวจ
                                </button>
                            ) : null}
                            {round.status === 'review' ? (
                                <button
                                    type="button"
                                    disabled={busy !== null}
                                    onClick={() => run(round.id, () => approveStockCount(round.id))}
                                    className="rounded bg-amber-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                                >
                                    อนุมัติส่วนต่าง
                                </button>
                            ) : null}
                            {round.status === 'approved' ? (
                                <button
                                    type="button"
                                    disabled={busy !== null}
                                    onClick={() => run(round.id, () => applyStockCount(round.id))}
                                    className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                                >
                                    ปรับยอดเข้าระบบ
                                </button>
                            ) : null}
                        </div>
                    </div>

                    <div className="mt-3 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-left">
                                    <th className="border p-2">วัสดุ</th>
                                    <th className="border p-2 text-right">ยอดระบบ</th>
                                    <th className="border p-2 text-right">ยอดตรวจ</th>
                                    <th className="border p-2 text-right">ส่วนต่าง</th>
                                </tr>
                            </thead>
                            <tbody>
                                {round.lines.map(line => (
                                    <tr key={line.id}>
                                        <td className="border p-2">{line.item.name}</td>
                                        <td className="border p-2 text-right">{line.systemQuantity}</td>
                                        <td className="border p-2 text-right">
                                            {round.status === 'counting' ? (
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={counts[line.id] ?? String(line.systemQuantity)}
                                                    onChange={e => setCounts(prev => ({ ...prev, [line.id]: e.target.value }))}
                                                    className="w-20 rounded border border-slate-300 p-1 text-right"
                                                />
                                            ) : (line.countedQuantity ?? '—')}
                                        </td>
                                        <td className={`border p-2 text-right ${line.variance ? 'font-semibold text-red-600' : ''}`}>
                                            {line.variance ?? '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );
}
