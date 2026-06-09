'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FieldMapping, DomNode } from '@/lib/types/import'

type FieldType = FieldMapping['type']

// Only text elements let the user choose between Text / Rich Text.
// Link and image types are locked because the system knows the correct type.
const TEXT_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: 'text',     label: 'Text' },
  { value: 'richtext', label: 'Rich Text' },
]

interface FieldRow {
  key: string          // row identifier, stable within a popover session
  type: FieldType
  typeLabel: string    // displayed when type is locked
  typeLocked: boolean
  placeholder: string
  label: string
}

// Build the initial rows based on what type of element was clicked.
// Link elements get two rows (text content + href) so both are mappable in one click.
function buildRows(elementType: DomNode['type']): FieldRow[] {
  if (elementType === 'link') {
    return [
      { key: 'text', type: 'text', typeLabel: 'Text',     typeLocked: false, placeholder: 'e.g. Button Text',    label: '' },
      { key: 'link', type: 'link', typeLabel: 'Link URL', typeLocked: true,  placeholder: 'e.g. Button Link URL', label: '' },
    ]
  }
  if (elementType === 'image') {
    return [
      { key: 'url', type: 'url', typeLabel: 'Image URL', typeLocked: true, placeholder: 'e.g. Banner Image', label: '' },
    ]
  }
  return [
    { key: 'text', type: 'text', typeLabel: 'Text', typeLocked: false, placeholder: 'e.g. Body Text', label: '' },
  ]
}

export interface ClickedElementInfo {
  mcId: string
  elementType: DomNode['type']
  preview: string
  tag: string
}

interface FieldPopoverProps {
  clickedElement: ClickedElementInfo
  existingMappings: FieldMapping[]
  onAdd: (mappings: FieldMapping[]) => void
  onRemove: (mcId: string, type: FieldMapping['type']) => void
  onCancel: () => void
}

export default function FieldPopover({
  clickedElement,
  existingMappings,
  onAdd,
  onRemove,
  onCancel,
}: FieldPopoverProps) {
  const firstInputRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<FieldRow[]>(() => buildRows(clickedElement.elementType))

  useEffect(() => {
    firstInputRef.current?.focus()
  }, [])

  const existingForElement = existingMappings.filter((m) => m.mcId === clickedElement.mcId)

  // Only show rows for types not yet mapped on this element
  const visibleRows = rows.filter((row) =>
    !existingForElement.some(
      (m) => m.type === row.type || (row.type === 'text' && m.type === 'richtext')
    )
  )

  const allMapped = visibleRows.length === 0 && existingForElement.length > 0

  function updateLabel(key: string, value: string) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, label: value } : r)))
  }

  function updateType(key: string, value: FieldType) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, type: value } : r)))
  }

  const toAdd = visibleRows.filter((r) => r.label.trim().length > 0)
  const canAdd = toAdd.length > 0

  function handleAdd() {
    if (!canAdd) return
    onAdd(toAdd.map((r) => ({ mcId: clickedElement.mcId, label: r.label.trim(), type: r.type })))
  }

  function handleKeyDown(e: React.KeyboardEvent, isLast: boolean) {
    if (e.key === 'Enter' && isLast) handleAdd()
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div className="absolute inset-x-0 bottom-0 z-10 border-t bg-card shadow-[0_-4px_16px_rgba(0,0,0,0.08)] p-4">

      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-xs font-semibold">
          {allMapped ? 'Fully mapped' : 'Make this editable'}
        </p>
        <button
          onClick={onCancel}
          className="p-0.5 rounded hover:bg-accent transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Element preview chip */}
      <p className="text-[10px] text-muted-foreground mb-3 truncate font-mono bg-muted/50 px-2 py-1 rounded">
        {`<${clickedElement.tag}>`}&nbsp;{clickedElement.preview}
      </p>

      {/* Already-mapped fields for this element */}
      {existingForElement.length > 0 && (
        <div className="mb-3 space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Mapped ({existingForElement.length})
          </p>
          {existingForElement.map((m) => (
            <div
              key={m.type}
              className="flex items-center justify-between px-2 py-1 rounded bg-green-500/10 text-[11px]"
            >
              <span className="font-medium text-green-600 dark:text-green-400 truncate">{m.label}</span>
              <button
                onClick={() => onRemove(m.mcId, m.type)}
                className="shrink-0 ml-2 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Field rows — one per mappable aspect of this element */}
      {visibleRows.length > 0 && (
        <>
          {/* Column headers — shown once above the first row */}
          <div className="flex gap-2 mb-1">
            <p className="flex-1 text-[11px] font-medium">Label</p>
            <p className="w-24 shrink-0 text-[11px] font-medium">Type</p>
          </div>

          {visibleRows.map((row, i) => (
            <div key={row.key} className="flex gap-2 mb-2">
              <input
                ref={i === 0 ? firstInputRef : undefined}
                type="text"
                value={row.label}
                onChange={(e) => updateLabel(row.key, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, i === visibleRows.length - 1)}
                placeholder={row.placeholder}
                maxLength={100}
                className="flex-1 px-2.5 py-1.5 text-xs rounded-md border bg-background
                           placeholder:text-muted-foreground
                           focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {row.typeLocked ? (
                <div className="w-24 shrink-0 flex items-center px-2.5 py-1.5 text-xs rounded-md border bg-muted/50 text-muted-foreground">
                  {row.typeLabel}
                </div>
              ) : (
                <select
                  value={row.type}
                  onChange={(e) => updateType(row.key, e.target.value as FieldType)}
                  className="w-24 shrink-0 px-2 py-1.5 text-xs rounded-md border bg-background cursor-pointer
                             focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {TEXT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              )}
            </div>
          ))}

          <div className="flex justify-end gap-2 mt-1">
            <button
              onClick={onCancel}
              className="px-3 py-1 text-xs rounded-md border hover:bg-accent transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!canAdd}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground',
                'hover:opacity-90 transition-opacity',
                canAdd ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
              )}
            >
              {toAdd.length > 1 ? `Add ${toAdd.length} Fields` : 'Add Field'}
            </button>
          </div>
        </>
      )}

      {allMapped && (
        <p className="text-[11px] text-muted-foreground text-center py-1">
          All aspects of this element are mapped. Remove one above to remap it.
        </p>
      )}
    </div>
  )
}
