// Shared types for the HTML import feature.
// Kept separate from the service file so client components can import safely.

export interface DomNode {
  mcId: string
  type: 'text' | 'image' | 'link'
  preview: string  // first 80 chars of text, or src/href
  tag: string
  sectionId?: string  // Phase 6 — the detected structural section this node lives in (if any)
}

export interface FieldMapping {
  mcId: string
  label: string
  type: 'text' | 'url' | 'link' | 'richtext'
}

// Phase 6 — a structural section auto-detected from imported HTML. These give
// imports the same toggle/delete/reorder boundaries a master gets (Phase 7 lets
// the user rename/add/merge them; Phase 8 turns them into SECTION markers on save).
export interface ImportSection {
  sectionId: string  // 'sec_1', 'sec_2', … — matches data-mc-section in instrumentedHtml
  label: string      // auto-derived, human-editable
  order: number      // 0-based top-to-bottom position
}

export interface AnalyzeResult {
  instrumentedHtml: string  // HTML with data-mc-id (+ data-mc-section) attrs injected
  domNodes: DomNode[]
  sections: ImportSection[] // Phase 6 — detected structural sections (may be empty)
  // Auto-detected field mappings — every meaningful content leaf (text/image/link)
  // pre-mapped so the mapper opens pre-filled for review instead of blank. The user
  // prunes/renames these and can still click to add anything missed.
  suggestedMappings: FieldMapping[]
}

// Phase 7 — the user-edited section model produced by the mapper. Each entry is a
// contiguous run of one or more detected rows: merge combines adjacent detected
// sections, split expands one back into its members. Array order is document
// order. Consumed by import create (Phase 8) to inject SECTION markers + set the
// field group per section.
export interface MappedSection {
  sectionId: string   // stable id (the first member's detected id) — React key / marker name seed
  label: string       // user-editable; becomes the section's display name
  rowIds: string[]    // detected data-mc-section ids this section spans, in order
}
