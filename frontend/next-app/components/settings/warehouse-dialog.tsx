'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { createWarehouse, updateWarehouse, getDivisions, getProvinces } from '@/lib/actions/warehouse';
import { getUsersForAssignment } from '@/lib/actions/users'; // Use new assignment function
import { Warehouse, User, Division, Province } from '@/types/schema';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Check, X, Search, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface WarehouseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    warehouse: Warehouse | null;
}

export function WarehouseDialog({ open, onOpenChange, warehouse }: WarehouseDialogProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    // Form States
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [type, setType] = useState('main'); // Default to main
    const [divisionId, setDivisionId] = useState<string>('');
    const [provinceId, setProvinceId] = useState<string>('');
    const [selectedManagers, setSelectedManagers] = useState<number[]>([]);

    // Data States
    const [users, setUsers] = useState<User[]>([]);
    const [divisions, setDivisions] = useState<Division[]>([]);
    const [provinces, setProvinces] = useState<Province[]>([]);

    // UI States
    const [managerSearch, setManagerSearch] = useState('');

    useEffect(() => {
        if (open) {
            fetchData();
            if (warehouse) {
                setName(warehouse.name);
                setCode(warehouse.code);
                setType(warehouse.type);
                setDivisionId(warehouse.divisionId?.toString() || '');
                setProvinceId(warehouse.provinceId?.toString() || '');
                setSelectedManagers(warehouse.managers.map(m => m.id));
            } else {
                resetForm();
            }
        }
    }, [open, warehouse]);

    const fetchData = async () => {
        const [usersRes, divisionsRes, provincesRes] = await Promise.all([
            getUsersForAssignment(),
            getDivisions(),
            getProvinces()
        ]);

        if (usersRes.success) setUsers(usersRes.users || []);
        if (divisionsRes.success) setDivisions(divisionsRes.divisions || []);
        if (provincesRes.success) setProvinces(provincesRes.provinces || []);
    };

    const resetForm = () => {
        setName('');
        setCode('');
        setType('main');
        setDivisionId('');
        setProvinceId('');
        setSelectedManagers([]);
        setManagerSearch('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!name || !code) {
            toast({ title: 'Error', description: 'Name and Code are required', variant: 'destructive' });
            return;
        }

        if (type === 'division' && !divisionId) {
            toast({ title: 'Error', description: 'Please select a Division', variant: 'destructive' });
            return;
        }

        if (type === 'provincial' && !provinceId) {
            toast({ title: 'Error', description: 'Please select a Province', variant: 'destructive' });
            return;
        }

        setLoading(true);

        const data = {
            name,
            code,
            type,
            divisionId: type === 'division' ? parseInt(divisionId) : null,
            provinceId: type === 'provincial' ? parseInt(provinceId) : null,
            managerIds: selectedManagers,
            isActive: true
        };

        const result = warehouse
            ? await updateWarehouse(warehouse.id, data)
            : await createWarehouse(data);

        setLoading(false);

        if (result.success) {
            toast({
                title: 'Success',
                description: `Warehouse ${warehouse ? 'updated' : 'created'} successfully`
            });
            onOpenChange(false);
        } else {
            toast({
                title: 'Error',
                description: result.error || 'Operation failed',
                variant: 'destructive'
            });
        }
    };

    const toggleManager = (userId: number) => {
        setSelectedManagers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const filteredUsers = users.filter(u =>
        (u.name?.toLowerCase().includes(managerSearch.toLowerCase()) ?? false) ||
        u.email.toLowerCase().includes(managerSearch.toLowerCase())
    );

    // Handle Type Change logic
    const handleTypeChange = (value: string) => {
        setType(value);
        if (value !== 'division') setDivisionId('');
        if (value !== 'provincial') setProvinceId('');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{warehouse ? 'Edit Warehouse' : 'New Warehouse'}</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-2">
                    <form id="warehouse-form" onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Main Warehouse"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="code">Code <span className="text-red-500">*</span></Label>
                                <Input
                                    id="code"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="WH-01"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={type} onValueChange={handleTypeChange}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="main">Main Warehouse (คลังหลัก)</SelectItem>
                                    <SelectItem value="division">Division Warehouse (คลังกอง/คลังย่อย)</SelectItem>
                                    <SelectItem value="provincial">Provincial Warehouse (คลังจังหวัด/ภูมิภาค)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {type === 'division' && (
                            <div className="space-y-2">
                                <Label className="text-red-600">Division (สังกัดกอง) *</Label>
                                <Select value={divisionId} onValueChange={setDivisionId}>
                                    <SelectTrigger className="bg-yellow-50 border-yellow-200">
                                        <SelectValue placeholder="เลือกกองที่สังกัด" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {divisions.map((div) => (
                                            <SelectItem key={div.id} value={div.id.toString()}>
                                                {div.name} ({div.abbr})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {type === 'provincial' && (
                            <div className="space-y-2">
                                <Label className="text-blue-600">Province (จังหวัด) *</Label>
                                <Select value={provinceId} onValueChange={setProvinceId}>
                                    <SelectTrigger className="bg-blue-50 border-blue-200">
                                        <SelectValue placeholder="เลือกจังหวัด" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {provinces.map((prov) => (
                                            <SelectItem key={prov.id} value={prov.id.toString()}>
                                                {prov.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Assigned Managers</Label>
                            <div className="border rounded-md p-3 space-y-3">
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search users..."
                                        className="pl-8"
                                        value={managerSearch}
                                        onChange={(e) => setManagerSearch(e.target.value)}
                                    />
                                </div>

                                <ScrollArea className="h-[150px]">
                                    <div className="space-y-2">
                                        {filteredUsers.length === 0 ? (
                                            <p className="text-sm text-center text-muted-foreground py-4">
                                                No users found
                                            </p>
                                        ) : (
                                            filteredUsers.map(user => {
                                                const isSelected = selectedManagers.includes(user.id);
                                                return (
                                                    <div
                                                        key={user.id}
                                                        className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 border-primary/20 border' : 'hover:bg-accent'
                                                            }`}
                                                        onClick={() => toggleManager(user.id)}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarImage src={user.avatar || undefined} />
                                                                <AvatarFallback>{(user.name || 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <p className="text-sm font-medium leading-none">{user.name}</p>
                                                                <p className="text-xs text-muted-foreground">{user.email}</p>
                                                            </div>
                                                        </div>
                                                        {isSelected && <Check className="h-4 w-4 text-primary" />}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </ScrollArea>
                                <p className="text-xs text-right text-muted-foreground">
                                    Selected: {selectedManagers.length}
                                </p>
                            </div>
                        </div>
                    </form>
                </div>

                <DialogFooter className="pt-2 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button type="submit" form="warehouse-form" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {warehouse ? 'Save Changes' : 'Create Warehouse'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
    return (
        <div className="bg-blue-600 text-white rounded-full p-1">
            <Check className="h-3 w-3" />
        </div>
    );
}
