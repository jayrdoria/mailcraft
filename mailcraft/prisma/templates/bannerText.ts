// Banner text box fields (live title/sub over the banner image).
// Shared by prisma/seed.ts, prisma/templates/x7v2.ts and the add-only
// prisma/seed-banner-text.ts (safe for prod). Lives under prisma/ because the
// :migrate image only contains this folder.
// Box/alignment/colour/size settings are NOT fields — they are _banner* meta-keys
// on fieldValues.en (see lib/bannerText.ts).

export const BANNER_TEXT_FIELD_KEYS = ['BANNER_TITLE', 'BANNER_SUB'] as const

const SUB_BY_LANG = {
  en: 'Play for a chance to win up to €30,000.',
  fr: 'Jouez pour tenter de gagner jusqu’à 30 000 €.',
  frca: 'Jouez pour tenter de gagner jusqu’à 30 000 €.',
  de: 'Spiele und gewinne mit etwas Glück bis zu 30.000 €.',
  it: 'Gioca per avere la possibilità di vincere fino a 30.000 €.',
  es: 'Juega para tener la oportunidad de ganar hasta 30.000 €.',
} as const

type Lang = keyof typeof SUB_BY_LANG

// Fields for a master's languages — appended after BANNER_LINK in the Header group
export function bannerTextFields(languages: readonly string[]) {
  const langs = languages.filter((l): l is Lang => l in SUB_BY_LANG)
  return [
    {
      key: 'BANNER_TITLE',
      label: 'Banner Title',
      type: 'text' as const,
      group: 'Header',
      defaultRequired: false,
      placeholder: 'Jackpot Club',
      defaultValue: 'Jackpot Club',
    },
    {
      key: 'BANNER_SUB',
      label: 'Banner Subtitle',
      type: 'text' as const,
      group: 'Header',
      defaultRequired: false,
      placeholder: 'Play for a chance to win up to €30,000.',
      defaultValues: Object.fromEntries(langs.map((l) => [l, SUB_BY_LANG[l]])),
    },
  ]
}

// Insert the banner text fields right after BANNER_LINK (or append if absent).
// Idempotent: fields already present are left exactly as they are.
export function withBannerTextFields<T extends { key: string }>(fields: T[], languages: readonly string[]): T[] {
  const missing = bannerTextFields(languages).filter((f) => !fields.some((x) => x.key === f.key)) as unknown as T[]
  if (missing.length === 0) return fields
  const at = fields.findIndex((f) => f.key === 'BANNER_LINK')
  const idx = at === -1 ? fields.length : at + 1
  return [...fields.slice(0, idx), ...missing, ...fields.slice(idx)]
}
