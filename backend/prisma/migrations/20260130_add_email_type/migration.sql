-- Add type column to EmailVerification table
ALTER TABLE "EmailVerification" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'EMAIL_VERIFICATION';

-- Remove unique constraint from userId (if exists)
-- SQLite doesn't support DROP CONSTRAINT directly, so we need to recreate the table

-- Create new table with correct schema
CREATE TABLE "EmailVerification_new" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'EMAIL_VERIFICATION',
    "expiresAt" DATETIME NOT NULL,
    "verifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Copy data from old table
INSERT INTO "EmailVerification_new" ("id", "userId", "token", "expiresAt", "verifiedAt", "createdAt")
SELECT "id", "userId", "token", "expiresAt", "verifiedAt", "createdAt" FROM "EmailVerification";

-- Drop old table
DROP TABLE "EmailVerification";

-- Rename new table
ALTER TABLE "EmailVerification_new" RENAME TO "EmailVerification";

-- Create indexes
CREATE UNIQUE INDEX "EmailVerification_token_key" ON "EmailVerification"("token");
CREATE INDEX "EmailVerification_userId_idx" ON "EmailVerification"("userId");
CREATE INDEX "EmailVerification_token_idx" ON "EmailVerification"("token");
