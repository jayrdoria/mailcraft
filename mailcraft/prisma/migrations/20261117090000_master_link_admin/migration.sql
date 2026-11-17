-- Admin → Links (2026-11-17): edit master links so only NEW templates pick them up.
-- Strictly additive: three new NULLABLE columns (no default, no backfill) + one enum value.
-- Every existing row keeps NULL: masters use their lockedFields as before, and saved templates
-- with no snapshot keep rendering with master.lockedFields, exactly as today.
-- Wrapped in one transaction: any failure leaves the database exactly as it was.

BEGIN;

-- AlterEnum
ALTER TYPE "ActivityAction" ADD VALUE 'MASTER_LINKS_UPDATED';

-- AlterTable
ALTER TABLE "master_templates" ADD COLUMN "currentLockedFields" JSONB,
ADD COLUMN "linkHistory" JSONB;

-- AlterTable
ALTER TABLE "saved_templates" ADD COLUMN "lockedFieldsSnapshot" JSONB;

COMMIT;
