import type { FormEvent } from 'react'

export type AuthMode = 'login' | 'register'

type AuthDialogProps = {
  authMode: AuthMode
  username: string
  password: string
  confirmPassword: string
  loginError: string | null
  isSubmittingLogin: boolean
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onAuthModeToggle: () => void
  onUsernameChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onConfirmPasswordChange: (value: string) => void
}

export function AuthDialog({
  authMode,
  username,
  password,
  confirmPassword,
  loginError,
  isSubmittingLogin,
  onClose,
  onSubmit,
  onAuthModeToggle,
  onUsernameChange,
  onPasswordChange,
  onConfirmPasswordChange,
}: AuthDialogProps) {
  return (
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
            onClick={onClose}
            className="text-sm text-slate-400 transition hover:text-slate-700"
          >
            Close
          </button>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Username</span>
            <input
              type="text"
              value={username}
              onChange={(event) => onUsernameChange(event.target.value)}
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
              onChange={(event) => onPasswordChange(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </label>

          {authMode === 'register' && (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Confirm password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => onConfirmPasswordChange(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                autoComplete="new-password"
                required
              />
            </label>
          )}

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
          onClick={onAuthModeToggle}
          className="mt-4 text-sm text-slate-500 transition hover:text-slate-900"
        >
          {authMode === 'login' ? 'Register' : 'Log in'}
        </button>
      </div>
    </div>
  )
}
