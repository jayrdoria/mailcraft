import type { PresetTexts, ThumbnailPreset } from '@/lib/types/thumbnailPreset'

// In-memory presets in the ORIGINAL shape (no FRCA, one image) so every brand / kind is covered by the
// logic layer without writing to the DB. Add cases here when a ticket touches presets — never change
// existing ones, or the baseline no longer matches.
const T = (en: string, fr: string, de: string, it: string, es: string): PresetTexts => ({ en, fr, de, it, es })

export const FIXTURE_PRESETS: ThumbnailPreset[] = [
  {
    id: 'fx_stakes_full', brand: 'STAKES', kind: 'card', imageUrl: 'https://example.com/s1.png', sortOrder: 0,
    labels: T('Bonuses', 'Bonus', 'Boni', 'Bonus IT', 'Bonos'), sublabels: null,
    links: T('https://www.stakes.com/a', 'https://www.stakes3.com/a', 'https://www.stakes.com/a', 'https://www.stakes.com/a', 'https://www.stakes.com/a'),
  },
  {
    id: 'fx_stakes_nolinks', brand: 'STAKES', kind: 'card', imageUrl: 'https://example.com/s2.png', sortOrder: 1,
    labels: T('Games', 'Jeux', 'Spiele', 'Giochi', 'Juegos'), sublabels: null, links: null,
  },
  {
    id: 'fx_stakes_partial', brand: 'STAKES', kind: 'card', imageUrl: 'https://example.com/s3.png', sortOrder: 2,
    labels: T('Cash', 'Cash FR', 'Cash DE', 'Cash IT', 'Cash ES'), sublabels: null,
    links: T('https://www.stakes.com/c', '', '', 'https://www.stakes.com/c', ''),
  },
  {
    id: 'fx_sc', brand: 'STAKES_CASINO', kind: 'card', imageUrl: 'https://example.com/sc.png', sortOrder: 0,
    labels: T('SC', 'SC fr', 'SC de', 'SC it', 'SC es'), sublabels: null,
    links: T('https://www.stakescasino.com/p', '', '', '', ''),
  },
  {
    id: 'fx_x7', brand: 'X7', kind: 'card', imageUrl: 'https://example.com/x7.png', sortOrder: 0,
    labels: T('X7', 'X7 fr', 'X7 de', 'X7 it', 'X7 es'), sublabels: null,
    links: T('https://x7casino.com/en/p', 'https://x7casino.com/fr/p', 'https://x7casino2.com/de/p', 'https://x7casino.com/it/p', 'https://x7casino.com/es/p'),
  },
  {
    id: 'fx_v2_sub', brand: 'X7_V2', kind: 'card', imageUrl: 'https://example.com/v2.png', sortOrder: 9,
    labels: T('V2', 'V2 fr', 'V2 de', 'V2 it', 'V2 es'), sublabels: T('sub', '', 'sub de', '', ''), links: null,
  },
  // ── 2026-11-10: FRCA texts + per-language images ──
  {
    id: 'fx_new_stakes_frca_imgs', brand: 'STAKES', kind: 'card', imageUrl: 'https://example.com/n1.png', sortOrder: 3,
    imageUrls: { fr: 'https://example.com/n1-fr.png', de: 'https://example.com/n1-de.png', frca: '' },
    labels: { ...T('New', 'Nouveau', 'Neu', 'Nuovo', 'Nuevo'), frca: 'Nouveau CA' },
    sublabels: null,
    links: { ...T('https://www.stakes.com/n', 'https://www.stakes3.com/n', 'https://www.stakes.com/n-de', '', ''), frca: 'https://www.stakes.com/n-ca' },
  },
  {
    id: 'fx_new_stakes_blank_frca', brand: 'STAKES', kind: 'card', imageUrl: 'https://example.com/n2.png', sortOrder: 4,
    imageUrls: { frca: 'https://example.com/n2-ca.png' },
    labels: { ...T('Blank', 'Vide', 'Leer', 'Vuoto', 'Vacio'), frca: '  ' },
    sublabels: null,
    links: { ...T('https://www.stakes.com/b', 'https://www.stakes3.com/b', '', '', ''), frca: '' },
  },
  {
    id: 'fx_new_v2_imgs', brand: 'X7_V2', kind: 'icon', imageUrl: 'https://example.com/n3.png', sortOrder: 9,
    imageUrls: { it: 'https://example.com/n3-it.png' },
    labels: T('Icon', 'Icône', 'Symbol', 'Icona', 'Icono'), sublabels: null, links: null,
  },
]
