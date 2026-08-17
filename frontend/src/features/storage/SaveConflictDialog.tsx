import { useId } from 'react'

type Props = {
  isOpen: boolean
  saveConflictName: string
  isSavingSession: boolean
  onNameChange: (name: string) => void
  onCancel: () => void
  onRename: () => void
  onReplace: () => void
}

export function SaveConflictDialog({
  isOpen,
  saveConflictName,
  isSavingSession,
  onNameChange,
  onCancel,
  onRename,
  onReplace,
}: Props) {
  const titleId = useId()

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/20 px-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <p id={titleId} className="text-sm font-semibold text-slate-900">Session already exists</p>
        <p className="mt-2 text-sm text-slate-600">
          A session named <span className="font-medium text-slate-800">{saveConflictName}</span> already exists in the destination.
        </p>
        <div className="mt-3">
          <label className="block text-xs font-medium text-slate-500">Save with a different name</label>
          <input
            value={saveConflictName}
            onChange={(event) => onNameChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              onRename()
            }}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
          />
          <p className="mt-1 text-xs text-slate-400">Press Enter to save with the typed name.</p>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSavingSession}
            className="rounded-md bg-slate-100 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onRename}
            disabled={isSavingSession}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white transition hover:bg-emerald-700"
          >
            {isSavingSession ? 'Saving...' : 'Save with new name'}
          </button>
          <button
            type="button"
            onClick={onReplace}
            disabled={isSavingSession}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white transition hover:bg-red-700"
          >
            {isSavingSession ? 'Saving...' : 'Replace'}
          </button>
        </div>
      </div>
    </div>
  )
}
