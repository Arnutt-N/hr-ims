'use client';

import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { deleteDepartmentMapping } from '@/lib/actions/departments';
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function DeleteMappingButton({ id }: { id: number }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const result = await deleteDepartmentMapping(id);
            if (result.success) {
                toast({
                    title: "Success",
                    description: result.message,
                });
                router.refresh();
            } else {
                toast({
                    title: "Error",
                    description: result.message,
                    variant: 'destructive'
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to delete mapping",
                variant: 'destructive'
            });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="text-slate-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will remove the department mapping.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
