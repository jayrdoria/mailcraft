'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import UploadStep from './UploadStep'
import VisualMapper from './VisualMapper'
import ConfigStep from './ConfigStep'
import type { AnalyzeResult, FieldMapping, MappedSection } from '@/lib/types/import'

type Step = 1 | 2 | 3

const STEP_LABELS: Record<Step, string> = {
  1: 'Upload',
  2: 'Define Fields',
  3: 'Configure',
}

interface ImportWizardProps {
  onClose: () => void
}

export default function ImportWizard({ onClose }: ImportWizardProps) {
  const [step, setStep] = useState<Step>(1)
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null)
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([])
  // Phase 7 — editable section model, seeded one-per-detected-section. Rename /
  // merge / split mutate this; Phase 8 sends it to create for marker injection.
  const [sections, setSections] = useState<MappedSection[]>([])

  function handleUploadSuccess(result: AnalyzeResult) {
    setAnalyzeResult(result)
    // Pre-fill every auto-detected field so the mapper opens ready to review,
    // not blank. The user prunes/renames rather than clicking each element.
    setFieldMappings(result.suggestedMappings)
    setSections(result.sections.map((s) => ({ sectionId: s.sectionId, label: s.label, rowIds: [s.sectionId] })))
    setStep(2)
  }

  function handleBack1() {
    setStep(1)
    setAnalyzeResult(null)
    setFieldMappings([])
    setSections([])
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-xl border bg-card shadow-xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div>
            <h2 className="text-sm font-semibold">Import HTML Email</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Step {step} of 3 — {STEP_LABELS[step]}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-accent transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step progress bar */}
        <div className="flex px-5 pt-3 pb-1 gap-1.5 shrink-0">
          {([1, 2, 3] as Step[]).map((s) => (
            <div
              key={s}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors duration-300',
                s <= step ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>

        {/* Steps */}
        {step === 1 && (
          <UploadStep onSuccess={handleUploadSuccess} />
        )}

        {step === 2 && analyzeResult && (
          <VisualMapper
            analyzeResult={analyzeResult}
            fieldMappings={fieldMappings}
            onFieldMappingsChange={setFieldMappings}
            sections={sections}
            onSectionsChange={setSections}
            onBack={handleBack1}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && analyzeResult && (
          <ConfigStep
            html={analyzeResult.instrumentedHtml}
            fieldMappings={fieldMappings}
            sections={sections}
            onBack={() => setStep(2)}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  )
}
