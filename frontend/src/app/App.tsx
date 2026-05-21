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
  const { isSavingSession, handleSaveSession } = useSessionSave(pushToast)

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

      {auth.isLoginOpen && !auth.isLoggedIn && (
        <AuthDialog
          authMode={auth.authMode}
          username={auth.username}
          password={auth.password}
          loginError={auth.loginError}
          isSubmittingLogin={auth.isSubmittingLogin}
          onClose={auth.closeLogin}
          onSubmit={(event) => void auth.handleAuthSubmit(event)}
          onAuthModeToggle={auth.toggleAuthMode}
          onUsernameChange={auth.setUsername}
          onPasswordChange={auth.setPassword}
        />
      )}
    </div>
  )
}
