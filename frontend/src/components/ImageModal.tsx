import { useEffect, useCallback, useRef, useState } from 'react'
import type { BoundingBox, PromptPoint } from '../lib/store/session'

type Props = {
    src: string
    alt: string
    onClose: () => void
    /** Enable bounding-box drawing */
    allowBoxDrawing?: boolean
    /** Enable point placing */
    allowPointPlacing?: boolean
    /** Pre-existing box (image pixel coords) */
    initialBox?: BoundingBox | null
    /** Pre-existing points */
    initialPoints?: PromptPoint[]
    /** Called when user finishes drawing a box */
    onBoxDrawn?: (box: BoundingBox) => void
    /** Called when user places a point */
    onPointPlaced?: (point: PromptPoint) => void
}

const DRAG_THRESHOLD = 5 // px – movement below this is a click, not a drag

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
    allowPointPlacing = false,
    initialBox = null,
    initialPoints = [],
    onBoxDrawn,
    onPointPlaced,
}: Props) {
    const backdropRef = useRef<HTMLDivElement>(null)
    const imgRef = useRef<HTMLImageElement>(null)

    // Zoom
    const [scale, setScale] = useState(1)

    // Box drawing state
    const [box, setBox] = useState<BoundingBox | null>(initialBox)
    const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
    const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null)
    const mouseDownPos = useRef<{ x: number; y: number } | null>(null)
    const wasDragging = useRef(false)

    // Points state (local copy for display)
    const [points, setPoints] = useState<PromptPoint[]>(initialPoints)

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

    // Zoom
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        setScale((prev) => Math.min(Math.max(prev + delta, 1), 5))
    }

    // Mouse handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0 || !imgRef.current) return
        if (!allowBoxDrawing && !allowPointPlacing) return
        e.preventDefault()

        mouseDownPos.current = { x: e.clientX, y: e.clientY }
        wasDragging.current = false

        if (allowBoxDrawing) {
            const pt = screenToImageCoords(e.clientX, e.clientY, imgRef.current)
            setDrawStart(pt)
            setDrawCurrent(pt)
            setBox(null)
        }
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!mouseDownPos.current || !imgRef.current) return

        // Check if we've moved enough to count as a drag
        const dx = e.clientX - mouseDownPos.current.x
        const dy = e.clientY - mouseDownPos.current.y
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
            wasDragging.current = true
        }

        if (allowBoxDrawing && drawStart) {
            const pt = screenToImageCoords(e.clientX, e.clientY, imgRef.current)
            setDrawCurrent(pt)
        }
    }

    const handleMouseUp = (e: React.MouseEvent) => {
        if (!mouseDownPos.current) return

        // If it was a click (not a drag) and points are enabled → add point
        if (!wasDragging.current && allowPointPlacing && imgRef.current) {
            const pt = screenToImageCoords(e.clientX, e.clientY, imgRef.current)
            const label: 0 | 1 = e.shiftKey ? 0 : 1 // Shift+click = negative
            const newPoint: PromptPoint = { x: pt.x, y: pt.y, label }
            setPoints((prev) => [...prev, newPoint])
            onPointPlaced?.(newPoint)

            // Cancel any in-progress box draw since it was just a click
            setDrawStart(null)
            setDrawCurrent(null)
        }

        // If it was a drag and box drawing is enabled → finalize box
        if (wasDragging.current && allowBoxDrawing && drawStart && drawCurrent) {
            const x1 = Math.min(drawStart.x, drawCurrent.x)
            const y1 = Math.min(drawStart.y, drawCurrent.y)
            const x2 = Math.max(drawStart.x, drawCurrent.x)
            const y2 = Math.max(drawStart.y, drawCurrent.y)

            if (x2 - x1 > 5 && y2 - y1 > 5) {
                const newBox: BoundingBox = [x1, y1, x2, y2]
                setBox(newBox)
                onBoxDrawn?.(newBox)
            }
        }

        mouseDownPos.current = null
        setDrawStart(null)
        setDrawCurrent(null)
    }

    // Reset zoom on double-click
    const handleDoubleClick = () => {
        setScale(1)
    }

    // Box to render (in-progress or finished)
    const activeBox: BoundingBox | null = drawStart && drawCurrent && wasDragging.current
        ? [
            Math.min(drawStart.x, drawCurrent.x),
            Math.min(drawStart.y, drawCurrent.y),
            Math.max(drawStart.x, drawCurrent.x),
            Math.max(drawStart.y, drawCurrent.y),
        ]
        : box

    const isInteractive = allowBoxDrawing || allowPointPlacing

    // Build hint text
    const hints: string[] = ['Scroll to zoom']
    if (allowBoxDrawing) hints.push('Drag to draw box')
    if (allowPointPlacing) hints.push('Click = positive point', 'Shift+click = negative')
    hints.push('Double-click to reset zoom')

    // Point radius scales with image size
    const pointRadius = imgRef.current
        ? Math.max(6, Math.min(imgRef.current.naturalWidth, imgRef.current.naturalHeight) * 0.008)
        : 8

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
                {hints.join(' · ')}
            </div>

            {/* Image container */}
            <div
                className={isInteractive ? 'cursor-crosshair' : 'cursor-default'}
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

                    {/* SVG overlay for box + points */}
                    {imgRef.current && (activeBox || points.length > 0) && (
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
                            {/* Bounding box */}
                            {activeBox && (
                                <rect
                                    x={activeBox[0]}
                                    y={activeBox[1]}
                                    width={activeBox[2] - activeBox[0]}
                                    height={activeBox[3] - activeBox[1]}
                                    fill="rgba(59, 130, 246, 0.15)"
                                    stroke="rgb(59, 130, 246)"
                                    strokeWidth={Math.max(2, 2 / scale)}
                                />
                            )}

                            {/* Points */}
                            {points.map((pt, i) => (
                                <g key={i}>
                                    <circle
                                        cx={pt.x}
                                        cy={pt.y}
                                        r={pointRadius}
                                        fill={pt.label === 1 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)'}
                                        stroke="white"
                                        strokeWidth={Math.max(2, pointRadius * 0.3)}
                                    />
                                    {/* Plus or minus icon inside */}
                                    <text
                                        x={pt.x}
                                        y={pt.y}
                                        textAnchor="middle"
                                        dominantBaseline="central"
                                        fill="white"
                                        fontSize={pointRadius * 1.4}
                                        fontWeight="bold"
                                        style={{ pointerEvents: 'none' }}
                                    >
                                        {pt.label === 1 ? '+' : '−'}
                                    </text>
                                </g>
                            ))}
                        </svg>
                    )}
                </div>
            </div>
        </div>
    )
}
