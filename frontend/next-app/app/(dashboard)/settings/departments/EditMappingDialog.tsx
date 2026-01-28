'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Edit } from 'lucide-react';
import { saveDepartmentMapping } from '@/lib/actions/departments';
import { useRouter } from 'next/navigation';

interface EditMappingDialogProps {
    department: string;
    initialWarehouseId: number;
    warehouses: any[];
}

export default function EditMappingDialog({ department, initialWarehouseId, warehouses }: EditMappingDialogProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedWarehouse, setSelectedWarehouse] = useState(initialWarehouseId.toString());
    const { toast } = useToast();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWarehouse) return;

        setIsSubmitting(true);
        try {
            const result = await saveDepartmentMapping(department, parseInt(selectedWarehouse));
            if (result.success) {
                toast({
                    title: "Success",
                    description: result.message,
                });
                setOpen(false);
                router.refresh();
            } else {
                toast({
                    title: "Error",
                    description: result.message,
                    variant: "destructive"
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Something went wrong",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                    <Edit size={16} />
                    <span className="sr-only">Edit</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Department Mapping</DialogTitle>
                    <DialogDescription>
                        Change the default warehouse for <strong>{department}</strong>.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="department">Department</Label>
                            <div className="px-3 py-2 rounded-md border border-slate-200 bg-slate-50 text-slate-500 text-sm">
                                {department}
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="warehouse">Default Warehouse</Label>
                            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select warehouse" />
                                </SelectTrigger>
                                <SelectContent>
                                    {warehouses.map((wh) => (
                                        <SelectItem key={wh.id} value={wh.id.toString()}>
                                            {wh.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !selectedWarehouse || selectedWarehouse === initialWarehouseId.toString()}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
