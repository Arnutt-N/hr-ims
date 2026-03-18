import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
    // Prisma client for the Next app is generated from backend/prisma/schema.prisma.
    // Runtime DB resolution should come from DATABASE_URL rather than hardcoded paths.
    return new PrismaClient();
};

declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
