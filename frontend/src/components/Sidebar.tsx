import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { createFolder, deleteFolder, fetchFolderTree } from '../lib/api/client'
import type { FolderNode, StorageScope } from '../lib/api/types'
import { useSessionStore } from '../lib/store/session'

const MIN_WIDTH = 220
const MAX_WIDTH = 420
const MIN_SECTION_RATIO = 0.2

type DragMode = 'width' | 'split' | null
type PendingFolderDraft = {
  scope: StorageScope
  parentPath: string | null
}

type FolderTreeProps = {
  nodes: FolderNode[]
  scope: StorageScope
  selectedScope: StorageScope | null
  selectedPath: string | null
  onSelect: (scope: StorageScope, path: string) => void
  pendingDraft: PendingFolderDraft | null
  draftName: string
  onDraftNameChange: (value: string) => void
  onDraftSubmit: () => void
  onDraftCancel: () => void
  depth?: number
}

function FolderIcon({ selected }: { selected: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 ${selected ? 'text-white' : 'text-amber-500'}`}
      fill="currentColor"
    >
      <path d="M3.75 6.75A2.25 2.25 0 0 1 6 4.5h4.061c.597 0 1.17.237 1.591.659l1.189 1.189c.14.14.33.22.53.22H18A2.25 2.25 0 0 1 20.25 8.82v7.93A2.25 2.25 0 0 1 18 19H6a2.25 2.25 0 0 1-2.25-2.25V6.75Z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="currentColor">
      <path d="M9 3.75A2.25 2.25 0 0 0 6.75 6v.75H4.5a.75.75 0 0 0 0 1.5h.529l.813 9.753A2.25 2.25 0 0 0 8.084 20.25h7.832a2.25 2.25 0 0 0 2.242-2.247l.813-9.753H19.5a.75.75 0 0 0 0-1.5h-2.25V6A2.25 2.25 0 0 0 15 3.75H9ZM15.75 6.75h-7.5V6A.75.75 0 0 1 9 5.25h6a.75.75 0 0 1 .75.75v.75Z" />
    </svg>
  )
}

function FolderTree({
  nodes,
  scope,
  selectedScope,
  selectedPath,
  onSelect,
  pendingDraft,
  draftName,
  onDraftNameChange,
  onDraftSubmit,
  onDraftCancel,
  depth = 0,
}: FolderTreeProps) {
  const renderDraftRow = (parentPath: string | null, rowDepth: number) => {
    if (!pendingDraft || pendingDraft.scope !== scope || pendingDraft.parentPath !== parentPath) {
      return null
    }

    return (
      <div className="py-1">
        <div
          className="flex items-center rounded-lg border border-slate-300 bg-white px-2 py-1.5"
          style={{ paddingLeft: `${rowDepth * 14 + 8}px` }}
          onClick={(event) => event.stopPropagation()}
        >
          <FolderIcon selected={false} />
          <input
            autoFocus
            value={draftName}
            onChange={(event) => onDraftNameChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                onDraftSubmit()
              } else if (event.key === 'Escape') {
                event.preventDefault()
                onDraftCancel()
              }
            }}
            onBlur={onDraftCancel}
            placeholder="Folder name"
            className="ml-2 w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {renderDraftRow(null, depth)}
      {nodes.map((node) => {
        const isSelected = selectedScope === scope && selectedPath === node.path
        return (
          <div key={`${scope}:${node.path}`}>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onSelect(scope, node.path)
              }}
              className={`flex w-full items-center rounded-lg px-2 py-1.5 text-left text-sm transition ${
                isSelected ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
              style={{ paddingLeft: `${depth * 14 + 8}px` }}
            >
              <FolderIcon selected={isSelected} />
              <span className="ml-2 truncate">{node.name}</span>
            </button>
            {node.children.length > 0 && (
              <FolderTree
                nodes={node.children}
                scope={scope}
                selectedScope={selectedScope}
                selectedPath={selectedPath}
                onSelect={onSelect}
                pendingDraft={pendingDraft}
                draftName={draftName}
                onDraftNameChange={onDraftNameChange}
                onDraftSubmit={onDraftSubmit}
                onDraftCancel={onDraftCancel}
                depth={depth + 1}
              />
            )}
            {renderDraftRow(node.path, depth + 1)}
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
  const showSharedActions = isAdmin
  const [width, setWidth] = useState(280)
  const [splitRatio, setSplitRatio] = useState(0.55)
  const [privateFolders, setPrivateFolders] = useState<FolderNode[]>([])
  const [sharedFolders, setSharedFolders] = useState<FolderNode[]>([])
  const [folderError, setFolderError] = useState<string | null>(null)
  const [pendingDraft, setPendingDraft] = useState<PendingFolderDraft | null>(null)
  const [draftName, setDraftName] = useState('')
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
        if (error instanceof Error && error.message === 'Not authenticated') {
          setFolderError(null)
          return
        }
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

  const startFolderDraft = (scope: StorageScope, parentPath: string | null = null) => {
    setPendingDraft({ scope, parentPath })
    setDraftName('')
    setFolderError(null)
  }

  const cancelFolderDraft = useCallback(() => {
    setPendingDraft(null)
    setDraftName('')
  }, [])

  const submitFolderDraft = useCallback(async () => {
    if (!pendingDraft) return

    const name = draftName.trim()
    if (!name) {
      cancelFolderDraft()
      return
    }

    try {
      const created = await createFolder(pendingDraft.scope, name, pendingDraft.parentPath)
      setSelectedSaveTarget(pendingDraft.scope, created.path)
      bumpFolderTreeVersion()
      setFolderError(null)
      cancelFolderDraft()
    } catch (error) {
      setFolderError(error instanceof Error ? error.message : 'Failed to create folder')
    }
  }, [bumpFolderTreeVersion, cancelFolderDraft, draftName, pendingDraft, setSelectedSaveTarget])

  const handleDeleteSelectedFolder = async (scope: StorageScope) => {
    if (selectedSaveScope !== scope || !selectedSavePath) return
    const confirmed = window.confirm(`Delete folder "${selectedSavePath}" and all of its contents?`)
    if (!confirmed) return

    try {
      await deleteFolder(scope, selectedSavePath)
      setSelectedSaveTarget(null, null)
      bumpFolderTreeVersion()
      setFolderError(null)
    } catch (error) {
      setFolderError(error instanceof Error ? error.message : 'Failed to delete folder')
    }
  }

  const renderSelectionActions = (scope: StorageScope) => {
    const isScopeSelected = selectedSaveScope === scope

    return (
      <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              startFolderDraft(scope, null)
            }}
            className="rounded-md bg-slate-200 px-2.5 py-1 text-xs text-slate-700 transition hover:bg-slate-300"
          >
            New folder
          </button>
          {isScopeSelected && selectedSavePath && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  startFolderDraft(scope, selectedSavePath)
                }}
                className="rounded-md bg-slate-200 px-2.5 py-1 text-xs text-slate-700 transition hover:bg-slate-300"
              >
                Add subfolder
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  void handleDeleteSelectedFolder(scope)
                }}
                aria-label="Delete folder"
                title="Delete folder"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-red-100 text-red-700 transition hover:bg-red-200"
              >
                <TrashIcon />
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  const renderSectionHeader = (label: string) => {
    return (
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      </div>
    )
  }

  return (
    <aside
      ref={sidebarRef}
      className="relative hidden h-full shrink-0 border-r border-slate-200 bg-slate-50 text-sm text-slate-700 md:flex"
      style={{ width }}
    >
      <div
        className="flex h-full w-full flex-col px-4 py-4"
        onClick={() => {
          cancelFolderDraft()
          setSelectedSaveTarget(null, null)
        }}
      >
        {folderError && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {folderError}
          </div>
        )}
        <section
          className="flex min-h-0 flex-col"
          style={{ flexBasis: `${splitRatio * 100}%`, flexGrow: 0, flexShrink: 0 }}
        >
          {renderSectionHeader('Shared folders')}
          {showSharedActions && renderSelectionActions('shared')}
          <div className="mt-3 flex-1 overflow-auto rounded-lg border border-dashed border-slate-300 bg-white/70 p-3">
            <FolderTree
              nodes={sharedFolders}
              scope="shared"
              selectedScope={selectedSaveScope}
              selectedPath={selectedSavePath}
              onSelect={setSelectedSaveTarget}
              pendingDraft={pendingDraft}
              draftName={draftName}
              onDraftNameChange={setDraftName}
              onDraftSubmit={() => void submitFolderDraft()}
              onDraftCancel={cancelFolderDraft}
            />
          </div>
        </section>

        <button
          type="button"
          aria-label="Resize sections"
          onMouseDown={startSplitDragging}
          onClick={(event) => event.stopPropagation()}
          className="my-2 h-2 w-full cursor-row-resize rounded-full border border-dashed border-slate-300 bg-white"
        >
          <span className="sr-only">Drag to resize sections</span>
        </button>

        <section
          className="flex min-h-0 flex-1 flex-col"
          style={{ flexBasis: `${(1 - splitRatio) * 100}%` }}
        >
          {renderSectionHeader('Private folders')}
          {renderSelectionActions('private')}
          <div className="mt-3 flex-1 overflow-auto rounded-lg border border-dashed border-slate-300 bg-white/70 p-3">
            <FolderTree
              nodes={privateFolders}
              scope="private"
              selectedScope={selectedSaveScope}
              selectedPath={selectedSavePath}
              onSelect={setSelectedSaveTarget}
              pendingDraft={pendingDraft}
              draftName={draftName}
              onDraftNameChange={setDraftName}
              onDraftSubmit={() => void submitFolderDraft()}
              onDraftCancel={cancelFolderDraft}
            />
          </div>
        </section>
      </div>

      <button
        type="button"
        aria-label="Resize sidebar"
        onMouseDown={startWidthDragging}
        onClick={(event) => event.stopPropagation()}
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent"
      >
        <span className="sr-only">Drag to resize sidebar width</span>
      </button>
    </aside>
  )
}
