"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Clock, Package, ArrowRight, User } from 'lucide-react';

interface StockTransfer {
    id: number;
    fromWarehouse: { name: string; code: string };
    toWarehouse: { name: string; code: string };
    item: { name: string; category: string };
    quantity: number;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    requestedBy: number;
    approvedBy?: number;
    note?: string;
    createdAt: string;
    completedAt?: string;
}

interface TransferApprovalListProps {
    userId: number;
    userRole: string;
}

export default function TransferApprovalList({ userId, userRole }: TransferApprovalListProps) {
    const [transfers, setTransfers] = useState<StockTransfer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchTransfers();
    }, []);

    const fetchTransfers = async () => {
        try {
            const res = await fetch('/api/stock-transfers?status=pending');
            const data = await res.json();
            setTransfers(data);
        } catch (err) {
            setError('ไม่สามารถโหลดข้อมูลได้');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (transferId: number) => {
        if (!confirm('ยืนยันการอนุมัติโอนพัสดุ?')) return;

        try {
            const res = await fetch(`/api/stock-transfers/${transferId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'approved',
                    approvedBy: userId
                })
            });

            if (!res.ok) throw new Error('Failed to approve');

            // Refresh list
            await fetchTransfers();
        } catch (err) {
            alert('เกิดข้อผิดพลาด: ไม่สามารถอนุมัติได้');
        }
    };

    const handleReject = async (transferId: number) => {
        if (!confirm('ยืนยันการปฏิเสธคำขอนี้?')) return;

        try {
            const res = await fetch(`/api/stock-transfers/${transferId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'rejected',
                    approvedBy: userId
                })
            });

            if (!res.ok) throw new Error('Failed to reject');

            await fetchTransfers();
        } catch (err) {
            alert('เกิดข้อผิดพลาด: ไม่สามารถปฏิเสธได้');
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: any; icon: any; label: string }> = {
            pending: { variant: 'secondary', icon: Clock, label: 'รออนุมัติ' },
            approved: { variant: 'default', icon: CheckCircle, label: 'อนุมัติแล้ว' },
            rejected: { variant: 'destructive', icon: XCircle, label: 'ปฏิเสธ' },
            completed: { variant: 'default', icon: CheckCircle, label: 'เสร็จสิ้น' }
        };

        const config = variants[status] || variants.pending;
        const Icon = config.icon;

        return (
            <Badge variant={config.variant} className="flex items-center gap-1">
                <Icon className="h-3 w-3" />
                {config.label}
            </Badge>
        );
    };

    if (loading) {
        return <div className="text-center py-8">กำลังโหลด...</div>;
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    if (transfers.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <Package className="h-12 w-12 mb-4 opacity-50" />
                    <p>ไม่มีคำขอโอนพัสดุที่รออนุมัติ</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {transfers.map((transfer) => (
                <Card key={transfer.id}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-lg">{transfer.item.name}</CardTitle>
                                <CardDescription className="flex items-center gap-2 mt-1">
                                    <span>{transfer.fromWarehouse.name}</span>
                                    <ArrowRight className="h-4 w-4" />
                                    <span>{transfer.toWarehouse.name}</span>
                                </CardDescription>
                            </div>
                            {getStatusBadge(transfer.status)}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500">จำนวน:</span>
                                    <span className="ml-2 font-medium">{transfer.quantity} ชิ้น</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">วันที่ขอ:</span>
                                    <span className="ml-2">{new Date(transfer.createdAt).toLocaleDateString('th-TH')}</span>
                                </div>
                            </div>

                            {transfer.note && (
                                <div className="text-sm">
                                    <span className="text-gray-500">หมายเหตุ:</span>
                                    <p className="mt-1 text-gray-700">{transfer.note}</p>
                                </div>
                            )}

                            {/* Action Buttons (Admin/Approver only) */}
                            {(userRole === 'admin' || userRole === 'approver') && transfer.status === 'pending' && (
                                <div className="flex gap-2 pt-3 border-t">
                                    <Button
                                        onClick={() => handleApprove(transfer.id)}
                                        className="flex-1"
                                        variant="default"
                                    >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        อนุมัติ
                                    </Button>
                                    <Button
                                        onClick={() => handleReject(transfer.id)}
                                        className="flex-1"
                                        variant="destructive"
                                    >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        ปฏิเสธ
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
