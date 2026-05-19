type StorageActionsProps = {
  maskUrl: string | null
  isSavingSession: boolean
  onSaveSession: () => void
}

export function StorageActions({
  maskUrl,
  isSavingSession,
  onSaveSession,
}: StorageActionsProps) {
  if (!maskUrl) {
    return null
  }

  return (
    <>
      <button
        type="button"
        onClick={onSaveSession}
        disabled={isSavingSession}
        className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
      >
        {isSavingSession ? 'Saving session...' : 'Save session'}
      </button>

      <button
        type="button"
        onClick={() => {
          const link = document.createElement('a')
          link.href = maskUrl
          link.download = 'segmentation_mask.png'
          link.click()
        }}
        className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
      >
        Save mask
      </button>
    </>
  )
}
