import { useSessionStore } from '../../lib/store/session'

export function SegmentationSettings() {
  const model = useSessionStore((state) => state.model)
  const promptMode = useSessionStore((state) => state.promptMode)
  const preprocessingMode = useSessionStore((state) => state.preprocessingMode)
  const setModel = useSessionStore((state) => state.setModel)
  const setPromptMode = useSessionStore((state) => state.setPromptMode)
  const setPreprocessingMode = useSessionStore((state) => state.setPreprocessingMode)

  return (
    <div className="mt-4 grid gap-6 md:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <header className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">Segmentation model</p>
        </header>

        <div className="mt-4 grid gap-3">
          <label className="flex items-center gap-3 text-sm text-slate-600">
            <input
              type="radio"
              name="model"
              className="accent-slate-900"
              checked={model === 'sam'}
              onChange={() => setModel('sam')}
            />
            <span>SAM</span>
          </label>

          <label className="flex items-center gap-3 text-sm text-slate-600">
            <input
              type="radio"
              name="model"
              className="accent-slate-900"
              checked={model === 'in-house'}
              onChange={() => setModel('in-house')}
            />
            <span>In-house model</span>
          </label>
        </div>
      </section>

      {model === 'sam' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <header>
            <p className="text-sm font-semibold text-slate-800">Prompt type</p>
          </header>

          <div className="mt-4 grid gap-3">
            <label className="flex items-center gap-3 text-sm text-slate-600">
              <input
                type="radio"
                name="prompt"
                className="accent-slate-900"
                checked={promptMode === 'box'}
                onChange={() => setPromptMode('box')}
              />
              <span>Bounding box</span>
            </label>

            <label className="flex items-center gap-3 text-sm text-slate-600">
              <input
                type="radio"
                name="prompt"
                className="accent-slate-900"
                checked={promptMode === 'points'}
                onChange={() => setPromptMode('points')}
              />
              <span>Pos / neg points</span>
            </label>

            <label className="flex items-center gap-3 text-sm text-slate-600">
              <input
                type="radio"
                name="prompt"
                className="accent-slate-900"
                checked={promptMode === 'box + points'}
                onChange={() => setPromptMode('box + points')}
              />
              <span>Box + pos / neg points</span>
            </label>
          </div>
        </section>
      )}

      {model === 'sam' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <header>
            <p className="text-sm font-semibold text-slate-800">Preprocessing</p>
          </header>

          <div className="mt-4 grid gap-3">
            <label className="flex items-center gap-3 text-sm text-slate-600">
              <input
                type="radio"
                name="preprocessing"
                className="accent-slate-900"
                checked={preprocessingMode === 'none'}
                onChange={() => setPreprocessingMode('none')}
              />
              <span>Off</span>
            </label>

            <label className="flex items-center gap-3 text-sm text-slate-600">
              <input
                type="radio"
                name="preprocessing"
                className="accent-slate-900"
                checked={preprocessingMode === 'contrast_change'}
                onChange={() => setPreprocessingMode('contrast_change')}
              />
              <span>Contrast change</span>
            </label>
          </div>
        </section>
      )}
    </div>
  )
}
