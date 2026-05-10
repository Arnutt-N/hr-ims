/**
 * Prisma mock harness for Server Action unit tests.
 *
 * Usage:
 *   import { prismaMock, resetPrismaMock, runTxCallback } from '../__mocks__/prisma';
 *
 *   vi.mock('@/lib/prisma', () => ({ default: prismaMock }));
 *
 *   beforeEach(() => resetPrismaMock());
 *
 *   prismaMock.user.findUnique.mockResolvedValueOnce({ id: 1, email: 'x' });
 *
 * `$transaction(callback)` invokes the callback with `prismaMock` itself as `tx`,
 * so the same mocked methods are usable inside both top-level and tx-scoped code.
 * `$transaction([...promises])` resolves all promises (callers tend to use the
 * callback form, but we support the array form for completeness).
 */

import { vi, type Mock } from 'vitest';

type Crud = {
    findUnique: Mock;
    findFirst: Mock;
    findMany: Mock;
    create: Mock;
    createMany: Mock;
    update: Mock;
    updateMany: Mock;
    upsert: Mock;
    delete: Mock;
    deleteMany: Mock;
    count: Mock;
};

function makeCrud(): Crud {
    return {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        createMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        upsert: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
        count: vi.fn(),
    };
}

const MODELS = [
    'user',
    'role',
    'userRole',
    'rolePermission',
    'inventoryItem',
    'category',
    'cartItem',
    'request',
    'requestItem',
    'warehouse',
    'stockLevel',
    'stockTransfer',
    'stockTransaction',
    'department',
    'departmentMapping',
    'division',
    'province',
    'history',
    'notification',
    'settings',
    'auditLog',
    'passwordHistory',
    'emailVerification',
    'session',
    // PRP v6 maintenance workflow models
    'maintenanceRequest',
    'maintenanceRequestItem',
    'maintenanceLog',
    'categoryAssigneeRule', // PRP v6 Phase 5
    'maintenanceRequestWatcher', // PRP v6 Phase 6
] as const;

type ModelName = (typeof MODELS)[number];

type PrismaMock = Record<ModelName, Crud> & {
    $transaction: Mock;
    $connect: Mock;
    $disconnect: Mock;
};

function buildPrismaMock(): PrismaMock {
    const mock = {} as PrismaMock;
    for (const model of MODELS) {
        (mock as any)[model] = makeCrud();
    }
    mock.$transaction = vi.fn();
    mock.$connect = vi.fn();
    mock.$disconnect = vi.fn();
    return mock;
}

export const prismaMock: PrismaMock = buildPrismaMock();

/**
 * Default `$transaction` behaviour: invoke callback with `prismaMock` as the `tx`
 * argument; resolve to its return. For array form, Promise.all the array.
 */
function defaultTransactionImpl(arg: any) {
    if (typeof arg === 'function') {
        return arg(prismaMock);
    }
    if (Array.isArray(arg)) {
        return Promise.all(arg);
    }
    return Promise.resolve(arg);
}

prismaMock.$transaction.mockImplementation(defaultTransactionImpl);

/** Reset all mocks. Call from beforeEach. */
export function resetPrismaMock(): void {
    for (const model of MODELS) {
        const crud = (prismaMock as any)[model] as Record<string, unknown>;
        for (const fn of Object.values(crud)) {
            // Tolerant of test-added stubs (e.g. `stockLevel.fields` references)
            // that aren't vi.fn() mocks.
            if (fn && typeof (fn as Mock).mockReset === 'function') {
                (fn as Mock).mockReset();
            }
        }
    }
    prismaMock.$transaction.mockReset();
    prismaMock.$transaction.mockImplementation(defaultTransactionImpl);
    prismaMock.$connect.mockReset();
    prismaMock.$disconnect.mockReset();
}

/**
 * Helper: directly invoke a recorded `$transaction` callback from a previous call.
 * Useful when you need to assert behaviour inside the callback when
 * `$transaction` was awaited but not directly invoked.
 */
export async function runTxCallback(callIndex = 0): Promise<unknown> {
    const call = prismaMock.$transaction.mock.calls[callIndex];
    if (!call) throw new Error(`No $transaction call at index ${callIndex}`);
    const arg = call[0];
    if (typeof arg !== 'function') throw new Error('$transaction was not called with a callback');
    return arg(prismaMock);
}
