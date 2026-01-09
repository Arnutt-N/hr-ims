import { PrismaClient } from "@prisma/client";
import path from "path";

const prismaClientSingleton = () => {
    // Current dir: d:\02 genAI\hr-ims\frontend\next-app
    // Root dir: d:\02 genAI\hr-ims
    // Target: d:\02 genAI\hr-ims\backend\prisma\dev.db
    const dbPath = path.resolve(process.cwd(), "../../backend/prisma/dev.db");
    const dbUrl = `file:${dbPath.replace(/\\/g, '/')}`;

    console.log('Connecting to DB at:', dbUrl);

    return new PrismaClient({
        datasources: {
            db: {
                url: dbUrl // Force my calculated URL for debugging
            }
        }
    });
};

declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
