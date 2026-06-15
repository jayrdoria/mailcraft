'use client'

import { apiFetch } from '@/lib/apiFetch'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import { toast } from 'sonner'
import { ArrowLeft, Settings, Save, Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEditorStore } from '@/lib/stores/editorStore'

class DuplicateNameError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DuplicateNameError'
  }
}

function normalizeGroup(group: string): string {
  return group.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '')
}

const SECTION_DESCRIPTIONS: Record<string, string> = {
  HEADER: 'Logo, banner image, and banner link',
  BODY: 'Greeting, body paragraphs, and CTA button',
  USERNAME_PASSWORD: 'Username display and forgot password link',
  THUMBNAILS: 'Promotional thumbnail images and labels',
  TERMS: 'Campaign-specific terms and conditions',
  LEGAL: 'Responsible gambling text and copyright',
}
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
  isImported?: boolean
  backHref?: string
  initialFolderId?: string | null
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
  isImported = false,
  backHref = '/dashboard',
  initialFolderId = null,
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
  const deletedSections = useEditorStore((s) => s.deletedSections)
  const storeFieldValues = useEditorStore((s) => s.fieldValues)
  const isDirty = useEditorStore((s) => s.isDirty)
  const isSaving = useEditorStore((s) => s.isSaving)
  const setIsSaving = useEditorStore((s) => s.setIsSaving)
  const markClean = useEditorStore((s) => s.markClean)
  const currentSavedId = useEditorStore((s) => s.savedTemplateId)
  const [nameError, setNameError] = useState<string | null>(null)

  const SIDEBAR_MIN = 280
  const SIDEBAR_MAX = 600
  const SIDEBAR_DEFAULT = 320
  const [sidebarWidth, setSidebarWidth] = useState<number>(SIDEBAR_DEFAULT)
  const [isResizing, setIsResizing] = useState(false)
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(0)

  // Load persisted width after mount to avoid SSR/client hydration mismatch
  useEffect(() => {
    const stored = localStorage.getItem('editor-sidebar-width')
    const parsed = stored ? parseInt(stored, 10) : NaN
    if (!isNaN(parsed)) {
      setSidebarWidth(Math.min(Math.max(parsed, SIDEBAR_MIN), SIDEBAR_MAX))
    }
  }, [])

  // Global listeners — always attached, guarded by isDragging ref
  useEffect(() => {
    function cancelDrag() {
      isDragging.current = false
      setIsResizing(false)
      setSidebarWidth((w) => {
        localStorage.setItem('editor-sidebar-width', String(w))
        return w
      })
    }
    function onMove(e: MouseEvent) {
      if (!isDragging.current) return
      // Primary button no longer held (e.g. released outside window) — cancel
      if (!(e.buttons & 1)) { cancelDrag(); return }
      const next = Math.min(Math.max(dragStartWidth.current + e.clientX - dragStartX.current, SIDEBAR_MIN), SIDEBAR_MAX)
      setSidebarWidth(next)
    }
    function onUp() {
      if (!isDragging.current) return
      cancelDrag()
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  function startSidebarResize(e: React.MouseEvent) {
    e.preventDefault()
    isDragging.current = true
    dragStartX.current = e.clientX
    dragStartWidth.current = sidebarWidth
    setIsResizing(true)
  }

  // Sections derived from field groups (all groups become toggleable in Configure)
  const allSections = (() => {
    const groups: string[] = []
    const seen = new Set<string>()
    for (const field of masterTemplate.editableFields) {
      const g = field.group
      if (g && !seen.has(g)) { groups.push(g); seen.add(g) }
    }
    return groups.map((g) => ({
      name: normalizeGroup(g),
      label: g,
      description: SECTION_DESCRIPTIONS[normalizeGroup(g)],
    }))
  })()

  // Build section config from parsed HTML sections + store state (not from the saved prop which is empty on new templates)
  const savedDeletedSet = new Set(sectionConfig.filter((s) => s.isDeleted).map((s) => s.name))
  const currentSectionConfig: SavedSectionConfig[] = allSections.map((s) => ({
    name: s.name,
    label: s.label,
    isActive: activeSections.includes(s.name),
    isDeleted: deletedSections.includes(s.name) || savedDeletedSet.has(s.name),
  }))

  // Initialize store on mount
  useEffect(() => {
    init({
      masterTemplateId: masterTemplate.id,
      savedTemplateId,
      templateName: savedTemplateName,
      brand: masterTemplate.brand,
      fieldValues,
      sectionConfig,
      masterPreviewHtml,
      supportedLanguages,
      openSetupModal: !isImported && sectionConfig.length === 0 && allSections.length > 0,
      allSectionNames: allSections.map((s) => s.name),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Warn on browser tab close / refresh when there are unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!useEditorStore.getState().isDirty) return
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
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
      folderId?: string
    }) => {
      const res = await apiFetch('/api/templates/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const json = await res.json()
        if (res.status === 409) throw new DuplicateNameError(json.error ?? 'Duplicate name')
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
      if (err.name === 'DuplicateNameError') {
        setNameError(err.message)
      } else {
        toast.error(err.message)
      }
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
        if (res.status === 409) throw new DuplicateNameError(json.error ?? 'Duplicate name')
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
      if (err.name === 'DuplicateNameError') {
        setNameError(err.message)
      } else {
        toast.error(err.message)
      }
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

    // Always stamp _bodyAlignment from the store's authoritative bodyAlignment so the
    // visual state is what gets persisted — not a potentially stale fieldValues entry.
    const currentBodyAlignment = useEditorStore.getState().bodyAlignment
    const fieldValuesToSave: MultiLanguageFieldValues = {
      ...storeFieldValues,
      en: {
        ...storeFieldValues.en,
        _bodyAlignment: currentBodyAlignment,
      },
    }

    const builtSectionConfig: SavedSectionConfig[] = allSections.map((s) => ({
      name: s.name,
      label: s.label,
      isActive: activeSections.includes(s.name),
      isDeleted: deletedSections.includes(s.name),
    }))

    if (!currentSavedId && !savedTemplateId) {
      createMutation.mutate({
        name: templateName,
        masterTemplateId: masterTemplate.id,
        fieldValues: fieldValuesToSave,
        sectionConfig: builtSectionConfig,
        ...(initialFolderId ? { folderId: initialFolderId } : {}),
      })
    } else {
      updateMutation.mutate({
        name: templateName,
        fieldValues: fieldValuesToSave,
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
          initialDeletedSections={deletedSections}
          initialRequiredFields={useEditorStore.getState().requiredFields}
          onConfirm={handleSetupConfirm}
          onCancel={closeSetupModal}
        />
      )}

      <div className={cn('fixed inset-0 z-[60] flex flex-col bg-background overflow-hidden', isResizing && 'select-none')}>
        {/* Header */}
        <div
          ref={headerRef}
          className="flex items-center gap-3 px-4 py-3 border-b bg-card shrink-0"
        >
          <button
            onClick={() => {
              if (isDirty && !window.confirm('You have unsaved changes. Leave without saving?')) return
              router.push(backHref)
            }}
            className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>
              {masterTemplate.brand === 'STAKES'
                ? 'Stakes'
                : masterTemplate.brand === 'STAKES_CASINO'
                  ? 'Stakes Casino'
                  : 'X7 Casino'}
            </span>
            <span>/</span>
            <span>{masterTemplate.name}</span>
          </div>

          <div className="flex-1" />

          {isOwner && (
            <>
              <div className="relative">
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => { setTemplateName(e.target.value); setNameError(null) }}
                  placeholder="Template name…"
                  className={cn(
                    'w-56 px-2.5 py-1.5 text-sm rounded-md border bg-background',
                    'focus:outline-none focus:ring-2',
                    nameError
                      ? 'border-red-500 focus:ring-red-500'
                      : 'focus:ring-ring'
                  )}
                />
                {nameError && (
                  <p className="absolute top-full left-0 mt-1 text-xs text-red-500 whitespace-nowrap bg-background px-1 rounded z-10">
                    {nameError}
                  </p>
                )}
              </div>

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
          <div className="shrink-0 flex flex-col overflow-hidden" style={{ width: sidebarWidth }}>
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

          {/* Resize handle */}
          <div
            onMouseDown={startSidebarResize}
            className={cn(
              'relative w-3 shrink-0 flex items-center justify-center cursor-col-resize group transition-colors',
              isResizing ? 'bg-primary/15' : 'hover:bg-primary/10'
            )}
          >
            <div className={cn(
              'flex flex-col gap-[3px] pointer-events-none transition-opacity',
              isResizing ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'
            )}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={cn('w-[3px] h-[3px] rounded-full transition-colors', isResizing ? 'bg-primary' : 'bg-muted-foreground group-hover:bg-primary')} />
              ))}
            </div>
          </div>

          {/* Preview + export */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <LivePreview />
            </div>

            {/* Export buttons (only for owner with a saved ID) */}
            {effectiveSavedId && isOwner && (
              <div className="p-4 border-t bg-card shrink-0">
                {isDirty ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 text-xs text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>You have unsaved changes — save the template to enable export.</span>
                  </div>
                ) : (
                  <ExportButtons
                    savedTemplateId={effectiveSavedId}
                    templateName={templateName}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
