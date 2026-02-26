import { useEffect, useCallback, useRef, useState } from 'react'
import type { BoundingBox } from '../lib/store/session'

type Props = {
    src: string
    alt: string
    onClose: () => void
    /** Enable bounding-box drawing mode */
    allowBoxDrawing?: boolean
    /** Pre-existing box to display (image pixel coords) */
    initialBox?: BoundingBox | null
    /** Called when user finishes drawing a box */
    onBoxDrawn?: (box: BoundingBox) => void
}

/** Convert a screen point to image pixel coordinates */
function screenToImageCoords(
    clientX: number,
    clientY: number,
    imgEl: HTMLImageElement,
): { x: number; y: number } {
    const rect = imgEl.getBoundingClientRect()
    const relX = (clientX - rect.left) / rect.width
    const relY = (clientY - rect.top) / rect.height
    return {
        x: Math.round(Math.max(0, Math.min(relX * imgEl.naturalWidth, imgEl.naturalWidth))),
        y: Math.round(Math.max(0, Math.min(relY * imgEl.naturalHeight, imgEl.naturalHeight))),
    }
}

export function ImageModal({
    src, alt, onClose,
    allowBoxDrawing = false,
    initialBox = null,
    onBoxDrawn,
}: Props) {
    const backdropRef = useRef<HTMLDivElement>(null)
    const imgRef = useRef<HTMLImageElement>(null)

    // Zoom state
    const [scale, setScale] = useState(1)

    // Box drawing state (image pixel coords)
    const [box, setBox] = useState<BoundingBox | null>(initialBox)
    const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
    const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null)

    // Close on Escape
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        },
        [onClose],
    )

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown)
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.body.style.overflow = ''
        }
    }, [handleKeyDown])

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === backdropRef.current) onClose()
    }

    // Zoom with scroll wheel
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        setScale((prev) => Math.min(Math.max(prev + delta, 1), 5))
    }

    // Mouse handlers — box drawing only
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0 || !allowBoxDrawing || !imgRef.current) return
        e.preventDefault()
        const pt = screenToImageCoords(e.clientX, e.clientY, imgRef.current)
        setDrawStart(pt)
        setDrawCurrent(pt)
        setBox(null)
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!drawStart || !imgRef.current) return
        const pt = screenToImageCoords(e.clientX, e.clientY, imgRef.current)
        setDrawCurrent(pt)
    }

    const handleMouseUp = () => {
        if (!drawStart || !drawCurrent) return

        const x1 = Math.min(drawStart.x, drawCurrent.x)
        const y1 = Math.min(drawStart.y, drawCurrent.y)
        const x2 = Math.max(drawStart.x, drawCurrent.x)
        const y2 = Math.max(drawStart.y, drawCurrent.y)

        if (x2 - x1 > 5 && y2 - y1 > 5) {
            const newBox: BoundingBox = [x1, y1, x2, y2]
            setBox(newBox)
            onBoxDrawn?.(newBox)
        }

        setDrawStart(null)
        setDrawCurrent(null)
    }

    // Reset zoom on double-click
    const handleDoubleClick = () => {
        setScale(1)
    }

    // Box to render (in-progress or finished)
    const activeBox: BoundingBox | null = drawStart && drawCurrent
        ? [
            Math.min(drawStart.x, drawCurrent.x),
            Math.min(drawStart.y, drawCurrent.y),
            Math.max(drawStart.x, drawCurrent.x),
            Math.max(drawStart.y, drawCurrent.y),
        ]
        : box

    return (
        <div
            ref={backdropRef}
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
            {/* Close button */}
            <button
                type="button"
                onClick={onClose}
                className="absolute right-5 top-5 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
                aria-label="Close"
            >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {/* Hint bar */}
            <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-xs text-white/60">
                {allowBoxDrawing
                    ? 'Scroll to zoom · Drag to draw bounding box · Double-click to reset zoom'
                    : 'Scroll to zoom · Double-click to reset zoom'}
            </div>

            {/* Image container */}
            <div
                className={allowBoxDrawing ? 'cursor-crosshair' : 'cursor-default'}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onDoubleClick={handleDoubleClick}
                style={{ userSelect: 'none' }}
            >
                <div
                    style={{
                        position: 'relative',
                        display: 'inline-block',
                        transform: `scale(${scale})`,
                        transition: 'transform 75ms',
                    }}
                >
                    <img
                        ref={imgRef}
                        src={src}
                        alt={alt}
                        draggable={false}
                        className="block max-h-[85vh] max-w-[85vw] rounded-xl shadow-2xl"
                    />

                    {/* Bounding box overlay */}
                    {activeBox && imgRef.current && (
                        <svg
                            style={{
                                position: 'absolute',
                                inset: 0,
                                width: '100%',
                                height: '100%',
                                pointerEvents: 'none',
                            }}
                            viewBox={`0 0 ${imgRef.current.naturalWidth} ${imgRef.current.naturalHeight}`}
                            preserveAspectRatio="none"
                        >
                            <rect
                                x={activeBox[0]}
                                y={activeBox[1]}
                                width={activeBox[2] - activeBox[0]}
                                height={activeBox[3] - activeBox[1]}
                                fill="rgba(59, 130, 246, 0.15)"
                                stroke="rgb(59, 130, 246)"
                                strokeWidth={Math.max(2, 2 / scale)}
                            />
                        </svg>
                    )}
                </div>
            </div>
        </div>
    )
}
