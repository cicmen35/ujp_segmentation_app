import { Header } from '../components/Header'
import { Sidebar } from '../components/Sidebar'
import { ImageCanvas } from '../components/ImageCanvas/ImageCanvas'
import { SegmentPanel } from '../features/segment/SegmentPanel'
import { UploadDropzone } from '../features/upload/UploadDropzone'
import { useSessionStore } from '../lib/store/session'

export function App() {
  const clear = useSessionStore((s) => s.clear)
  const imageUrl = useSessionStore((s) => s.imageUrl)

  const boundingBox = useSessionStore((s) => s.boundingBox)
  const setBoundingBox = useSessionStore((s) => s.setBoundingBox)
  const promptPoints = useSessionStore((s) => s.promptPoints)
  const removeLastPoint = useSessionStore((s) => s.removeLastPoint)

  const hasPromptData = !!boundingBox || promptPoints.length > 0

  const handleUndo = () => {
    // Remove last point first, then box
    if (promptPoints.length > 0) {
      removeLastPoint()
    } else if (boundingBox) {
      setBoundingBox(null)
    }
  }

  const model = useSessionStore((s) => s.model)
  const setModel = useSessionStore((s) => s.setModel)

  const promptMode = useSessionStore((s) => s.promptMode)
  const setPromptMode = useSessionStore((s) => s.setPromptMode)

  return (
    <div className="flex h-screen bg-white">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto px-8 py-6">
          <div className="flex flex-col gap-6">
            {/* Upload / Preview */}
            <div className="flex gap-10">
              {imageUrl ? <ImageCanvas /> : <UploadDropzone />}
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={clear}
                className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={handleUndo}
                className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white"
                disabled={!hasPromptData}
              >
                Undo
              </button>

              <SegmentPanel />
            </div>

            {/* Settings */}
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              {/* Model selection */}
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

              {/* Prompt selection */}
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
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
