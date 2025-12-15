import { Header } from '../components/Header'
import { Sidebar } from '../components/Sidebar'

export function App() {
  return (
    <div className="flex h-screen bg-white">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto px-8 py-6">
          <h1 className="sr-only">UJP Segmentation App</h1>
        </main>
      </div>
    </div>
  )
}

