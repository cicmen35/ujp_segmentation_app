/**
 * Tests for useAuthController
 *
 * Covers:
 *  - session restore on mount (fetchCurrentUser success + failure)
 *  - login flow: setAuth called, dialog closed, session cleared on success
 *  - login failure: loginError populated, dialog stays open
 *  - register flow: calls register() not login()
 *  - password mismatch validation (client-side, no API call)
 *  - logout: clearAuth + clear called, all local state reset
 *  - delete user: success and error states
 *  - toggleDeleteUsers: opens/closes the panel and resets error/success
 */
import { renderHook, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthController } from '../features/auth/useAuthController'
import { useSessionStore } from '../lib/store/session'

// ─── Mock the API client ───────────────────────────────────────────────────────
vi.mock('../lib/api/client', () => ({
  fetchCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  deleteUser: vi.fn(),
  fetchUsers: vi.fn().mockResolvedValue([]),
}))

import {
  fetchCurrentUser,
  login,
  logout,
  register,
  deleteUser,
} from '../lib/api/client'

const mockFetchCurrentUser = vi.mocked(fetchCurrentUser)
const mockLogin = vi.mocked(login)
const mockLogout = vi.mocked(logout)
const mockRegister = vi.mocked(register)
const mockDeleteUser = vi.mocked(deleteUser)

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fakeSubmit() {
  return {
    preventDefault: vi.fn(),
  } as unknown as React.FormEvent<HTMLFormElement>
}

function resetStore() {
  useSessionStore.setState({
    isLoggedIn: false, currentUser: null, role: null,
    file: null, imageUrl: null, maskUrl: null,
    boundingBox: null, promptPoints: [],
    model: 'sam', promptMode: 'box', preprocessingMode: 'none',
    selectedSaveScope: null, selectedSavePath: null, folderTreeVersion: 0,
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('useAuthController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStore()
  })

  // ── mount behaviour ─────────────────────────────────────────────────────────
  it('restores auth state from fetchCurrentUser on mount', async () => {
    mockFetchCurrentUser.mockResolvedValue({ id: '1', username: 'alice', role: 'user' })

    const { result } = renderHook(() => useAuthController())

    // Let the async effect complete
    await act(async () => {})

    expect(result.current.isLoggedIn).toBe(true)
    expect(result.current.currentUser).toBe('alice')
    expect(result.current.role).toBe('user')
  })

  it('stays logged-out when fetchCurrentUser fails', async () => {
    mockFetchCurrentUser.mockRejectedValue(new Error('Unauthorized'))

    const { result } = renderHook(() => useAuthController())

    await act(async () => {})

    expect(result.current.isLoggedIn).toBe(false)
    expect(result.current.currentUser).toBeNull()
  })

  // ── login flow ──────────────────────────────────────────────────────────────
  it('calls login(), sets auth, and closes dialog on successful login', async () => {
    mockFetchCurrentUser.mockRejectedValue(new Error('no session'))
    mockLogin.mockResolvedValue({ id: '2', username: 'bob', role: 'user' })

    const { result } = renderHook(() => useAuthController())
    await act(async () => {})

    act(() => { result.current.openLogin() })
    act(() => { result.current.setUsername('bob') })
    act(() => { result.current.setPassword('pass') })

    await act(async () => {
      await result.current.handleAuthSubmit(fakeSubmit())
    })

    expect(mockLogin).toHaveBeenCalledWith('bob', 'pass')
    expect(result.current.isLoggedIn).toBe(true)
    expect(result.current.isLoginOpen).toBe(false)
    expect(result.current.loginError).toBeNull()
  })

  it('populates loginError and keeps dialog open on login failure', async () => {
    mockFetchCurrentUser.mockRejectedValue(new Error('no session'))
    mockLogin.mockRejectedValue(new Error('Invalid credentials'))

    const { result } = renderHook(() => useAuthController())
    await act(async () => {})

    act(() => { result.current.openLogin() })
    act(() => { result.current.setUsername('bob') })
    act(() => { result.current.setPassword('wrong') })

    await act(async () => {
      await result.current.handleAuthSubmit(fakeSubmit())
    })

    expect(result.current.loginError).toBe('Invalid credentials')
    expect(result.current.isLoginOpen).toBe(true)
    expect(result.current.isLoggedIn).toBe(false)
  })

  // ── register flow ───────────────────────────────────────────────────────────
  it('calls register() (not login) when authMode is register', async () => {
    mockFetchCurrentUser.mockRejectedValue(new Error('no session'))
    mockRegister.mockResolvedValue({ id: '3', username: 'carol', role: 'user' })

    const { result } = renderHook(() => useAuthController())
    await act(async () => {})

    act(() => { result.current.openLogin() })
    act(() => { result.current.toggleAuthMode() }) // switch to register
    act(() => { result.current.setUsername('carol') })
    act(() => { result.current.setPassword('pass') })
    act(() => { result.current.setConfirmPassword('pass') })

    await act(async () => {
      await result.current.handleAuthSubmit(fakeSubmit())
    })

    expect(mockRegister).toHaveBeenCalledWith('carol', 'pass')
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('sets loginError and never calls API when passwords do not match', async () => {
    mockFetchCurrentUser.mockRejectedValue(new Error('no session'))

    const { result } = renderHook(() => useAuthController())
    await act(async () => {})

    act(() => { result.current.openLogin() })
    act(() => { result.current.toggleAuthMode() })
    act(() => { result.current.setPassword('aaa') })
    act(() => { result.current.setConfirmPassword('bbb') })

    await act(async () => {
      await result.current.handleAuthSubmit(fakeSubmit())
    })

    expect(result.current.loginError).toBe('Passwords do not match')
    expect(mockRegister).not.toHaveBeenCalled()
    expect(mockLogin).not.toHaveBeenCalled()
  })

  // ── logout flow ─────────────────────────────────────────────────────────────
  it('calls logout(), clears auth and session state', async () => {
    mockFetchCurrentUser.mockResolvedValue({ id: '1', username: 'alice', role: 'user' })
    mockLogout.mockResolvedValue(undefined)

    const { result } = renderHook(() => useAuthController())
    await act(async () => {})

    expect(result.current.isLoggedIn).toBe(true)

    await act(async () => { await result.current.handleLogout() })

    expect(mockLogout).toHaveBeenCalled()
    expect(result.current.isLoggedIn).toBe(false)
    expect(result.current.currentUser).toBeNull()
    expect(result.current.isLoggingOut).toBe(false)
    expect(result.current.isLoginOpen).toBe(false)
  })

  it('still clears auth even if logout() throws', async () => {
    mockFetchCurrentUser.mockResolvedValue({ id: '1', username: 'alice', role: 'user' })
    mockLogout.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useAuthController())
    await act(async () => {})

    // handleLogout uses try/finally (no catch), so the error propagates after
    // the finally block clears auth state. We catch it here so the test doesn't fail.
    await act(async () => {
      try {
        await result.current.handleLogout()
      } catch {
        // expected — logout() threw, but the finally block still ran
      }
    })

    // clearAuth is called in finally block, so state is cleared regardless
    expect(result.current.isLoggedIn).toBe(false)
  })

  // ── delete user flow ─────────────────────────────────────────────────────────
  it('sets deleteUserSuccess after successful deletion', async () => {
    mockFetchCurrentUser.mockResolvedValue({ id: '1', username: 'admin', role: 'admin' })
    mockDeleteUser.mockResolvedValue(undefined)

    const { result } = renderHook(() => useAuthController())
    await act(async () => {})

    act(() => { result.current.setUserToDelete('bob') })

    await act(async () => {
      await result.current.handleDeleteUser(fakeSubmit())
    })

    expect(mockDeleteUser).toHaveBeenCalledWith('bob')
    expect(result.current.deleteUserSuccess).toContain('bob')
    expect(result.current.deleteUserError).toBeNull()
    expect(result.current.userToDelete).toBe('')
  })

  it('sets deleteUserError on deletion failure', async () => {
    mockFetchCurrentUser.mockResolvedValue({ id: '1', username: 'admin', role: 'admin' })
    mockDeleteUser.mockRejectedValue(new Error('User not found'))

    const { result } = renderHook(() => useAuthController())
    await act(async () => {})

    act(() => { result.current.setUserToDelete('ghost') })

    await act(async () => {
      await result.current.handleDeleteUser(fakeSubmit())
    })

    expect(result.current.deleteUserError).toBe('User not found')
    expect(result.current.deleteUserSuccess).toBeNull()
  })

  // ── toggle delete users panel ─────────────────────────────────────────────────
  it('toggleDeleteUsers opens and closes the panel, resetting errors', async () => {
    mockFetchCurrentUser.mockRejectedValue(new Error('no session'))

    const { result } = renderHook(() => useAuthController())
    await act(async () => {})

    expect(result.current.isDeleteUsersOpen).toBe(false)
    act(() => { result.current.toggleDeleteUsers() })
    expect(result.current.isDeleteUsersOpen).toBe(true)

    act(() => { result.current.toggleDeleteUsers() })
    expect(result.current.isDeleteUsersOpen).toBe(false)
    expect(result.current.deleteUserError).toBeNull()
    expect(result.current.deleteUserSuccess).toBeNull()
  })
})
