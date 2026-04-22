'use client'

import { apiFetch } from '@/lib/apiFetch'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import { toast } from 'sonner'
import { ArrowLeft, Settings, Save, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useEditorStore } from '@/lib/stores/editorStore'
import { parseSectionNames } from '@/lib/clientRender'
import SetupModal from './SetupModal'
import FieldEditor from './FieldEditor'
import LivePreview from './LivePreview'
import ExportButtons from './ExportButtons'
import TemplateActivityLog from './TemplateActivityLog'
import type { TemplateFieldConfig, SavedSectionConfig, MultiLanguageFieldValues, Language } from '@/lib/types/template'
import { LANGUAGES } from '@/lib/types/template'
import type { SetupConfig } from '@/lib/stores/editorStore'

interface MasterTemplate {
  id: string
  name: string
  brand: string
  editableFields: TemplateFieldConfig[]
}

interface EditorClientProps {
  masterTemplate: MasterTemplate
  savedTemplateId: string | null
  savedTemplateName: string
  fieldValues: MultiLanguageFieldValues
  sectionConfig: SavedSectionConfig[]
  masterPreviewHtml: string
  isOwner: boolean
  supportedLanguages?: Language[]
}

export default function EditorClient({
  masterTemplate,
  savedTemplateId,
  savedTemplateName,
  fieldValues,
  sectionConfig,
  masterPreviewHtml,
  isOwner,
  supportedLanguages = LANGUAGES,
}: EditorClientProps) {
  const router = useRouter()
  const qc = useQueryClient()
  const headerRef = useRef<HTMLDivElement>(null)
  const setupGearRef = useRef<HTMLButtonElement>(null)

  const init = useEditorStore((s) => s.init)
  const isSetupModalOpen = useEditorStore((s) => s.isSetupModalOpen)
  const openSetupModal = useEditorStore((s) => s.openSetupModal)
  const closeSetupModal = useEditorStore((s) => s.closeSetupModal)
  const applySetupConfig = useEditorStore((s) => s.applySetupConfig)
  const templateName = useEditorStore((s) => s.templateName)
  const setTemplateName = useEditorStore((s) => s.setTemplateName)
  const activeSections = useEditorStore((s) => s.activeSections)
  const storeFieldValues = useEditorStore((s) => s.fieldValues)
  const isDirty = useEditorStore((s) => s.isDirty)
  const isSaving = useEditorStore((s) => s.isSaving)
  const setIsSaving = useEditorStore((s) => s.setIsSaving)
  const markClean = useEditorStore((s) => s.markClean)
  const currentSavedId = useEditorStore((s) => s.savedTemplateId)

  // Sections parsed from master HTML
  const allSections = parseSectionNames(masterPreviewHtml)

  // Build current section config for field editor
  const currentSectionConfig: SavedSectionConfig[] = sectionConfig.map((s) => ({
    ...s,
    isActive: activeSections.includes(s.name),
  }))

  // Initialize store on mount
  useEffect(() => {
    init({
      masterTemplateId: masterTemplate.id,
      savedTemplateId,
      templateName: savedTemplateName,
      fieldValues,
      sectionConfig,
      masterPreviewHtml,
      supportedLanguages,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // GSAP: save button pulse while saving
  const saveBtnRef = useRef<HTMLButtonElement>(null)
  useGSAP(
    () => {
      if (!saveBtnRef.current) return
      if (isSaving) {
        gsap.to(saveBtnRef.current, { scale: 0.97, repeat: -1, yoyo: true, duration: 0.4 })
      } else {
        gsap.killTweensOf(saveBtnRef.current)
        gsap.to(saveBtnRef.current, { scale: 1, duration: 0.1 })
      }
    },
    { scope: saveBtnRef, dependencies: [isSaving] }
  )

  // GSAP: gear hover rotation
  useGSAP(
    () => {
      if (!setupGearRef.current) return
      const el = setupGearRef.current
      const enter = () => gsap.to(el.querySelector('svg'), { rotation: 45, duration: 0.3, ease: 'power2.out' })
      const leave = () => gsap.to(el.querySelector('svg'), { rotation: 0, duration: 0.3, ease: 'power2.out' })
      el.addEventListener('mouseenter', enter)
      el.addEventListener('mouseleave', leave)
      return () => {
        el.removeEventListener('mouseenter', enter)
        el.removeEventListener('mouseleave', leave)
      }
    },
    { scope: setupGearRef }
  )

  // Create new saved template mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string
      masterTemplateId: string
      fieldValues: MultiLanguageFieldValues
      sectionConfig: SavedSectionConfig[]
    }) => {
      const res = await apiFetch('/api/templates/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Save failed')
      }
      return res.json()
    },
    onSuccess: (json) => {
      qc.invalidateQueries({ queryKey: ['saved-templates'] })
      toast.success('Template created')
      markClean()
      setIsSaving(false)
      // Redirect to saved editor
      router.replace(`/editor/${json.data.id}`)
    },
    onError: (err: Error) => {
      toast.error(err.message)
      setIsSaving(false)
    },
  })

  // Update saved template mutation
  const updateMutation = useMutation({
    mutationFn: async (data: {
      name?: string
      fieldValues?: MultiLanguageFieldValues
      sectionConfig?: SavedSectionConfig[]
    }) => {
      const id = currentSavedId ?? savedTemplateId
      const res = await apiFetch(`/api/templates/saved/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Save failed')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saved-templates'] })
      qc.invalidateQueries({ queryKey: ['activity', currentSavedId ?? savedTemplateId] })
      toast.success('Template saved')
      markClean()
      setIsSaving(false)
    },
    onError: (err: Error) => {
      toast.error(err.message)
      setIsSaving(false)
    },
  })

  function handleSave() {
    // Validate required fields
    const missingRequired = useEditorStore.getState().requiredFields.filter((key) => {
      const val = storeFieldValues.en[key]
      if (Array.isArray(val)) return val.length === 0
      return !val || (val as string).trim() === ''
    })
    if (missingRequired.length > 0) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSaving(true)

    const builtSectionConfig: SavedSectionConfig[] = allSections.map((s) => ({
      name: s.name,
      label: s.label,
      isActive: activeSections.includes(s.name),
    }))

    if (!currentSavedId && !savedTemplateId) {
      createMutation.mutate({
        name: templateName,
        masterTemplateId: masterTemplate.id,
        fieldValues: storeFieldValues,
        sectionConfig: builtSectionConfig,
      })
    } else {
      updateMutation.mutate({
        name: templateName,
        fieldValues: storeFieldValues,
        sectionConfig: builtSectionConfig,
      })
    }
  }

  function handleSetupConfirm(config: SetupConfig) {
    applySetupConfig(config)
    closeSetupModal()
  }

  const effectiveSavedId = currentSavedId ?? savedTemplateId

  return (
    <>
      {/* Setup Modal */}
      {isSetupModalOpen && (
        <SetupModal
          sections={allSections}
          initialActiveSections={activeSections}
          initialRequiredFields={useEditorStore.getState().requiredFields}
          onConfirm={handleSetupConfirm}
          onCancel={closeSetupModal}
        />
      )}

      <div className="fixed inset-0 z-[60] flex flex-col bg-background overflow-hidden">
        {/* Header */}
        <div
          ref={headerRef}
          className="flex items-center gap-3 px-4 py-3 border-b bg-card shrink-0"
        >
          <Link
            href="/dashboard"
            className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{masterTemplate.brand === 'STAKES' ? 'Stakes' : 'X7 Casino'}</span>
            <span>/</span>
            <span>{masterTemplate.name}</span>
          </div>

          <div className="flex-1" />

          {isOwner && (
            <>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template name…"
                className="w-56 px-2.5 py-1.5 text-sm rounded-md border bg-background
                           focus:outline-none focus:ring-2 focus:ring-ring"
              />

              <button
                ref={setupGearRef}
                onClick={openSetupModal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border
                           hover:bg-accent transition-colors cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                Setup
              </button>

              <button
                ref={saveBtnRef}
                onClick={handleSave}
                disabled={isSaving || !isDirty}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-opacity cursor-pointer',
                  'bg-primary text-primary-foreground hover:opacity-90',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save
              </button>
            </>
          )}
        </div>

        {/* Editor body: fields | preview */}
        <div className="flex flex-1 overflow-hidden">
          {/* Field editor */}
          <div className="w-80 shrink-0 border-r flex flex-col overflow-hidden">
            <FieldEditor
              editableFields={masterTemplate.editableFields}
              sectionConfig={currentSectionConfig}
            />

            {/* Activity log at bottom of field column */}
            {effectiveSavedId && (
              <div className="p-3 border-t shrink-0">
                <TemplateActivityLog savedTemplateId={effectiveSavedId} />
              </div>
            )}
          </div>

          {/* Preview + export */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <LivePreview />
            </div>

            {/* Export buttons (only for owner with a saved ID) */}
            {effectiveSavedId && isOwner && (
              <div className="p-4 border-t bg-card shrink-0">
                <ExportButtons
                  savedTemplateId={effectiveSavedId}
                  templateName={templateName}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
