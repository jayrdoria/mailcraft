// ─────────────────────────────────────────────
// CUSTOM BLOCKS — user-created content layered on top of a cloned/imported
// master template. Stored per SavedTemplate (never on the master). A saved
// template with zero custom blocks renders byte-identical to the legacy path.
//
// The email's vertical order is described by LayoutOrder, which interleaves
// master SECTION markers and CustomBlocks. See lib/services/blockRenderer.ts
// (Phase 2) for how blocks are turned into email-safe HTML.
// ─────────────────────────────────────────────

import type { Language } from './template'

// ─────────────────────────────────────────────
// BLOCK TYPES
// 'columns' is defined here for forward-compat but not rendered until Phase 9.
// ─────────────────────────────────────────────

export type BlockType = 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'columns'

export const BLOCK_TYPES: BlockType[] = ['text', 'image', 'button', 'divider', 'spacer', 'columns']

// ─────────────────────────────────────────────
// PER-LANGUAGE CONTENT
// Shape is a superset across block types; each type uses the subset it needs:
//   text   → html
//   image  → src, alt, href (href optional = not linked)
//   button → label, href
//   divider→ (none — styling only)
//   spacer → (none — styling only)
//   columns→ (Phase 9)
// Kept as one flat shape so the store/editor can treat content uniformly.
// ─────────────────────────────────────────────

export interface BlockContent {
  html?: string   // text block — rich HTML (same sanitization path as richtext fields)
  src?: string    // image block — image URL
  alt?: string    // image block — alt text
  href?: string   // image/button block — link URL
  label?: string  // button block — visible label
}

// ─────────────────────────────────────────────
// STYLING / PROPS — shared across all languages for a block
// All optional; blockRenderer applies sensible per-type defaults.
// ─────────────────────────────────────────────

export interface BlockProps {
  align?: 'left' | 'center' | 'right'
  paddingTop?: number         // px
  paddingBottom?: number      // px
  backgroundColor?: string    // hex, applied to the block's outer cell

  // text
  fontSize?: number           // px
  textColor?: string          // hex

  // image
  width?: number              // px, clamped to email content width at render

  // button
  buttonColor?: string        // hex background
  buttonTextColor?: string    // hex label colour
  borderRadius?: number       // px

  // divider
  lineColor?: string          // hex
  lineThickness?: number      // px

  // spacer
  height?: number             // px

  // columns
  columnCount?: number        // 2 or 3
  columnGap?: number          // px gap between columns
}

// ─────────────────────────────────────────────
// CUSTOM BLOCK
// ─────────────────────────────────────────────

export interface CustomBlock {
  id: string                                        // stable uuid; referenced by LayoutItem
  type: BlockType
  props: BlockProps
  content: Partial<Record<Language, BlockContent>>  // per-language; non-text blocks may only fill 'en'
  // COLUMNS ONLY (Phase 9): child block ids per column. The child blocks live in
  // the flat customBlocks array (so they reuse the whole block editor + actions)
  // but are NOT in layoutOrder — they only render inside this columns block.
  columns?: string[][]
}

// ─────────────────────────────────────────────
// LAYOUT ORDER — the email's top-to-bottom sequence.
// Each item is either a master section (by SECTION name) or a custom block (by id).
// A null/absent layoutOrder means "legacy": render master sections in source order
// with no custom blocks (see deriveDefaultLayout in Phase 2).
// ─────────────────────────────────────────────

export type LayoutItem =
  | { kind: 'section'; name: string }
  | { kind: 'block'; id: string }

export type LayoutOrder = LayoutItem[]
