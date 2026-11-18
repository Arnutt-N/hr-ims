'use client';

import { useEffect } from 'react';
import { formatThaiDate } from '@/lib/date-utils';

interface PrintRequisitionProps {
    request: {
        id: number;
        date: Date | string;
        status: string;
        type: string;
        user: { name: string | null; department: string | null } | null;
        warehouse: { name: string; code: string } | null;
        requestItems: Array<{
            quantity: number;
            item: { name: string; unit: string | null };
        }>;
    };
}

const TYPE_LABEL: Record<string, string> = {
    withdraw: 'เบิกพัสดุ',
    borrow: 'ยืมพัสดุ',
    return: 'คืนพัสดุ',
};

const STATUS_LABEL: Record<string, string> = {
    pending: 'รออนุมัติ',
    approved: 'อนุมัติแล้ว',
    rejected: 'ปฏิเสธ',
    cancelled: 'ยกเลิก',
};

export function PrintRequisition({ request }: PrintRequisitionProps) {
    useEffect(() => {
        const timer = setTimeout(() => window.print(), 500);
        return () => clearTimeout(timer);
    }, []);

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

            <div className="border-b-2 border-black pb-4">
                <h1 className="text-2xl font-bold">ใบเบิกพัสดุ</h1>
                <div className="mt-1 text-sm">
                    เลขที่: <strong>#{request.id}</strong> | วันที่: {formatThaiDate(request.date)}
                </div>
            </div>

            <table className="mt-4 w-full text-sm">
                <tbody>
                    <tr>
                        <td className="border border-black p-2 font-semibold w-1/4">ผู้ขอ</td>
                        <td className="border border-black p-2">{request.user?.name ?? '—'}</td>
                        <td className="border border-black p-2 font-semibold w-1/4">หน่วยงาน</td>
                        <td className="border border-black p-2">{request.user?.department ?? '—'}</td>
                    </tr>
                    <tr>
                        <td className="border border-black p-2 font-semibold">ประเภท</td>
                        <td className="border border-black p-2">{TYPE_LABEL[request.type] ?? request.type}</td>
                        <td className="border border-black p-2 font-semibold">คลัง</td>
                        <td className="border border-black p-2">{request.warehouse?.name ?? '—'}</td>
                    </tr>
                    <tr>
                        <td className="border border-black p-2 font-semibold">สถานะ</td>
                        <td className="border border-black p-2" colSpan={3}>
                            {STATUS_LABEL[request.status] ?? request.status}
                        </td>
                    </tr>
                </tbody>
            </table>

            <table className="mt-6 w-full border-collapse text-sm">
                <thead>
                    <tr>
                        <th className="border border-black p-2 text-left">ลำดับ</th>
                        <th className="border border-black p-2 text-left">รายการ</th>
                        <th className="border border-black p-2 text-right">จำนวน</th>
                        <th className="border border-black p-2 text-left">หน่วย</th>
                    </tr>
                </thead>
                <tbody>
                    {request.requestItems.map((line, index) => (
                        <tr key={index}>
                            <td className="border border-black p-2">{index + 1}</td>
                            <td className="border border-black p-2">{line.item.name}</td>
                            <td className="border border-black p-2 text-right">{line.quantity}</td>
                            <td className="border border-black p-2">{line.item.unit ?? '—'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="mt-12 grid grid-cols-3 gap-8 text-center text-sm">
                <div>
                    <div>ผู้ขอ</div>
                    <div className="signature-line" />
                </div>
                <div>
                    <div>ผู้อนุมัติ</div>
                    <div className="signature-line" />
                </div>
                <div>
                    <div>ผู้จ่าย</div>
                    <div className="signature-line" />
                </div>
            </div>
        </div>
    );
}
