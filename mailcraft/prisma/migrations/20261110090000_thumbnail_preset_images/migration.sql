-- Thumbnail presets: optional per-language images.
-- Strictly additive: one new NULLABLE column, no default, no backfill — every existing row keeps
-- NULL (= the main imageUrl in every language), so existing presets behave exactly as before.
-- FRCA texts need no column: they are an optional "frca" key inside the existing labels / sublabels /
-- links JSON.
-- Wrapped in one transaction: any failure leaves the database exactly as it was.

BEGIN;

-- AlterTable
ALTER TABLE "thumbnail_presets" ADD COLUMN "imageUrls" JSONB;

COMMIT;
