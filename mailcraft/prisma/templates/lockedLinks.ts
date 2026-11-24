// Per-language locked footer links (2026-11-17 link-admin ticket).
// Shared by seed.ts / x7v2.ts (fresh installs) and seed-locked-links.ts (add-only prod update).

// Stakes 18+ logo: FR + IT always go to stakes3.com (every other language keeps `value`)
export const STAKES_LOGO1_VALUES = {
  fr: 'https://stakes3.com/responsible-gaming',
  it: 'https://stakes3.com/responsible-gaming',
}

// X7 Casino V2 18+ logo — was hardcoded per language in master-templates/x7-v2/{lang}.html
export const X7V2_LOGO2_LINK = {
  key: 'FOOTER_LOGO2_LINK',
  label: '18+ Logo Link',
  value: 'https://x7casino.com/en/responsible-gaming',
  values: {
    fr: 'https://x7casino.com/fr/responsible-gaming',
    de: 'https://x7casino2.com/de/responsible-gaming',
    it: 'https://x7casino.com/it/responsible-gaming',
    es: 'https://x7casino.com/es/responsible-gaming',
  },
  note: 'Responsible gaming 18+ logo href',
  isReadOnly: false,
}

// X7 V2 + Whitelist footer refresh (2026-11-24): GamCare replaces the Play Responsibly + Kahnawake logos
export const GAMCARE_URL = 'https://www.gamcare.org.uk/'
export const X7V2_GAMCARE_LINK = {
  key: 'FOOTER_GAMCARE_LINK',
  label: 'GamCare Logo Link',
  value: GAMCARE_URL,
  note: 'GamCare logo href',
  isReadOnly: false,
}

// Whitelist responsible-gaming page per language — every language (DE too) on x7casino.io
export const x7WhitelistRgUrl = (lang: string) => `https://x7casino.io/${lang}/responsible-gaming`
export const X7V2_WL_LOGO2_LINK = {
  ...X7V2_LOGO2_LINK,
  value: x7WhitelistRgUrl('en'),
  values: Object.fromEntries(['fr', 'de', 'it', 'es'].map((l) => [l, x7WhitelistRgUrl(l)])),
}
