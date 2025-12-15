import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'

const MIN_WIDTH = 220
const MAX_WIDTH = 420
const MIN_SECTION_RATIO = 0.2

type DragMode = 'width' | 'split' | null

export function Sidebar() {
  const [width, setWidth] = useState(280)
  const [splitRatio, setSplitRatio] = useState(0.55)
  const dragModeRef = useRef<DragMode>(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(width)
  const sidebarRef = useRef<HTMLDivElement>(null)

  const onMouseMove = useCallback((event: MouseEvent) => {
    if (!dragModeRef.current) return
    event.preventDefault()

    if (dragModeRef.current === 'width') {
      const delta = event.clientX - startXRef.current
      const nextWidth = Math.min(Math.max(startWidthRef.current + delta, MIN_WIDTH), MAX_WIDTH)
      setWidth(nextWidth)
      return
    }

    if (dragModeRef.current === 'split') {
      const container = sidebarRef.current
      if (!container) return
      const { top, height } = container.getBoundingClientRect()
      if (!height) return
      const relativeY = event.clientY - top
      const ratio = Math.min(Math.max(relativeY / height, MIN_SECTION_RATIO), 1 - MIN_SECTION_RATIO)
      setSplitRatio(ratio)
    }
  }, [])

  const stopDragging = useCallback(() => {
    dragModeRef.current = null
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', stopDragging)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', stopDragging)
    }
  }, [onMouseMove, stopDragging])

  const startWidthDragging = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    dragModeRef.current = 'width'
    startXRef.current = event.clientX
    startWidthRef.current = width
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [width])

  const startSplitDragging = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    dragModeRef.current = 'split'
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }, [])

  return (
    <aside
      ref={sidebarRef}
      className="relative hidden h-full shrink-0 border-r border-slate-200 bg-slate-50 text-sm text-slate-700 md:flex"
      style={{ width }}
    >
      <div className="flex h-full w-full flex-col px-4 py-4">
        <section
          className="flex min-h-0 flex-col"
          style={{ flexBasis: `${splitRatio * 100}%`, flexGrow: 0, flexShrink: 0 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Shared</p>
          <div className="mt-3 flex-1 rounded-lg border border-dashed border-slate-300 bg-white/70 p-4 text-center text-slate-400">
            Shared folder structure
          </div>
        </section>

        <button
          type="button"
          aria-label="Resize sections"
          onMouseDown={startSplitDragging}
          className="my-2 h-2 w-full cursor-row-resize rounded-full border border-dashed border-slate-300 bg-white"
        >
          <span className="sr-only">Drag to resize sections</span>
        </button>

        <section
          className="flex min-h-0 flex-1 flex-col"
          style={{ flexBasis: `${(1 - splitRatio) * 100}%` }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Personal</p>
          <div className="mt-3 flex-1 rounded-lg border border-dashed border-slate-300 bg-white/70 p-4 text-center text-slate-400">
            Private folder structure
          </div>
        </section>
      </div>

      <button
        type="button"
        aria-label="Resize sidebar"
        onMouseDown={startWidthDragging}
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent"
      >
        <span className="sr-only">Drag to resize sidebar width</span>
      </button>
    </aside>
  )
}
