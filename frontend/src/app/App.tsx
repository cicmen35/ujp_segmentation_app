import { useState } from 'react'

import { Header } from '../components/Header'
import { Sidebar } from '../components/Sidebar'
import { Toaster } from '../components/Toaster'
import type { Toast } from '../components/Toaster'
import { AdminUserManagement } from '../features/auth/AdminUserManagement'
import { AuthDialog } from '../features/auth/AuthDialog'
import { useAuthController } from '../features/auth/useAuthController'
import { SegmentationSettings } from '../features/segmentation/SegmentationSettings'
import { SegmentationToolbar } from '../features/segmentation/SegmentationToolbar'
import { SegmentationWorkspace } from '../features/segmentation/SegmentationWorkspace'
import { SaveConflictDialog } from '../features/storage/SaveConflictDialog'
import { StorageActions } from '../features/storage/StorageActions'
import { useSessionSave } from '../features/storage/useSessionSave'
import { useSessionStore } from '../lib/store/session'

export function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [toasts, setToasts] = useState<Toast[]>([])

  const clear = useSessionStore((state) => state.clear)
  const maskUrl = useSessionStore((state) => state.maskUrl)
  const boundingBox = useSessionStore((state) => state.boundingBox)
  const setBoundingBox = useSessionStore((state) => state.setBoundingBox)
  const promptPoints = useSessionStore((state) => state.promptPoints)
  const removeLastPoint = useSessionStore((state) => state.removeLastPoint)

  const hasPromptData = !!boundingBox || promptPoints.length > 0

  const handleUndo = () => {
    if (promptPoints.length > 0) {
      removeLastPoint()
    } else if (boundingBox) {
      setBoundingBox(null)
    }
  }

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
      {auth.isLoggedIn && <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen((o) => !o)} />}
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

      <Toaster toasts={toasts} />

      <SaveConflictDialog
        isOpen={!!pendingSaveConflict}
        saveConflictName={saveConflictName}
        isSavingSession={isSavingSession}
        onNameChange={setSaveConflictName}
        onCancel={clearSaveConflict}
        onRename={() => void handleRenameConflict()}
        onReplace={() => void handleReplaceConflict()}
      />

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
