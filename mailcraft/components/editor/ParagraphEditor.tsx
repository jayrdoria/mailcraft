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

function htmlToParagraphs(html: string, existingIds: string[]): BodyParagraph[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const result: BodyParagraph[] = []
  Array.from(doc.body.children).forEach((node, i) => {
    const raw = node.tagName === 'P' ? node.innerHTML : node.outerHTML
    if (!raw || raw === '<br>' || !raw.trim()) return
    result.push({ id: existingIds[i] ?? crypto.randomUUID(), html: normalizeForEmail(raw) })
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
    onUpdate({ editor }) {
      const paragraphs = htmlToParagraphs(editor.getHTML(), idTracker.current)
      idTracker.current = paragraphs.map((p) => p.id)
      onChange(paragraphs)
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
