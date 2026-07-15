'use client'

import { useRef } from 'react'
import {
  Type, Image as ImageIcon, MousePointerClick, Minus, MoveVertical,
  GripVertical, Trash2, Pencil, ChevronUp, ChevronDown, Layers, Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEditorStore } from '@/lib/stores/editorStore'
import { LanguageSelector } from './FieldEditor'
import RichTextEditor from './RichTextEditor'
import type { SavedSectionConfig } from '@/lib/types/template'
import type { BlockType, CustomBlock } from '@/lib/types/blocks'

// Palette (columns deferred to Phase 9)
const PALETTE: { type: BlockType; label: string; icon: React.ElementType }[] = [
  { type: 'text',    label: 'Text',    icon: Type },
  { type: 'image',   label: 'Image',   icon: ImageIcon },
  { type: 'button',  label: 'Button',  icon: MousePointerClick },
  { type: 'divider', label: 'Divider', icon: Minus },
  { type: 'spacer',  label: 'Spacer',  icon: MoveVertical },
]

const BLOCK_ICON: Record<BlockType, React.ElementType> = {
  text: Type, image: ImageIcon, button: MousePointerClick, divider: Minus, spacer: MoveVertical, columns: MoveVertical,
}

function blockSummary(block: CustomBlock, lang: string): string {
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

  const dragIndex = useRef<number | null>(null)

  const sectionLabels = new Map(sectionConfig.map((s) => [s.name, s.label]))
  const deletedSections = new Set(sectionConfig.filter((s) => s.isDeleted).map((s) => s.name))
  const blocksById = new Map(customBlocks.map((b) => [b.id, b]))
  const activeBlock = activeBlockId ? blocksById.get(activeBlockId) ?? null : null

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

      {/* Selected block editor */}
      {activeBlock && (
        <div className="border-t shrink-0 max-h-[48%] overflow-y-auto bg-muted/20">
          <BlockEditor key={activeBlock.id} block={activeBlock} lang={activeLanguage} />
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Block editor — per-type content + shared style controls
// ─────────────────────────────────────────────

function BlockEditor({ block, lang }: { block: CustomBlock; lang: string }) {
  const updateBlockContent = useEditorStore((s) => s.updateBlockContent)
  const updateBlockProps = useEditorStore((s) => s.updateBlockProps)
  const setActiveBlock = useEditorStore((s) => s.setActiveBlock)

  const c = block.content[lang as keyof typeof block.content] ?? block.content.en ?? {}
  const p = block.props
  const langKey = lang as Parameters<typeof updateBlockContent>[1]

  const setContent = (patch: Partial<typeof c>) => updateBlockContent(block.id, langKey, patch)

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground capitalize">
          {block.type} settings
        </p>
        <button onClick={() => setActiveBlock(null)} className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer">
          Done
        </button>
      </div>

      {/* Content controls */}
      {block.type === 'text' && (
        <RichTextEditor value={c.html ?? ''} onChange={(v) => setContent({ html: v })} placeholder="Enter text…" />
      )}

      {block.type === 'image' && (
        <div className="space-y-2">
          <TextField label="Image URL" value={c.src ?? ''} onChange={(v) => setContent({ src: v })} placeholder="https://…" />
          <TextField label="Alt text" value={c.alt ?? ''} onChange={(v) => setContent({ alt: v })} placeholder="Describe the image" />
          <TextField label="Link URL (optional)" value={c.href ?? ''} onChange={(v) => setContent({ href: v })} placeholder="https://…" />
          <NumberField label="Max width (px)" value={p.width ?? 560} onChange={(v) => updateBlockProps(block.id, { width: v })} />
        </div>
      )}

      {block.type === 'button' && (
        <div className="space-y-2">
          <TextField label="Label" value={c.label ?? ''} onChange={(v) => setContent({ label: v })} placeholder="Click here" />
          <TextField label="Link URL" value={c.href ?? ''} onChange={(v) => setContent({ href: v })} placeholder="https://…" />
          <div className="grid grid-cols-2 gap-2">
            <ColorField label="Button" value={p.buttonColor ?? '#ef5e5e'} onChange={(v) => updateBlockProps(block.id, { buttonColor: v })} />
            <ColorField label="Text" value={p.buttonTextColor ?? '#ffffff'} onChange={(v) => updateBlockProps(block.id, { buttonTextColor: v })} />
          </div>
          <NumberField label="Corner radius (px)" value={p.borderRadius ?? 4} onChange={(v) => updateBlockProps(block.id, { borderRadius: v })} />
        </div>
      )}

      {block.type === 'divider' && (
        <div className="grid grid-cols-2 gap-2">
          <ColorField label="Line color" value={p.lineColor ?? '#333333'} onChange={(v) => updateBlockProps(block.id, { lineColor: v })} />
          <NumberField label="Thickness (px)" value={p.lineThickness ?? 1} onChange={(v) => updateBlockProps(block.id, { lineThickness: v })} />
        </div>
      )}

      {block.type === 'spacer' && (
        <NumberField label="Height (px)" value={p.height ?? 24} onChange={(v) => updateBlockProps(block.id, { height: v })} />
      )}

      {/* Text style extras */}
      {block.type === 'text' && (
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Font size (px)" value={p.fontSize ?? 15} onChange={(v) => updateBlockProps(block.id, { fontSize: v })} />
          <ColorField label="Text color" value={p.textColor ?? '#ffffff'} onChange={(v) => updateBlockProps(block.id, { textColor: v })} />
        </div>
      )}

      {/* Shared style controls */}
      {(block.type === 'text' || block.type === 'image' || block.type === 'button') && (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Alignment</p>
          <div className="flex gap-1">
            {(['left', 'center', 'right'] as const).map((a) => (
              <button
                key={a}
                onClick={() => updateBlockProps(block.id, { align: a })}
                className={cn(
                  'flex-1 py-1 text-[11px] rounded border capitalize transition-colors cursor-pointer',
                  (p.align ?? 'center') === a ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground hover:bg-accent'
                )}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      )}

      {block.type !== 'spacer' && (
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Padding top" value={p.paddingTop ?? 16} onChange={(v) => updateBlockProps(block.id, { paddingTop: v })} />
          <NumberField label="Padding bottom" value={p.paddingBottom ?? 16} onChange={(v) => updateBlockProps(block.id, { paddingBottom: v })} />
        </div>
      )}
    </div>
  )
}

// ── small field helpers ──────────────────────

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-0.5 w-full px-2.5 py-1.5 text-xs rounded-md border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  )
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-0.5 w-full px-2.5 py-1.5 text-xs rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="mt-0.5 flex items-center gap-1.5 border rounded-md px-1.5 py-1 bg-background">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-5 w-6 rounded cursor-pointer bg-transparent" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 text-xs bg-transparent focus:outline-none"
        />
      </div>
    </label>
  )
}
