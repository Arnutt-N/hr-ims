'use client';

import { useEffect } from 'react';

interface PrintWorkOrderProps {
    request: {
        id: number;
        title: string;
        description: string;
        status: string;
        severity: string;
        priority: string;
        category: string;
        tags: string | null;
        photos: string | null;
        estimatedCost: number | null;
        createdAt: Date | string;
        closedAt: Date | string | null;
        items: Array<{
            id: number;
            status: string;
            resolution: string | null;
            actualCost: number | null;
            item: { id: number; name: string; serial: string | null };
        }>;
        reportedBy: { id: number; name: string | null } | null;
        assignedTo: { id: number; name: string | null } | null;
        location: { id: number; name: string } | null;
    };
}

const SEVERITY_LABEL: Record<string, string> = {
    low: 'ต่ำ', medium: 'กลาง', high: 'สูง', critical: 'วิกฤต',
};
const PRIORITY_LABEL: Record<string, string> = {
    low: 'ต่ำ', normal: 'ปกติ', high: 'เร่งด่วน', urgent: 'ด่วนมาก',
};
const STATUS_LABEL: Record<string, string> = {
    open: 'รอดำเนินการ', assigned: 'มอบหมายแล้ว', in_progress: 'กำลังซ่อม',
    awaiting_parts: 'รออะไหล่', resolved: 'รอตรวจรับ', closed: 'ปิดงาน', cancelled: 'ยกเลิก',
};

function parsePhotos(s: string | null): string[] {
    if (!s) return [];
    try {
        const p = JSON.parse(s);
        return Array.isArray(p) ? p.filter((u): u is string => typeof u === 'string') : [];
    } catch {
        return [];
    }
}

function fmtDate(d: Date | string): string {
    return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function PrintWorkOrder({ request }: PrintWorkOrderProps) {
    useEffect(() => {
        // Auto-trigger browser print on mount; user can cancel
        const timer = setTimeout(() => window.print(), 500);
        return () => clearTimeout(timer);
    }, []);

    const photos = parsePhotos(request.photos);
    const totalActualCost = request.items.reduce((sum, it) => sum + (it.actualCost ?? 0), 0);

    return (
        <div className="print-only mx-auto max-w-[210mm] bg-white p-10 text-black">
            <style>{`
                @page { size: A4; margin: 15mm; }
                @media print {
                    body * { visibility: hidden; }
                    .print-only, .print-only * { visibility: visible; }
                    .print-only { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                }
                .signature-line {
                    border-bottom: 1px solid #000;
                    height: 1.5rem;
                    margin-top: 0.25rem;
                }
            `}</style>

            <button
                type="button"
                onClick={() => window.print()}
                className="no-print mb-4 rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
            >
                พิมพ์อีกครั้ง
            </button>

            {/* Header */}
            <div className="border-b-2 border-black pb-4">
                <h1 className="text-2xl font-bold">ใบสั่งงานซ่อมบำรุง</h1>
                <div className="mt-1 text-sm">
                    เลขที่: <strong>#{request.id}</strong> | วันที่: {fmtDate(request.createdAt)}
                </div>
            </div>

            {/* Title + meta */}
            <div className="mt-4">
                <h2 className="text-lg font-semibold">{request.title}</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm">{request.description}</p>
            </div>

            <table className="mt-4 w-full text-sm">
                <tbody>
                    <tr>
                        <td className="border border-black p-2 font-semibold w-1/4">สถานะ</td>
                        <td className="border border-black p-2">{STATUS_LABEL[request.status] ?? request.status}</td>
                        <td className="border border-black p-2 font-semibold w-1/4">ผลกระทบ</td>
                        <td className="border border-black p-2">{SEVERITY_LABEL[request.severity] ?? request.severity}</td>
                    </tr>
                    <tr>
                        <td className="border border-black p-2 font-semibold">ความเร่งด่วน</td>
                        <td className="border border-black p-2">{PRIORITY_LABEL[request.priority] ?? request.priority}</td>
                        <td className="border border-black p-2 font-semibold">หน่วยงาน</td>
                        <td className="border border-black p-2">{request.location?.name ?? '—'}</td>
                    </tr>
                    <tr>
                        <td className="border border-black p-2 font-semibold">ผู้แจ้ง</td>
                        <td className="border border-black p-2">{request.reportedBy?.name ?? '—'}</td>
                        <td className="border border-black p-2 font-semibold">ผู้รับผิดชอบ</td>
                        <td className="border border-black p-2">{request.assignedTo?.name ?? '—'}</td>
                    </tr>
                </tbody>
            </table>

            {/* Items */}
            <div className="mt-6">
                <h3 className="font-semibold mb-2">รายการอุปกรณ์ ({request.items.length})</h3>
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr className="bg-slate-100">
                            <th className="border border-black p-2 text-left">อุปกรณ์</th>
                            <th className="border border-black p-2 text-left">Serial</th>
                            <th className="border border-black p-2 text-left">สถานะ</th>
                            <th className="border border-black p-2 text-left">การซ่อม</th>
                            <th className="border border-black p-2 text-right">ค่าใช้จ่าย</th>
                        </tr>
                    </thead>
                    <tbody>
                        {request.items.map((it) => (
                            <tr key={it.id}>
                                <td className="border border-black p-2">{it.item.name}</td>
                                <td className="border border-black p-2 font-mono text-xs">{it.item.serial ?? '—'}</td>
                                <td className="border border-black p-2">{STATUS_LABEL[it.status] ?? it.status}</td>
                                <td className="border border-black p-2">{it.resolution ?? '—'}</td>
                                <td className="border border-black p-2 text-right">
                                    {it.actualCost !== null ? it.actualCost.toLocaleString() : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="font-semibold">
                            <td colSpan={4} className="border border-black p-2 text-right">รวมค่าใช้จ่าย</td>
                            <td className="border border-black p-2 text-right">{totalActualCost.toLocaleString()} บาท</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Photos */}
            {photos.length > 0 && (
                <div className="mt-6">
                    <h3 className="font-semibold mb-2">ภาพประกอบ</h3>
                    <div className="grid grid-cols-3 gap-2">
                        {photos.map((url, idx) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={url} src={url} alt={`ภาพที่ ${idx + 1}`} className="border border-slate-300 rounded" />
                        ))}
                    </div>
                </div>
            )}

            {/* Signatures */}
            <div className="mt-12 grid grid-cols-3 gap-8 text-sm">
                <div>
                    <div className="signature-line" />
                    <div className="text-center mt-1">ผู้แจ้ง</div>
                    <div className="text-center text-xs">({request.reportedBy?.name ?? '...........'})</div>
                </div>
                <div>
                    <div className="signature-line" />
                    <div className="text-center mt-1">ผู้รับผิดชอบ</div>
                    <div className="text-center text-xs">({request.assignedTo?.name ?? '...........'})</div>
                </div>
                <div>
                    <div className="signature-line" />
                    <div className="text-center mt-1">ผู้อนุมัติ</div>
                    <div className="text-center text-xs">(...........)</div>
                </div>
            </div>
        </div>
    );
}
