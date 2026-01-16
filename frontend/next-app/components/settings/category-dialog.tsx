'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { createCategory, updateCategory } from '@/lib/actions/categories';

interface CategoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    category?: any;
    onSuccess: () => void;
}

export function CategoryDialog({ open, onOpenChange, category, onSuccess }: CategoryDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (open) {
            setName(category?.name || '');
            setDescription(category?.description || '');
        }
    }, [open, category]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Name is required');
            return;
        }

        setIsLoading(true);
        try {
            const data = { name, description };
            if (category) {
                const res = await updateCategory(category.id, data);
                if (res.error) {
                    toast.error(res.error);
                } else {
                    toast.success('Category updated successfully');
                    onSuccess();
                    onOpenChange(false);
                }
            } else {
                const res = await createCategory(data);
                if (res.error) {
                    toast.error(res.error);
                } else {
                    toast.success('Category created successfully');
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{category ? 'Edit Category' : 'Create Category'}</DialogTitle>
                    <DialogDescription>
                        {category ? 'Update the category details below.' : 'Add a new category for inventory items.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            disabled={isLoading}
                            placeholder="e.g. IT Equipment"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            disabled={isLoading}
                            placeholder="Optional description..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button disabled={isLoading} type="submit">
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {category ? 'Save Changes' : 'Create Category'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
