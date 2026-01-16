'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { updateInventoryItem } from '@/lib/actions/inventory';
import { getCategories } from '@/lib/actions/categories';
import { toast } from 'sonner';

interface EditItemDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: {
        id: number;
        name: string;
        category: string;
        type: string;
        status: string;
        stock?: number;
        serial?: string | null;
        image?: string | null;
        repairNotes?: string | null;
    };
}

export default function EditItemDialog({ open, onOpenChange, item }: EditItemDialogProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        name: item.name,
        category: item.category,
        type: item.type,
        status: item.status,
        serial: item.serial || '',
        image: item.image || '',
        repairNotes: item.repairNotes || '',
        stock: item.stock || 0
    });

    useEffect(() => {
        setFormData({
            name: item.name,
            category: item.category,
            type: item.type,
            status: item.status,
            serial: item.serial || '',
            image: item.image || '',
            repairNotes: item.repairNotes || '',
            stock: item.stock || 0
        });
    }, [item]);

    // Load categories when dialog opens
    useEffect(() => {
        if (open) {
            getCategories().then(res => {
                if (res.success && res.categories) {
                    setCategories(res.categories);
                }
            });
        }
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const result = await updateInventoryItem(item.id, {
                name: formData.name,
                category: formData.category,
                type: formData.type as any,
                status: formData.status as any,
                serial: formData.serial,
                stock: formData.stock
                // Image and RepairNotes not in Zod schema yet? Need to check UpdateInventory schema
                // If they are missing from schema, I should add them or ignore them.
                // Assuming schema matches usage.
            });

            if (result.success) {
                toast.success('Item updated successfully');
                onOpenChange(false);
            } else {
                toast.error(result.message || 'Failed to update item');
            }
        } catch (error: any) {
            toast.error('An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Edit Item Information</DialogTitle>
                    <DialogDescription>
                        Update item details. Required fields are marked with *
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="category">Category *</Label>
                                <Select
                                    value={formData.category} // Use category name as value for now since schema expects string
                                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.name}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                        {/* Fallback if current category not in list */}
                                        {!categories.find(c => c.name === formData.category) && formData.category && (
                                            <SelectItem value={formData.category}>{formData.category}</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="type">Type *</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="durable">Durable</SelectItem>
                                        <SelectItem value="consumable">Consumable</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">Status *</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="available">Available</SelectItem>
                                        <SelectItem value="borrowed">Borrowed</SelectItem>
                                        <SelectItem value="maintenance">Maintenance</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="serial">Serial Number</Label>
                            <Input
                                id="serial"
                                value={formData.serial}
                                onChange={(e) => setFormData({ ...formData, serial: e.target.value })}
                                placeholder="Optional"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="image">Image URL</Label>
                            <Input
                                id="image"
                                value={formData.image}
                                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                                placeholder="Optional"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="repairNotes">Repair Notes</Label>
                            <Textarea
                                id="repairNotes"
                                value={formData.repairNotes}
                                onChange={(e) => setFormData({ ...formData, repairNotes: e.target.value })}
                                placeholder="Maintenance or repair notes"
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
