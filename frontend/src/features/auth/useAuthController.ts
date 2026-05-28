import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import { deleteUser, fetchCurrentUser, fetchUsers, login, logout, register } from '../../lib/api/client'
import type { UserListItem, UserRole } from '../../lib/api/types'
import { useSessionStore } from '../../lib/store/session'
import type { AuthMode } from './AuthDialog'

type UseAuthControllerResult = {
  isLoggedIn: boolean
  currentUser: string | null
  role: UserRole | null
  isLoggingOut: boolean
  isDeleteUsersOpen: boolean
  isLoginOpen: boolean
  authMode: AuthMode
  username: string
  password: string
  confirmPassword: string
  loginError: string | null
  isSubmittingLogin: boolean
  userToDelete: string
  userSuggestions: UserListItem[]
  deleteUserError: string | null
  deleteUserSuccess: string | null
  isDeletingUser: boolean
  openLogin: () => void
  closeLogin: () => void
  toggleAuthMode: () => void
  setUsername: (value: string) => void
  setPassword: (value: string) => void
  setConfirmPassword: (value: string) => void
  toggleDeleteUsers: () => void
  setUserToDelete: (value: string) => void
  handleAuthSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>
  handleLogout: () => Promise<void>
  handleDeleteUser: (event: FormEvent<HTMLFormElement>) => Promise<void>
}

export function useAuthController(): UseAuthControllerResult {
  const isLoggedIn = useSessionStore((state) => state.isLoggedIn)
  const currentUser = useSessionStore((state) => state.currentUser)
  const role = useSessionStore((state) => state.role)
  const setAuth = useSessionStore((state) => state.setAuth)
  const clearAuth = useSessionStore((state) => state.clearAuth)
  const clear = useSessionStore((state) => state.clear)

  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [userToDelete, setUserToDelete] = useState('')
  const [deleteUserError, setDeleteUserError] = useState<string | null>(null)
  const [deleteUserSuccess, setDeleteUserSuccess] = useState<string | null>(null)
  const [isDeletingUser, setIsDeletingUser] = useState(false)
  const [isDeleteUsersOpen, setIsDeleteUsersOpen] = useState(false)
  const [userSuggestions, setUserSuggestions] = useState<UserListItem[]>([])

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

  const openLogin = () => {
    setLoginError(null)
    setAuthMode('login')
    setConfirmPassword('')
    setIsLoginOpen(true)
  }

  const closeLogin = () => {
    setConfirmPassword('')
    setIsLoginOpen(false)
  }

  const toggleAuthMode = () => {
    setLoginError(null)
    setConfirmPassword('')
    setAuthMode((current) => (current === 'login' ? 'register' : 'login'))
  }

  const toggleDeleteUsers = () => {
    setDeleteUserError(null)
    setDeleteUserSuccess(null)
    setIsDeleteUsersOpen((current) => !current)
  }

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoginError(null)

    if (authMode === 'register' && password !== confirmPassword) {
      setLoginError('Passwords do not match')
      return
    }

    setIsSubmittingLogin(true)

    try {
      const user = authMode === 'login'
        ? await login(username, password)
        : await register(username, password)
      setAuth(user)
      setIsLoginOpen(false)
      setPassword('')
      setConfirmPassword('')
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
      setConfirmPassword('')
      setLoginError(null)
      setIsLoginOpen(false)
      setIsDeleteUsersOpen(false)
      setDeleteUserError(null)
      setDeleteUserSuccess(null)
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

  return {
    isLoggedIn,
    currentUser,
    role,
    isLoggingOut,
    isDeleteUsersOpen,
    isLoginOpen,
    authMode,
    username,
    password,
    confirmPassword,
    loginError,
    isSubmittingLogin,
    userToDelete,
    userSuggestions,
    deleteUserError,
    deleteUserSuccess,
    isDeletingUser,
    openLogin,
    closeLogin,
    toggleAuthMode,
    setUsername,
    setPassword,
    setConfirmPassword,
    toggleDeleteUsers,
    setUserToDelete,
    handleAuthSubmit,
    handleLogout,
    handleDeleteUser,
  }
}
