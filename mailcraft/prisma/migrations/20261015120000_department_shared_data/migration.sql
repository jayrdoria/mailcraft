-- Department-shared data.
-- Strictly additive: adds nullable columns + indexes, relaxes NOT NULL, swaps
-- ON DELETE CASCADE → SET NULL so deleting an account can never delete templates,
-- folders or activity history. No row is deleted; template content is never touched.
-- Wrapped in one transaction: any failure leaves the database exactly as it was.

BEGIN;

-- DropForeignKey
ALTER TABLE "folders" DROP CONSTRAINT "folders_userId_fkey";

-- DropForeignKey
ALTER TABLE "saved_templates" DROP CONSTRAINT "saved_templates_userId_fkey";

-- AlterTable (was NOT NULL + ON DELETE SET NULL, which made deleting any account with activity fail)
ALTER TABLE "activity_logs" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "folders" ADD COLUMN     "department" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "saved_templates" ADD COLUMN     "department" TEXT,
ADD COLUMN     "lastEditedById" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "folders_department_idx" ON "folders"("department");

-- CreateIndex
CREATE INDEX "saved_templates_department_idx" ON "saved_templates"("department");

-- AddForeignKey
ALTER TABLE "saved_templates" ADD CONSTRAINT "saved_templates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_templates" ADD CONSTRAINT "saved_templates_lastEditedById_fkey" FOREIGN KEY ("lastEditedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: rows created by DEPARTMENT accounts now belong to that department.
-- Key = trimmed, whitespace-collapsed, upper-cased (must match departmentKey() in
-- lib/services/accessService.ts). Admin / no-department rows stay NULL (personal).
UPDATE "saved_templates" s
SET "department" = upper(regexp_replace(btrim(u."department"), '\s+', ' ', 'g'))
FROM "users" u
WHERE s."userId" = u."id"
  AND u."role" = 'DEPARTMENT'
  AND u."department" IS NOT NULL
  AND btrim(u."department") <> '';

UPDATE "folders" f
SET "department" = upper(regexp_replace(btrim(u."department"), '\s+', ' ', 'g'))
FROM "users" u
WHERE f."userId" = u."id"
  AND u."role" = 'DEPARTMENT'
  AND u."department" IS NOT NULL
  AND btrim(u."department") <> '';

-- Until now only the creator could edit, so the creator is the last editor.
-- Plain SQL: Prisma's @updatedAt is not triggered, so "updatedAt" is unchanged.
UPDATE "saved_templates" SET "lastEditedById" = "userId";

COMMIT;
