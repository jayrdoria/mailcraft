'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import { Monitor, Tablet, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEditorStore } from '@/lib/stores/editorStore'

/** Inject a script into the preview srcDoc that prevents all link navigation. */
function addPreviewGuard(html: string): string {
  const guard = `<script>document.addEventListener('click',function(e){var a=e.target.closest('a');if(a){e.preventDefault();}},true);<\/script>`
  const idx = html.indexOf('</head>')
  if (idx !== -1) return html.slice(0, idx) + guard + html.slice(idx)
  return guard + html
}

const DEVICE_WIDTHS = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
}

const DEVICE_ICONS = {
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
} as const

export default function LivePreview() {
  const device = useEditorStore((s) => s.device)
  const setDevice = useEditorStore((s) => s.setDevice)
  const renderedHtml = useEditorStore((s) => s.renderedHtml)
  const iframeWrapperRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (!iframeWrapperRef.current) return
      gsap.to(iframeWrapperRef.current, {
        maxWidth: DEVICE_WIDTHS[device],
        duration: 0.3,
        ease: 'power2.inOut',
      })
    },
    { scope: iframeWrapperRef, dependencies: [device] }
  )

  return (
    <div className="flex flex-col h-full">
      {/* Device toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-card shrink-0">
        {(Object.keys(DEVICE_WIDTHS) as Array<keyof typeof DEVICE_WIDTHS>).map((d) => {
          const Icon = DEVICE_ICONS[d]
          return (
            <button
              key={d}
              onClick={() => setDevice(d)}
              title={d.charAt(0).toUpperCase() + d.slice(1)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-colors cursor-pointer',
                device === d
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline capitalize">{d}</span>
            </button>
          )
        })}
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-auto bg-muted/30 p-4 flex justify-center">
        <div
          ref={iframeWrapperRef}
          className="w-full transition-none"
          style={{ maxWidth: DEVICE_WIDTHS[device] }}
        >
          {renderedHtml ? (
            <iframe
              srcDoc={addPreviewGuard(renderedHtml)}
              className="w-full border-0 rounded-md shadow-sm"
              style={{ minHeight: '600px' }}
              title="Email preview"
              sandbox="allow-same-origin allow-scripts"
              onLoad={(e) => {
                const iframe = e.currentTarget
                try {
                  const body = iframe.contentDocument?.body
                  if (body) iframe.style.height = body.scrollHeight + 'px'
                } catch { /* cross-origin guard */ }
              }}
            />
          ) : (
            <div className="flex items-center justify-center min-h-[400px] rounded-md border border-dashed">
              <p className="text-sm text-muted-foreground">
                Preview will appear here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
