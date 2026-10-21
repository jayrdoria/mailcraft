-- CTA presets: dropdown options for the CTA Button Text field, one text per language
-- (FRCA uses the FR text), plus a per-account permission to manage them.
-- Strictly additive: one new table, one new column with a default. No existing row is changed.
-- Seeds the initial presets here so prod gets them on deploy (never run db:seed on prod).
-- Wrapped in one transaction: any failure leaves the database exactly as it was.

BEGIN;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "canManageCtaPresets" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "cta_presets" (
    "id" TEXT NOT NULL,
    "en" TEXT NOT NULL,
    "fr" TEXT NOT NULL,
    "de" TEXT NOT NULL,
    "it" TEXT NOT NULL,
    "es" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cta_presets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cta_presets_sortOrder_idx" ON "cta_presets"("sortOrder");

-- Seed initial presets
INSERT INTO "cta_presets" ("id", "en", "fr", "de", "it", "es", "sortOrder", "updatedAt") VALUES
  ('cta_seed_claim_my_bonus', 'Claim my bonus!', 'Réclamez mon bonus !',      'Meinen Bonus einfordern!', 'Richiedi il mio bonus!', '¡Reclama mi bono!',   0, CURRENT_TIMESTAMP),
  ('cta_seed_claim_now',      'Claim now!',      'Réclamez maintenant !',     'Jetzt einfordern!',        'Riscatta ora!',          '¡Reclama ahora!',     1, CURRENT_TIMESTAMP),
  ('cta_seed_play_now',       'Play now!',       'Jouez maintenant !',        'Jetzt spielen!',           'Gioca ora!',             '¡Juega ahora!',       2, CURRENT_TIMESTAMP),
  ('cta_seed_claim_spins',    'Claim Spins',     'Réclame tes spins',         'Spins sichern',            'Richiedi i tuoi spin',   'Reclama tus spins',   3, CURRENT_TIMESTAMP),
  ('cta_seed_opt_in_now',     'Opt-in Now!',     'Participe maintenant !',    'Jetzt teilnehmen!',        'Partecipa ora!',         '¡Participa ahora!',   4, CURRENT_TIMESTAMP),
  ('cta_seed_join_race',      'Join Race',       'Rejoins la course',         'Mach beim Rennen mit',     'Partecipa alla gara',    'Únete a la carrera',  5, CURRENT_TIMESTAMP);

COMMIT;
