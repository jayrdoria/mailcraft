-- Thumbnail presets: quick picks for a template's thumbnail slots (image + per-language
-- label / sublabel / link), scoped per brand. kind 'card' = THUMBn_* slots, 'icon' = the
-- X7 V2 Icons design (ICONn_*). Managed with the same permission as CTA presets.
-- Strictly additive: one new table. No existing row or column is changed.
-- Seeds the X7 V2 defaults here so prod gets them on deploy (never run db:seed on prod).
-- Wrapped in one transaction: any failure leaves the database exactly as it was.

BEGIN;

-- CreateTable
CREATE TABLE "thumbnail_presets" (
    "id" TEXT NOT NULL,
    "brand" "Brand" NOT NULL,
    "kind" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "labels" JSONB NOT NULL,
    "sublabels" JSONB,
    "links" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "thumbnail_presets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "thumbnail_presets_brand_kind_sortOrder_idx" ON "thumbnail_presets"("brand", "kind", "sortOrder");

-- Seed: X7 Casino V2 — the current default cards + the 3 icons
INSERT INTO "thumbnail_presets" ("id", "brand", "kind", "imageUrl", "labels", "sublabels", "links", "sortOrder", "updatedAt") VALUES
  ('thumb_seed_v2_jackpot_club', 'X7_V2', 'card',
   'https://userimg-assets.customeriomail.com/images/client-env-66535/01M4D7WYGD81JX07PDVH6K41BT.png',
   '{"en":"The Jackpot Club","fr":"Le Jackpot Club","de":"Der Jackpot Club","it":"Il Jackpot Club","es":"El Jackpot Club"}',
   '{"en":"Win up to €30,000","fr":"Gagnez jusqu’à 30 000 €","de":"Gewinne bis zu 30.000 €","it":"Vinci fino a 30.000 €","es":"Gana hasta 30.000 €"}',
   '{"en":"https://x7casino.com/en/promotions","fr":"https://x7casino.com/fr/promotions","de":"https://x7casino2.com/de/promotions","it":"https://x7casino.com/it/promotions","es":"https://x7casino.com/es/promotions"}',
   0, CURRENT_TIMESTAMP),
  ('thumb_seed_v2_blasts_races', 'X7_V2', 'card',
   'https://userimg-assets.customeriomail.com/images/client-env-66535/01M4D7WYGHV4RMXRW83GREKSMT.png',
   '{"en":"Blasts & Races","fr":"Blasts & Races","de":"Blasts & Races","it":"Blasts & Races","es":"Blasts & Races"}',
   '{"en":"€25M prize pool","fr":"25 M€ de prix à gagner","de":"25 Mio. € Preispool","it":"Montepremi di 25 M€","es":"25 M€ en premios"}',
   '{"en":"https://x7casino.com/en/promotions","fr":"https://x7casino.com/fr/promotions","de":"https://x7casino2.com/de/promotions","it":"https://x7casino.com/it/promotions","es":"https://x7casino.com/es/promotions"}',
   1, CURRENT_TIMESTAMP),
  ('thumb_seed_v2_icon_bonuses', 'X7_V2', 'icon',
   'https://userimg-assets.customeriomail.com/images/client-env-110039/01M5Y3Y8F0QJCERXZTZM6RNQ3Y.png',
   '{"en":"Exclusive Bonuses","fr":"Bonus exclusifs","de":"Exklusive Boni","it":"Bonus esclusivi","es":"Bonos exclusivos"}',
   NULL,
   '{"en":"https://x7casino.com/en/promotions","fr":"https://x7casino.com/fr/promotions","de":"https://x7casino2.com/de/promotions","it":"https://x7casino.com/it/promotions","es":"https://x7casino.com/es/promotions"}',
   0, CURRENT_TIMESTAMP),
  ('thumb_seed_v2_icon_games', 'X7_V2', 'icon',
   'https://userimg-assets.customeriomail.com/images/client-env-110039/01M5Y3Y8R7R0Z0VTV2248C0QRB.png',
   '{"en":"10,000+ Games","fr":"10 000+ jeux","de":"10.000+ Spiele","it":"10.000+ giochi","es":"10.000+ juegos"}',
   NULL,
   '{"en":"https://x7casino.com/en/promotions","fr":"https://x7casino.com/fr/promotions","de":"https://x7casino2.com/de/promotions","it":"https://x7casino.com/it/promotions","es":"https://x7casino.com/es/promotions"}',
   1, CURRENT_TIMESTAMP),
  ('thumb_seed_v2_icon_cashback', 'X7_V2', 'icon',
   'https://userimg-assets.customeriomail.com/images/client-env-110039/01M5Y3Y8V8XZJ41MSQWBSYNXNM.png',
   '{"en":"Monday Cashback","fr":"Cashback du lundi","de":"Montags-Cashback","it":"Cashback del lunedì","es":"Cashback de los lunes"}',
   NULL,
   '{"en":"https://x7casino.com/en/promotions","fr":"https://x7casino.com/fr/promotions","de":"https://x7casino2.com/de/promotions","it":"https://x7casino.com/it/promotions","es":"https://x7casino.com/es/promotions"}',
   2, CURRENT_TIMESTAMP);

COMMIT;
