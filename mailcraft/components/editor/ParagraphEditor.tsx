'use client'

import { useEffect, useRef } from 'react'
import { Bold, Plus, Trash2 } from 'lucide-react'
import type { BodyParagraph } from '@/lib/types/template'

function normalizeBold(html: string): string {
  let result = html
  result = result.replace(/<b\b[^>]*>/gi, '<strong style="font-weight:700">')
  result = result.replace(/<\/b>/gi, '</strong>')
  result = result.replace(/<strong\b[^>]*>/gi, '<strong style="font-weight:700">')
  return result
}

function stripToSafeHtml(html: string): string {
  let result = html
  // Remove entire block elements that carry Word junk (style sheets, head, scripts, comments)
  result = result.replace(/<style[\s\S]*?<\/style>/gi, '')
  result = result.replace(/<head[\s\S]*?<\/head>/gi, '')
  result = result.replace(/<script[\s\S]*?<\/script>/gi, '')
  result = result.replace(/<!--[\s\S]*?-->/g, '')
  result = result.replace(/<xml[\s\S]*?<\/xml>/gi, '')
  result = normalizeBold(result)
  result = result
    .replace(/<strong style="font-weight:700">/g, '\x00OPEN\x00')
    .replace(/<\/strong>/g, '\x00CLOSE\x00')
    .replace(/<[^>]+>/g, '')
    .replace(/\x00OPEN\x00/g, '<strong style="font-weight:700">')
    .replace(/\x00CLOSE\x00/g, '</strong>')
  // Collapse whitespace left by stripped tags
  result = result.replace(/\s+/g, ' ').trim()
  return result
}

interface ParagraphItemProps {
  para: BodyParagraph
  canDelete: boolean
  onChange: (html: string) => void
  onDelete: () => void
}

function ParagraphItem({ para, canDelete, onChange, onDelete }: ParagraphItemProps) {
  const divRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (divRef.current) {
      divRef.current.innerHTML = para.html
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleInput = () => {
    if (divRef.current) onChange(divRef.current.innerHTML)
  }

  const handleBlur = () => {
    if (!divRef.current) return
    const normalized = normalizeBold(divRef.current.innerHTML)
    if (normalized !== divRef.current.innerHTML) {
      divRef.current.innerHTML = normalized
    }
    onChange(normalized)
  }

  const handleBold = () => {
    if (!divRef.current) return
    divRef.current.focus()
    document.execCommand('bold', false)
    onChange(divRef.current.innerHTML)
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    const htmlData = e.clipboardData.getData('text/html')
    const textData = e.clipboardData.getData('text/plain')
    const clean = htmlData
      ? stripToSafeHtml(htmlData)
      : textData.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    document.execCommand('insertHTML', false, clean)
    if (divRef.current) onChange(divRef.current.innerHTML)
  }

  return (
    <div className="flex gap-2 items-start">
      <div className="flex-1 border rounded-md overflow-hidden">
        <div className="flex items-center gap-1 px-2 py-1 border-b bg-muted/40">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              handleBold()
            }}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Bold"
          >
            <Bold className="w-3 h-3" />
          </button>
        </div>
        <div
          ref={divRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onBlur={handleBlur}
          onPaste={handlePaste}
          className="px-3 py-2 text-sm outline-none min-h-[60px] leading-relaxed"
        />
      </div>
      <button
        type="button"
        onClick={onDelete}
        disabled={!canDelete}
        className="mt-8 p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

interface ParagraphEditorProps {
  value: BodyParagraph[]
  onChange: (v: BodyParagraph[]) => void
}

export default function ParagraphEditor({ value, onChange }: ParagraphEditorProps) {
  const addParagraph = () => {
    onChange([...value, { id: crypto.randomUUID(), html: '' }])
  }

  const updateParagraph = (id: string, html: string) => {
    onChange(value.map((p) => (p.id === id ? { ...p, html } : p)))
  }

  const deleteParagraph = (id: string) => {
    onChange(value.filter((p) => p.id !== id))
  }

  return (
    <div className="space-y-2">
      {value.map((para) => (
        <ParagraphItem
          key={para.id}
          para={para}
          canDelete={value.length > 1}
          onChange={(html) => updateParagraph(para.id, html)}
          onDelete={() => deleteParagraph(para.id)}
        />
      ))}
      <button
        type="button"
        onClick={addParagraph}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 cursor-pointer"
      >
        <Plus className="w-3 h-3" />
        Add paragraph
      </button>
    </div>
  )
}
