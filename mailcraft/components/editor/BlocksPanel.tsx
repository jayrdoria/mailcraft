'use client'

import { useRef } from 'react'
import {
  Type, Image as ImageIcon, MousePointerClick, Minus, MoveVertical,
  GripVertical, Trash2, Pencil, ChevronUp, ChevronDown, Layers, Plus, Columns3, LayoutTemplate, Rows3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEditorStore, BLOCK_PRESETS, type PresetId } from '@/lib/stores/editorStore'
import { LanguageSelector } from './FieldEditor'
import type { SavedSectionConfig } from '@/lib/types/template'
import type { BlockType, CustomBlock } from '@/lib/types/blocks'

// Palette
const PALETTE: { type: BlockType; label: string; icon: React.ElementType }[] = [
  { type: 'text',    label: 'Text',    icon: Type },
  { type: 'image',   label: 'Image',   icon: ImageIcon },
  { type: 'button',  label: 'Button',  icon: MousePointerClick },
  { type: 'divider', label: 'Divider', icon: Minus },
  { type: 'spacer',  label: 'Spacer',  icon: MoveVertical },
  { type: 'columns', label: 'Columns', icon: Columns3 },
]

// Block types allowed inside a column — everything except columns (no nesting).
// Shared with BlockInspector's columns editor.
export const COLUMN_CHILD_TYPES = PALETTE.filter((x) => x.type !== 'columns')

export const BLOCK_ICON: Record<BlockType, React.ElementType> = {
  text: Type, image: ImageIcon, button: MousePointerClick, divider: Minus, spacer: MoveVertical, columns: Columns3,
}

// Icon per quick-layout: side-by-side layouts get the columns icon, stacked
// groups get the rows icon, single-content ones their content icon.
const PRESET_ICON: Record<PresetId, React.ElementType> = {
  thumbnails: Columns3,
  twoColCards: Columns3,
  imageTextButton: Rows3,
  doubleImageTextButton: Rows3,
  textButton: MousePointerClick,
  bannerButton: ImageIcon,
}

export function blockSummary(block: CustomBlock, lang: string): string {
  const c = block.content[lang as keyof typeof block.content] ?? block.content.en ?? {}
  switch (block.type) {
    case 'text': {
      const text = (c.html ?? '').replace(/<[^>]+>/g, '').trim()
      return text ? (text.length > 36 ? text.slice(0, 36) + '…' : text) : 'Empty text'
    }
    case 'image':  return c.src ? c.src.split('/').pop() || 'Image' : 'No image set'
    case 'button': return c.label || 'Button'
    case 'divider': return 'Divider'
    case 'spacer': return `Spacer · ${block.props.height ?? 24}px`
    case 'columns': {
      const n = block.props.columnCount ?? 2
      const childCount = (block.columns ?? []).reduce((sum, col) => sum + col.length, 0)
      return n === 1 ? `Group · ${childCount} block${childCount === 1 ? '' : 's'}` : `${n} columns`
    }
    default:       return block.type
  }
}

interface BlocksPanelProps {
  sectionConfig: SavedSectionConfig[]
}

export default function BlocksPanel({ sectionConfig }: BlocksPanelProps) {
  const activeLanguage = useEditorStore((s) => s.activeLanguage)
  const setActiveLanguage = useEditorStore((s) => s.setActiveLanguage)
  const supportedLanguages = useEditorStore((s) => s.supportedLanguages)
  const layoutOrder = useEditorStore((s) => s.layoutOrder)
  const customBlocks = useEditorStore((s) => s.customBlocks)
  const activeBlockId = useEditorStore((s) => s.activeBlockId)
  const addBlock = useEditorStore((s) => s.addBlock)
  const removeBlock = useEditorStore((s) => s.removeBlock)
  const moveLayoutItem = useEditorStore((s) => s.moveLayoutItem)
  const setActiveBlock = useEditorStore((s) => s.setActiveBlock)
  const setDraggingBlockType = useEditorStore((s) => s.setDraggingBlockType)
  const insertPreset = useEditorStore((s) => s.insertPreset)

  const dragIndex = useRef<number | null>(null)

  const sectionLabels = new Map(sectionConfig.map((s) => [s.name, s.label]))
  const deletedSections = new Set(sectionConfig.filter((s) => s.isDeleted).map((s) => s.name))
  const blocksById = new Map(customBlocks.map((b) => [b.id, b]))

  function handleDrop(targetIndex: number) {
    if (dragIndex.current === null) return
    moveLayoutItem(dragIndex.current, targetIndex)
    dragIndex.current = null
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Language + heading */}
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Layout</p>
        <LanguageSelector value={activeLanguage} onChange={setActiveLanguage} languages={supportedLanguages} />
      </div>

      {/* Palette */}
      <div className="px-3 py-2.5 border-b shrink-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1">
          <Plus className="w-3 h-3" /> Add block
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {PALETTE.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', type)
                e.dataTransfer.effectAllowed = 'copy'
                setDraggingBlockType(type)
              }}
              onDragEnd={() => setDraggingBlockType(null)}
              onClick={() => addBlock(type)}
              title={`Click to add, or drag onto the preview`}
              className="flex flex-col items-center gap-1 py-2 rounded-md border text-[11px]
                         text-muted-foreground hover:text-foreground hover:bg-accent hover:border-primary/40
                         transition-colors cursor-grab active:cursor-grabbing"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Presets — one-click layouts */}
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mt-3 mb-1.5 flex items-center gap-1">
          <LayoutTemplate className="w-3 h-3" /> Quick layouts
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {BLOCK_PRESETS.map((preset) => {
            const Icon = PRESET_ICON[preset.id] ?? LayoutTemplate
            return (
              <button
                key={preset.id}
                onClick={() => insertPreset(preset.id)}
                title="Insert this layout"
                className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-md border text-[10px] text-center leading-tight
                           text-muted-foreground hover:text-foreground hover:bg-accent hover:border-primary/40
                           transition-colors cursor-pointer"
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {preset.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Layout list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {layoutOrder.map((item, i) => {
          if (item.kind === 'section') {
            if (deletedSections.has(item.name)) return null
            return (
              <div
                key={`sec-${item.name}`}
                draggable
                onDragStart={() => (dragIndex.current = i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(i)}
                className="group flex items-center gap-1.5 px-2 py-2 rounded-md bg-muted/40 border border-dashed transition-colors hover:bg-accent"
              >
                <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 cursor-grab active:cursor-grabbing" />
                <Layers className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{sectionLabels.get(item.name) ?? item.name}</p>
                  <p className="text-[10px] text-muted-foreground">Template section</p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => moveLayoutItem(i, i - 1)}
                    disabled={i === 0}
                    title="Move up"
                    className="p-0.5 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveLayoutItem(i, i + 1)}
                    disabled={i === layoutOrder.length - 1}
                    title="Move down"
                    className="p-0.5 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          }

          const block = blocksById.get(item.id)
          if (!block) return null
          const Icon = BLOCK_ICON[block.type]
          const isActive = block.id === activeBlockId

          return (
            <div
              key={item.id}
              draggable
              onDragStart={() => (dragIndex.current = i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(i)}
              className={cn(
                'group flex items-center gap-1.5 px-2 py-2 rounded-md border transition-colors',
                isActive ? 'border-primary bg-primary/5' : 'bg-card hover:bg-accent'
              )}
            >
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 cursor-grab active:cursor-grabbing" />
              <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setActiveBlock(isActive ? null : block.id)}>
                <p className="text-xs font-medium capitalize truncate">{block.type}</p>
                <p className="text-[10px] text-muted-foreground truncate">{blockSummary(block, activeLanguage)}</p>
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={() => moveLayoutItem(i, i - 1)}
                  disabled={i === 0}
                  title="Move up"
                  className="p-0.5 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => moveLayoutItem(i, i + 1)}
                  disabled={i === layoutOrder.length - 1}
                  title="Move down"
                  className="p-0.5 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setActiveBlock(isActive ? null : block.id)}
                  title="Edit"
                  className={cn('p-0.5 rounded hover:bg-accent cursor-pointer', isActive && 'text-primary')}
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={() => removeBlock(block.id)}
                  title="Delete block"
                  className="p-0.5 rounded hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          )
        })}

        {customBlocks.length === 0 && (
          <p className="text-[11px] text-muted-foreground/70 text-center py-6 leading-relaxed">
            Add blocks above to layer custom content<br />between your template sections.
          </p>
        )}
      </div>
    </div>
  )
}
