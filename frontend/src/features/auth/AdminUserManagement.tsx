import type { FormEvent } from 'react'

import type { UserListItem } from '../../lib/api/types'

type AdminUserManagementProps = {
  userToDelete: string
  userSuggestions: UserListItem[]
  deleteUserError: string | null
  deleteUserSuccess: string | null
  isDeletingUser: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onUserToDeleteChange: (value: string) => void
}

export function AdminUserManagement({
  userToDelete,
  userSuggestions,
  deleteUserError,
  deleteUserSuccess,
  isDeletingUser,
  onSubmit,
  onUserToDeleteChange,
}: AdminUserManagementProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <header>
        <p className="text-sm font-semibold text-slate-800">Admin user management</p>
      </header>

      <form className="mt-4 flex flex-col gap-3 md:flex-row md:items-end" onSubmit={onSubmit}>
        <label className="flex-1">
          <span className="mb-2 block text-sm font-medium text-slate-700">Username to delete</span>
          <input
            type="text"
            value={userToDelete}
            onChange={(event) => onUserToDeleteChange(event.target.value)}
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
  )
}
