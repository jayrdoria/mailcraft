'use client'

import { useState, useCallback } from 'react'
import { Trash2, FileImage, Link2, Type, MousePointerClick } from 'lucide-react'
import { cn } from '@/lib/utils'
import MapperFrame, { type ClickedElement } from './MapperFrame'
import FieldPopover from './FieldPopover'
import type { AnalyzeResult, FieldMapping } from '@/lib/types/import'

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
  onBack: () => void
  onNext: () => void
}

export default function VisualMapper({
  analyzeResult,
  fieldMappings,
  onFieldMappingsChange,
  onBack,
  onNext,
}: VisualMapperProps) {
  const [clickedElement, setClickedElement] = useState<ClickedElement | null>(null)

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

  const mappedIds  = fieldMappings.map((m) => m.mcId)
  const canProceed = fieldMappings.length > 0

  return (
    <>
      {/* Instruction bar */}
      <div className="px-5 py-2 border-b shrink-0 bg-muted/30 flex items-center gap-2">
        <MousePointerClick className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <p className="text-[11px] text-muted-foreground">
          Click any element in the preview to make it editable.{' '}
          <span className="text-green-500 font-medium">Green</span> = already mapped.
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

        {/* Right — defined fields list */}
        <div className="w-52 shrink-0 flex flex-col bg-muted/10">
          <div className="px-3 py-2 border-b shrink-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Fields ({fieldMappings.length})
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {fieldMappings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-4 text-center">
                <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                  Click elements in the preview to define editable fields
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {fieldMappings.map((m, i) => {
                  const Icon = TYPE_ICON[m.type]
                  return (
                    <div
                      key={`${m.mcId}-${m.type}-${i}`}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-md bg-muted/50 group"
                    >
                      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{m.label}</p>
                        <p className="text-[10px] text-muted-foreground">{TYPE_LABEL[m.type]}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveField(m.mcId, m.type)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded
                                   hover:text-destructive transition-all cursor-pointer shrink-0"
                        title="Remove field"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
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
