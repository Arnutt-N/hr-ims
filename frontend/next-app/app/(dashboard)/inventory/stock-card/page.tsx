import { Suspense } from 'react';
import { getStockCard } from '@/lib/actions/stock-management';
import { getTransferSourceWarehouses } from '@/lib/actions/warehouse';
import { formatThaiDateTime } from '@/lib/date-utils';
import { PrintStockCardButton } from './PrintStockCardButton';

export const metadata = {
    title: 'Stock Card | HR-IMS',
    description: 'Warehouse stock movement card',
};

interface StockCardPageProps {
    searchParams: Promise<{
        warehouseId?: string;
        itemId?: string;
        startDate?: string;
        endDate?: string;
    }>;
}

const STOCK_CARD_CUTOVER_DATE = process.env.STOCK_CARD_CUTOVER_DATE || '2026-11-18';

const TYPE_LABEL: Record<string, string> = {
    inbound: 'รับเข้า',
    outbound: 'จ่ายออก',
    transfer_in: 'โอนเข้า',
    transfer_out: 'โอนออก',
    adjustment: 'ปรับยอด',
};

export default async function StockCardPage({ searchParams }: StockCardPageProps) {
    const params = await searchParams;
    const warehouseId = Number.parseInt(params.warehouseId ?? '', 10);
    const itemId = params.itemId ? Number.parseInt(params.itemId, 10) : undefined;
    const warehousesResult = await getTransferSourceWarehouses();
    const warehouses = warehousesResult.warehouses ?? [];

    const hasValidWarehouse = Number.isInteger(warehouseId) && warehouseId > 0;
    const result = hasValidWarehouse
        ? await getStockCard({
            warehouseId,
            ...(itemId && Number.isInteger(itemId) ? { itemId } : {}),
            ...(params.startDate ? { startDate: params.startDate } : {}),
            ...(params.endDate ? { endDate: params.endDate } : {})
        })
        : null;

    const transactions = result?.transactions ?? [];
    const stockLevels = result?.stockLevels ?? [];
    const selectedWarehouse = warehouses.find(w => w.id === warehouseId);

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">บัตรคุมวัสดุ</h1>
                    <p className="text-slate-500 mt-1">ประวัติการเคลื่อนไหวและยอดคงเหลือรายคลัง</p>
                </div>
                {result && 'success' in result ? <PrintStockCardButton /> : null}
            </div>

            <form method="get" className="grid grid-cols-1 sm:grid-cols-4 gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <label className="text-sm">
                    <span className="block text-slate-600 mb-1">คลัง</span>
                    <select name="warehouseId" defaultValue={hasValidWarehouse ? warehouseId : ''} className="w-full rounded border border-slate-300 p-2">
                        <option value="">เลือกคลัง</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                </label>
                <label className="text-sm">
                    <span className="block text-slate-600 mb-1">รหัสวัสดุ</span>
                    <input name="itemId" type="number" min="1" defaultValue={itemId ?? ''} className="w-full rounded border border-slate-300 p-2" />
                </label>
                <label className="text-sm">
                    <span className="block text-slate-600 mb-1">ตั้งแต่วันที่</span>
                    <input name="startDate" type="date" defaultValue={params.startDate ?? ''} className="w-full rounded border border-slate-300 p-2" />
                </label>
                <div className="flex items-end gap-2">
                    <label className="text-sm flex-1">
                        <span className="block text-slate-600 mb-1">ถึงวันที่</span>
                        <input name="endDate" type="date" defaultValue={params.endDate ?? ''} className="w-full rounded border border-slate-300 p-2" />
                    </label>
                    <button type="submit" className="rounded bg-indigo-600 px-4 py-2 text-sm text-white">ค้นหา</button>
                </div>
            </form>

            {!hasValidWarehouse ? (
                <p className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
                    เลือกคลังเพื่อดูบัตรคุมวัสดุ
                </p>
            ) : result && 'error' in result ? (
                <p className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{result.error}</p>
            ) : (
                <Suspense fallback={<div className="h-64 bg-slate-50 rounded-xl animate-pulse" />}>
                    <div className="print-only rounded-xl border border-slate-200 bg-white p-6">
                        <style>{`
                            @page { size: A4; margin: 15mm; }
                            @media print {
                                body * { visibility: hidden; }
                                .print-only, .print-only * { visibility: visible; }
                                .print-only { position: absolute; left: 0; top: 0; width: 100%; }
                                form, .no-print { display: none !important; }
                            }
                        `}</style>
                        <h2 className="text-lg font-semibold">
                            บัตรคุมวัสดุ {selectedWarehouse ? `คลัง ${selectedWarehouse.name}` : ''}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            ยอดคงเหลือด้านล่างอ่านจาก StockLevel (ข้อมูลทางการ) ส่วนตารางด้านบนเป็นรายการเคลื่อนไหวที่บันทึกใน StockTransaction เท่านั้น
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            วันเริ่มใช้บัตรคุมวัสดุ {STOCK_CARD_CUTOVER_DATE} · ก่อนวันนี้แสดงรายการเท่าที่ตรวจสอบได้ และไม่ใช้คำนวณยอดยกมา
                        </p>
                        <p className="mt-1 text-sm text-amber-700">
                            ก่อนใช้กระทบยอด ต้องบันทึกยอดยกมารายคลังและรายวัสดุ พร้อมเวลาและผู้รับรอง แล้วตรวจว่า ยอดยกมา + รับเข้า − จ่ายออก + ปรับยอด = StockLevel.quantity ณ เวลาตรวจ
                        </p>

                        <div className="mt-4 overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 text-left">
                                        <th className="border p-2">วันเวลา</th>
                                        <th className="border p-2">วัสดุ</th>
                                        <th className="border p-2">ประเภท</th>
                                        <th className="border p-2 text-right">จำนวน</th>
                                        <th className="border p-2">เลขอ้างอิง</th>
                                        <th className="border p-2">หมายเหตุ</th>
                                        <th className="border p-2">ผู้บันทึก</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map(tx => (
                                        <tr key={tx.id}>
                                            <td className="border p-2">{formatThaiDateTime(tx.createdAt)}</td>
                                            <td className="border p-2">{tx.item.name}</td>
                                            <td className="border p-2">{TYPE_LABEL[tx.type] ?? tx.type}</td>
                                            <td className="border p-2 text-right">{tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}</td>
                                            <td className="border p-2">{tx.referenceId ?? '—'}</td>
                                            <td className="border p-2">{tx.note ?? '—'}</td>
                                            <td className="border p-2">{tx.user.name ?? '—'}</td>
                                        </tr>
                                    ))}
                                    {transactions.length === 0 ? (
                                        <tr><td colSpan={7} className="border p-4 text-center text-slate-500">ไม่มีรายการเคลื่อนไหวในช่วงที่เลือก</td></tr>
                                    ) : null}
                                </tbody>
                            </table>
                        </div>

                        <h3 className="mt-8 font-semibold">ยอดคงเหลือ ณ ปัจจุบัน (StockLevel)</h3>
                        <div className="mt-2 overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 text-left">
                                        <th className="border p-2">วัสดุ</th>
                                        <th className="border p-2 text-right">คงเหลือ</th>
                                        <th className="border p-2 text-right">จอง</th>
                                        <th className="border p-2 text-right">ขั้นต่ำ</th>
                                        <th className="border p-2 text-right">สูงสุด</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stockLevels.map(level => (
                                        <tr key={level.id}>
                                            <td className="border p-2">{level.item.name}</td>
                                            <td className="border p-2 text-right">{level.quantity}</td>
                                            <td className="border p-2 text-right">{level.reserved}</td>
                                            <td className="border p-2 text-right">{level.minStock ?? '—'}</td>
                                            <td className="border p-2 text-right">{level.maxStock ?? '—'}</td>
                                        </tr>
                                    ))}
                                    {stockLevels.length === 0 ? (
                                        <tr><td colSpan={5} className="border p-4 text-center text-slate-500">ไม่มีข้อมูลยอดคงเหลือ</td></tr>
                                    ) : null}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </Suspense>
            )}
        </div>
    );
}
