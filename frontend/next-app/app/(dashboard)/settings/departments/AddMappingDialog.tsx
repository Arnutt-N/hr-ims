'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus } from 'lucide-react';
import { saveDepartmentMapping } from '@/lib/actions/departments';
import { useRouter } from 'next/navigation';

interface AddMappingDialogProps {
    uniqueDepartments: string[];
    warehouses: any[];
}

export default function AddMappingDialog({ uniqueDepartments, warehouses }: AddMappingDialogProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedDept, setSelectedDept] = useState('');
    const [selectedWarehouse, setSelectedWarehouse] = useState('');
    const { toast } = useToast();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDept || !selectedWarehouse) return;

        setIsSubmitting(true);
        try {
            const result = await saveDepartmentMapping(selectedDept, parseInt(selectedWarehouse));
            if (result.success) {
                toast({
                    title: "Success",
                    description: result.message,
                });
                setOpen(false);
                setSelectedDept('');
                setSelectedWarehouse('');
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
        <>
            <Button onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Mapping
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Map Department to Warehouse</DialogTitle>
                        <DialogDescription>
                            Select a department and the default warehouse for its users.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="department">Department</Label>
                                <Select value={selectedDept} onValueChange={setSelectedDept}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {uniqueDepartments.map((dept) => (
                                            <SelectItem key={dept} value={dept}>
                                                {dept}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                            <Button type="submit" disabled={isSubmitting || !selectedDept || !selectedWarehouse}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Mapping
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
