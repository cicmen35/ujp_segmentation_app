import { Header } from '../components/Header'
import { Sidebar } from '../components/Sidebar'
import { UploadDropzone } from '../features/upload/UploadDropzone'

export function App() {
  return (
    <div className="flex h-screen bg-white">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto px-8 py-6">
          <div className="flex flex-col gap-6">
            <div className="flex gap-10">
              <UploadDropzone />
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Reset
              </button>
              <button
                type="button"
                className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Undo
              </button>
              <button
                type="button"
                className="rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Run
              </button>
            </div>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <header className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">Segmentation model</p>
                </header>
                <div className="mt-4 grid gap-3">
                  {['SAM', 'In-house model'].map((model) => (
                    <label key={model} className="flex items-center gap-3 text-sm text-slate-600">
                      <input type="checkbox" className="accent-slate-900" disabled />
                      <span>{model}</span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <header>
                  <p className="text-sm font-semibold text-slate-800">Prompt type</p>
                </header>
                <div className="mt-4 grid gap-3">
                  {['Point', 'Bounding box', 'Point + box'].map((prompt) => (
                    <label key={prompt} className="flex items-center gap-3 text-sm text-slate-600">
                      <input type="checkbox" className="accent-slate-900" disabled />
                      <span>{prompt}</span>
                    </label>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

