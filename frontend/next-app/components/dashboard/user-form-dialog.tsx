'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { revokeUserSessions } from '@/lib/actions/users';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface UserFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: any) => Promise<void>;
    initialData?: any;
    mode: 'create' | 'edit';
    currentUserRole?: string;
}

export function UserFormDialog({ open, onOpenChange, onSubmit, initialData, mode, currentUserRole }: UserFormProps) {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        role: 'user',
        department: '',
        status: 'active'
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (initialData && mode === 'edit') {
            setFormData({
                email: initialData.email || '',
                password: '',
                name: initialData.name || '',
                role: initialData.role || 'user',
                department: initialData.department || '',
                status: initialData.status || 'active'
            });
        } else {
            setFormData({
                email: '',
                password: '',
                name: '',
                role: 'user',
                department: '',
                status: 'active'
            });
        }
        setErrors({});
    }, [initialData, mode, open]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!emailRegex.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }

        // Password validation (only for create or if changing password)
        if (mode === 'create' || formData.password) {
            if (!formData.password) {
                newErrors.password = 'Password is required';
            } else if (formData.password.length < 8) {
                newErrors.password = 'Password must be at least 8 characters';
            } else if (!/[A-Z]/.test(formData.password)) {
                newErrors.password = 'Password must contain at least one uppercase letter';
            } else if (!/[a-z]/.test(formData.password)) {
                newErrors.password = 'Password must contain at least one lowercase letter';
            } else if (!/[0-9]/.test(formData.password)) {
                newErrors.password = 'Password must contain at least one number';
            }
        }

        // Name validation
        if (!formData.name) {
            newErrors.name = 'Name is required';
        } else if (formData.name.length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }

        // Department validation
        if (!formData.department) {
            newErrors.department = 'Department is required';
        } else if (formData.department.length < 2) {
            newErrors.department = 'Department must be at least 2 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setSubmitting(true);

        // Prepare data (exclude empty password for edit)
        const { password, ...otherData } = formData;
        const submitData = mode === 'edit' && !password
            ? otherData
            : { ...formData };

        await onSubmit(submitData);
        setSubmitting(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{mode === 'create' ? 'Add New User' : 'Edit User'}</DialogTitle>
                        <DialogDescription>
                            {mode === 'create'
                                ? 'Create a new user account with appropriate access level.'
                                : 'Update user information and permissions.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {/* Email */}
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email Address *</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                disabled={mode === 'edit'}
                                className={errors.email ? 'border-red-500' : ''}
                            />
                            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                        </div>

                        {/* Password */}
                        <div className="grid gap-2">
                            <Label htmlFor="password">
                                Password {mode === 'create' ? '*' : '(Leave blank to keep current)'}
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder={mode === 'edit' ? 'Enter new password...' : 'Min. 8 characters'}
                                className={errors.password ? 'border-red-500' : ''}
                            />
                            {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                            {!errors.password && (
                                <p className="text-xs text-slate-500">
                                    Must contain uppercase, lowercase, and number
                                </p>
                            )}
                        </div>

                        {/* Name */}
                        <div className="grid gap-2">
                            <Label htmlFor="name">Full Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className={errors.name ? 'border-red-500' : ''}
                            />
                            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                        </div>

                        {/* Department */}
                        <div className="grid gap-2">
                            <Label htmlFor="department">Department *</Label>
                            <Input
                                id="department"
                                value={formData.department}
                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                placeholder="e.g., IT, HR, Finance"
                                className={errors.department ? 'border-red-500' : ''}
                            />
                            {errors.department && <p className="text-xs text-red-500">{errors.department}</p>}
                        </div>

                        {/* Role */}
                        <div className="grid gap-2">
                            <Label htmlFor="role">Role *</Label>
                            <Select value={formData.role} onValueChange={(val: string) => setFormData({ ...formData, role: val })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {currentUserRole === 'superadmin' && (
                                        <SelectItem value="superadmin">Super Administrator</SelectItem>
                                    )}
                                    <SelectItem value="admin">Administrator</SelectItem>
                                    <SelectItem value="approver">Approver (ผู้อนุมัติ)</SelectItem>
                                    <SelectItem value="auditor">Auditor (ผู้ตรวจ)</SelectItem>
                                    <SelectItem value="technician">Technician (ช่างซ่อม)</SelectItem>
                                    <SelectItem value="user">Standard User</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Status */}
                        <div className="grid gap-2">
                            <Label htmlFor="status">Status *</Label>
                            <Select value={formData.status} onValueChange={(val: string) => setFormData({ ...formData, status: val })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:justify-between">
                        {mode === 'edit' && (
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={async () => {
                                    if (!confirm('Are you sure you want to revoke all active sessions for this user? They will be logged out immediately.')) return;
                                    const res = await revokeUserSessions(initialData.id);
                                    if (res.success) toast.success('All sessions revoked');
                                    else toast.error(res.error || 'Failed');
                                }}
                            >
                                Revoke Sessions
                            </Button>
                        )}
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700">
                                {submitting ? 'Saving...' : (mode === 'create' ? 'Create User' : 'Update User')}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
