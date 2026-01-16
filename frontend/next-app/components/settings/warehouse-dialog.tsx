'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { createWarehouse, updateWarehouse } from '@/lib/actions/warehouse';
import { getUsers } from '@/lib/actions/users';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface WarehouseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    warehouse?: any;
    onSuccess: () => void;
}

export function WarehouseDialog({ open, onOpenChange, warehouse, onSuccess }: WarehouseDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [users, setUsers] = useState<any[]>([]);

    // Form State
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [type, setType] = useState('central');
    const [selectedManagers, setSelectedManagers] = useState<number[]>([]);

    useEffect(() => {
        // Load users for manager selection
        if (open) {
            getUsers().then(res => {
                if (res.success) setUsers(res.users || []);
            });
        }
    }, [open]);

    useEffect(() => {
        if (open) {
            setName(warehouse?.name || '');
            setCode(warehouse?.code || '');
            setType(warehouse?.type || 'central');
            setSelectedManagers(warehouse?.managers?.map((m: any) => m.id) || []);
        }
    }, [open, warehouse]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !code) return toast.error('Name and Code are required');

        setIsLoading(true);
        try {
            const data = {
                name,
                code,
                type,
                managerIds: selectedManagers
            };

            if (warehouse) {
                const res = await updateWarehouse(warehouse.id, data);
                if (res.error) toast.error(res.error);
                else {
                    toast.success('Warehouse updated');
                    onSuccess();
                    onOpenChange(false);
                }
            } else {
                const res = await createWarehouse(data);
                if (res.error) toast.error(res.error);
                else {
                    toast.success('Warehouse created');
                    onSuccess();
                    onOpenChange(false);
                }
            }
        } catch (error) {
            console.error(error);
            toast.error('Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleManager = (userId: number) => {
        if (selectedManagers.includes(userId)) {
            setSelectedManagers(selectedManagers.filter(id => id !== userId));
        } else {
            setSelectedManagers([...selectedManagers, userId]);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{warehouse ? 'Edit Warehouse' : 'New Warehouse'}</DialogTitle>
                    <DialogDescription>
                        Configure warehouse details and assign managers.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Main Warehouse" />
                        </div>
                        <div className="space-y-2">
                            <Label>Code</Label>
                            <Input value={code} onChange={e => setCode(e.target.value)} placeholder="WH-01" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="central">Central</SelectItem>
                                <SelectItem value="division">Division</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Assigned Managers</Label>
                        <div className="border rounded-md p-3 max-h-[150px] overflow-y-auto space-y-2">
                            {users.map(user => {
                                const isSelected = selectedManagers.includes(user.id);
                                return (
                                    <div
                                        key={user.id}
                                        className={`flex items-center justify-between p-2 rounded-lg text-sm cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-slate-50'}`}
                                        onClick={() => toggleManager(user.id)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={user.avatar} />
                                                <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <span className={isSelected ? 'font-medium text-blue-700' : 'text-slate-600'}>{user.name}</span>
                                        </div>
                                        {isSelected && <CheckBadge />}
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-xs text-slate-500">Click to select/deselect managers.</p>
                    </div>

                    <DialogFooter>
                        <Button disabled={isLoading} type="submit">
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {warehouse ? 'Save Changes' : 'Create Warehouse'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function CheckBadge() {
    return (
        <div className="bg-blue-600 text-white rounded-full p-0.5">
            <Plus className="h-3 w-3 rotate-45" />
            {/* Using a rotated plus as check for now or just import Check */}
        </div>
    );
}
