import { useMemo } from 'react'
import ujpLogo from '../assets/ujp-praha.jpg'

type HeaderProps = {
  isLoggedIn: boolean
  currentUser: string | null
  role: 'admin' | 'user' | null
  onLoginClick: () => void
  onLogoutClick: () => void
  onToggleDeleteUsers: () => void
  isLoggingOut: boolean
  isDeleteUsersOpen: boolean
}

export function Header({
  isLoggedIn,
  currentUser,
  role,
  onLoginClick,
  onLogoutClick,
  onToggleDeleteUsers,
  isLoggingOut,
  isDeleteUsersOpen,
}: HeaderProps) {
  const dateLabel = useMemo(() => new Date().toLocaleDateString('cs-CZ', { day: '2-digit', month: 'short', year: 'numeric' }), [])

  return (
    <header className="sticky top-0 z-10 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="flex h-16 w-full items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <img src={ujpLogo} alt="UJP Praha" className="h-9 w-auto" />
          <div className="flex flex-col leading-tight">
            <span className="text-[11px] uppercase text-slate-500">{dateLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm text-slate-500">
          {isLoggedIn ? (
            <>
              <span className="font-medium text-slate-900">{currentUser}</span>
              {role === 'admin' && (
                <button
                  type="button"
                  onClick={onToggleDeleteUsers}
                  className="transition hover:text-slate-900"
                >
                  {isDeleteUsersOpen ? 'Close delete' : 'Delete user'}
                </button>
              )}
              <button
                type="button"
                onClick={onLogoutClick}
                className="transition hover:text-slate-900"
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onLoginClick}
              className="transition hover:text-slate-900"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
