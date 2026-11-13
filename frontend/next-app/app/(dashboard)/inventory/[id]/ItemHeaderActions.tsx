'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import EditItemDialog from './EditItemDialog';
import { ADMIN_ROLES, sessionHasAnyRole } from '@/lib/role-access';

interface ItemHeaderActionsProps {
    item: {
        id: number;
        name: string;
        category: string;
        type: string;
        status: string;
        serial?: string | null;
        image?: string | null;
        repairNotes?: string | null;
    };
}

export default function ItemHeaderActions({ item }: ItemHeaderActionsProps) {
    const { data: session } = useSession();
    const canEdit = sessionHasAnyRole(session, ...ADMIN_ROLES);

    const [editDialogOpen, setEditDialogOpen] = useState(false);

    if (!canEdit) {
        return null;
    }

    return (
        <>
            <Button
                size="sm"
                variant="outline"
                onClick={() => setEditDialogOpen(true)}
            >
                <Edit className="mr-2 h-4 w-4" />
                Edit Item
            </Button>

            <EditItemDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                item={item}
            />
        </>
    );
}
