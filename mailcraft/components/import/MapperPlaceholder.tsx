'use client'

// Phase 3 placeholder — replaced by the real visual mapper in Phase 4.
// Shows detected DOM nodes so the analyze result can be verified,
// but "Next" is blocked until field mappings are defined.

import { FileImage, Link2, Type, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AnalyzeResult, FieldMapping, DomNode } from '@/lib/types/import'

const TYPE_ICON: Record<DomNode['type'], React.ElementType> = {
  image: FileImage,
  link:  Link2,
  text:  Type,
}

const TYPE_LABEL: Record<DomNode['type'], string> = {
  image: 'Image',
  link:  'Link',
  text:  'Text',
}

interface MapperPlaceholderProps {
  analyzeResult: AnalyzeResult
  fieldMappings: FieldMapping[]
  onFieldMappingsChange: (mappings: FieldMapping[]) => void
  onBack: () => void
  onNext: () => void
}

export default function MapperPlaceholder({
  analyzeResult,
  fieldMappings,
  onBack,
  onNext,
}: MapperPlaceholderProps) {
  const { domNodes } = analyzeResult
  const canProceed = fieldMappings.length > 0

  const grouped = {
    image: domNodes.filter((n) => n.type === 'image'),
    link:  domNodes.filter((n) => n.type === 'link'),
    text:  domNodes.filter((n) => n.type === 'text'),
  } as const

  return (
    <>
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {/* Status note */}
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-md bg-muted/60 text-[11px] text-muted-foreground">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            The interactive field mapper is coming in Phase 4. Below is a preview of the{' '}
            <strong className="text-foreground">{domNodes.length}</strong> editable element
            {domNodes.length !== 1 ? 's' : ''} detected in your HTML.
          </span>
        </div>

        {/* Detected nodes grouped by type */}
        {(Object.entries(grouped) as [DomNode['type'], DomNode[]][]).map(([type, nodes]) => {
          if (nodes.length === 0) return null
          const Icon = TYPE_ICON[type]

          return (
            <div key={type}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                {TYPE_LABEL[type]}s ({nodes.length})
              </p>
              <div className="space-y-1">
                {nodes.map((node) => (
                  <div
                    key={node.mcId}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-muted/40 text-xs"
                  >
                    <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground font-mono text-[10px] shrink-0">
                      {`<${node.tag}>`}
                    </span>
                    <span className="truncate text-foreground/70">{node.preview}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {domNodes.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">
            No editable elements detected in this HTML file.
          </p>
        )}
      </div>

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
          title={!canProceed ? 'Define at least one editable field to continue' : undefined}
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
