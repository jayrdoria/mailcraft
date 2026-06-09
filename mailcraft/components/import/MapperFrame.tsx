'use client'

import { useEffect, useRef } from 'react'

export interface ClickedElement {
  mcId: string
  elementType: 'text' | 'image' | 'link'
  preview: string
  tag: string
}

interface MapperFrameProps {
  instrumentedHtml: string
  mappedIds: string[]
  onElementClick: (element: ClickedElement) => void
}

// Appends a self-contained interaction script to the HTML before loading in iframe.
// The script adds hover highlights and click → postMessage for every [data-mc-id] element.
function buildMapperHtml(html: string): string {
  const script = `<script>
(function () {
  var HOVER  = '2px solid rgba(99,102,241,0.7)';
  var MAPPED = '2px solid rgba(34,197,94,0.8)';
  var mapped = new Set();

  function refreshOutlines() {
    document.querySelectorAll('[data-mc-id]').forEach(function (el) {
      var id = el.getAttribute('data-mc-id');
      el.style.outline       = mapped.has(id) ? MAPPED : '';
      el.style.outlineOffset = mapped.has(id) ? '2px'  : '';
    });
  }

  document.querySelectorAll('[data-mc-id]').forEach(function (el) {
    el.style.cursor = 'pointer';

    el.addEventListener('mouseenter', function () {
      if (!mapped.has(el.getAttribute('data-mc-id'))) {
        el.style.outline       = HOVER;
        el.style.outlineOffset = '2px';
      }
    });

    el.addEventListener('mouseleave', function () {
      if (!mapped.has(el.getAttribute('data-mc-id'))) {
        el.style.outline       = '';
        el.style.outlineOffset = '';
      }
    });

    el.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var tag     = el.tagName.toLowerCase();
      var mcId    = el.getAttribute('data-mc-id');
      var type    = 'text';
      var preview = (el.textContent || '').trim().slice(0, 80);
      if (tag === 'img')  { type = 'image'; preview = el.getAttribute('src')  || ''; }
      if (tag === 'a')    { type = 'link';  preview = el.getAttribute('href') || ''; }
      window.parent.postMessage(
        { type: 'MC_ELEMENT_CLICK', mcId: mcId, elementType: type, preview: preview, tag: tag },
        '*'
      );
    });
  });

  // Parent notifies iframe whenever the mapped-IDs set changes
  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'MC_UPDATE_MAPPED') {
      mapped = new Set(e.data.mappedIds);
      refreshOutlines();
    }
  });
})();
</script>`

  // Prefer inserting before </body>; fall back to appending
  return html.includes('</body>')
    ? html.replace('</body>', script + '</body>')
    : html + script
}

export default function MapperFrame({ instrumentedHtml, mappedIds, onElementClick }: MapperFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const srcDoc    = buildMapperHtml(instrumentedHtml)

  // Receive click events from the iframe
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type !== 'MC_ELEMENT_CLICK') return
      onElementClick({
        mcId:        e.data.mcId,
        elementType: e.data.elementType,
        preview:     e.data.preview,
        tag:         e.data.tag,
      })
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onElementClick])

  // Push mapped-ID updates to the iframe after each change
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'MC_UPDATE_MAPPED', mappedIds },
      '*'
    )
  }, [mappedIds])

  function handleLoad() {
    // Send initial mapped state once iframe is ready
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'MC_UPDATE_MAPPED', mappedIds },
      '*'
    )
  }

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      onLoad={handleLoad}
      className="w-full h-full border-0"
      title="Email HTML Preview"
    />
  )
}
