import { PrismaClient } from "@prisma/client";

/**
 * Soft-delete middleware (PRP v6 Q19): auto-injects WHERE deletedAt IS NULL
 * on every find/count/aggregate query targeting the maintenance tables. Other
 * tables are untouched. Callers wanting to see deleted rows (admin "Show
 * deleted" view) must opt in by setting `where.deletedAt` explicitly — the
 * middleware sees the explicit filter and skips injection.
 */
const SOFT_DELETE_MODELS = new Set<string>([
    "MaintenanceRequest",
    "MaintenanceRequestItem",
]);

const READ_OPS = new Set<string>([
    "findUnique",
    "findUniqueOrThrow",
    "findFirst",
    "findFirstOrThrow",
    "findMany",
    "count",
    "aggregate",
    "groupBy",
]);

function callerExplicitlyHandlesDeletedAt(args: unknown): boolean {
    if (!args || typeof args !== "object") return false;
    const where = (args as { where?: unknown }).where;
    if (!where || typeof where !== "object") return false;
    if ("deletedAt" in where) return true;
    const and = (where as { AND?: unknown }).AND;
    if (Array.isArray(and)) {
        return and.some(
            (clause) =>
                clause && typeof clause === "object" && "deletedAt" in clause,
        );
    }
    return false;
}

function applySoftDeleteMiddleware(client: PrismaClient): void {
    client.$use(async (params, next) => {
        if (!params.model || !SOFT_DELETE_MODELS.has(params.model)) {
            return next(params);
        }
        if (!READ_OPS.has(params.action)) {
            return next(params);
        }
        if (callerExplicitlyHandlesDeletedAt(params.args)) {
            return next(params);
        }
        const args = (params.args ?? {}) as { where?: Record<string, unknown> };
        params.args = {
            ...args,
            where: { ...(args.where ?? {}), deletedAt: null },
        };
        return next(params);
    });
}

const prismaClientSingleton = () => {
    // Prisma client for the Next app is generated from backend/prisma/schema.prisma.
    // Runtime DB resolution should come from DATABASE_URL rather than hardcoded paths.
    const client = new PrismaClient();
    applySoftDeleteMiddleware(client);
    return client;
};

declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
