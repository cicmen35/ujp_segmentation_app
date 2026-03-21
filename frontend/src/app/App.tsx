import { FormEvent, useEffect, useState } from 'react'
import { Header } from '../components/Header'
import { Sidebar } from '../components/Sidebar'
import { ImageCanvas } from '../components/ImageCanvas/ImageCanvas'
import { SegmentPanel } from '../features/segment/SegmentPanel'
import { UploadDropzone } from '../features/upload/UploadDropzone'
import { fetchCurrentUser, login } from '../lib/api/client'
import { useSessionStore } from '../lib/store/session'

export function App() {
  const isLoggedIn = useSessionStore((s) => s.isLoggedIn)
  const currentUser = useSessionStore((s) => s.currentUser)
  const setAuth = useSessionStore((s) => s.setAuth)
  const clearAuth = useSessionStore((s) => s.clearAuth)
  const clear = useSessionStore((s) => s.clear)
  const imageUrl = useSessionStore((s) => s.imageUrl)
  const maskUrl = useSessionStore((s) => s.maskUrl)

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
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    let active = true

    const restoreSession = async () => {
      try {
        const user = await fetchCurrentUser()
        if (active) {
          setAuth(user)
        }
      } catch {
        if (active) {
          clearAuth()
        }
      }
    }

    void restoreSession()

    return () => {
      active = false
    }
  }, [clearAuth, setAuth])

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoginError(null)
    setIsSubmittingLogin(true)

    try {
      const user = await login(username, password)
      setAuth(user)
      setIsLoginOpen(false)
      setPassword('')
      clear()
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setIsSubmittingLogin(false)
    }
  }

  return (
    <div className="flex h-screen bg-white">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          isLoggedIn={isLoggedIn}
          currentUser={currentUser}
          onLoginClick={() => {
            setLoginError(null)
            setIsLoginOpen(true)
          }}
        />
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

              {maskUrl && (
                <button
                  type="button"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = maskUrl;
                    a.download = "segmentation_mask.png";
                    a.click();
                  }}
                  className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Save mask
                </button>
              )}
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
      {isLoginOpen && !isLoggedIn && (
        <div className="fixed inset-0 z-20 flex items-start justify-end bg-slate-950/15 px-6 py-20">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Authentication</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Sign in</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsLoginOpen(false)}
                className="text-sm text-slate-400 transition hover:text-slate-700"
              >
                Close
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleLogin}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Username</span>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  autoComplete="username"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  autoComplete="current-password"
                  required
                />
              </label>

              {loginError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingLogin}
                className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isSubmittingLogin ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
