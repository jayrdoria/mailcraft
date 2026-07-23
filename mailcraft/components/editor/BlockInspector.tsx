'use client'

import { useState } from 'react'
import { X, ArrowLeft, ChevronUp, ChevronDown, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEditorStore } from '@/lib/stores/editorStore'
import RichTextEditor from './RichTextEditor'
import { BLOCK_ICON, blockSummary, COLUMN_CHILD_TYPES } from './BlocksPanel'
import type { CustomBlock } from '@/lib/types/blocks'

// ─────────────────────────────────────────────
// BLOCK INSPECTOR — the block editor lifted out of the cramped left sidebar into
// its own full-height, roomy column (rendered by EditorClient between the layout
// list and the preview). Columns drill in one child at a time instead of stacking.
// ─────────────────────────────────────────────

export default function BlockInspector() {
  const activeBlockId = useEditorStore((s) => s.activeBlockId)
  const activeLanguage = useEditorStore((s) => s.activeLanguage)
  const customBlocks = useEditorStore((s) => s.customBlocks)
  const setActiveBlock = useEditorStore((s) => s.setActiveBlock)

  const block = activeBlockId ? customBlocks.find((b) => b.id === activeBlockId) ?? null : null
  if (!block) return null

  return (
    <div className="flex flex-col h-full overflow-hidden bg-card">
      <div className="flex items-center justify-between px-4 py-2.5 border-b shrink-0">
        <p className="text-xs font-semibold capitalize">{block.type} settings</p>
        <button
          onClick={() => setActiveBlock(null)}
          title="Close"
          className="p-1 rounded-md hover:bg-accent transition-colors text-muted-foreground cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <BlockEditor key={block.id} block={block} lang={activeLanguage} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Block editor — per-type content + shared style controls (headerless; the
// container above provides the title + close).
// ─────────────────────────────────────────────

function BlockEditor({ block, lang }: { block: CustomBlock; lang: string }) {
  const updateBlockContent = useEditorStore((s) => s.updateBlockContent)
  const updateBlockProps = useEditorStore((s) => s.updateBlockProps)

  const c = block.content[lang as keyof typeof block.content] ?? block.content.en ?? {}
  const p = block.props
  const langKey = lang as Parameters<typeof updateBlockContent>[1]
  const setContent = (patch: Partial<typeof c>) => updateBlockContent(block.id, langKey, patch)

  return (
    <div className="p-4 space-y-4">
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

      {block.type === 'columns' && <ColumnsEditor block={block} lang={lang} />}

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

      {/* Columns manage their own padding inside ColumnsEditor (overview only), so
          it never leaks into a drilled-in child editor. */}
      {block.type !== 'spacer' && block.type !== 'columns' && (
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Padding top" value={p.paddingTop ?? 16} onChange={(v) => updateBlockProps(block.id, { paddingTop: v })} />
          <NumberField label="Padding bottom" value={p.paddingBottom ?? 16} onChange={(v) => updateBlockProps(block.id, { paddingBottom: v })} />
        </div>
      )}
    </div>
  )
}

// ── columns editor — per-column child block management, with drill-in editing ──
function ColumnsEditor({ block, lang }: { block: CustomBlock; lang: string }) {
  const customBlocks = useEditorStore((s) => s.customBlocks)
  const updateBlockProps = useEditorStore((s) => s.updateBlockProps)
  const addColumnChild = useEditorStore((s) => s.addColumnChild)
  const removeColumnChild = useEditorStore((s) => s.removeColumnChild)
  const moveColumnChild = useEditorStore((s) => s.moveColumnChild)
  const [editId, setEditId] = useState<string | null>(null)

  const count = block.props.columnCount ?? 2
  const gap = block.props.columnGap ?? 16
  const byId = new Map(customBlocks.map((b) => [b.id, b]))
  const cols = block.columns ?? []

  // Drill-in: edit a single child (one level at a time, with a back link) so the
  // panel never stacks nested editors.
  const editChild = editId ? byId.get(editId) : undefined
  if (editId && editChild) {
    const Icon = BLOCK_ICON[editChild.type]
    return (
      <div className="space-y-3">
        <button
          onClick={() => setEditId(null)}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to columns
        </button>
        <div className="flex items-center gap-1.5 pb-1 border-b">
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground capitalize">{editChild.type}</p>
        </div>
        <BlockEditor key={editChild.id} block={editChild} lang={lang} />
      </div>
    )
  }

  const p = block.props

  return (
    <div className="space-y-3">
      {count > 1 && (
        <NumberField label="Gap between columns (px)" value={gap} onChange={(v) => updateBlockProps(block.id, { columnGap: v })} />
      )}

      {Array.from({ length: count }).map((_, ci) => {
        const childIds = cols[ci] ?? []
        return (
          <div key={ci} className="rounded-md border p-2.5 space-y-2 bg-background/40">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Column {ci + 1}</p>

            {childIds.map((cid, i) => {
              const child = byId.get(cid)
              if (!child) return null
              const Icon = BLOCK_ICON[child.type]
              return (
                <div key={cid} className="group flex items-center gap-1.5 px-2 py-1.5 rounded border bg-card">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setEditId(cid)}>
                    <p className="text-[11px] font-medium capitalize truncate">{child.type}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{blockSummary(child, lang)}</p>
                  </div>
                  <button onClick={() => moveColumnChild(block.id, ci, i, i - 1)} disabled={i === 0} title="Move up" className="p-0.5 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"><ChevronUp className="w-3 h-3" /></button>
                  <button onClick={() => moveColumnChild(block.id, ci, i, i + 1)} disabled={i === childIds.length - 1} title="Move down" className="p-0.5 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"><ChevronDown className="w-3 h-3" /></button>
                  <button onClick={() => removeColumnChild(block.id, ci, cid)} title="Delete" className="p-0.5 rounded hover:bg-destructive/10 hover:text-destructive cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                </div>
              )
            })}

            {childIds.length === 0 && (
              <p className="text-[10px] text-muted-foreground/60 px-1 py-0.5">Empty — add a block below.</p>
            )}

            {/* Mini palette — add any block type to this column, then drill in to edit it */}
            <div className="flex flex-wrap gap-1 pt-0.5">
              {COLUMN_CHILD_TYPES.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => setEditId(addColumnChild(block.id, ci, type))}
                  title={`Add ${label}`}
                  className="flex items-center gap-1 px-1.5 py-1 rounded border text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent hover:border-primary/40 transition-colors cursor-pointer"
                >
                  <Icon className="w-3 h-3" /> {label}
                </button>
              ))}
            </div>
          </div>
        )
      })}

      {/* Block-level padding for the whole columns block */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <NumberField label="Padding top" value={p.paddingTop ?? 6} onChange={(v) => updateBlockProps(block.id, { paddingTop: v })} />
        <NumberField label="Padding bottom" value={p.paddingBottom ?? 6} onChange={(v) => updateBlockProps(block.id, { paddingBottom: v })} />
      </div>
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
