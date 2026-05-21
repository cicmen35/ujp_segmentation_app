import { SegmentPanel } from './SegmentPanel'

type SegmentationToolbarProps = {
  onReset: () => void
  onUndo: () => void
  hasPromptData: boolean
}

export function SegmentationToolbar({
  onReset,
  onUndo,
  hasPromptData,
}: SegmentationToolbarProps) {
  return (
    <>
      <button
        type="button"
        onClick={onReset}
        className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
      >
        Reset
      </button>

      <button
        type="button"
        onClick={onUndo}
        className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white"
        disabled={!hasPromptData}
      >
        Undo
      </button>

      <SegmentPanel />
    </>
  )
}
