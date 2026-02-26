import { useEffect, useCallback, useRef, useState } from 'react'

type Props = {
    src: string
    alt: string
    onClose: () => void
}

export function ImageModal({ src, alt, onClose }: Props) {
    const backdropRef = useRef<HTMLDivElement>(null)
    const [scale, setScale] = useState(1)
    const [translate, setTranslate] = useState({ x: 0, y: 0 })
    const isPanning = useRef(false)
    const lastMouse = useRef({ x: 0, y: 0 })

    // Close on Escape
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        },
        [onClose],
    )

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown)
        // prevent body scroll while modal is open
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.body.style.overflow = ''
        }
    }, [handleKeyDown])

    // Close when clicking backdrop (not the image)
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === backdropRef.current) onClose()
    }

    // Zoom with scroll wheel
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        setScale((prev) => Math.min(Math.max(prev + delta, 0.25), 5))
    }

    // Pan with mouse drag
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return
        isPanning.current = true
        lastMouse.current = { x: e.clientX, y: e.clientY }
        e.preventDefault()
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isPanning.current) return
        const dx = e.clientX - lastMouse.current.x
        const dy = e.clientY - lastMouse.current.y
        lastMouse.current = { x: e.clientX, y: e.clientY }
        setTranslate((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
    }

    const handleMouseUp = () => {
        isPanning.current = false
    }

    // Reset zoom/pan on double-click
    const handleDoubleClick = () => {
        setScale(1)
        setTranslate({ x: 0, y: 0 })
    }

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

            {/* Zoom hint */}
            <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-xs text-white/60">
                Scroll to zoom · Drag to pan · Double-click to reset
            </div>

            {/* Image container */}
            <div
                className="cursor-grab active:cursor-grabbing"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onDoubleClick={handleDoubleClick}
                style={{ userSelect: 'none' }}
            >
                <img
                    src={src}
                    alt={alt}
                    draggable={false}
                    className="max-h-[85vh] max-w-[85vw] rounded-xl shadow-2xl transition-transform duration-75"
                    style={{
                        transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                    }}
                />
            </div>
        </div>
    )
}
