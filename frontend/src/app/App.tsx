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
          </div>
        </main>
      </div>
    </div>
  )
}

