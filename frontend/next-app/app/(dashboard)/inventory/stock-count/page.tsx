import { getStockCountRounds } from '@/lib/actions/stock-count';
import { getTransferSourceWarehouses } from '@/lib/actions/warehouse';
import { StockCountActions } from '@/components/inventory/StockCountActions';

export const metadata = {
    title: 'Stock Count | HR-IMS',
    description: 'Warehouse stock count rounds',
};

export default async function StockCountPage() {
    const [roundsResult, warehousesResult] = await Promise.all([
        getStockCountRounds(),
        getTransferSourceWarehouses()
    ]);

    if ('error' in roundsResult) {
        return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{roundsResult.error}</div>;
    }

    const warehouses = warehousesResult.warehouses ?? [];

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">รอบตรวจนับสต็อก</h1>
                <p className="text-slate-500 mt-1">บันทึกยอดตรวจ ทบทวนส่วนต่าง แล้วปรับยอดเข้าระบบ</p>
            </div>
            <StockCountActions warehouses={warehouses} rounds={roundsResult.rounds} />
        </div>
    );
}
