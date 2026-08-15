/**
 * Tests for useSessionSave
 *
 * Covers:
 *  - happy path: toast and folder-tree bump on successful save
 *  - conflict detection: pendingSaveConflict state is populated on SessionSaveConflictError
 *  - handleReplaceConflict: calls saveSession with replace=true and clears conflict
 *  - handleRenameConflict: calls saveSession with new name and clears conflict
 *  - "Not authenticated" error shows specific toast copy
 *  - generic errors show the error message toast
 */
import { renderHook, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessionSave } from '../features/storage/useSessionSave'
import { SessionSaveConflictError } from '../lib/api/client'
import { useSessionStore } from '../lib/store/session'

// ─── Mock the API client ───────────────────────────────────────────────────────
vi.mock('../lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api/client')>()
  return {
    ...actual,
    saveSession: vi.fn(),
  }
})

import { saveSession } from '../lib/api/client'
const mockSaveSession = vi.mocked(saveSession)

// ─── Helpers ───────────────────────────────────────────────────────────────────
function makeFile(name = 'test.png') {
  return new File(['content'], name, { type: 'image/png' })
}

function makeMaskBlob() {
  return new Blob(['mask'], { type: 'image/png' })
}

/** Seed the session store with the minimum state needed for a save */
function seedStore(overrides: Partial<Parameters<typeof useSessionStore.getState>[0]> = {}) {
  const store = useSessionStore.getState()
  store.setFile(makeFile())
  // maskUrl cannot be set via store action while mocking fetch; set directly
  useSessionStore.setState({
    maskUrl: 'blob:mock-mask-url',
    selectedSaveScope: 'private',
    selectedSavePath: null,
    model: 'sam',
    promptMode: 'box',
    preprocessingMode: 'none',
    boundingBox: [10, 20, 100, 200],
    promptPoints: [],
    ...overrides,
  })
}

/** Mock global fetch so maskUrl blob retrieval works */
function mockFetch(blob: Blob) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    blob: () => Promise.resolve(blob),
  } as unknown as Response)
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('useSessionSave', () => {
  let pushToast: ReturnType<typeof vi.fn>

  beforeEach(() => {
    pushToast = vi.fn()
    vi.clearAllMocks()
    // Reset Zustand store
    useSessionStore.setState(useSessionStore.getInitialState?.() ?? {
      file: null, imageUrl: null, maskUrl: null, boundingBox: null,
      promptPoints: [], model: 'sam', promptMode: 'box',
      preprocessingMode: 'none', isLoggedIn: false, currentUser: null,
      role: null, selectedSaveScope: null, selectedSavePath: null,
      folderTreeVersion: 0,
    })
  })

  it('calls pushToast with success and bumps folderTreeVersion on successful save', async () => {
    const maskBlob = makeMaskBlob()
    mockFetch(maskBlob)
    seedStore()

    mockSaveSession.mockResolvedValue({
      scope: 'private',
      session_folder: 'my-folder',
      path: 'my-folder/session',
      original_image: 'original.png',
      mask_image: 'mask.png',
    })

    const { result } = renderHook(() => useSessionSave(pushToast))

    const versionBefore = useSessionStore.getState().folderTreeVersion
    await act(async () => { await result.current.handleSaveSession() })

    expect(pushToast).toHaveBeenCalledWith('success', expect.stringContaining('private'))
    expect(useSessionStore.getState().folderTreeVersion).toBe(versionBefore + 1)
    expect(result.current.isSavingSession).toBe(false)
  })

  it('populates pendingSaveConflict when SessionSaveConflictError is thrown', async () => {
    const maskBlob = makeMaskBlob()
    mockFetch(maskBlob)
    seedStore()

    mockSaveSession.mockRejectedValue(
      new SessionSaveConflictError('my-session', 'Session already exists')
    )

    const { result } = renderHook(() => useSessionSave(pushToast))

    await act(async () => { await result.current.handleSaveSession() })

    expect(result.current.pendingSaveConflict).not.toBeNull()
    expect(result.current.saveConflictName).toBe('my-session')
    expect(pushToast).not.toHaveBeenCalled()
  })

  it('handleReplaceConflict calls saveSession with replace=true and clears conflict', async () => {
    const maskBlob = makeMaskBlob()
    mockFetch(maskBlob)
    seedStore()

    // First call raises conflict, second call succeeds
    mockSaveSession
      .mockRejectedValueOnce(new SessionSaveConflictError('my-session'))
      .mockResolvedValue({
        scope: 'private', session_folder: '', path: 'path/session',
        original_image: '', mask_image: '',
      })

    const { result } = renderHook(() => useSessionSave(pushToast))

    // Trigger conflict
    await act(async () => { await result.current.handleSaveSession() })
    expect(result.current.pendingSaveConflict).not.toBeNull()

    // Resolve via replace
    await act(async () => { await result.current.handleReplaceConflict() })

    expect(mockSaveSession).toHaveBeenLastCalledWith(
      expect.any(File),
      expect.any(Blob),
      'private',
      null,
      expect.any(Object),
      expect.objectContaining({ replace: true, sessionName: 'my-session' }),
    )
    expect(result.current.pendingSaveConflict).toBeNull()
    expect(pushToast).toHaveBeenCalledWith('success', expect.any(String))
  })

  it('handleRenameConflict calls saveSession with the new name', async () => {
    const maskBlob = makeMaskBlob()
    mockFetch(maskBlob)
    seedStore()

    mockSaveSession
      .mockRejectedValueOnce(new SessionSaveConflictError('original-name'))
      .mockResolvedValue({
        scope: 'private', session_folder: '', path: 'p/s',
        original_image: '', mask_image: '',
      })

    const { result } = renderHook(() => useSessionSave(pushToast))

    await act(async () => { await result.current.handleSaveSession() })
    act(() => { result.current.setSaveConflictName('renamed-session') })
    await act(async () => { await result.current.handleRenameConflict() })

    expect(mockSaveSession).toHaveBeenLastCalledWith(
      expect.any(File),
      expect.any(Blob),
      'private',
      null,
      expect.any(Object),
      expect.objectContaining({ sessionName: 'renamed-session' }),
    )
    expect(result.current.pendingSaveConflict).toBeNull()
  })

  it('shows specific "unavailable" toast on Not authenticated error', async () => {
    const maskBlob = makeMaskBlob()
    mockFetch(maskBlob)
    seedStore()

    mockSaveSession.mockRejectedValue(new Error('Not authenticated'))

    const { result } = renderHook(() => useSessionSave(pushToast))

    await act(async () => { await result.current.handleSaveSession() })

    expect(pushToast).toHaveBeenCalledWith(
      'error',
      'Session save is unavailable in the current session',
    )
  })

  it('shows generic error toast for unknown errors', async () => {
    const maskBlob = makeMaskBlob()
    mockFetch(maskBlob)
    seedStore()

    mockSaveSession.mockRejectedValue(new Error('Network failure'))

    const { result } = renderHook(() => useSessionSave(pushToast))

    await act(async () => { await result.current.handleSaveSession() })

    expect(pushToast).toHaveBeenCalledWith('error', 'Network failure')
  })

  it('does nothing when maskUrl is absent', async () => {
    seedStore()
    useSessionStore.setState({ maskUrl: null })

    const { result } = renderHook(() => useSessionSave(pushToast))

    await act(async () => { await result.current.handleSaveSession() })

    expect(mockSaveSession).not.toHaveBeenCalled()
    expect(pushToast).not.toHaveBeenCalled()
  })
})
