import { create } from 'zustand'
import type {
  MultiLanguageFieldValues,
  SavedSectionConfig,
  Language,
  FieldValue,
} from '@/lib/types/template'
import { LANGUAGES } from '@/lib/types/template'
import type { BodyAlignment } from '@/lib/paragraphRenderer'
import type { CustomBlock, LayoutOrder, BlockType, BlockContent, BlockProps } from '@/lib/types/blocks'
import { deriveDefaultLayout } from '@/lib/layoutComposer'

// ─────────────────────────────────────────────
// Block factory — sensible defaults per type.
// Defaults assume the dark master theme (white text / transparent bg);
// users adjust colours in the block editor.
// ─────────────────────────────────────────────

function makeBlock(type: BlockType): CustomBlock {
  const id = 'blk_' + crypto.randomUUID().slice(0, 8)
  switch (type) {
    case 'text':
      return { id, type, props: { align: 'center', fontSize: 15, textColor: '#ffffff', paddingTop: 12, paddingBottom: 12 }, content: { en: { html: '<p>New text</p>' } } }
    case 'image':
      return { id, type, props: { align: 'center', width: 560, paddingTop: 12, paddingBottom: 12 }, content: { en: { src: '', alt: '', href: '' } } }
    case 'button':
      return { id, type, props: { align: 'center', buttonColor: '#ef5e5e', buttonTextColor: '#ffffff', borderRadius: 4, paddingTop: 16, paddingBottom: 16 }, content: { en: { label: 'Click here', href: '' } } }
    case 'divider':
      return { id, type, props: { lineColor: '#333333', lineThickness: 1, paddingTop: 16, paddingBottom: 16 }, content: { en: {} } }
    case 'spacer':
      return { id, type, props: { height: 24 }, content: { en: {} } }
    case 'columns':
      // Starts as 2 empty columns; the user fills each with child blocks.
      return { id, type, props: { columnCount: 2, columnGap: 16, paddingTop: 6, paddingBottom: 6 }, content: { en: {} }, columns: [[], []] }
  }
}

// ─────────────────────────────────────────────
// PRESETS — one-click layouts so users don't rebuild common structures.
// A preset returns all blocks to add to customBlocks, plus which ids go into
// layoutOrder (children of a columns preset are added but stay out of layoutOrder).
// ─────────────────────────────────────────────

export type PresetId =
  | 'thumbnails'
  | 'imageTextButton'
  | 'doubleImageTextButton'
  | 'twoColCards'
  | 'textButton'
  | 'bannerButton'

export const BLOCK_PRESETS: { id: PresetId; label: string }[] = [
  { id: 'thumbnails',            label: '2-Col Thumbnails' },
  { id: 'imageTextButton',       label: 'Image · Text · Button' },
  { id: 'doubleImageTextButton', label: '2× Image · Text · Button' },
  // Added layouts (mobile-first: 2-col ones stack full-width on phones):
  { id: 'twoColCards',           label: '2-Col Cards' },
  { id: 'textButton',            label: 'Text · Button' },
  { id: 'bannerButton',          label: 'Banner · Button' },
]

function presetText(html: string): CustomBlock {
  const b = makeBlock('text')
  return { ...b, content: { en: { html } } }
}
function presetButton(label: string): CustomBlock {
  const b = makeBlock('button')
  return { ...b, content: { en: { label, href: '' } } }
}

function buildPreset(id: PresetId): { blocks: CustomBlock[]; layoutIds: string[] } {
  if (id === 'thumbnails') {
    const i1 = makeBlock('image'), t1 = presetText('<p>Label one</p>')
    const i2 = makeBlock('image'), t2 = presetText('<p>Label two</p>')
    const cols = makeBlock('columns')
    cols.columns = [[i1.id, t1.id], [i2.id, t2.id]]
    return { blocks: [i1, t1, i2, t2, cols], layoutIds: [cols.id] }
  }
  // Two side-by-side cards (image + text + button each). Stack on mobile.
  if (id === 'twoColCards') {
    const a = [makeBlock('image'), presetText('<p>Title one</p>'), presetButton('Learn more')]
    const b = [makeBlock('image'), presetText('<p>Title two</p>'), presetButton('Learn more')]
    const cols = makeBlock('columns')
    cols.columns = [a.map((x) => x.id), b.map((x) => x.id)]
    return { blocks: [...a, ...b, cols], layoutIds: [cols.id] }
  }
  // Simple CTA — text + button, grouped as one full-width item.
  if (id === 'textButton') {
    const kids = [presetText('<p>Your message here</p>'), presetButton('Learn more')]
    const g = makeBlock('columns')
    g.props = { ...g.props, columnCount: 1 }
    g.columns = [kids.map((x) => x.id)]
    return { blocks: [...kids, g], layoutIds: [g.id] }
  }
  // Promo banner — image + button, grouped as one full-width item.
  if (id === 'bannerButton') {
    const kids = [makeBlock('image'), presetButton('Shop now')]
    const g = makeBlock('columns')
    g.props = { ...g.props, columnCount: 1 }
    g.columns = [kids.map((x) => x.id)]
    return { blocks: [...kids, g], layoutIds: [g.id] }
  }
  // A stack of image → text → button, once or twice, grouped into a single-column
  // container so it's ONE tidy layout item (same stacked full-width view).
  const stack = (): CustomBlock[] => [makeBlock('image'), presetText('<p>Your text here</p>'), presetButton('Learn more')]
  const children = id === 'doubleImageTextButton' ? [...stack(), ...stack()] : stack()
  const group = makeBlock('columns')
  group.props = { ...group.props, columnCount: 1 }
  group.columns = [children.map((b) => b.id)]
  return { blocks: [...children, group], layoutIds: [group.id] }
}

// Reconcile a saved layoutOrder against the current master sections + blocks:
// drop stale section/block refs, append any master sections missing from the
// saved order (so newly added master sections still appear).
function buildInitialLayout(
  masterPreviewHtml: string,
  savedLayout: LayoutOrder | null | undefined,
  blocks: CustomBlock[]
): LayoutOrder {
  const masterSections = deriveDefaultLayout(masterPreviewHtml)
  if (!savedLayout || savedLayout.length === 0) return masterSections

  const masterNames = new Set(masterSections.map((s) => (s.kind === 'section' ? s.name : '')))
  const blockIds = new Set(blocks.map((b) => b.id))
  const seenSections = new Set<string>()
  const items: LayoutOrder = []

  for (const item of savedLayout) {
    if (item.kind === 'section') {
      if (masterNames.has(item.name) && !seenSections.has(item.name)) {
        items.push(item)
        seenSections.add(item.name)
      }
    } else if (blockIds.has(item.id)) {
      items.push(item)
    }
  }
  for (const s of masterSections) {
    if (s.kind === 'section' && !seenSections.has(s.name)) items.push(s)
  }
  return items
}

export interface SetupConfig {
  activeSections: string[]
  requiredFields: string[]
  deletedSections: string[]
}

interface EditorStore {
  // Template identity
  templateName: string
  masterTemplateId: string
  savedTemplateId: string | null
  brand: string

  // Master HTML (fetched once — locked fields pre-injected, editable fields still {{TOKEN}})
  masterPreviewHtml: string

  // Setup config
  activeSections: string[]
  deletedSections: string[]
  requiredFields: string[]

  // Field values — per language
  fieldValues: MultiLanguageFieldValues

  // Custom blocks (MailCraft Blocks) + interleaved layout order
  customBlocks: CustomBlock[]
  layoutOrder: LayoutOrder
  activeBlockId: string | null
  // Field key currently being edited — drives the preview highlight (editor-only).
  activeFieldKey: string | null
  sidebarTab: 'content' | 'blocks'
  // Transient: block type currently being dragged from the palette (Phase 4b)
  draggingBlockType: BlockType | null

  // Preview
  renderedHtml: string
  device: 'desktop' | 'tablet' | 'mobile'
  bodyAlignment: BodyAlignment

  // Language
  activeLanguage: Language
  supportedLanguages: Language[]

  // State
  isDirty: boolean
  isSaving: boolean
  isSetupModalOpen: boolean

  // Actions
  init: (data: {
    masterTemplateId: string
    savedTemplateId: string | null
    templateName: string
    brand: string
    fieldValues: MultiLanguageFieldValues
    sectionConfig: SavedSectionConfig[]
    masterPreviewHtml: string
    supportedLanguages: Language[]
    openSetupModal: boolean
    allSectionNames?: string[]
    customBlocks?: CustomBlock[] | null
    layoutOrder?: LayoutOrder | null
  }) => void
  // Block actions
  addBlock: (type: BlockType, atIndex?: number) => string
  updateBlockContent: (id: string, lang: Language, patch: Partial<BlockContent>) => void
  updateBlockProps: (id: string, patch: Partial<BlockProps>) => void
  removeBlock: (id: string) => void
  moveLayoutItem: (fromIndex: number, toIndex: number) => void
  // Columns child blocks (Phase 9) — children live in customBlocks, referenced by
  // id in the columns block's `columns` array (not in layoutOrder).
  insertPreset: (id: PresetId, atIndex?: number) => void
  addColumnChild: (columnsId: string, colIndex: number, type: BlockType) => string
  removeColumnChild: (columnsId: string, colIndex: number, childId: string) => void
  moveColumnChild: (columnsId: string, colIndex: number, fromIdx: number, toIdx: number) => void
  setColumnCount: (columnsId: string, count: number) => void
  setActiveBlock: (id: string | null) => void
  setActiveFieldKey: (key: string | null) => void
  setSidebarTab: (tab: 'content' | 'blocks') => void
  setDraggingBlockType: (type: BlockType | null) => void
  setTemplateName: (name: string) => void
  setFieldValue: (key: string, value: FieldValue) => void
  setFieldValueAllLanguages: (key: string, value: FieldValue) => void
  applySetupConfig: (config: SetupConfig) => void
  setDevice: (device: EditorStore['device']) => void
  setBodyAlignment: (alignment: BodyAlignment) => void
  setActiveLanguage: (lang: Language) => void
  openSetupModal: () => void
  closeSetupModal: () => void
  setRenderedHtml: (html: string) => void
  setIsSaving: (v: boolean) => void
  markClean: () => void
  reset: () => void
}

const EMPTY_FIELD_VALUES: MultiLanguageFieldValues = {
  en: {}, fr: {}, frca: {}, de: {}, it: {}, es: {},
}

// Sections that default to OFF when creating a brand-new template
const DEFAULT_INACTIVE_SECTIONS = new Set(['USERNAME_PASSWORD', 'LEGAL'])

export const useEditorStore = create<EditorStore>((set) => ({
  templateName: '',
  masterTemplateId: '',
  savedTemplateId: null,
  brand: '',
  masterPreviewHtml: '',
  activeSections: [],
  deletedSections: [],
  requiredFields: [],
  fieldValues: EMPTY_FIELD_VALUES,
  customBlocks: [],
  layoutOrder: [],
  activeBlockId: null,
  activeFieldKey: null,
  sidebarTab: 'content',
  draggingBlockType: null,
  renderedHtml: '',
  device: 'desktop',
  bodyAlignment: 'center',
  activeLanguage: 'en',
  supportedLanguages: LANGUAGES,
  isDirty: false,
  isSaving: false,
  isSetupModalOpen: false,

  init: (data) => {
    const activeSections = data.sectionConfig.length > 0
      ? data.sectionConfig.filter((s) => s.isActive && !s.isDeleted).map((s) => s.name)
      : (data.allSectionNames ?? []).filter((name) => !DEFAULT_INACTIVE_SECTIONS.has(name))
    const deletedSections = data.sectionConfig
      .filter((s) => s.isDeleted)
      .map((s) => s.name)

    const savedAlignment = data.fieldValues.en?._bodyAlignment
    const bodyAlignment: BodyAlignment =
      typeof savedAlignment === 'string' && savedAlignment === 'left' ? 'left' : 'center'

    const customBlocks = data.customBlocks ?? []
    const layoutOrder = buildInitialLayout(data.masterPreviewHtml, data.layoutOrder, customBlocks)

    set({
      masterTemplateId: data.masterTemplateId,
      savedTemplateId: data.savedTemplateId,
      templateName: data.templateName,
      brand: data.brand,
      fieldValues: data.fieldValues,
      activeSections,
      deletedSections,
      customBlocks,
      layoutOrder,
      activeBlockId: null,
      masterPreviewHtml: data.masterPreviewHtml,
      supportedLanguages: data.supportedLanguages,
      activeLanguage: data.supportedLanguages[0] ?? 'en',
      isDirty: false,
      isSetupModalOpen: data.openSetupModal,
      bodyAlignment,
      // Clear stale renderedHtml from a previous template navigation so the
      // preview never flashes wrong content before the new render fires.
      renderedHtml: '',
    })
  },

  addBlock: (type, atIndex) => {
    const block = makeBlock(type)
    set((state) => {
      const layoutOrder = [...state.layoutOrder]
      const item: LayoutOrder[number] = { kind: 'block', id: block.id }
      if (atIndex === undefined || atIndex < 0 || atIndex > layoutOrder.length) {
        layoutOrder.push(item)
      } else {
        layoutOrder.splice(atIndex, 0, item)
      }
      return {
        customBlocks: [...state.customBlocks, block],
        layoutOrder,
        activeBlockId: block.id,
        isDirty: true,
      }
    })
    return block.id
  },

  updateBlockContent: (id, lang, patch) =>
    set((state) => ({
      isDirty: true,
      customBlocks: state.customBlocks.map((b) =>
        b.id === id ? { ...b, content: { ...b.content, [lang]: { ...b.content[lang], ...patch } } } : b
      ),
    })),

  updateBlockProps: (id, patch) =>
    set((state) => ({
      isDirty: true,
      customBlocks: state.customBlocks.map((b) =>
        b.id === id ? { ...b, props: { ...b.props, ...patch } } : b
      ),
    })),

  removeBlock: (id) =>
    set((state) => {
      // Removing a columns block also removes its child blocks (avoid orphans).
      const block = state.customBlocks.find((b) => b.id === id)
      const childIds = block?.type === 'columns' ? new Set((block.columns ?? []).flat()) : new Set<string>()
      return {
        isDirty: true,
        customBlocks: state.customBlocks.filter((b) => b.id !== id && !childIds.has(b.id)),
        layoutOrder: state.layoutOrder.filter((it) => !(it.kind === 'block' && it.id === id)),
        activeBlockId: state.activeBlockId === id ? null : state.activeBlockId,
      }
    }),

  insertPreset: (id, atIndex) =>
    set((state) => {
      const { blocks, layoutIds } = buildPreset(id)
      const items = layoutIds.map((bid) => ({ kind: 'block' as const, id: bid }))
      const layoutOrder = [...state.layoutOrder]
      if (atIndex === undefined || atIndex < 0 || atIndex > layoutOrder.length) {
        layoutOrder.push(...items)
      } else {
        layoutOrder.splice(atIndex, 0, ...items)
      }
      return {
        customBlocks: [...state.customBlocks, ...blocks],
        layoutOrder,
        activeBlockId: layoutIds[0] ?? state.activeBlockId,
        isDirty: true,
      }
    }),

  addColumnChild: (columnsId, colIndex, type) => {
    const child = makeBlock(type)
    set((state) => ({
      isDirty: true,
      customBlocks: [...state.customBlocks, child].map((b) => {
        if (b.id !== columnsId) return b
        const cols = (b.columns ?? []).map((c) => [...c])
        while (cols.length <= colIndex) cols.push([])
        cols[colIndex] = [...cols[colIndex], child.id]
        return { ...b, columns: cols }
      }),
    }))
    return child.id
  },

  removeColumnChild: (columnsId, colIndex, childId) =>
    set((state) => ({
      isDirty: true,
      customBlocks: state.customBlocks
        .filter((b) => b.id !== childId)
        .map((b) =>
          b.id === columnsId
            ? { ...b, columns: (b.columns ?? []).map((c, i) => (i === colIndex ? c.filter((cid) => cid !== childId) : c)) }
            : b
        ),
    })),

  moveColumnChild: (columnsId, colIndex, fromIdx, toIdx) =>
    set((state) => ({
      isDirty: true,
      customBlocks: state.customBlocks.map((b) => {
        if (b.id !== columnsId) return b
        const cols = (b.columns ?? []).map((c) => [...c])
        const col = cols[colIndex]
        if (!col || fromIdx < 0 || toIdx < 0 || fromIdx >= col.length || toIdx >= col.length) return b
        const [moved] = col.splice(fromIdx, 1)
        col.splice(toIdx, 0, moved)
        return { ...b, columns: cols }
      }),
    })),

  setColumnCount: (columnsId, count) =>
    set((state) => {
      const block = state.customBlocks.find((b) => b.id === columnsId)
      if (!block) return {}
      const cols = (block.columns ?? []).map((c) => [...c])
      // Children in dropped columns become orphans → remove them too.
      const orphaned = new Set<string>()
      for (let i = count; i < cols.length; i++) cols[i].forEach((id) => orphaned.add(id))
      const newCols: string[][] = []
      for (let i = 0; i < count; i++) newCols.push(cols[i] ?? [])
      return {
        isDirty: true,
        customBlocks: state.customBlocks
          .filter((b) => !orphaned.has(b.id))
          .map((b) => (b.id === columnsId ? { ...b, columns: newCols, props: { ...b.props, columnCount: count } } : b)),
      }
    }),

  moveLayoutItem: (fromIndex, toIndex) =>
    set((state) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= state.layoutOrder.length ||
        toIndex >= state.layoutOrder.length
      ) {
        return {}
      }
      const layoutOrder = [...state.layoutOrder]
      const [moved] = layoutOrder.splice(fromIndex, 1)
      layoutOrder.splice(toIndex, 0, moved)
      return { layoutOrder, isDirty: true }
    }),

  setActiveBlock: (id) => set({ activeBlockId: id }),

  setActiveFieldKey: (key) => set({ activeFieldKey: key }),

  setSidebarTab: (tab) => set({ sidebarTab: tab }),

  setDraggingBlockType: (type) => set({ draggingBlockType: type }),

  setTemplateName: (name) => set({ templateName: name, isDirty: true }),

  setFieldValue: (key, value) =>
    set((state) => ({
      isDirty: true,
      fieldValues: {
        ...state.fieldValues,
        [state.activeLanguage]: {
          ...state.fieldValues[state.activeLanguage],
          [key]: value,
        },
      },
    })),

  setFieldValueAllLanguages: (key, value) =>
    set((state) => {
      const updated = { ...state.fieldValues }
      for (const lang of state.supportedLanguages) {
        updated[lang] = { ...updated[lang], [key]: value }
      }
      return { isDirty: true, fieldValues: updated }
    }),

  applySetupConfig: (config) => {
    const { activeSections, requiredFields, deletedSections } = config
    set({ activeSections, deletedSections, requiredFields, isDirty: true })
  },

  setBodyAlignment: (alignment) =>
    set((state) => ({
      bodyAlignment: alignment,
      isDirty: true,
      fieldValues: {
        ...state.fieldValues,
        en: { ...state.fieldValues.en, _bodyAlignment: alignment },
      },
    })),

  setDevice: (device) => set({ device }),
  setActiveLanguage: (lang) => set({ activeLanguage: lang }),
  openSetupModal: () => set({ isSetupModalOpen: true }),
  closeSetupModal: () => set({ isSetupModalOpen: false }),
  setRenderedHtml: (html) => set({ renderedHtml: html }),
  setIsSaving: (v) => set({ isSaving: v }),
  markClean: () => set({ isDirty: false }),
  reset: () => set({
    templateName: '',
    masterTemplateId: '',
    savedTemplateId: null,
    brand: '',
    masterPreviewHtml: '',
    activeSections: [],
    deletedSections: [],
    requiredFields: [],
    fieldValues: EMPTY_FIELD_VALUES,
    customBlocks: [],
    layoutOrder: [],
    activeBlockId: null,
    activeFieldKey: null,
    sidebarTab: 'content',
    draggingBlockType: null,
    renderedHtml: '',
    device: 'desktop',
    bodyAlignment: 'center',
    activeLanguage: 'en',
    supportedLanguages: LANGUAGES,
    isDirty: false,
    isSaving: false,
    isSetupModalOpen: false,
  }),
}))
