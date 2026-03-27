import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Header } from '../components/Header'
import { Sidebar } from '../components/Sidebar'
import { ImageCanvas } from '../components/ImageCanvas/ImageCanvas'
import { SegmentPanel } from '../features/segment/SegmentPanel'
import { UploadDropzone } from '../features/upload/UploadDropzone'
import { deleteUser, fetchCurrentUser, fetchUsers, login, logout, register, saveSession } from '../lib/api/client'
import type { UserListItem } from '../lib/api/types'
import { useSessionStore } from '../lib/store/session'

type AuthMode = 'login' | 'register'

export function App() {
  const isLoggedIn = useSessionStore((s) => s.isLoggedIn)
  const currentUser = useSessionStore((s) => s.currentUser)
  const role = useSessionStore((s) => s.role)
  const selectedSaveScope = useSessionStore((s) => s.selectedSaveScope)
  const selectedSavePath = useSessionStore((s) => s.selectedSavePath)
  const bumpFolderTreeVersion = useSessionStore((s) => s.bumpFolderTreeVersion)
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
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [userToDelete, setUserToDelete] = useState('')
  const [deleteUserError, setDeleteUserError] = useState<string | null>(null)
  const [deleteUserSuccess, setDeleteUserSuccess] = useState<string | null>(null)
  const [isDeletingUser, setIsDeletingUser] = useState(false)
  const [isDeleteUsersOpen, setIsDeleteUsersOpen] = useState(false)
  const [userSuggestions, setUserSuggestions] = useState<UserListItem[]>([])
  const [isSavingSession, setIsSavingSession] = useState(false)
  const [saveSessionError, setSaveSessionError] = useState<string | null>(null)
  const [saveSessionSuccess, setSaveSessionSuccess] = useState<string | null>(null)

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

  useEffect(() => {
    if (!isLoggedIn || role !== 'admin' || !isDeleteUsersOpen) {
      setUserSuggestions([])
      return
    }

    const query = userToDelete.trim()
    let active = true
    const timeoutId = window.setTimeout(async () => {
      try {
        const users = await fetchUsers(query, 5)
        if (active) {
          setUserSuggestions(users)
        }
      } catch {
        if (active) {
          setUserSuggestions([])
        }
      }
    }, 150)

    return () => {
      active = false
      window.clearTimeout(timeoutId)
    }
  }, [isDeleteUsersOpen, isLoggedIn, role, userToDelete])

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoginError(null)
    setIsSubmittingLogin(true)

    try {
      const user = authMode === 'login'
        ? await login(username, password)
        : await register(username, password)
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

  const handleLogout = async () => {
    setIsLoggingOut(true)

    try {
      await logout()
    } finally {
      clear()
      clearAuth()
      setPassword('')
      setLoginError(null)
      setIsLoginOpen(false)
      setIsDeleteUsersOpen(false)
      setDeleteUserError(null)
      setDeleteUserSuccess(null)
      setSaveSessionError(null)
      setSaveSessionSuccess(null)
      setUserToDelete('')
      setIsLoggingOut(false)
    }
  }

  const handleDeleteUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setDeleteUserError(null)
    setDeleteUserSuccess(null)
    setIsDeletingUser(true)

    try {
      await deleteUser(userToDelete)
      setDeleteUserSuccess(`User '${userToDelete}' deleted`)
      setUserToDelete('')
      setUserSuggestions((current) => current.filter((user) => user.username !== userToDelete))
    } catch (error) {
      setDeleteUserError(error instanceof Error ? error.message : 'Failed to delete user')
    } finally {
      setIsDeletingUser(false)
    }
  }

  const handleSaveSession = async () => {
    if (!imageUrl || !maskUrl) return
    const file = useSessionStore.getState().file
    if (!file) return

    setSaveSessionError(null)
    setSaveSessionSuccess(null)
    setIsSavingSession(true)

    try {
      const maskBlob = await fetch(maskUrl).then((response) => response.blob())
      const scope = selectedSaveScope ?? 'private'
      const result = await saveSession(file, maskBlob, scope, selectedSavePath)
      setSaveSessionSuccess(`Saved to ${scope}/${result.path}`)
      bumpFolderTreeVersion()
    } catch (error) {
      if (error instanceof Error && error.message === 'Not authenticated') {
        setSaveSessionError('Session save is unavailable in the current session')
      } else {
        setSaveSessionError(error instanceof Error ? error.message : 'Failed to save session')
      }
    } finally {
      setIsSavingSession(false)
    }
  }

  return (
    <div className="flex h-screen bg-white">
      {isLoggedIn && <Sidebar />}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          isLoggedIn={isLoggedIn}
          currentUser={currentUser}
          role={role}
          onLoginClick={() => {
            setLoginError(null)
            setAuthMode('login')
            setIsLoginOpen(true)
          }}
          onLogoutClick={handleLogout}
          onToggleDeleteUsers={() => {
            setDeleteUserError(null)
            setDeleteUserSuccess(null)
            setIsDeleteUsersOpen((current) => !current)
          }}
          isLoggingOut={isLoggingOut}
          isDeleteUsersOpen={isDeleteUsersOpen}
        />
        <main className="flex-1 overflow-auto px-8 py-6">
          <div className="flex flex-col gap-6">
            {isLoggedIn && role === 'admin' && isDeleteUsersOpen && (
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <header>
                  <p className="text-sm font-semibold text-slate-800">Admin user management</p>
                </header>

                <form className="mt-4 flex flex-col gap-3 md:flex-row md:items-end" onSubmit={handleDeleteUser}>
                  <label className="flex-1">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Username to delete</span>
                    <input
                      type="text"
                      value={userToDelete}
                      onChange={(event) => setUserToDelete(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                      placeholder="test-user"
                      list="admin-user-suggestions"
                      required
                    />
                    <datalist id="admin-user-suggestions">
                      {userSuggestions.map((user) => (
                        <option key={user.username} value={user.username}>
                          {user.role}
                        </option>
                      ))}
                    </datalist>
                  </label>

                  <button
                    type="submit"
                    disabled={isDeletingUser}
                    className="rounded-2xl border border-red-200 px-5 py-3 text-sm font-medium text-red-700 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeletingUser ? 'Deleting...' : 'Delete user'}
                  </button>
                </form>

                {deleteUserError && (
                  <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {deleteUserError}
                  </div>
                )}

                {deleteUserSuccess && (
                  <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {deleteUserSuccess}
                  </div>
                )}
              </section>
            )}

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
                <>
                  <button
                    type="button"
                    onClick={handleSaveSession}
                    disabled={isSavingSession}
                    className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                  >
                    {isSavingSession ? 'Saving session...' : 'Save session'}
                  </button>

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
                </>
              )}
            </div>

            {(saveSessionError || saveSessionSuccess) && (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  saveSessionError
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}
              >
                {saveSessionError ?? saveSessionSuccess}
              </div>
            )}

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
                <h2 className="mt-2 text-xl font-semibold text-slate-900">
                  {authMode === 'login' ? 'Log in' : 'Register'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsLoginOpen(false)}
                className="text-sm text-slate-400 transition hover:text-slate-700"
              >
                Close
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleAuthSubmit}>
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
                {isSubmittingLogin
                  ? authMode === 'login'
                    ? 'Signing in...'
                    : 'Creating account...'
                  : authMode === 'login'
                    ? 'Log in'
                    : 'Create account'}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setLoginError(null)
                setAuthMode((current) => current === 'login' ? 'register' : 'login')
              }}
              className="mt-4 text-sm text-slate-500 transition hover:text-slate-900"
            >
              {authMode === 'login'
                ? 'Register'
                : 'Log in'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
