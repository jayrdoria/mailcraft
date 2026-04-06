'use client'

import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import { X, Settings, Info, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SetupConfig } from '@/lib/stores/editorStore'

export interface SectionDef {
  name: string
  label: string
  description?: string
}

interface SetupModalProps {
  sections: SectionDef[]
  initialActiveSections: string[]
  initialRequiredFields: string[]
  onConfirm: (config: SetupConfig) => void
  onCancel: () => void
}

export default function SetupModal({
  sections,
  initialActiveSections,
  initialRequiredFields,
  onConfirm,
  onCancel,
}: SetupModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const rowsRef = useRef<HTMLDivElement>(null)

  const [activeSections, setActiveSections] = useState<Set<string>>(
    new Set(initialActiveSections.length > 0 ? initialActiveSections : sections.map((s) => s.name))
  )
  const [requiredFields] = useState<string[]>(initialRequiredFields)
  const [deletedSections, setDeletedSections] = useState<Set<string>>(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useGSAP(
    () => {
      gsap.from(modalRef.current, {
        opacity: 0,
        scale: 0.95,
        duration: 0.25,
        ease: 'power2.out',
      })

      if (rowsRef.current) {
        const rows = rowsRef.current.querySelectorAll('.section-row')
        gsap.from(rows, {
          opacity: 0,
          x: -12,
          duration: 0.3,
          stagger: 0.06,
          ease: 'power2.out',
          delay: 0.15,
        })
      }
    },
    { scope: modalRef }
  )

  function toggleSection(name: string) {
    setActiveSections((prev) => {
      const next = new Set(prev)
      if (next.has(name)) { next.delete(name) } else { next.add(name) }
      return next
    })
  }

  function confirmDelete(name: string) {
    setDeletedSections((prev) => new Set([...prev, name]))
    setActiveSections((prev) => {
      const next = new Set(prev)
      next.delete(name)
      return next
    })
    setDeleteConfirm(null)
  }

  const visibleSections = sections.filter((s) => !deletedSections.has(s.name))

  function handleConfirm() {
    onConfirm({
      activeSections: Array.from(activeSections).filter((n) => !deletedSections.has(n)),
      requiredFields,
      deletedSections: Array.from(deletedSections),
    })
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div
        ref={modalRef}
        className="w-full max-w-lg rounded-xl border bg-card shadow-xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Configure Your Template</h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-md hover:bg-accent transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="px-5 pt-3 pb-1 text-xs text-muted-foreground shrink-0">
          Choose which sections to include in this email.
        </p>

        {/* Section rows */}
        <div ref={rowsRef} className="px-5 py-3 space-y-2 overflow-y-auto flex-1">
          {visibleSections.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              All sections have been deleted.
            </p>
          )}
          {visibleSections.map((section) => {
            const isActive = activeSections.has(section.name)
            return (
              <div
                key={section.name}
                className={cn(
                  'section-row rounded-lg border p-3.5 transition-colors',
                  isActive ? 'bg-card' : 'bg-muted/30 opacity-70'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{section.label}</p>
                    {section.description && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {section.description}
                      </p>
                    )}
                    {!isActive && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 italic">
                        (Section will be hidden in email)
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Delete button */}
                    {deleteConfirm === section.name ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-destructive font-medium">Delete?</span>
                        <button
                          onClick={() => confirmDelete(section.name)}
                          className="text-[11px] px-2 py-0.5 rounded bg-destructive text-destructive-foreground cursor-pointer"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-[11px] px-2 py-0.5 rounded border cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(section.name)}
                        className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10
                                   transition-colors cursor-pointer"
                        title="Permanently remove section"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Toggle */}
                    <button
                      onClick={() => toggleSection(section.name)}
                      className={cn(
                        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors',
                        isActive ? 'bg-green-500' : 'bg-muted'
                      )}
                      role="switch"
                      aria-checked={isActive}
                    >
                      <span
                        className={cn(
                          'pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
                          isActive ? 'translate-x-4' : 'translate-x-0.5'
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Info note */}
        <div className="px-5 pb-3 shrink-0">
          <div className="flex gap-2 px-3 py-2.5 rounded-md bg-muted/50 text-[11px] text-muted-foreground">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              Logo, verify button link, footer, and legal text are managed by your admin.
              You can change the button text but not its link.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t shrink-0">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-xs rounded-md border hover:bg-accent transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground
                       hover:opacity-90 transition-opacity cursor-pointer"
          >
            Start Editing →
          </button>
        </div>
      </div>
    </div>
  )
}
