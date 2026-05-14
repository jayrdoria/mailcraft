'use client'

import { useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { Bold, Italic, Underline as UnderlineIcon, List, AlignCenter, AlignJustify } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BodyParagraph } from '@/lib/types/template'

function paragraphsToHtml(paragraphs: BodyParagraph[]): string {
  if (!paragraphs.length) return '<p></p>'
  return paragraphs
    .map((p) => {
      const html = p.html.trim()
      if (html.startsWith('<ul') || html.startsWith('<ol')) return html
      return `<p>${html}</p>`
    })
    .join('')
}

// Ensures semantic tags carry inline styles for email client compatibility
function normalizeForEmail(html: string): string {
  return html
    .replace(/<strong(?![^>]*style)[^>]*>/g, '<strong style="font-weight:700">')
    .replace(/<em(?![^>]*style)[^>]*>/g, '<em style="font-style:italic">')
    .replace(/<u\b(?![^>]*style)[^>]*>/g, '<u style="text-decoration:underline">')
}

function isWordHtml(html: string): boolean {
  return html.includes('mso-') || html.includes('<o:p') || html.includes('urn:schemas-microsoft-com')
}

function isGoogleSheetsHtml(html: string): boolean {
  return (
    html.includes('google-sheets-html-origin') ||
    html.includes('data-sheets-value') ||
    html.includes('sheets.googleusercontent.com') ||
    // Sheets always emits this exact padding on td elements
    html.includes('padding:2px 3px 2px 3px') ||
    html.includes('padding: 2px 3px 2px 3px')
  )
}

function cellHasBold(cell: Element): boolean {
  // Check td-level style first
  if (/font-weight\s*:\s*(bold|700)/i.test(cell.getAttribute('style') ?? '')) return true
  // Fall back to any child element with explicit bold style
  return Array.from(cell.querySelectorAll('[style]')).some((el) =>
    /font-weight\s*:\s*(bold|700)/i.test(el.getAttribute('style') ?? '')
  )
}

// Converts Google Sheets clipboard HTML (table structure) into clean <p> tags,
// wrapping bold cells in <strong> since Sheets uses td-level font-weight instead of <strong>.
function convertSheetsToParagraphs(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const rows = Array.from(doc.querySelectorAll('tr'))
  if (!rows.length) return html

  return rows
    .map((row) => {
      const cells = Array.from(row.querySelectorAll('td, th'))
      const cellTexts = cells.map((cell) => {
        const text = (cell.textContent ?? '').replace(/ /g, '').trim()
        if (!text) return ''
        return cellHasBold(cell) ? `<strong style="font-weight:700">${text}</strong>` : text
      })
      const line = cellTexts.filter(Boolean).join(' ')
      return line ? `<p>${line}</p>` : '<p></p>'
    })
    .join('')
}

function isEmptyContent(raw: string): boolean {
  if (!raw || raw === '<br>' || !raw.trim()) return true
  // Strip tags and &nbsp; — if nothing remains, treat as empty (handles Word-pasted blank lines)
  const text = raw.replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, '').trim()
  return text === ''
}

function htmlToParagraphs(html: string, existingIds: string[]): BodyParagraph[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const result: BodyParagraph[] = []
  Array.from(doc.body.children).forEach((node, i) => {
    const raw = node.tagName === 'P' ? node.innerHTML : node.outerHTML
    result.push({ id: existingIds[i] ?? crypto.randomUUID(), html: isEmptyContent(raw) ? '' : normalizeForEmail(raw) })
  })
  return result
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      title={title}
      className={cn(
        'p-1 rounded transition-colors',
        active
          ? 'bg-accent text-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

interface ParagraphEditorProps {
  value: BodyParagraph[]
  onChange: (v: BodyParagraph[]) => void
  alignment?: 'center' | 'left'
  onAlignmentChange?: (alignment: 'center' | 'left') => void
}

export default function ParagraphEditor({ value, onChange, alignment = 'center', onAlignmentChange }: ParagraphEditorProps) {
  const idTracker = useRef<string[]>(value.map((p) => p.id))
  const isWordPaste = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        blockquote: false,
        code: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
        strike: false,
      }),
      Underline,
    ],
    content: paragraphsToHtml(value),
    // Sheets: intercept before TipTap, convert table rows → clean <p> with bold preserved.
    // Word: let TipTap handle natively (preserves bold), flag the paste so onUpdate strips blank lines.
    onCreate({ editor }) {
      editor.view.dom.addEventListener('paste', (e: Event) => {
        const html = (e as ClipboardEvent).clipboardData?.getData('text/html')
        if (!html) return

        if (isGoogleSheetsHtml(html)) {
          e.preventDefault()
          e.stopImmediatePropagation()
          const converted = convertSheetsToParagraphs(html)
          setTimeout(() => editor.commands.insertContent(converted), 0)
          return
        }

        if (isWordHtml(html)) {
          // Don't intercept — TipTap's native handler preserves bold correctly.
          // Flag it so onUpdate can strip the blank lines Word inserts.
          isWordPaste.current = true
        }
      }, true)
    },
    onUpdate({ editor }) {
      const paragraphs = htmlToParagraphs(editor.getHTML(), idTracker.current)
      idTracker.current = paragraphs.map((p) => p.id)
      onChange(paragraphs)

      if (isWordPaste.current) {
        isWordPaste.current = false
        const hasEmpty = paragraphs.some((p) => p.html === '')
        if (hasEmpty) {
          const collapsed = paragraphs.filter((p) => p.html !== '')
          idTracker.current = collapsed.map((p) => p.id)
          onChange(collapsed)
          queueMicrotask(() =>
            editor.commands.setContent(paragraphsToHtml(collapsed), false)
          )
        }
      }
    },
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[120px] px-3 py-2 text-sm leading-relaxed',
      },
    },
  })

  if (!editor) return null

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="flex items-center gap-0.5 px-2 py-1 border-b bg-muted/40">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="w-3 h-3" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="w-3 h-3" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="Underline"
        >
          <UnderlineIcon className="w-3 h-3" />
        </ToolbarButton>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet list"
        >
          <List className="w-3 h-3" />
        </ToolbarButton>
        {onAlignmentChange && (
          <>
            <div className="w-px h-4 bg-border mx-1" />
            <ToolbarButton
              onClick={() => onAlignmentChange('center')}
              active={alignment === 'center'}
              title="Center align"
            >
              <AlignCenter className="w-3 h-3" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => onAlignmentChange('left')}
              active={alignment === 'left'}
              title="Left / Justify"
            >
              <AlignJustify className="w-3 h-3" />
            </ToolbarButton>
          </>
        )}
      </div>
      <div className="[&_.tiptap_p]:mb-1 [&_.tiptap_ul]:pl-5 [&_.tiptap_ul]:my-1 [&_.tiptap_ul]:list-disc [&_.tiptap_ol]:pl-5 [&_.tiptap_ol]:my-1 [&_.tiptap_ol]:list-decimal [&_.tiptap_li]:mb-0.5">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
