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
          <div className="flex gap-10">
            <UploadDropzone />
          </div>
        </main>
      </div>
    </div>
  )
}

