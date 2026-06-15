'use client'

import { apiFetch } from '@/lib/apiFetch'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import { toast } from 'sonner'
import {
  Plus, Search, Trash2, Edit, Download, Share2, Eye,
  Mail, Clock, Copy, MoreHorizontal, Files, Archive,
  Folder, FolderPlus, FolderInput, ChevronRight, Pencil, X,
  CheckSquare, Square,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND_LABELS } from '@/lib/types/template'
import type { BrandSlug } from '@/lib/types/template'
import ShareModal from '@/components/editor/ShareModal'

type BrandFilter = 'ALL' | BrandSlug

interface MasterTemplate {
  id: string
  name: string
  brand: BrandSlug
  description: string | null
  editableFields?: { key: string; defaultValue?: string; defaultValues?: Partial<Record<string, string>> }[]
}

function getMasterPreviewImage(m: MasterTemplate): string | null {
  const f = m.editableFields?.find((f) => f.key === 'BANNER_IMG')
  return f?.defaultValues?.['en'] ?? f?.defaultValue ?? null
}

interface SavedTemplate {
  id: string
  name: string
  updatedAt: string
  folderId: string | null
  previewImageUrl: string | null
  masterTemplate: { id: string; name: string; brand: BrandSlug; languages: string[] }
}

interface FolderItem {
  id: string
  name: string
  templateCount: number
  createdAt: string
  updatedAt: string
}

interface SharedTemplate {
  id: string
  savedTemplate: SavedTemplate & {
    user: { id: string; name: string; department: string | null }
    previewImageUrl: string | null
  }
  sharedBy: { id: string; name: string; department: string | null }
  createdAt: string
}

interface DashboardData {
  own: SavedTemplate[]
  shared: SharedTemplate[]
}

function getGreeting(name: string) {
  const hour = new Date().getHours()
  const salutation = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  return `${salutation}, ${name}`
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function BrandBadge({ brand }: { brand: BrandSlug }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide',
        brand === 'STAKES' || brand === 'STAKES_CASINO'
          ? 'bg-stakes/15 text-stakes'
          : 'bg-x7/15 text-x7'
      )}
    >
      {BRAND_LABELS[brand]}
    </span>
  )
}

/* ── Three-dot overflow menu ─────────────────────────── */
interface TemplateMenuProps {
  languages: string[]
  onCopyClean: (lang: string) => void
  onCopyFull: (lang: string) => void
  onDownload: (lang: string) => void
  onDownloadZip: () => void
  onShare: () => void
  onDuplicate: () => void
  onMoveToFolder: () => void
  onDelete: () => void
}

function TemplateMenu({
  languages, onCopyClean, onCopyFull, onDownload, onDownloadZip,
  onShare, onDuplicate, onMoveToFolder, onDelete,
}: TemplateMenuProps) {
  const [open, setOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })
  const [selectedLang, setSelectedLang] = useState(languages[0] ?? 'en')
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      const insideButton = menuRef.current?.contains(target)
      const insideDropdown = dropdownRef.current?.contains(target)
      if (!insideButton && !insideDropdown) setOpen(false)
    }
    function handleScroll() { setOpen(false) }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [open])

  function handleToggle(e: React.MouseEvent) {
    e.preventDefault()
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const dropdownHeight = 290
      const openUpward = window.innerHeight - rect.bottom < dropdownHeight
      setDropdownPos({
        top: openUpward ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
        right: window.innerWidth - rect.right,
      })
    }
    setOpen((v) => !v)
  }

  const exportItems: { label: string; icon: React.ElementType; action: () => void }[] = [
    { label: 'Copy Clean HTML', icon: Copy, action: () => onCopyClean(selectedLang) },
    { label: 'Copy Full HTML', icon: Mail, action: () => onCopyFull(selectedLang) },
    { label: 'Download', icon: Download, action: () => onDownload(selectedLang) },
    { label: 'Download ZIP (All Languages)', icon: Archive, action: onDownloadZip },
  ]

  const managementItems: { label: string; icon: React.ElementType; action: () => void; destructive?: boolean }[] = [
    { label: 'Share', icon: Share2, action: onShare },
    { label: 'Duplicate', icon: Files, action: onDuplicate },
    { label: 'Move to Folder', icon: FolderInput, action: onMoveToFolder },
    { label: 'Delete', icon: Trash2, action: onDelete, destructive: true },
  ]

  return (
    <div ref={menuRef} className="relative">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground
                   transition-colors cursor-pointer"
        aria-label="More actions"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: dropdownPos.top, right: dropdownPos.right, zIndex: 9999 }}
          className="min-w-[190px] rounded-lg border bg-popover shadow-xl shadow-black/30 py-1 animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {languages.length > 1 && (
            <div className="px-2 py-1.5 border-b mb-1">
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full h-6 text-xs rounded border bg-background text-foreground px-1 cursor-pointer"
              >
                {languages.map((lang) => (
                  <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                ))}
              </select>
            </div>
          )}
          {exportItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                onClick={() => { setOpen(false); item.action() }}
                className="flex items-center gap-2.5 w-full px-3 py-1.5 text-xs text-left
                           text-foreground hover:bg-accent transition-colors cursor-pointer"
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {item.label}
              </button>
            )
          })}
          <div className="my-1 border-t" />
          {managementItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                onClick={() => { setOpen(false); item.action() }}
                className={cn(
                  'flex items-center gap-2.5 w-full px-3 py-1.5 text-xs text-left transition-colors cursor-pointer',
                  item.destructive
                    ? 'text-destructive hover:bg-destructive/10'
                    : 'text-foreground hover:bg-accent'
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {item.label}
              </button>
            )
          })}
        </div>,
        document.body
      )}
    </div>
  )
}

/* ── Folder card ─────────────────────────────────────── */
interface FolderCardProps {
  folder: FolderItem
  renamingId: string | null
  renameName: string
  onRenameNameChange: (v: string) => void
  onRenameStart: (folder: FolderItem) => void
  onRenameConfirm: () => void
  onRenameCancel: () => void
  onDelete: (folder: FolderItem) => void
  onClick: () => void
}

function FolderCard({
  folder, renamingId, renameName, onRenameNameChange,
  onRenameStart, onRenameConfirm, onRenameCancel, onDelete, onClick,
}: FolderCardProps) {
  const isRenaming = renamingId === folder.id
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isRenaming) inputRef.current?.focus()
  }, [isRenaming])

  return (
    <div
      className="group relative flex items-center gap-3 px-4 py-3 rounded-xl border bg-card
                 hover:border-primary/40 transition-colors cursor-pointer"
      onClick={() => { if (!isRenaming) onClick() }}
    >
      <Folder className="w-8 h-8 shrink-0 text-primary/60" />

      <div className="flex-1 min-w-0">
        {isRenaming ? (
          <input
            ref={inputRef}
            value={renameName}
            onChange={(e) => onRenameNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onRenameConfirm()
              if (e.key === 'Escape') onRenameCancel()
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full text-sm font-medium bg-transparent border-b border-primary outline-none"
          />
        ) : (
          <p className="text-sm font-medium truncate">{folder.name}</p>
        )}
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {folder.templateCount} {folder.templateCount === 1 ? 'template' : 'templates'}
        </p>
      </div>

      {/* Folder actions */}
      {!isRenaming && (
        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onRenameStart(folder)}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Rename"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(folder)}
            className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {isRenaming && (
        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onRenameConfirm}
            className="px-2 py-1 text-[11px] rounded-md bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
          >
            Save
          </button>
          <button
            onClick={onRenameCancel}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Move to folder modal ────────────────────────────── */
interface MoveToFolderModalProps {
  folders: FolderItem[]
  currentFolderId: string | null
  onMove: (folderId: string | null) => void
  onClose: () => void
}

function MoveToFolderModal({ folders, currentFolderId, onMove, onClose }: MoveToFolderModalProps) {
  const [selected, setSelected] = useState<string | null>(currentFolderId)

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-sm rounded-xl border bg-card shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-sm font-semibold">Move to Folder</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-accent text-muted-foreground cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-2 max-h-64 overflow-y-auto">
          {/* No folder option */}
          <button
            onClick={() => setSelected(null)}
            className={cn(
              'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-left transition-colors cursor-pointer',
              selected === null ? 'bg-primary/10 text-primary' : 'hover:bg-accent text-muted-foreground'
            )}
          >
            <X className="w-4 h-4 shrink-0" />
            No folder (uncategorized)
          </button>

          {folders.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No folders yet. Create one from the dashboard.</p>
          )}

          {folders.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelected(f.id)}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-left transition-colors cursor-pointer',
                selected === f.id ? 'bg-primary/10 text-primary' : 'hover:bg-accent text-foreground'
              )}
            >
              <Folder className="w-4 h-4 shrink-0" />
              <span className="flex-1 truncate">{f.name}</span>
              <span className="text-[11px] text-muted-foreground shrink-0">{f.templateCount}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-xs rounded-md border hover:bg-accent transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => { onMove(selected); onClose() }}
            disabled={selected === currentFolderId}
            className="flex-1 py-2 text-xs rounded-md bg-primary text-primary-foreground
                       hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Move
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ── Shared template card ────────────────────────────── */
interface SharedTemplateCardProps {
  s: SharedTemplate
  onCopyClean: (id: string, lang: string) => void
}

function SharedTemplateCard({ s, onCopyClean }: SharedTemplateCardProps) {
  const langs = s.savedTemplate.masterTemplate.languages
  const [selectedLang, setSelectedLang] = useState(langs[0] ?? 'en')

  return (
    <div className="rounded-xl border bg-card flex flex-col hover:border-primary/30 transition-colors">
      <div className="relative w-full bg-muted overflow-hidden rounded-t-xl" style={{ paddingBottom: '52%' }}>
        {s.savedTemplate.previewImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.savedTemplate.previewImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
        ) : (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-1.5"
            style={{
              background:
                s.savedTemplate.masterTemplate.brand === 'X7'
                  ? 'linear-gradient(135deg, #0d0d0d 0%, #001a1e 100%)'
                  : 'linear-gradient(135deg, #0d0d0d 0%, #1e0d0d 100%)',
            }}
          >
            <Mail className="w-5 h-5 text-white/20" />
            <span
              className="text-[10px] font-semibold tracking-widest uppercase"
              style={{ color: s.savedTemplate.masterTemplate.brand === 'X7' ? '#07d8f4' : '#ef5e5e' }}
            >
              {BRAND_LABELS[s.savedTemplate.masterTemplate.brand]}
            </span>
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{s.savedTemplate.name}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <BrandBadge brand={s.savedTemplate.masterTemplate.brand} />
            <span className="text-[11px] text-muted-foreground">from {s.sharedBy.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          {formatDate(s.createdAt)}
        </div>
        <div className="flex gap-2 pt-2 border-t">
          <Link
            href={`/editor/${s.savedTemplate.id}`}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md
                       border hover:bg-accent transition-colors text-muted-foreground"
          >
            <Eye className="w-3 h-3" />
            View
          </Link>
          <div className="flex-1 flex gap-1">
            {langs.length > 1 && (
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                className="h-full text-xs rounded-md border bg-background text-foreground px-1 cursor-pointer"
              >
                {langs.map((lang) => (
                  <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                ))}
              </select>
            )}
            <button
              onClick={() => onCopyClean(s.savedTemplate.id, selectedLang)}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs rounded-md
                         bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              Copy Clean HTML
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Main dashboard ──────────────────────────────────── */
interface DashboardClientProps {
  userName: string
  initialFolderId?: string | null
}

export default function DashboardClient({ userName, initialFolderId = null }: DashboardClientProps) {
  const [search, setSearch] = useState('')
  const [brandFilter, setBrandFilter] = useState<BrandFilter>('ALL')
  const [shareTemplateId, setShareTemplateId] = useState<string | null>(null)
  const [activeFolderId, setActiveFolderId] = useState<string | null>(initialFolderId)

  // Folder create state
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const newFolderInputRef = useRef<HTMLInputElement>(null)

  // Folder rename state
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)
  const [renameFolderName, setRenameFolderName] = useState('')

  // Move template state
  const [moveTemplateId, setMoveTemplateId] = useState<string | null>(null)

  // Bulk select state
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const cardsRef = useRef<HTMLDivElement>(null)
  const masterRowRef = useRef<HTMLDivElement>(null)
  // Tracks the last folder view that was animated so background refetches don't re-trigger
  const lastAnimatedViewRef = useRef<string | null | undefined>(undefined)
  const qc = useQueryClient()

  useEffect(() => {
    if (creatingFolder) newFolderInputRef.current?.focus()
  }, [creatingFolder])

  useEffect(() => {
    setSelectMode(false)
    setSelectedIds(new Set())
  }, [activeFolderId])

  // ── Queries ──────────────────────────────────────────
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['saved-templates'],
    queryFn: async () => {
      const res = await apiFetch('/api/templates/saved')
      const json = await res.json()
      return json.data
    },
  })

  const { data: folders = [] } = useQuery<FolderItem[]>({
    queryKey: ['folders'],
    queryFn: async () => {
      const res = await apiFetch('/api/folders')
      const json = await res.json()
      return json.data
    },
  })

  const { data: masters } = useQuery<MasterTemplate[]>({
    queryKey: ['master-templates'],
    queryFn: async () => {
      const res = await apiFetch('/api/templates/master')
      const json = await res.json()
      return json.data
    },
    staleTime: 1000 * 60 * 10,
  })

  // ── Template mutations ────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/templates/saved/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saved-templates'] })
      toast.success('Template deleted')
    },
    onError: () => toast.error('Delete failed — please try again'),
  })

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/templates/saved/${id}/duplicate`, { method: 'POST' })
      if (!res.ok) throw new Error('Duplicate failed')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saved-templates'] })
      toast.success('Template duplicated')
    },
    onError: () => toast.error('Duplicate failed — please try again'),
  })

  const moveTemplateMutation = useMutation({
    mutationFn: async ({ id, folderId }: { id: string; folderId: string | null }) => {
      const res = await apiFetch(`/api/templates/saved/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      })
      if (!res.ok) throw new Error('Move failed')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saved-templates'] })
      qc.invalidateQueries({ queryKey: ['folders'] })
      toast.success('Template moved')
    },
    onError: () => toast.error('Move failed — please try again'),
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(
        ids.map((id) => apiFetch(`/api/templates/saved/${id}`, { method: 'DELETE' }))
      )
    },
    onSuccess: (_, ids) => {
      qc.invalidateQueries({ queryKey: ['saved-templates'] })
      qc.invalidateQueries({ queryKey: ['folders'] })
      setSelectMode(false)
      setSelectedIds(new Set())
      toast.success(`${ids.length} template${ids.length !== 1 ? 's' : ''} deleted`)
    },
    onError: () => toast.error('Bulk delete failed — please try again'),
  })

  // ── Folder mutations ──────────────────────────────────
  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiFetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to create folder')
      return json.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['folders'] })
      setCreatingFolder(false)
      setNewFolderName('')
      toast.success('Folder created')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const renameFolderMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await apiFetch(`/api/folders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to rename folder')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['folders'] })
      setRenamingFolderId(null)
      setRenameFolderName('')
      toast.success('Folder renamed')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteFolderMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/folders/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete folder')
      return res.json()
    },
    onSuccess: (json) => {
      qc.invalidateQueries({ queryKey: ['folders'] })
      qc.invalidateQueries({ queryKey: ['saved-templates'] })
      if (activeFolderId === json.data.id) setActiveFolderId(null)
      const count = json.data.templateCount
      toast.success(
        count > 0
          ? `Folder and ${count} template${count !== 1 ? 's' : ''} deleted`
          : 'Folder deleted'
      )
    },
    onError: () => toast.error('Delete failed — please try again'),
  })

  // ── GSAP animations ───────────────────────────────────
  useGSAP(
    () => {
      if (!data || !cardsRef.current) return
      // Only animate when the view changes (folder nav or first load) — not on background refetches
      if (lastAnimatedViewRef.current === activeFolderId) return
      const cards = cardsRef.current.querySelectorAll('.template-card')
      if (cards.length === 0) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      lastAnimatedViewRef.current = activeFolderId
      gsap.from(cards, { opacity: 0, y: 20, duration: 0.4, stagger: 0.08, ease: 'power2.out' })
    },
    { scope: cardsRef, dependencies: [data, activeFolderId] }
  )

  useGSAP(
    () => {
      if (!masters || !masterRowRef.current) return
      const cards = masterRowRef.current.querySelectorAll('.master-card')
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.from(cards, { opacity: 0, scale: 0.95, duration: 0.35, stagger: 0.06, ease: 'power2.out' })
    },
    { scope: masterRowRef, dependencies: [masters] }
  )

  // ── Derived data ──────────────────────────────────────
  const own = data?.own ?? []
  const shared = data?.shared ?? []
  const activeFolder = activeFolderId ? folders.find((f) => f.id === activeFolderId) : null

  // Templates visible in the current "location"
  const locationFiltered = activeFolderId
    ? own.filter((t) => t.folderId === activeFolderId)
    : own.filter((t) => t.folderId === null)

  const filtered = locationFiltered.filter((t) => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase())
    const matchBrand = brandFilter === 'ALL' || t.masterTemplate.brand === brandFilter
    return matchSearch && matchBrand
  })

  // ── Handlers ──────────────────────────────────────────
  async function copyClean(id: string, lang = 'en') {
    try {
      const res = await apiFetch(`/api/templates/saved/${id}/clean?lang=${lang}`)
      const html = await res.text()
      await navigator.clipboard.writeText(html)
      toast.success('Clean HTML copied to clipboard')
    } catch { toast.error('Copy failed') }
  }

  async function copyFull(id: string, lang = 'en') {
    try {
      const res = await apiFetch(`/api/templates/saved/${id}/html?lang=${lang}`)
      const html = await res.text()
      await navigator.clipboard.writeText(html)
      toast.success('Full HTML copied to clipboard')
    } catch { toast.error('Copy failed') }
  }

  async function downloadClean(id: string, name: string, lang = 'en') {
    try {
      const res = await apiFetch(`/api/templates/saved/${id}/clean?lang=${lang}`)
      const html = await res.text()
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${name}-${lang}.html`; a.click()
      URL.revokeObjectURL(url)
      toast.success('Downloaded')
    } catch { toast.error('Download failed') }
  }

  async function downloadZip(id: string, name: string) {
    try {
      const res = await apiFetch(`/api/templates/saved/${id}/zip`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${name}-all-languages.zip`; a.click()
      URL.revokeObjectURL(url)
      toast.success('ZIP downloaded')
    } catch { toast.error('Download failed') }
  }

  function handleCreateFolder() {
    const name = newFolderName.trim()
    if (!name) return
    createFolderMutation.mutate(name)
  }

  function handleRenameStart(folder: FolderItem) {
    setRenamingFolderId(folder.id)
    setRenameFolderName(folder.name)
  }

  function handleRenameConfirm() {
    const name = renameFolderName.trim()
    if (!name || !renamingFolderId) return
    renameFolderMutation.mutate({ id: renamingFolderId, name })
  }

  function handleDeleteFolder(folder: FolderItem) {
    const msg = folder.templateCount > 0
      ? `Delete "${folder.name}"? This will permanently delete the ${folder.templateCount} template${folder.templateCount !== 1 ? 's' : ''} inside. This cannot be undone.`
      : `Delete folder "${folder.name}"? This cannot be undone.`
    if (confirm(msg)) deleteFolderMutation.mutate(folder.id)
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((t) => t.id)))
    }
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  function handleBulkDelete() {
    const count = selectedIds.size
    if (count === 0) return
    if (!confirm(`Delete ${count} template${count !== 1 ? 's' : ''}? This cannot be undone.`)) return
    bulkDeleteMutation.mutate([...selectedIds])
  }

  // ── Render ────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-10">

      {/* ── Greeting ────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{getGreeting(userName)}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {own.length === 0
            ? 'Pick a master template below to get started.'
            : `You have ${own.length} template${own.length !== 1 ? 's' : ''} saved.`}
        </p>
      </div>

      {/* ── Your Templates ──────────────────────────── */}
      <section>
        {/* Section header */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {selectMode ? (
            /* ── Select mode toolbar ── */
            <>
              <button
                onClick={toggleSelectAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                           rounded-md border hover:bg-accent transition-colors cursor-pointer shrink-0"
              >
                {selectedIds.size > 0 && selectedIds.size === filtered.length
                  ? <CheckSquare className="w-3.5 h-3.5" />
                  : <Square className="w-3.5 h-3.5" />}
                {selectedIds.size > 0 && selectedIds.size === filtered.length ? 'Deselect All' : 'Select All'}
              </button>

              <span className="text-xs text-muted-foreground shrink-0">
                {selectedIds.size} selected
              </span>

              <div className="flex-1" />

              <button
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0 || bulkDeleteMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md
                           bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity
                           disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
              </button>

              <button
                onClick={exitSelectMode}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                           rounded-md border hover:bg-accent transition-colors cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
            </>
          ) : (
            /* ── Normal header ── */
            <>
              {activeFolderId ? (
                <div className="flex items-center gap-1.5 flex-1 min-w-0 text-sm">
                  <button
                    onClick={() => { setActiveFolderId(null); setSearch('') }}
                    className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
                  >
                    Your Templates
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="font-semibold truncate">{activeFolder?.name}</span>
                </div>
              ) : (
                <h2 className="text-base font-semibold flex-1">Your Templates</h2>
              )}

              <div className="flex items-center gap-2 shrink-0">
                {filtered.length > 0 && (
                  <button
                    onClick={() => setSelectMode(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                               rounded-md border hover:bg-accent transition-colors cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    Select
                  </button>
                )}
                {!activeFolderId && (
                  <button
                    onClick={() => { setCreatingFolder(true); setSearch('') }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                               rounded-md border hover:bg-accent transition-colors cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    New Folder
                  </button>
                )}
                <Link
                  href={activeFolderId ? `/templates?folder=${activeFolderId}` : '/templates'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                             rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Search + brand filter */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder={activeFolderId ? `Search in ${activeFolder?.name ?? 'folder'}…` : 'Search templates…'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border bg-background
                         focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {(['ALL', 'STAKES', 'STAKES_CASINO', 'X7'] as BrandFilter[]).map((b) => (
            <button
              key={b}
              onClick={() => setBrandFilter(b)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer',
                brandFilter === b
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground hover:bg-accent'
              )}
            >
              {b === 'ALL' ? 'All' : BRAND_LABELS[b as BrandSlug]}
            </button>
          ))}
        </div>

        {/* ── Folders grid (root only) ─────────────── */}
        {!activeFolderId && (
          <div className="mb-6">
            {(folders.length > 0 || creatingFolder) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-2">
                {folders.map((f) => (
                  <FolderCard
                    key={f.id}
                    folder={f}
                    renamingId={renamingFolderId}
                    renameName={renameFolderName}
                    onRenameNameChange={setRenameFolderName}
                    onRenameStart={handleRenameStart}
                    onRenameConfirm={handleRenameConfirm}
                    onRenameCancel={() => { setRenamingFolderId(null); setRenameFolderName('') }}
                    onDelete={handleDeleteFolder}
                    onClick={() => { setActiveFolderId(f.id); setSearch('') }}
                  />
                ))}

                {/* Inline new folder input */}
                {creatingFolder && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-primary/50 bg-card">
                    <FolderPlus className="w-8 h-8 shrink-0 text-primary/40" />
                    <input
                      ref={newFolderInputRef}
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateFolder()
                        if (e.key === 'Escape') { setCreatingFolder(false); setNewFolderName('') }
                      }}
                      placeholder="Folder name…"
                      className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={handleCreateFolder}
                        disabled={!newFolderName.trim() || createFolderMutation.isPending}
                        className="px-2 py-1 text-[11px] rounded-md bg-primary text-primary-foreground
                                   hover:opacity-90 disabled:opacity-50 cursor-pointer"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => { setCreatingFolder(false); setNewFolderName('') }}
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* No folders yet empty state */}
            {folders.length === 0 && !creatingFolder && own.length > 0 && (
              <button
                onClick={() => setCreatingFolder(true)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground
                           transition-colors cursor-pointer mb-2 group"
              >
                <FolderPlus className="w-3.5 h-3.5 group-hover:text-primary transition-colors" />
                Create a folder to organise your templates
              </button>
            )}
          </div>
        )}

        {/* ── Templates grid ───────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 rounded-xl border bg-card animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
            <Mail className="w-8 h-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">
              {activeFolderId
                ? 'This folder is empty'
                : own.length === 0 ? 'No templates yet' : 'No results'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {activeFolderId
                ? 'Move templates here using the ··· menu on any template card'
                : own.length === 0
                  ? 'Browse master templates to create your first one'
                  : 'Try a different search or filter'}
            </p>
            {own.length === 0 && (
              <Link
                href="/templates"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium
                           rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Browse Templates →
              </Link>
            )}
          </div>
        ) : (
          <div ref={cardsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((t) => {
              const isSelected = selectedIds.has(t.id)
              return (
                <div
                  key={t.id}
                  onClick={() => selectMode && toggleSelect(t.id)}
                  className={cn(
                    'template-card group rounded-xl border bg-card flex flex-col transition-colors',
                    selectMode
                      ? isSelected
                        ? 'border-primary ring-2 ring-primary/30 cursor-pointer'
                        : 'hover:border-primary/50 cursor-pointer'
                      : 'hover:border-primary/30'
                  )}
                >
                  {/* Image / placeholder */}
                  <div className="relative w-full overflow-hidden rounded-t-xl" style={{ paddingBottom: '52%' }}>
                    {t.previewImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.previewImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
                    ) : (
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-center gap-1.5"
                        style={{
                          background:
                            t.masterTemplate.brand === 'X7'
                              ? 'linear-gradient(135deg, #0d0d0d 0%, #001a1e 100%)'
                              : 'linear-gradient(135deg, #0d0d0d 0%, #1e0d0d 100%)',
                        }}
                      >
                        <Mail className="w-5 h-5 text-white/20" />
                        <span
                          className="text-[10px] font-semibold tracking-widest uppercase"
                          style={{ color: t.masterTemplate.brand === 'X7' ? '#07d8f4' : '#ef5e5e' }}
                        >
                          {BRAND_LABELS[t.masterTemplate.brand]}
                        </span>
                      </div>
                    )}

                    {/* Checkbox overlay — visible in select mode */}
                    {selectMode && (
                      <div className={cn(
                        'absolute top-2 left-2 w-5 h-5 rounded-md flex items-center justify-center transition-colors',
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-black/40 text-white'
                      )}>
                        {isSelected
                          ? <CheckSquare className="w-4 h-4" />
                          : <Square className="w-4 h-4" />}
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex flex-col gap-2 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.name}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <BrandBadge brand={t.masterTemplate.brand} />
                          <span className="text-[11px] text-muted-foreground truncate">
                            {t.masterTemplate.name}
                          </span>
                        </div>
                      </div>
                      {!selectMode && (
                        <TemplateMenu
                          languages={t.masterTemplate.languages}
                          onCopyClean={(lang) => copyClean(t.id, lang)}
                          onCopyFull={(lang) => copyFull(t.id, lang)}
                          onDownload={(lang) => downloadClean(t.id, t.name, lang)}
                          onDownloadZip={() => downloadZip(t.id, t.name)}
                          onShare={() => setShareTemplateId(t.id)}
                          onDuplicate={() => duplicateMutation.mutate(t.id)}
                          onMoveToFolder={() => setMoveTemplateId(t.id)}
                          onDelete={() => {
                            if (confirm('Delete this template? This cannot be undone.')) {
                              deleteMutation.mutate(t.id)
                            }
                          }}
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatDate(t.updatedAt)}
                    </div>

                    <div className="pt-2 border-t">
                      {selectMode ? (
                        <div
                          className={cn(
                            'flex items-center justify-center gap-1.5 w-full py-1.5 text-xs font-medium rounded-md transition-colors',
                            isSelected
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted/50 text-muted-foreground'
                          )}
                        >
                          {isSelected ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                          {isSelected ? 'Selected' : 'Select'}
                        </div>
                      ) : (
                        <Link
                          href={`/editor/${t.id}`}
                          className="flex items-center justify-center gap-1.5 w-full py-1.5 text-xs font-medium
                                     rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                        >
                          <Edit className="w-3 h-3" />
                          Edit
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Shared With Me ───────────────────────────── */}
      {shared.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-4">Shared With Me</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {shared.map((s) => (
              <SharedTemplateCard key={s.id} s={s} onCopyClean={(id, lang) => copyClean(id, lang)} />
            ))}
          </div>
        </section>
      )}

      {/* ── Start Fresh ──────────────────────────────── */}
      {masters && masters.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-1">Start Fresh</h2>
          <p className="text-xs text-muted-foreground mb-4">Pick a master template to clone.</p>
          <div ref={masterRowRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {masters.map((m) => {
              const previewImg = getMasterPreviewImage(m)
              return (
                <Link
                  key={m.id}
                  href={`/editor/new?master=${m.id}`}
                  className="master-card rounded-xl border bg-card flex flex-col overflow-hidden
                             hover:border-primary/30 transition-colors group"
                >
                  <div className="relative w-full bg-muted overflow-hidden" style={{ paddingBottom: '56%' }}>
                    {previewImg ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previewImg} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
                    ) : (
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-center gap-1.5"
                        style={{
                          background:
                            m.brand === 'X7'
                              ? 'linear-gradient(135deg, #0d0d0d 0%, #1a0010 100%)'
                              : 'linear-gradient(135deg, #0d0d0d 0%, #1a1200 100%)',
                        }}
                      >
                        <Mail className="w-5 h-5 text-white/20" />
                        <span
                          className="text-[10px] font-semibold tracking-widest uppercase"
                          style={{ color: m.brand === 'X7' ? '#07d8f4' : '#ef5e5e' }}
                        >
                          {BRAND_LABELS[m.brand]}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col gap-1">
                    <BrandBadge brand={m.brand} />
                    <p className="text-sm font-medium mt-1 group-hover:text-primary transition-colors">
                      {m.name}
                    </p>
                    {m.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{m.description}</p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Modals ───────────────────────────────────── */}
      {shareTemplateId && (
        <ShareModal savedTemplateId={shareTemplateId} onClose={() => setShareTemplateId(null)} />
      )}

      {moveTemplateId && (
        <MoveToFolderModal
          folders={folders}
          currentFolderId={own.find((t) => t.id === moveTemplateId)?.folderId ?? null}
          onMove={(folderId) => moveTemplateMutation.mutate({ id: moveTemplateId, folderId })}
          onClose={() => setMoveTemplateId(null)}
        />
      )}
    </div>
  )
}
