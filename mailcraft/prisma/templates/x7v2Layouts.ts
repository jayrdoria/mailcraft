// X7 Casino V2 layout option fields — Welcome Boost / Free Spins bodies, the Icons
// thumbnail design and the optional "More at X7" heading.
// Shared by prisma/templates/x7v2.ts (seed / fresh create) and the add-only
// prisma/seed-x7v2-layouts.ts (safe for prod). Lives under prisma/ because the
// :migrate image only contains this folder.
// The choices themselves (body layout, alignment, thumbnail design, heading on/off)
// are NOT fields — they are meta-keys on fieldValues.en (see lib/v2Layouts.ts).

type Lang = 'en' | 'fr' | 'de' | 'it' | 'es'
type ByLang = Record<Lang, string>

const CIO = 'https://userimg-assets.customeriomail.com/images/client-env-110039'

const promoLinks: ByLang = {
  en: 'https://x7casino.com/en/promotions',
  fr: 'https://x7casino.com/fr/promotions',
  de: 'https://x7casino2.com/de/promotions',
  it: 'https://x7casino.com/it/promotions',
  es: 'https://x7casino.com/es/promotions',
}

const text = (key: string, label: string, group: string, defaultValues: ByLang, placeholder?: string) => ({
  key, label, type: 'text' as const, group, defaultRequired: false, defaultValues, ...(placeholder ? { placeholder } : {}),
})
const single = (key: string, label: string, group: string, defaultValue: string) => ({
  key, label, type: 'text' as const, group, defaultRequired: false, defaultValue, placeholder: defaultValue,
})
const url = (key: string, label: string, group: string, value: string | ByLang) => ({
  key, label, type: 'url' as const, group, defaultRequired: false,
  ...(typeof value === 'string' ? { defaultValue: value } : { defaultValues: value }),
})

// Body group — inserted after BODY_CONTENT (Free Spins reuses GREETING, both reuse CTA_TEXT/CTA_LINK)
export const v2BodyLayoutFields = [
  // Welcome Boost
  text('WB_GREETING', 'Greeting', 'Body', { en: 'Hey', fr: 'Salut', de: 'Hey', it: 'Ehi', es: 'Hola' }),
  single('WB_STAT_VALUE', 'Highlight value', 'Body', '400%'),
  text('WB_STAT_TEXT', 'Highlight text', 'Body', {
    en: 'up to €500 on your first deposit',
    fr: 'jusqu’à 500 € sur votre premier dépôt',
    de: 'bis zu 500 € auf deine erste Einzahlung',
    it: 'fino a 500 € sul tuo primo deposito',
    es: 'hasta 500 € en tu primer depósito',
  }),
  text('WB_STEPS_LABEL', 'Steps title', 'Body', {
    en: 'How it works', fr: 'Comment ça marche', de: 'So funktioniert’s', it: 'Come funziona', es: 'Cómo funciona',
  }),
  text('WB_STEP1', 'Step 1', 'Body', {
    en: 'Deposit €10 or more', fr: 'Déposez 10 € ou plus', de: 'Zahle 10 € oder mehr ein', it: 'Deposita 10 € o più', es: 'Deposita 10 € o más',
  }),
  text('WB_STEP2', 'Step 2', 'Body', {
    en: 'Activate your boost', fr: 'Activez votre boost', de: 'Aktiviere deinen Boost', it: 'Attiva il tuo boost', es: 'Activa tu boost',
  }),
  text('WB_STEP3', 'Step 3', 'Body', {
    en: 'Play with bonus funds added',
    fr: 'Jouez avec vos fonds bonus ajoutés',
    de: 'Spiele mit dem zusätzlichen Bonusguthaben',
    it: 'Gioca con i fondi bonus aggiunti',
    es: 'Juega con los fondos de bono añadidos',
  }),
  // Free Spins
  text('FS_TITLE', 'Title', 'Body', {
    en: '50 Free Spins', fr: '50 Tours Gratuits', de: '50 Freispiele', it: '50 Giri Gratis', es: '50 Giros Gratis',
  }),
  text('FS_SUBLINE', 'Subtitle', 'Body', {
    en: 'Your next session just got 50 spins better.',
    fr: 'Votre prochaine session s’enrichit de 50 tours.',
    de: 'Deine nächste Session wird um 50 Spins besser.',
    it: 'La tua prossima sessione si arricchisce di 50 giri.',
    es: 'Tu próxima sesión acaba de mejorar con 50 giros.',
  }),
  // Game names are not translated — the editor offers "Sync all"; empty = chip hidden
  single('GAME1', 'Game 1', 'Body', 'Zeus Vs Hades'),
  single('GAME2', 'Game 2', 'Body', 'Spina Colada'),
  single('GAME3', 'Game 3', 'Body', 'Le Hooligan'),
  text('FS_VALIDITY', 'Validity line', 'Body', {
    en: 'Valid Sept 24–30 · One-time claim',
    fr: 'Valable du 24 au 30 sept. · Une seule réclamation',
    de: 'Gültig vom 24.–30. Sept. · Einmalig einlösbar',
    it: 'Valido dal 24 al 30 sett. · Riscatto unico',
    es: 'Válido del 24 al 30 sept. · Un solo reclamo',
  }),
]

// Thumbnails group — heading before THUMB1_IMG, icons after the card fields
export const v2HeadingField = text('MORE_HEADING', 'Heading text', 'Thumbnails', {
  en: 'More at X7', fr: 'Plus sur X7', de: 'Mehr bei X7', it: 'Altro su X7', es: 'Más en X7',
})

export const v2IconFields = [
  url('ICON1_IMG', 'Icon 1 Image', 'Thumbnails', `${CIO}/01M5Y3Y8F0QJCERXZTZM6RNQ3Y.png`),
  url('ICON1_LINK', 'Icon 1 Link', 'Thumbnails', promoLinks),
  text('ICON1_LABEL', 'Icon 1 Label', 'Thumbnails', {
    en: 'Exclusive Bonuses', fr: 'Bonus exclusifs', de: 'Exklusive Boni', it: 'Bonus esclusivi', es: 'Bonos exclusivos',
  }),
  url('ICON2_IMG', 'Icon 2 Image', 'Thumbnails', `${CIO}/01M5Y3Y8R7R0Z0VTV2248C0QRB.png`),
  url('ICON2_LINK', 'Icon 2 Link', 'Thumbnails', promoLinks),
  text('ICON2_LABEL', 'Icon 2 Label', 'Thumbnails', {
    en: '10,000+ Games', fr: '10 000+ jeux', de: '10.000+ Spiele', it: '10.000+ giochi', es: '10.000+ juegos',
  }),
  url('ICON3_IMG', 'Icon 3 Image', 'Thumbnails', `${CIO}/01M5Y3Y8V8XZJ41MSQWBSYNXNM.png`),
  url('ICON3_LINK', 'Icon 3 Link', 'Thumbnails', promoLinks),
  text('ICON3_LABEL', 'Icon 3 Label', 'Thumbnails', {
    en: 'Monday Cashback', fr: 'Cashback du lundi', de: 'Montags-Cashback', it: 'Cashback del lunedì', es: 'Cashback de los lunes',
  }),
]

export const V2_LAYOUT_FIELD_KEYS = [
  ...v2BodyLayoutFields.map((f) => f.key),
  v2HeadingField.key,
  ...v2IconFields.map((f) => f.key),
]

// Insert `add` after the field `afterKey` (or append). Only fields not already present.
function insertAfter<T extends { key: string }>(fields: T[], afterKey: string, add: T[]): T[] {
  const missing = add.filter((f) => !fields.some((x) => x.key === f.key))
  if (missing.length === 0) return fields
  const at = fields.findIndex((f) => f.key === afterKey)
  const idx = at === -1 ? fields.length : at + 1
  return [...fields.slice(0, idx), ...missing, ...fields.slice(idx)]
}

function insertBefore<T extends { key: string }>(fields: T[], beforeKey: string, add: T[]): T[] {
  const missing = add.filter((f) => !fields.some((x) => x.key === f.key))
  if (missing.length === 0) return fields
  const at = fields.findIndex((f) => f.key === beforeKey)
  const idx = at === -1 ? fields.length : at
  return [...fields.slice(0, idx), ...missing, ...fields.slice(idx)]
}

// Idempotent: fields already present (incl. admin edits) are left exactly as they are.
// Returns the same array instance when nothing was added.
export function withV2LayoutFields<T extends { key: string }>(fields: T[]): T[] {
  let next = insertAfter(fields, 'BODY_CONTENT', v2BodyLayoutFields as unknown as T[])
  next = insertBefore(next, 'THUMB1_IMG', [v2HeadingField] as unknown as T[])
  const lastCard = ['THUMB2_SUBLABEL', 'THUMB2_LABEL', 'THUMB2_LINK', 'THUMB2_IMG'].find((k) => next.some((f) => f.key === k)) ?? 'THUMB2_SUBLABEL'
  next = insertAfter(next, lastCard, v2IconFields as unknown as T[])
  return next
}
