'use client'

import { useRef, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { Link as TiptapLink } from '@tiptap/extension-link'
import { Bold, Italic, Underline as UnderlineIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// Extend Link to preserve inline style attribute (needed for email-safe link styles)
const EmailLink = TiptapLink.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: (el) => el.getAttribute('style'),
        renderHTML: (attrs) => (attrs.style ? { style: attrs.style } : {}),
      },
    }
  },
})

function wrapForEditor(html: string): string {
  const trimmed = html.trim()
  if (!trimmed) return '<p></p>'
  if (/^<(p|div|ul|ol|h[1-6])\b/i.test(trimmed)) return trimmed
  return `<p>${trimmed}</p>`
}

function unwrapFromEditor(html: string): string {
  // Single <p> — strip wrapper to preserve stored format
  const match = html.match(/^<p[^>]*>([\s\S]*)<\/p>$/i)
  if (match) return match[1]
  return html
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

interface RichTextEditorProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const valueRef = useRef(value)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        blockquote: false,
        code: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
        strike: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      Underline,
      EmailLink.configure({
        openOnClick: false,
        autolink: false,
      }),
    ],
    content: wrapForEditor(value),
    onUpdate({ editor }) {
      const newValue = unwrapFromEditor(editor.getHTML())
      valueRef.current = newValue
      onChange(newValue)
    },
    editorProps: {
      attributes: {
        class: 'outline-none px-3 py-2 text-sm leading-relaxed',
      },
      handleKeyDown(_view, event) {
        // Prevent new paragraphs — richtext is single-block
        if (event.key === 'Enter') return true
      },
    },
  })

  // Sync content when value is updated externally (e.g. after store init on page load)
  useEffect(() => {
    if (!editor || value === valueRef.current) return
    valueRef.current = value
    editor.commands.setContent(wrapForEditor(value), false)
  }, [editor, value])

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
      </div>
      <div
        className={cn(
          '[&_.tiptap_a]:underline [&_.tiptap_a]:text-blue-400 [&_.tiptap_a]:cursor-pointer',
          !value && 'relative',
        )}
      >
        {!value && placeholder && (
          <span className="absolute top-2 left-3 text-sm text-muted-foreground pointer-events-none">
            {placeholder}
          </span>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
