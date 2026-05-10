'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole, ADMIN_ROLES } from '@/lib/auth-guards';
import { CATEGORIES } from '@/lib/maintenance/types';

/**
 * CategoryAssigneeRule Server Actions (PRP v6 Phase 5 — Q15).
 *
 * Admin manages a small set of "category → default assignee" rules.
 * createMaintenanceRequest consults these rules at insert time to pre-set
 * assignedToId, removing the manual triage step for predictable categories
 * like electrical → electrician.
 */

const SetRuleSchema = z.object({
    id: z.number().int().positive().optional(), // omit = create
    category: z.enum(CATEGORIES),
    assigneeUserId: z.number().int().positive(),
    priority: z.number().int().min(0).max(100).optional(),
    enabled: z.boolean().optional(),
});

/**
 * List all rules (incl. disabled). Used by /settings/maintenance-rules
 * admin page; sorted by category + priority desc for readable display.
 */
export async function getCategoryRules() {
    const session = await requireRole(...ADMIN_ROLES);
    if (!session?.user?.id) return { error: 'Unauthorized - Admin only' };

    try {
        const rules = await prisma.categoryAssigneeRule.findMany({
            include: { assignee: { select: { id: true, name: true, email: true } } },
            orderBy: [{ category: 'asc' }, { priority: 'desc' }],
        });
        return { success: true, rules };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('getCategoryRules failed:', message);
        return { error: message };
    }
}

/**
 * Upsert a rule. Validates the assignee has admin/technician role
 * (ineligible if plain user/auditor — they cannot be auto-assigned work).
 */
export async function setCategoryRule(input: unknown) {
    const session = await requireRole(...ADMIN_ROLES);
    if (!session?.user?.id) return { error: 'Unauthorized - Admin only' };

    const parsed = SetRuleSchema.safeParse(input);
    if (!parsed.success) return { error: 'Invalid input', issues: parsed.error.format() };
    const { id, category, assigneeUserId, priority, enabled } = parsed.data;

    try {
        // Validate assignee role
        const assignee = await prisma.user.findUnique({
            where: { id: assigneeUserId },
            include: { userRoles: { include: { role: true } } },
        });
        if (!assignee) return { error: 'Assignee not found' };
        const roles = assignee.userRoles.map((ur) => ur.role.slug);
        const eligible = roles.some((r) => ['admin', 'superadmin', 'technician'].includes(r));
        if (!eligible) {
            return {
                error: 'Assignee must have admin, superadmin, or technician role to receive auto-assignment',
            };
        }

        const rule = id
            ? await prisma.categoryAssigneeRule.update({
                  where: { id },
                  data: {
                      category,
                      assigneeUserId,
                      priority: priority ?? 0,
                      enabled: enabled ?? true,
                  },
              })
            : await prisma.categoryAssigneeRule.create({
                  data: {
                      category,
                      assigneeUserId,
                      priority: priority ?? 0,
                      enabled: enabled ?? true,
                  },
              });

        revalidatePath('/settings/maintenance-rules');
        return { success: true, rule };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('setCategoryRule failed:', message);
        return { error: message };
    }
}

/**
 * Soft-disable a rule (sets enabled=false). Hard delete intentionally
 * not supported — keeps audit trail of historical assignment intent.
 */
export async function deleteCategoryRule(id: number) {
    const session = await requireRole(...ADMIN_ROLES);
    if (!session?.user?.id) return { error: 'Unauthorized - Admin only' };

    if (!Number.isInteger(id) || id <= 0) return { error: 'Invalid id' };

    try {
        await prisma.categoryAssigneeRule.update({
            where: { id },
            data: { enabled: false },
        });
        revalidatePath('/settings/maintenance-rules');
        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('deleteCategoryRule failed:', message);
        return { error: message };
    }
}

/**
 * Preview tooling for the admin settings page — shows what assignee would
 * be picked for a given category without actually creating a request.
 */
export async function testAutoAssignment(category: string) {
    const session = await requireRole(...ADMIN_ROLES);
    if (!session?.user?.id) return { error: 'Unauthorized - Admin only' };

    const parsed = z.enum(CATEGORIES).safeParse(category);
    if (!parsed.success) return { error: 'Invalid category' };

    try {
        const matchedRule = await prisma.categoryAssigneeRule.findFirst({
            where: { category: parsed.data, enabled: true },
            orderBy: { priority: 'desc' },
            include: { assignee: { select: { id: true, name: true, email: true } } },
        });
        return {
            success: true,
            matchedRule,
            resolvedAssignee: matchedRule?.assignee ?? null,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('testAutoAssignment failed:', message);
        return { error: message };
    }
}
