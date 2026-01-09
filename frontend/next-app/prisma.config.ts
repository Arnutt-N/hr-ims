import { defineConfig } from "prisma/config";

// Note: In Prisma 7, the connection URL moves here
export default defineConfig({
    schema: "./prisma/schema.prisma",
    datasource: {
        url: "file:d:/02 genAI/hr-ims/backend/prisma/dev.db",
    },
});
