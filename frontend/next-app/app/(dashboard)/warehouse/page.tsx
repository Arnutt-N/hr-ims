"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StockTransferForm from '@/components/warehouse/StockTransferForm';
import TransferApprovalList from '@/components/warehouse/TransferApprovalList';
import { Package, ArrowLeftRight, CheckSquare } from 'lucide-react';

export default function WarehouseManagementPage() {
    const [activeTab, setActiveTab] = useState('request');

    // TODO: Get from session/auth
    const userId = 1;
    const userRole = 'admin'; // admin, approver, user

    const handleTransferSuccess = () => {
        alert('ส่งคำขอโอนพัสดุเรียบร้อยแล้ว รอการอนุมัติ');
        // Switch to approval tab if admin
        if (userRole === 'admin' || userRole === 'approver') {
            setActiveTab('approval');
        }
    };

    return (
        <div className="container mx-auto py-8 px-4 max-w-6xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Package className="h-8 w-8" />
                    จัดการคลังพัสดุ
                </h1>
                <p className="text-gray-600 mt-2">
                    ระบบโอนพัสดุระหว่างคลังและอนุมัติคำขอ
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="request" className="flex items-center gap-2">
                        <ArrowLeftRight className="h-4 w-4" />
                        ขอโอนพัสดุ
                    </TabsTrigger>
                    <TabsTrigger value="approval" className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4" />
                        อนุมัติคำขอ
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="request" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>แบบฟอร์มขอโอนพัสดุ</CardTitle>
                            <CardDescription>
                                กรอกข้อมูลเพื่อขอโอนพัสดุจากคลังหนึ่งไปยังอีกคลังหนึ่ง
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <StockTransferForm
                                userId={userId}
                                onSuccess={handleTransferSuccess}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="approval" className="mt-6">
                    <div>
                        <h2 className="text-xl font-semibold mb-4">คำขอที่รออนุมัติ</h2>
                        <TransferApprovalList userId={userId} userRole={userRole} />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
