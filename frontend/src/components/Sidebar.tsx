import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { createFolder, fetchFolderTree } from '../lib/api/client'
import type { FolderNode, StorageScope } from '../lib/api/types'
import { useSessionStore } from '../lib/store/session'

const MIN_WIDTH = 220
const MAX_WIDTH = 420
const MIN_SECTION_RATIO = 0.2

type DragMode = 'width' | 'split' | null

type FolderTreeProps = {
  nodes: FolderNode[]
  scope: StorageScope
  selectedScope: StorageScope | null
  selectedPath: string | null
  onSelect: (scope: StorageScope, path: string) => void
  depth?: number
}

function FolderTree({ nodes, scope, selectedScope, selectedPath, onSelect, depth = 0 }: FolderTreeProps) {
  return (
    <div className="space-y-1">
      {nodes.map((node) => {
        const isSelected = selectedScope === scope && selectedPath === node.path
        return (
          <div key={`${scope}:${node.path}`}>
            <button
              type="button"
              onClick={() => onSelect(scope, node.path)}
              className={`flex w-full items-center rounded-lg px-2 py-1.5 text-left text-sm transition ${
                isSelected ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
              style={{ paddingLeft: `${depth * 14 + 8}px` }}
            >
              {node.name}
            </button>
            {node.children.length > 0 && (
              <FolderTree
                nodes={node.children}
                scope={scope}
                selectedScope={selectedScope}
                selectedPath={selectedPath}
                onSelect={onSelect}
                depth={depth + 1}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export function Sidebar() {
  const role = useSessionStore((s) => s.role)
  const selectedSaveScope = useSessionStore((s) => s.selectedSaveScope)
  const selectedSavePath = useSessionStore((s) => s.selectedSavePath)
  const setSelectedSaveTarget = useSessionStore((s) => s.setSelectedSaveTarget)
  const folderTreeVersion = useSessionStore((s) => s.folderTreeVersion)
  const bumpFolderTreeVersion = useSessionStore((s) => s.bumpFolderTreeVersion)
  const isAdmin = role === 'admin'
  const [width, setWidth] = useState(280)
  const [splitRatio, setSplitRatio] = useState(0.55)
  const [privateFolders, setPrivateFolders] = useState<FolderNode[]>([])
  const [sharedFolders, setSharedFolders] = useState<FolderNode[]>([])
  const [folderError, setFolderError] = useState<string | null>(null)
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

  useEffect(() => {
    let active = true

    const loadTrees = async () => {
      try {
        const tree = await fetchFolderTree()
        if (!active) return
        setPrivateFolders(tree.private)
        setSharedFolders(tree.shared)
        setFolderError(null)
      } catch (error) {
        if (!active) return
        setFolderError(error instanceof Error ? error.message : 'Failed to load folders')
      }
    }

    void loadTrees()

    return () => {
      active = false
    }
  }, [folderTreeVersion])

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

  const handleCreateFolder = async (scope: StorageScope) => {
    const name = window.prompt('Folder name')
    if (!name) return

    const parentPath = selectedSaveScope === scope ? selectedSavePath : null

    try {
      const created = await createFolder(scope, name, parentPath)
      setSelectedSaveTarget(scope, created.path)
      bumpFolderTreeVersion()
      setFolderError(null)
    } catch (error) {
      setFolderError(error instanceof Error ? error.message : 'Failed to create folder')
    }
  }

  const renderSectionHeader = (label: string, scope: StorageScope) => {
    return (
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
        <div className="flex items-center gap-2 text-[11px]">
          <button
            type="button"
            onClick={() => void handleCreateFolder(scope)}
            className="rounded-md bg-slate-200 px-2.5 py-1 text-slate-600 transition hover:bg-slate-300"
          >
            Add folder
          </button>
        </div>
      </div>
    )
  }

  return (
    <aside
      ref={sidebarRef}
      className="relative hidden h-full shrink-0 border-r border-slate-200 bg-slate-50 text-sm text-slate-700 md:flex"
      style={{ width }}
    >
      <div className="flex h-full w-full flex-col px-4 py-4">
        {folderError && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {folderError}
          </div>
        )}
        {isAdmin && (
          <>
            <section
              className="flex min-h-0 flex-col"
              style={{ flexBasis: `${splitRatio * 100}%`, flexGrow: 0, flexShrink: 0 }}
            >
              {renderSectionHeader('Shared folders', 'shared')}
              <div className="mt-3 flex-1 overflow-auto rounded-lg border border-dashed border-slate-300 bg-white/70 p-3">
                <FolderTree
                  nodes={sharedFolders}
                  scope="shared"
                  selectedScope={selectedSaveScope}
                  selectedPath={selectedSavePath}
                  onSelect={setSelectedSaveTarget}
                />
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
          </>
        )}

        <section
          className="flex min-h-0 flex-1 flex-col"
          style={isAdmin ? { flexBasis: `${(1 - splitRatio) * 100}%` } : undefined}
        >
          {renderSectionHeader('Private folders', 'private')}
          <div className="mt-3 flex-1 overflow-auto rounded-lg border border-dashed border-slate-300 bg-white/70 p-3">
            <FolderTree
              nodes={privateFolders}
              scope="private"
              selectedScope={selectedSaveScope}
              selectedPath={selectedSavePath}
              onSelect={setSelectedSaveTarget}
            />
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
