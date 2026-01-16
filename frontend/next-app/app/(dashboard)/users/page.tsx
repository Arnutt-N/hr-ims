'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getUsers, createUser, updateUser, deleteUser } from '@/lib/actions/users';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UserPlus, Edit, Trash2, Search, Users as UsersIcon } from 'lucide-react';
import { UserFormDialog } from '@/components/dashboard/user-form-dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function UserManagementPage() {
    const { data: session } = useSession();
    const [users, setUsers] = useState<any[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<any>(null);

    useEffect(() => {
        loadUsers();
    }, []);

    useEffect(() => {
        // Filter users based on search query
        if (searchQuery) {
            const filtered = users.filter(user =>
                user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.department?.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredUsers(filtered);
        } else {
            setFilteredUsers(users);
        }
    }, [searchQuery, users]);

    const loadUsers = async () => {
        setLoading(true);
        const res = await getUsers();
        if (res.success) {
            setUsers(res.users || []);
            setFilteredUsers(res.users || []);
        } else {
            toast.error(res.error || 'Failed to load users');
        }
        setLoading(false);
    };

    const handleCreate = () => {
        setSelectedUser(null);
        setDialogMode('create');
        setDialogOpen(true);
    };

    const handleEdit = (user: any) => {
        setSelectedUser(user);
        setDialogMode('edit');
        setDialogOpen(true);
    };

    const handleDeleteClick = (user: any) => {
        setUserToDelete(user);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!userToDelete) return;

        const res = await deleteUser(userToDelete.id);
        if (res.success) {
            toast.success('User deleted successfully');
            loadUsers();
        } else {
            toast.error(res.error || 'Failed to delete user');
        }
        setDeleteConfirmOpen(false);
        setUserToDelete(null);
    };

    const handleFormSubmit = async (data: any) => {
        let res;
        if (dialogMode === 'create') {
            res = await createUser(data);
        } else {
            res = await updateUser(selectedUser.id, data);
        }

        if (res.success) {
            toast.success(`User ${dialogMode === 'create' ? 'created' : 'updated'} successfully`);
            setDialogOpen(false);
            loadUsers();
        } else {
            toast.error(res.error || 'Operation failed');
        }
    };

    if (loading) return <div className="p-8 text-center animate-pulse">Loading users...</div>;

    return (
        <div className="space-y-6 animate-fade-in-up max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">User Management</h2>
                    <p className="text-slate-500 mt-1">Manage system access and user roles.</p>
                </div>
                <Button
                    onClick={handleCreate}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200"
                >
                    <UserPlus size={16} className="mr-2" /> Add New User
                </Button>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <Input
                        placeholder="Search by name, email, or department..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {filteredUsers.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <UsersIcon size={48} className="mx-auto mb-4 text-slate-200" />
                        <p className="font-medium">No users found</p>
                        {searchQuery && <p className="text-sm mt-1">Try adjusting your search</p>}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow>
                                    <TableHead>User Info</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.map((user) => (
                                    <TableRow key={user.id} className="hover:bg-slate-50/50">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                                    {user.name?.[0]?.toUpperCase() || 'U'}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800">{user.name || 'Unknown'}</div>
                                                    <div className="text-xs text-slate-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={user.role === 'admin' ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-100'}>
                                                {user.role?.toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-slate-600">{user.department || '-'}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                                                <span className="text-sm font-medium text-slate-600 capitalize">{user.status}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEdit(user)}
                                                    className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                >
                                                    <Edit size={16} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteClick(user)}
                                                    className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            <div className="text-sm text-slate-500 text-center">
                Showing {filteredUsers.length} of {users.length} user{users.length !== 1 ? 's' : ''}
            </div>

            {/* User Form Dialog */}
            <UserFormDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSubmit={handleFormSubmit}
                initialData={selectedUser}
                mode={dialogMode}
                currentUserRole={session?.user?.role}
            />

            {/* Delete Confirmation */}
            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete <strong>{userToDelete?.name}</strong>'s account.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete User
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
