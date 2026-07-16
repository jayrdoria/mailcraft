'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  Trash2, FileImage, Link2, Type, MousePointerClick,
  Layers, ArrowDownToLine, Split, Pencil, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import MapperFrame, { type ClickedElement } from './MapperFrame'
import FieldPopover from './FieldPopover'
import type { AnalyzeResult, FieldMapping, MappedSection } from '@/lib/types/import'

const TYPE_ICON: Record<FieldMapping['type'], React.ElementType> = {
  url:      FileImage,
  link:     Link2,
  text:     Type,
  richtext: Type,
}

const TYPE_LABEL: Record<FieldMapping['type'], string> = {
  url:      'Image URL',
  link:     'Link URL',
  text:     'Text',
  richtext: 'Rich Text',
}

interface VisualMapperProps {
  analyzeResult: AnalyzeResult
  fieldMappings: FieldMapping[]
  onFieldMappingsChange: (mappings: FieldMapping[]) => void
  sections: MappedSection[]
  onSectionsChange: (sections: MappedSection[]) => void
  onBack: () => void
  onNext: () => void
}

export default function VisualMapper({
  analyzeResult,
  fieldMappings,
  onFieldMappingsChange,
  sections,
  onSectionsChange,
  onBack,
  onNext,
}: VisualMapperProps) {
  const [clickedElement, setClickedElement] = useState<ClickedElement | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleElementClick = useCallback((el: ClickedElement) => {
    setClickedElement(el)
  }, [])

  function handleAddField(newMappings: FieldMapping[]) {
    onFieldMappingsChange([...fieldMappings, ...newMappings])
    setClickedElement(null)
  }

  function handleRemoveField(mcId: string, type: FieldMapping['type']) {
    const idx = fieldMappings.findIndex((m) => m.mcId === mcId && m.type === type)
    if (idx === -1) return
    const next = [...fieldMappings]
    next.splice(idx, 1)
    onFieldMappingsChange(next)
  }

  function handleRenameField(mcId: string, type: FieldMapping['type'], label: string) {
    onFieldMappingsChange(
      fieldMappings.map((m) => (m.mcId === mcId && m.type === type ? { ...m, label } : m))
    )
  }

  // ── Section grouping + edits ────────────────
  // Each detected node carries the row id (data-mc-section) it lives in; a field's
  // section is the MappedSection whose rowIds include that row.
  const rowIdOfMcId = useMemo(
    () => new Map(analyzeResult.domNodes.map((n) => [n.mcId, n.sectionId])),
    [analyzeResult.domNodes]
  )
  // Original detected labels — used to restore names when a merged section is split.
  const detectedLabel = useMemo(
    () => new Map(analyzeResult.sections.map((s) => [s.sectionId, s.label])),
    [analyzeResult.sections]
  )

  function sectionIndexOfField(m: FieldMapping): number {
    const rid = rowIdOfMcId.get(m.mcId)
    if (!rid) return -1
    return sections.findIndex((s) => s.rowIds.includes(rid))
  }

  function renameSection(id: string, label: string) {
    onSectionsChange(sections.map((s) => (s.sectionId === id ? { ...s, label } : s)))
  }

  // Merge a section into the one directly below it (keeps document order contiguous).
  function mergeDown(i: number) {
    if (i < 0 || i >= sections.length - 1) return
    const merged: MappedSection = {
      sectionId: sections[i].sectionId,
      label: sections[i].label,
      rowIds: [...sections[i].rowIds, ...sections[i + 1].rowIds],
    }
    const next = [...sections]
    next.splice(i, 2, merged)
    onSectionsChange(next)
  }

  // Split a merged section back into one section per member row (restores labels).
  function splitSection(i: number) {
    const sec = sections[i]
    if (!sec || sec.rowIds.length < 2) return
    const pieces = sec.rowIds.map<MappedSection>((rid) => ({
      sectionId: rid,
      label: detectedLabel.get(rid) ?? rid,
      rowIds: [rid],
    }))
    const next = [...sections]
    next.splice(i, 1, ...pieces)
    onSectionsChange(next)
  }

  const mappedIds  = fieldMappings.map((m) => m.mcId)
  const canProceed = fieldMappings.length > 0
  const ungrouped  = fieldMappings.filter((m) => sectionIndexOfField(m) === -1)

  return (
    <>
      {/* Instruction bar */}
      <div className="px-5 py-2 border-b shrink-0 bg-muted/30 flex items-center gap-2">
        <MousePointerClick className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <p className="text-[11px] text-muted-foreground">
          Fields were auto-detected and grouped by section — review on the right, remove any you don&apos;t need,
          or click an element to add one. <span className="text-green-500 font-medium">Green</span> = mapped.
        </p>
      </div>

      {/* Split layout — fixed height so the iframe has a defined space */}
      <div className="flex h-[430px] overflow-hidden">

        {/* Left — iframe preview */}
        <div className="flex-1 relative overflow-hidden border-r">
          <MapperFrame
            instrumentedHtml={analyzeResult.instrumentedHtml}
            mappedIds={mappedIds}
            onElementClick={handleElementClick}
          />

          {/* FieldPopover anchored to the bottom of the preview panel */}
          {clickedElement && (
            <FieldPopover
              key={clickedElement.mcId}
              clickedElement={clickedElement}
              existingMappings={fieldMappings}
              onAdd={handleAddField}
              onRemove={handleRemoveField}
              onCancel={() => setClickedElement(null)}
            />
          )}
        </div>

        {/* Right — fields grouped by section */}
        <div className="w-64 shrink-0 flex flex-col bg-muted/10">
          <div className="px-3 py-2 border-b shrink-0 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Sections &amp; Fields
            </p>
            <span className="text-[10px] text-muted-foreground">{fieldMappings.length} field{fieldMappings.length === 1 ? '' : 's'}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {sections.length === 0 && ungrouped.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full px-4 text-center">
                <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                  Click elements in the preview to define editable fields
                </p>
              </div>
            )}

            {sections.map((sec, i) => {
              const fields = fieldMappings.filter((m) => sectionIndexOfField(m) === i)
              const isEditing = editingId === sec.sectionId
              const merged = sec.rowIds.length > 1
              return (
                <div key={sec.sectionId} className="rounded-md border bg-card/60 overflow-hidden">
                  {/* Section header */}
                  <div className="flex items-center gap-1.5 px-2 py-1.5 bg-muted/40 border-b">
                    <Layers className="w-3 h-3 text-muted-foreground shrink-0" />
                    {isEditing ? (
                      <input
                        autoFocus
                        value={sec.label}
                        onChange={(e) => renameSection(sec.sectionId, e.target.value)}
                        onBlur={() => setEditingId(null)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingId(null) }}
                        className="flex-1 min-w-0 text-xs font-medium bg-background border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    ) : (
                      <p className="flex-1 min-w-0 text-xs font-medium truncate" title={sec.label}>{sec.label || 'Untitled'}</p>
                    )}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => setEditingId(isEditing ? null : sec.sectionId)}
                        title={isEditing ? 'Done' : 'Rename section'}
                        className="p-0.5 rounded hover:bg-accent cursor-pointer text-muted-foreground hover:text-foreground"
                      >
                        {isEditing ? <Check className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
                      </button>
                      {merged && (
                        <button
                          onClick={() => splitSection(i)}
                          title="Split back into detected sections"
                          className="p-0.5 rounded hover:bg-accent cursor-pointer text-muted-foreground hover:text-foreground"
                        >
                          <Split className="w-3 h-3" />
                        </button>
                      )}
                      {i < sections.length - 1 && (
                        <button
                          onClick={() => mergeDown(i)}
                          title="Merge with section below"
                          className="p-0.5 rounded hover:bg-accent cursor-pointer text-muted-foreground hover:text-foreground"
                        >
                          <ArrowDownToLine className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Fields in this section */}
                  <div className="p-1.5 space-y-1">
                    {fields.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground/50 px-1 py-0.5">No fields yet</p>
                    ) : (
                      fields.map((m, fi) => (
                        <FieldRow key={`${m.mcId}-${m.type}-${fi}`} mapping={m} onRemove={handleRemoveField} onRename={handleRenameField} />
                      ))
                    )}
                  </div>
                </div>
              )
            })}

            {/* Ungrouped fields — nodes with no detected section */}
            {ungrouped.length > 0 && (
              <div className="rounded-md border border-dashed bg-card/40 overflow-hidden">
                <div className="px-2 py-1.5 bg-muted/20 border-b">
                  <p className="text-[11px] font-medium text-muted-foreground">Ungrouped</p>
                </div>
                <div className="p-1.5 space-y-1">
                  {ungrouped.map((m, fi) => (
                    <FieldRow key={`u-${m.mcId}-${m.type}-${fi}`} mapping={m} onRemove={handleRemoveField} onRename={handleRenameField} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-4 border-t shrink-0">
        <button
          onClick={onBack}
          className="px-4 py-1.5 text-xs rounded-md border hover:bg-accent transition-colors cursor-pointer"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          title={!canProceed ? 'Click at least one element to define a field' : undefined}
          className={cn(
            'px-4 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground',
            'hover:opacity-90 transition-opacity',
            canProceed ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'
          )}
        >
          Next →
        </button>
      </div>
    </>
  )
}

// ── A single mapped-field row (inline-renameable) ────────────────
function FieldRow({
  mapping,
  onRemove,
  onRename,
}: {
  mapping: FieldMapping
  onRemove: (mcId: string, type: FieldMapping['type']) => void
  onRename: (mcId: string, type: FieldMapping['type'], label: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const Icon = TYPE_ICON[mapping.type]
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/50 group">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={mapping.label}
            onChange={(e) => onRename(mapping.mcId, mapping.type, e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditing(false) }}
            maxLength={100}
            className="w-full text-xs font-medium bg-background border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        ) : (
          <p className="text-xs font-medium truncate cursor-text" title="Click to rename" onClick={() => setEditing(true)}>
            {mapping.label || 'Untitled'}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground">{TYPE_LABEL[mapping.type]}</p>
      </div>
      <button
        onClick={() => setEditing(true)}
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-foreground transition-all cursor-pointer shrink-0 text-muted-foreground"
        title="Rename field"
      >
        <Pencil className="w-3 h-3" />
      </button>
      <button
        onClick={() => onRemove(mapping.mcId, mapping.type)}
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded
                   hover:text-destructive transition-all cursor-pointer shrink-0"
        title="Remove field"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  )
}
