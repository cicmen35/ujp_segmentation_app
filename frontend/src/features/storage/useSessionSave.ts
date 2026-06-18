import { useState } from 'react'

import { saveSession, SessionSaveConflictError } from '../../lib/api/client'
import type { SaveSessionPromptMetadata } from '../../lib/api/types'
import { useSessionStore } from '../../lib/store/session'

type ToastKind = 'success' | 'error'
type PendingSaveConflict = {
  originalImage: File
  maskBlob: Blob
  scope: 'shared' | 'private'
  parentPath: string | null
  promptMetadata: SaveSessionPromptMetadata
  sessionName: string
}

export function useSessionSave(pushToast: (kind: ToastKind, message: string) => void) {
  const imageUrl = useSessionStore((state) => state.imageUrl)
  const maskUrl = useSessionStore((state) => state.maskUrl)
  const selectedSaveScope = useSessionStore((state) => state.selectedSaveScope)
  const selectedSavePath = useSessionStore((state) => state.selectedSavePath)
  const bumpFolderTreeVersion = useSessionStore((state) => state.bumpFolderTreeVersion)
  const model = useSessionStore((state) => state.model)
  const promptMode = useSessionStore((state) => state.promptMode)
  const preprocessingMode = useSessionStore((state) => state.preprocessingMode)
  const boundingBox = useSessionStore((state) => state.boundingBox)
  const promptPoints = useSessionStore((state) => state.promptPoints)

  const [isSavingSession, setIsSavingSession] = useState(false)
  const [pendingSaveConflict, setPendingSaveConflict] = useState<PendingSaveConflict | null>(null)
  const [saveConflictName, setSaveConflictName] = useState('')

  const clearSaveConflict = () => {
    setPendingSaveConflict(null)
    setSaveConflictName('')
  }

  const runSaveSession = async (
    originalImage: File,
    maskBlob: Blob,
    scope: 'shared' | 'private',
    parentPath: string | null,
    promptMetadata: SaveSessionPromptMetadata,
    options?: { sessionName?: string; replace?: boolean },
  ) => {
    const result = await saveSession(originalImage, maskBlob, scope, parentPath, promptMetadata, options)
    pushToast('success', `Saved to ${scope}/${result.path}`)
    bumpFolderTreeVersion()
    clearSaveConflict()
  }

  const handleSaveSession = async () => {
    if (!imageUrl || !maskUrl) return

    const file = useSessionStore.getState().file
    if (!file) return

    const scope = selectedSaveScope ?? 'private'
    const promptMetadata: SaveSessionPromptMetadata = {
      model,
      prompt_mode: promptMode,
      preprocessing_mode: preprocessingMode,
      bounding_box: boundingBox,
      prompt_points: promptPoints,
      created_at: new Date().toISOString(),
    }

    setIsSavingSession(true)

    try {
      const maskBlob = await fetch(maskUrl).then((response) => response.blob())
      await runSaveSession(file, maskBlob, scope, selectedSavePath, promptMetadata)
    } catch (error) {
      if (error instanceof SessionSaveConflictError) {
        const maskBlob = await fetch(maskUrl).then((response) => response.blob())
        setPendingSaveConflict({
          originalImage: file,
          maskBlob,
          scope,
          parentPath: selectedSavePath,
          promptMetadata,
          sessionName: error.sessionName,
        })
        setSaveConflictName(error.sessionName)
        return
      }

      if (error instanceof Error && error.message === 'Not authenticated') {
        pushToast('error', 'Session save is unavailable in the current session')
      } else {
        pushToast('error', error instanceof Error ? error.message : 'Failed to save session')
      }
    } finally {
      setIsSavingSession(false)
    }
  }

  return {
    isSavingSession,
    handleSaveSession,
    pendingSaveConflict,
    saveConflictName,
    setSaveConflictName,
    clearSaveConflict,
    handleReplaceConflict: async () => {
      if (!pendingSaveConflict) return

      setIsSavingSession(true)
      try {
        await runSaveSession(
          pendingSaveConflict.originalImage,
          pendingSaveConflict.maskBlob,
            pendingSaveConflict.scope,
            pendingSaveConflict.parentPath,
            pendingSaveConflict.promptMetadata,
            {
            sessionName: pendingSaveConflict.sessionName,
            replace: true,
          },
        )
      } catch (error) {
        if (error instanceof SessionSaveConflictError) {
          setPendingSaveConflict((current) => (
            current
              ? { ...current, sessionName: error.sessionName }
              : current
          ))
          setSaveConflictName(error.sessionName)
          return
        }

        pushToast('error', error instanceof Error ? error.message : 'Failed to replace session')
      } finally {
        setIsSavingSession(false)
      }
    },
    handleRenameConflict: async () => {
      if (!pendingSaveConflict) return

      const nextName = saveConflictName.trim()
      if (!nextName) return

      setIsSavingSession(true)
      try {
        await runSaveSession(
          pendingSaveConflict.originalImage,
          pendingSaveConflict.maskBlob,
          pendingSaveConflict.scope,
          pendingSaveConflict.parentPath,
          pendingSaveConflict.promptMetadata,
          {
            sessionName: nextName,
          },
        )
      } catch (error) {
        if (error instanceof SessionSaveConflictError) {
          setPendingSaveConflict((current) => (
            current
              ? { ...current, sessionName: error.sessionName }
              : current
          ))
          setSaveConflictName(error.sessionName)
          return
        }

        pushToast('error', error instanceof Error ? error.message : 'Failed to save session')
      } finally {
        setIsSavingSession(false)
      }
    },
  }
}
