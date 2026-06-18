import { useState } from 'react'

import { Header } from '../components/Header'
import { Sidebar } from '../components/Sidebar'
import { AdminUserManagement } from '../features/auth/AdminUserManagement'
import { AuthDialog } from '../features/auth/AuthDialog'
import { useAuthController } from '../features/auth/useAuthController'
import { SegmentationSettings } from '../features/segmentation/SegmentationSettings'
import { SegmentationToolbar } from '../features/segmentation/SegmentationToolbar'
import { SegmentationWorkspace } from '../features/segmentation/SegmentationWorkspace'
import { StorageActions } from '../features/storage/StorageActions'
import { useSessionSave } from '../features/storage/useSessionSave'
import { useSessionStore } from '../lib/store/session'
type Toast = {
  id: number
  kind: 'success' | 'error'
  message: string
}

export function App() {
  const clear = useSessionStore((state) => state.clear)
  const maskUrl = useSessionStore((state) => state.maskUrl)
  const boundingBox = useSessionStore((state) => state.boundingBox)
  const setBoundingBox = useSessionStore((state) => state.setBoundingBox)
  const promptPoints = useSessionStore((state) => state.promptPoints)
  const removeLastPoint = useSessionStore((state) => state.removeLastPoint)

  const hasPromptData = !!boundingBox || promptPoints.length > 0

  const handleUndo = () => {
    // Remove last point first, then box
    if (promptPoints.length > 0) {
      removeLastPoint()
    } else if (boundingBox) {
      setBoundingBox(null)
    }
  }

  const [toasts, setToasts] = useState<Toast[]>([])

  const pushToast = (kind: Toast['kind'], message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts((current) => [...current, { id, kind, message }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 5000)
  }

  const auth = useAuthController()
  const {
    isSavingSession,
    handleSaveSession,
    pendingSaveConflict,
    saveConflictName,
    setSaveConflictName,
    clearSaveConflict,
    handleReplaceConflict,
    handleRenameConflict,
  } = useSessionSave(pushToast)

  return (
    <div className="flex h-screen bg-white">
      {auth.isLoggedIn && <Sidebar />}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          isLoggedIn={auth.isLoggedIn}
          currentUser={auth.currentUser}
          role={auth.role}
          onLoginClick={auth.openLogin}
          onLogoutClick={() => void auth.handleLogout()}
          onToggleDeleteUsers={auth.toggleDeleteUsers}
          isLoggingOut={auth.isLoggingOut}
          isDeleteUsersOpen={auth.isDeleteUsersOpen}
        />
        <main className="flex-1 overflow-auto px-8 py-6">
          <div className="flex flex-col gap-6">
            {auth.isLoggedIn && auth.role === 'admin' && auth.isDeleteUsersOpen && (
              <AdminUserManagement
                userToDelete={auth.userToDelete}
                userSuggestions={auth.userSuggestions}
                deleteUserError={auth.deleteUserError}
                deleteUserSuccess={auth.deleteUserSuccess}
                isDeletingUser={auth.isDeletingUser}
                onSubmit={(event) => void auth.handleDeleteUser(event)}
                onUserToDeleteChange={auth.setUserToDelete}
              />
            )}

            <SegmentationWorkspace />

            <div className="flex gap-4">
              <SegmentationToolbar
                onReset={clear}
                onUndo={handleUndo}
                hasPromptData={hasPromptData}
              />
              <StorageActions
                maskUrl={maskUrl}
                isSavingSession={isSavingSession}
                onSaveSession={() => void handleSaveSession()}
              />
            </div>

            <SegmentationSettings />
          </div>
        </main>
      </div>

      {toasts.length > 0 && (
        <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`rounded-2xl border px-4 py-3 text-sm shadow-lg ${
                toast.kind === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}

      {pendingSaveConflict && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/20 px-4"
          onClick={clearSaveConflict}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-sm font-semibold text-slate-900">Session already exists</p>
            <p className="mt-2 text-sm text-slate-600">
              A session named <span className="font-medium text-slate-800">{saveConflictName}</span> already exists in the destination.
            </p>
            <div className="mt-3">
              <label className="block text-xs font-medium text-slate-500">Save with a different name</label>
              <input
                value={saveConflictName}
                onChange={(event) => setSaveConflictName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return
                  event.preventDefault()
                  void handleRenameConflict()
                }}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
              />
              <p className="mt-1 text-xs text-slate-400">Press Enter to save with the typed name.</p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={clearSaveConflict}
                disabled={isSavingSession}
                className="rounded-md bg-slate-100 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleRenameConflict()}
                disabled={isSavingSession}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white transition hover:bg-emerald-700"
              >
                {isSavingSession ? 'Saving...' : 'Save with new name'}
              </button>
              <button
                type="button"
                onClick={() => void handleReplaceConflict()}
                disabled={isSavingSession}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white transition hover:bg-red-700"
              >
                {isSavingSession ? 'Saving...' : 'Replace'}
              </button>
            </div>
          </div>
        </div>
      )}

      {auth.isLoginOpen && !auth.isLoggedIn && (
        <AuthDialog
          authMode={auth.authMode}
          username={auth.username}
          password={auth.password}
          confirmPassword={auth.confirmPassword}
          loginError={auth.loginError}
          isSubmittingLogin={auth.isSubmittingLogin}
          onClose={auth.closeLogin}
          onSubmit={(event) => void auth.handleAuthSubmit(event)}
          onAuthModeToggle={auth.toggleAuthMode}
          onUsernameChange={auth.setUsername}
          onPasswordChange={auth.setPassword}
          onConfirmPasswordChange={auth.setConfirmPassword}
        />
      )}
    </div>
  )
}
