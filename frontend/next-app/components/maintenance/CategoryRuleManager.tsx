'use client';

import { useEffect, useState, useTransition, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { PageLoader } from '@/components/ui/page-loader';
import { Trash2, Plus, FlaskConical } from 'lucide-react';
import { CATEGORIES, type Category } from '@/lib/maintenance/types';

const CATEGORY_LABELS: Record<Category, string> = {
    electrical: 'ไฟฟ้า',
    mechanical: 'เครื่องกล',
    software: 'ซอฟต์แวร์',
    physical: 'กายภาพ',
    other: 'อื่นๆ',
};

interface Rule {
    id: number;
    category: string;
    assigneeUserId: number;
    priority: number;
    enabled: boolean;
    assignee: { id: number; name: string | null; email: string };
}

interface UserOption {
    id: number;
    name: string | null;
    email: string;
}

export function CategoryRuleManager() {
    const [rules, setRules] = useState<Rule[]>([]);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<UserOption[]>([]);
    const [pending, startTransition] = useTransition();

    // New rule form state
    const [newCategory, setNewCategory] = useState<Category>('electrical');
    const [newAssignee, setNewAssignee] = useState<number | null>(null);
    const [newPriority, setNewPriority] = useState('0');

    // Test tool state
    const [testCategory, setTestCategory] = useState<Category>('electrical');
    const [testResult, setTestResult] = useState<UserOption | null | 'none'>(null);

    const loadRules = useCallback(async () => {
        setLoading(true);
        try {
            const { getCategoryRules } = await import('@/lib/actions/category-rules');
            const r = await getCategoryRules();
            if (r && 'rules' in r && Array.isArray(r.rules)) {
                setRules(r.rules as Rule[]);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadRules();
    }, [loadRules]);

    useEffect(() => {
        // Lazy-load assignable users (admin/superadmin/technician)
        let cancelled = false;
        async function load() {
            try {
                const { getUsers } = await import('@/lib/actions/users');
                const result = await getUsers();
                if (cancelled) return;
                if (Array.isArray(result)) {
                    const eligible = result.filter((u: { role?: string; userRoles?: { role: { slug: string } }[] }) => {
                        const slugs = (u.userRoles ?? []).map((ur) => ur.role.slug);
                        if (u.role && ['admin', 'superadmin', 'technician'].includes(u.role)) return true;
                        return slugs.some((s: string) => ['admin', 'superadmin', 'technician'].includes(s));
                    });
                    setUsers(eligible.map((u: { id: number; name: string | null; email: string }) => ({
                        id: u.id, name: u.name, email: u.email,
                    })));
                }
            } catch {
                // graceful fallback — empty list
            }
        }
        void load();
        return () => { cancelled = true; };
    }, []);

    const addRule = () => {
        if (!newAssignee) {
            toast.error('กรุณาเลือกผู้รับผิดชอบ');
            return;
        }
        startTransition(async () => {
            const { setCategoryRule } = await import('@/lib/actions/category-rules');
            const r = await setCategoryRule({
                category: newCategory,
                assigneeUserId: newAssignee,
                priority: Number.parseInt(newPriority, 10) || 0,
                enabled: true,
            });
            if ('success' in r && r.success) {
                toast.success('เพิ่มกฎเรียบร้อย');
                setNewAssignee(null);
                setNewPriority('0');
                await loadRules();
            } else {
                toast.error(('error' in r && r.error) || 'เพิ่มไม่สำเร็จ');
            }
        });
    };

    const toggleRule = (rule: Rule) => {
        startTransition(async () => {
            const { setCategoryRule } = await import('@/lib/actions/category-rules');
            const r = await setCategoryRule({
                id: rule.id,
                category: rule.category as Category,
                assigneeUserId: rule.assigneeUserId,
                priority: rule.priority,
                enabled: !rule.enabled,
            });
            if ('success' in r && r.success) {
                await loadRules();
            } else {
                toast.error(('error' in r && r.error) || 'อัปเดตไม่สำเร็จ');
            }
        });
    };

    const removeRule = (id: number) => {
        if (!window.confirm('ปิดใช้งานกฎนี้หรือไม่? (ข้อมูลยังคงอยู่)')) return;
        startTransition(async () => {
            const { deleteCategoryRule } = await import('@/lib/actions/category-rules');
            const r = await deleteCategoryRule(id);
            if ('success' in r && r.success) {
                toast.success('ปิดใช้งานเรียบร้อย');
                await loadRules();
            }
        });
    };

    const runTest = () => {
        startTransition(async () => {
            const { testAutoAssignment } = await import('@/lib/actions/category-rules');
            const r = await testAutoAssignment(testCategory);
            if ('success' in r && r.success) {
                setTestResult(r.resolvedAssignee ?? 'none');
            }
        });
    };

    if (loading) return <PageLoader />;

    return (
        <div className="space-y-6">
            {/* Add rule form */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-3">เพิ่มกฎใหม่</h3>
                <div className="grid gap-3 sm:grid-cols-4">
                    <div>
                        <Label>ประเภท</Label>
                        <select
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value as Category)}
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        >
                            {CATEGORIES.map((c) => (
                                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <Label>ผู้รับผิดชอบ</Label>
                        <select
                            value={newAssignee ?? ''}
                            onChange={(e) => setNewAssignee(e.target.value ? Number.parseInt(e.target.value, 10) : null)}
                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        >
                            <option value="">เลือก...</option>
                            {users.map((u) => (
                                <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <Label htmlFor="rule-prio">ลำดับความสำคัญ</Label>
                        <Input
                            id="rule-prio"
                            type="number"
                            min="0"
                            max="100"
                            value={newPriority}
                            onChange={(e) => setNewPriority(e.target.value)}
                        />
                    </div>
                    <div className="flex items-end">
                        <Button onClick={addRule} disabled={pending} className="w-full">
                            <Plus size={14} className="mr-1.5" /> เพิ่ม
                        </Button>
                    </div>
                </div>
            </div>

            {/* Existing rules table */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm overflow-x-auto">
                <h3 className="font-semibold text-slate-900 mb-3">กฎที่มีอยู่ ({rules.length})</h3>
                {rules.length === 0 ? (
                    <p className="text-sm text-slate-500">ยังไม่มีกฎ — เพิ่มกฎด้านบนเพื่อเริ่มใช้</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-600">
                                <th className="py-2 pr-3">ประเภท</th>
                                <th className="py-2 pr-3">ผู้รับผิดชอบ</th>
                                <th className="py-2 pr-3 text-right">ลำดับ</th>
                                <th className="py-2 pr-3">สถานะ</th>
                                <th className="py-2 pr-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rules.map((r) => (
                                <tr key={r.id} className="border-b border-slate-100">
                                    <td className="py-2 pr-3">{CATEGORY_LABELS[r.category as Category] ?? r.category}</td>
                                    <td className="py-2 pr-3">{r.assignee.name ?? r.assignee.email}</td>
                                    <td className="py-2 pr-3 text-right">{r.priority}</td>
                                    <td className="py-2 pr-3">
                                        <button
                                            type="button"
                                            onClick={() => toggleRule(r)}
                                            disabled={pending}
                                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                r.enabled
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-slate-200 text-slate-600'
                                            }`}
                                        >
                                            {r.enabled ? 'เปิดใช้งาน' : 'ปิด'}
                                        </button>
                                    </td>
                                    <td className="py-2 pr-3 text-right">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => removeRule(r.id)}
                                            disabled={pending}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Test sandbox */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <FlaskConical size={18} /> ทดสอบกฎ
                </h3>
                <p className="text-xs text-blue-700 mb-3">เลือกประเภทเพื่อดูว่ารายการแจ้งซ่อมจะถูกมอบหมายให้ใคร</p>
                <div className="flex items-end gap-3">
                    <div className="flex-1">
                        <Label htmlFor="test-cat">ประเภท</Label>
                        <select
                            id="test-cat"
                            value={testCategory}
                            onChange={(e) => setTestCategory(e.target.value as Category)}
                            className="mt-1 block w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm"
                        >
                            {CATEGORIES.map((c) => (
                                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                            ))}
                        </select>
                    </div>
                    <Button onClick={runTest} disabled={pending}>ทดสอบ</Button>
                </div>
                {testResult !== null && (
                    <div className="mt-3 rounded-md bg-white px-3 py-2 text-sm">
                        {testResult === 'none'
                            ? '⚠️ ไม่มีกฎที่ใช้ได้ — รายการจะไม่ถูกมอบหมายอัตโนมัติ'
                            : `✅ จะมอบหมายให้: ${testResult.name ?? testResult.email}`}
                    </div>
                )}
            </div>
        </div>
    );
}
