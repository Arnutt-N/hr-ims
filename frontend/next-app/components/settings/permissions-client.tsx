'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPermissions, updatePermission } from '@/lib/actions/permissions';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Save, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

const ROLES = ['user', 'technician', 'approver', 'auditor', 'admin']; // Superadmin always has full access
const MENUS = [
    { label: 'Inventory', path: '/inventory' },
    { label: 'Cart', path: '/cart' },
    { label: 'My Assets', path: '/my-assets' },
    { label: 'Requests', path: '/requests' },
    { label: 'Maintenance', path: '/maintenance' },
    { label: 'History', path: '/history' },
    { label: 'Reports', path: '/reports' },
    { label: 'Scanner', path: '/scanner' },
    { label: 'Tags', path: '/tags' },
    { label: 'Dept Mapping', path: '/settings/departments' },
    { label: 'Users', path: '/users' },
    { label: 'Audit Logs', path: '/logs' },
    { label: 'Categories', path: '/settings/categories' },
    { label: 'Warehouses', path: '/settings/warehouses' },
    { label: 'Settings', path: '/settings' },
];

export function PermissionsClient() {
    const router = useRouter();
    const [permissions, setPermissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        loadPermissions();
    }, []);

    const loadPermissions = async () => {
        setLoading(true);
        const res = await getPermissions();
        if (res.success) {
            setPermissions(res.permissions || []);
        } else {
            toast.error('Failed to load permissions');
        }
        setLoading(false);
    };

    const handleToggle = async (role: string, menuLabel: string, path: string, currentChecked: boolean) => {
        // Optimistic update
        const newChecked = !currentChecked;

        // Find if request is in progress? For now just await
        const res = await updatePermission(role, menuLabel, path, newChecked);
        if (res.success) {
            // Update local state
            setPermissions(prev => {
                const existing = prev.find(p => p.role === role && p.menu === menuLabel);
                if (existing) {
                    return prev.map(p => p.id === existing.id ? { ...p, canView: newChecked } : p);
                } else {
                    return [...prev, { role, menu: menuLabel, path, canView: newChecked }];
                }
            });
            toast.success(`Updated ${role} access to ${menuLabel}`);
        } else {
            toast.error('Failed to update permission');
        }
    };

    const isChecked = (role: string, menuLabel: string) => {
        const perm = permissions.find(p => p.role === role && p.menu === menuLabel);
        // Default to TRUE for now if not found, OR false? 
        // Strategy: Default Block (False) or Allow (True)?
        // For transition, maybe default true? 
        // Let's default to FALSE for safety, but check sidebar logic. 
        // Sidebar logic currently allows hardcoded roles. 
        // Ideally we want to override hardcoded roles.
        // Let's assume default is FALSE if record doesn't exist, EXCEPT for initial migration where we might want to default TRUE.
        // To make it easy: Default FALSE. User has to enable.
        return perm?.canView ?? false;
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto p-6 animate-fade-in-up">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Shield className="text-blue-600" /> Role Permissions
                    </h1>
                    <p className="text-slate-500">Configure menu access for each user role.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Permission Matrix</CardTitle>
                    <CardDescription>
                        Check the boxes to allow access. Uncheck to hide the menu.
                        <br />
                        <span className="text-xs text-amber-600 font-semibold">Note: Superadmin has full access to all menus automatically.</span>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="w-[200px]">Menu / Role</TableHead>
                                    {ROLES.map(role => (
                                        <TableHead key={role} className="text-center capitalize">{role}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {MENUS.map((menu) => (
                                    <TableRow key={menu.label} className="hover:bg-slate-50/50">
                                        <TableCell className="font-medium flex items-center gap-2">
                                            {menu.label}
                                            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">{menu.path}</span>
                                        </TableCell>
                                        {ROLES.map(role => (
                                            <TableCell key={`${role}-${menu.label}`} className="text-center">
                                                <Checkbox
                                                    checked={isChecked(role, menu.label)}
                                                    onCheckedChange={() => handleToggle(role, menu.label, menu.path, isChecked(role, menu.label))}
                                                    className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                                />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
