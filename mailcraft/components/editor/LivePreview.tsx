'use client'

import { useRef, useEffect, useState } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/lib/gsap'
import { Monitor, Tablet, Smartphone, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEditorStore } from '@/lib/stores/editorStore'

// Injected into the preview iframe: blocks link navigation, and makes any
// [data-mcb-id] element (a custom block) hover-highlight + click-to-select,
// reporting the selection to the parent via postMessage. The parent pushes the
// current selection back with MCB_SET_SELECTED so the outline persists.
function buildCanvasScript(): string {
  return `<style>
.mcb-dz-td{padding:0!important;border:0!important;height:0;line-height:0;font-size:0;}
.mcb-dz-line{height:0;overflow:hidden;}
body.mcb-dragging .mcb-dz-line{height:20px;margin:3px 10px;border:2px dashed rgba(99,102,241,.6);border-radius:4px;background:rgba(99,102,241,.08);}
body.mcb-dragging .mcb-dz.mcb-over .mcb-dz-line{border-style:solid;background:rgba(99,102,241,.30);}
<\/style>
<script>
(function(){
  var SEL='2px solid #6366f1', HOV='2px dashed rgba(99,102,241,0.55)';
  var selectedId=null, pointerDragId=null, pointerZone=null;
  function tgt(el){ return el.querySelector('td') || el; }
  function blocks(){ return document.querySelectorAll('[data-mcb-id]'); }
  function zones(){ return document.querySelectorAll('[data-mcb-drop]'); }
  // Report body height to the parent so the iframe box grows when drop zones
  // expand during a drag (otherwise the bottom zones are clipped/unreachable).
  function reportHeight(){ requestAnimationFrame(function(){ window.parent.postMessage({type:'MCB_HEIGHT',height:document.body.scrollHeight},'*'); }); }
  function paint(){
    blocks().forEach(function(el){
      var t=tgt(el), on=el.getAttribute('data-mcb-id')===selectedId;
      t.style.outline=on?SEL:''; t.style.outlineOffset=on?'-2px':'';
    });
  }
  function clearOver(){ zones().forEach(function(z){ z.classList.remove('mcb-over'); }); }
  function endDrag(){ document.body.classList.remove('mcb-dragging'); clearOver(); }

  blocks().forEach(function(el){
    el.style.cursor='pointer';
    var cell=tgt(el);
    cell.style.position='relative';
    // Prevent inner images from hijacking a drag (imgs are draggable by default).
    var imgs=cell.querySelectorAll('img');
    for(var k=0;k<imgs.length;k++){ imgs[k].setAttribute('draggable','false'); }

    // Drag handle — appears on hover. Uses POINTER (mouse) events, not HTML5
    // drag, which is unreliable for elements inside a table / sandboxed iframe.
    var h=document.createElement('div');
    h.title='Drag to move';
    h.innerHTML='\\u2630';
    h.style.cssText='position:absolute;top:4px;right:4px;z-index:5;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff;background:#6366f1;border-radius:4px;cursor:grab;opacity:0;transition:opacity .1s;box-shadow:0 1px 3px rgba(0,0,0,.35);user-select:none;-webkit-user-select:none;';
    cell.appendChild(h);

    el.addEventListener('mouseenter',function(){ h.style.opacity='1'; if(el.getAttribute('data-mcb-id')!==selectedId){ cell.style.outline=HOV; cell.style.outlineOffset='-2px'; }});
    el.addEventListener('mouseleave',function(){ if(!pointerDragId){ h.style.opacity='0'; } if(el.getAttribute('data-mcb-id')!==selectedId){ cell.style.outline=''; cell.style.outlineOffset=''; }});
    el.addEventListener('click',function(e){ e.preventDefault(); e.stopPropagation(); window.parent.postMessage({type:'MCB_SELECT',id:el.getAttribute('data-mcb-id')},'*'); });

    h.addEventListener('click',function(e){ e.stopPropagation(); });
    h.addEventListener('mousedown',function(e){
      e.preventDefault(); e.stopPropagation();
      pointerDragId=el.getAttribute('data-mcb-id'); pointerZone=null;
      h.style.cursor='grabbing';
      document.body.classList.add('mcb-dragging'); reportHeight();
      window.parent.postMessage({type:'MCB_BLOCK_DRAG_START'},'*');
    });
  });

  // Palette drop zones (HTML5 drag from the parent sidebar).
  zones().forEach(function(z){
    z.addEventListener('dragover',function(e){ e.preventDefault(); if(e.dataTransfer){ e.dataTransfer.dropEffect='copy'; } clearOver(); z.classList.add('mcb-over'); });
    z.addEventListener('dragleave',function(){ z.classList.remove('mcb-over'); });
    z.addEventListener('drop',function(e){ e.preventDefault(); var idx=parseInt(z.getAttribute('data-mcb-drop'),10); window.parent.postMessage({type:'MCB_DROP',index:idx},'*'); endDrag(); });
  });

  // Pointer-based block reorder: while a handle is held, highlight the nearest
  // drop zone to the cursor; on release, ask the parent to move the block there.
  function nearestZone(y){
    var zs=zones(), best=null, bestD=Infinity;
    for(var i=0;i<zs.length;i++){ var r=zs[i].getBoundingClientRect(); var c=r.top+r.height/2; var d=Math.abs(c-y); if(d<bestD){ bestD=d; best=zs[i]; } }
    return best;
  }
  document.addEventListener('mousemove',function(e){
    if(!pointerDragId) return;
    e.preventDefault(); clearOver();
    pointerZone=nearestZone(e.clientY);
    if(pointerZone) pointerZone.classList.add('mcb-over');
    // Stream cursor position so the parent can auto-scroll near the edges.
    window.parent.postMessage({type:'MCB_POINTER',clientY:e.clientY},'*');
  });
  document.addEventListener('mouseup',function(){
    if(!pointerDragId) return;
    var id=pointerDragId; pointerDragId=null;
    if(pointerZone){ var idx=parseInt(pointerZone.getAttribute('data-mcb-drop'),10); window.parent.postMessage({type:'MCB_MOVE',id:id,toIndex:idx},'*'); }
    pointerZone=null; endDrag(); reportHeight();
    window.parent.postMessage({type:'MCB_BLOCK_DRAG_END'},'*');
  });

  document.addEventListener('click',function(e){ var a=e.target.closest&&e.target.closest('a'); if(a){ e.preventDefault(); } },true);
  window.addEventListener('message',function(e){
    if(!e.data) return;
    if(e.data.type==='MCB_SET_SELECTED'){ selectedId=e.data.id; paint(); }
    else if(e.data.type==='MCB_DRAG_START'){ document.body.classList.add('mcb-dragging'); reportHeight(); }
    else if(e.data.type==='MCB_DRAG_END'){ endDrag(); reportHeight(); }
    else if(e.data.type==='MCB_CANCEL'){ if(pointerDragId){ pointerDragId=null; pointerZone=null; endDrag(); reportHeight(); window.parent.postMessage({type:'MCB_BLOCK_DRAG_END'},'*'); } }
  });
})();
<\/script>`
}

function withCanvasScript(html: string): string {
  const script = buildCanvasScript()
  return html.includes('</body>') ? html.replace('</body>', script + '</body>') : html + script
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
  const activeBlockId = useEditorStore((s) => s.activeBlockId)
  const setActiveBlock = useEditorStore((s) => s.setActiveBlock)
  const setSidebarTab = useEditorStore((s) => s.setSidebarTab)
  const draggingBlockType = useEditorStore((s) => s.draggingBlockType)
  const iframeWrapperRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollDir = useRef(0)
  // True while an existing block is being pointer-dragged inside the iframe.
  const [blockDragging, setBlockDragging] = useState(false)

  // Palette drags (native DnD from the sidebar) use the overlay edge strips +
  // spacers. Pointer block-drags stream the cursor position instead. Both share
  // the same rAF auto-scroll loop.
  const paletteDragging = draggingBlockType !== null
  const autoScrollActive = paletteDragging || blockDragging

  // Receive events from inside the preview iframe: block selection + palette drop.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const data = e.data
      if (data?.type === 'MCB_SELECT') {
        setActiveBlock(data.id)
        setSidebarTab('blocks')
      } else if (data?.type === 'MCB_DROP') {
        // Read the dragging type fresh (avoids stale closure) and insert at the zone index.
        const state = useEditorStore.getState()
        const type = state.draggingBlockType
        if (type) state.addBlock(type, data.index)
        state.setDraggingBlockType(null)
      } else if (data?.type === 'MCB_HEIGHT' && typeof data.height === 'number') {
        // Grow/shrink the iframe box as drop zones expand/collapse during a drag,
        // so the bottom-most zones aren't clipped out of reach.
        if (iframeRef.current) iframeRef.current.style.height = data.height + 'px'
      } else if (data?.type === 'MCB_MOVE') {
        // Reorder an existing block. data.toIndex is a drop-zone index in the
        // ORIGINAL layoutOrder; adjust for the item being removed from earlier.
        const state = useEditorStore.getState()
        const fromIndex = state.layoutOrder.findIndex((it) => it.kind === 'block' && it.id === data.id)
        if (fromIndex !== -1) {
          const to = data.toIndex > fromIndex ? data.toIndex - 1 : data.toIndex
          state.moveLayoutItem(fromIndex, to)
        }
      } else if (data?.type === 'MCB_BLOCK_DRAG_START') {
        setBlockDragging(true)
      } else if (data?.type === 'MCB_BLOCK_DRAG_END') {
        setBlockDragging(false)
        scrollDir.current = 0
      } else if (data?.type === 'MCB_POINTER') {
        // Pointer block-drag: convert the iframe-local cursor Y into a position
        // within the scroll viewport and auto-scroll when near an edge.
        const sc = scrollRef.current
        const ifr = iframeRef.current
        if (sc && ifr) {
          const cRect = sc.getBoundingClientRect()
          const iRect = ifr.getBoundingClientRect()
          const cursorY = iRect.top - cRect.top + data.clientY
          const EDGE = 64
          scrollDir.current = cursorY < EDGE ? -1 : cursorY > cRect.height - EDGE ? 1 : 0
        }
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [setActiveBlock, setSidebarTab])

  // Reveal / hide drop zones in the iframe as a palette drag starts / ends.
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: draggingBlockType ? 'MCB_DRAG_START' : 'MCB_DRAG_END' },
      '*'
    )
  }, [draggingBlockType])

  // Safety net: a pointer block-drag lives inside the iframe, so if the mouse is
  // released outside the preview the iframe never sees mouseup. Cancel it here.
  useEffect(() => {
    function onUp() {
      iframeRef.current?.contentWindow?.postMessage({ type: 'MCB_CANCEL' }, '*')
    }
    window.addEventListener('mouseup', onUp)
    return () => window.removeEventListener('mouseup', onUp)
  }, [])

  // Push the current selection into the iframe so the outline stays in sync
  // whether the block was selected on the canvas or in the sidebar list.
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'MCB_SET_SELECTED', id: activeBlockId }, '*')
  }, [activeBlockId, renderedHtml])

  // Auto-scroll the preview while dragging: neither native DnD nor a pointer drag
  // scrolls on its own, so off-screen drop zones are unreachable. scrollDir is set
  // by the edge strips (palette drag) or MCB_POINTER (block drag); this rAF loop
  // applies it while any drag is active.
  useEffect(() => {
    if (!autoScrollActive) {
      scrollDir.current = 0
      return
    }
    let raf = 0
    const step = () => {
      const el = scrollRef.current
      if (el && scrollDir.current !== 0) el.scrollTop += scrollDir.current * 14
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => {
      scrollDir.current = 0
      cancelAnimationFrame(raf)
    }
  }, [autoScrollActive])

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

      {/* Preview area — relative viewport so edge auto-scroll strips can overlay it */}
      <div className="flex-1 relative overflow-hidden bg-muted/30">
        <div
          ref={scrollRef}
          className="absolute inset-0 overflow-auto flex flex-col items-center px-4 py-4"
        >
        {/* Drag-time spacers give the first/last drop zones room to clear the edge
            auto-scroll strips. Real elements (not padding) so their height is
            always counted in the scroll range — padding-bottom on a scroll flex
            container is dropped by many browsers. */}
        {paletteDragging &&<div aria-hidden className="shrink-0 w-full h-16" />}
        <div
          ref={iframeWrapperRef}
          className="w-full shrink-0 transition-none"
          style={{ maxWidth: DEVICE_WIDTHS[device] }}
        >
          {renderedHtml ? (
            <iframe
              ref={iframeRef}
              srcDoc={withCanvasScript(renderedHtml)}
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
                // Re-sync selection after each reload (srcDoc changes on every edit).
                iframe.contentWindow?.postMessage({ type: 'MCB_SET_SELECTED', id: activeBlockId }, '*')
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
        {paletteDragging &&<div aria-hidden className="shrink-0 w-full h-24" />}
        </div>

        {/* Edge auto-scroll strips — active only during a drag so off-screen
            drop zones become reachable. Overlay the scroll viewport edges. */}
        {paletteDragging &&(
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); scrollDir.current = -1 }}
              onDragLeave={() => { scrollDir.current = 0 }}
              onDrop={(e) => { e.preventDefault(); scrollDir.current = 0 }}
              className="absolute top-0 inset-x-0 h-14 z-20 flex items-start justify-center pt-1
                         bg-gradient-to-b from-primary/20 to-transparent"
            >
              <ChevronUp className="w-4 h-4 text-primary/70 animate-pulse pointer-events-none" />
            </div>
            <div
              onDragOver={(e) => { e.preventDefault(); scrollDir.current = 1 }}
              onDragLeave={() => { scrollDir.current = 0 }}
              onDrop={(e) => { e.preventDefault(); scrollDir.current = 0 }}
              className="absolute bottom-0 inset-x-0 h-14 z-20 flex items-end justify-center pb-1
                         bg-gradient-to-t from-primary/20 to-transparent"
            >
              <ChevronDown className="w-4 h-4 text-primary/70 animate-pulse pointer-events-none" />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
