import { PermissionsClient } from '@/components/settings/permissions-client';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Role Permissions | HR-IMS',
    description: 'Configure system permissions',
};

export default function PermissionsPage() {
    return <PermissionsClient />;
}
