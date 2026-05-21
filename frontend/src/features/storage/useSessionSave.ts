import { useState } from 'react'

import { saveSession } from '../../lib/api/client'
import type { SaveSessionPromptMetadata } from '../../lib/api/types'
import { useSessionStore } from '../../lib/store/session'

type ToastKind = 'success' | 'error'

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

  const handleSaveSession = async () => {
    if (!imageUrl || !maskUrl) return

    const file = useSessionStore.getState().file
    if (!file) return

    setIsSavingSession(true)

    try {
      const maskBlob = await fetch(maskUrl).then((response) => response.blob())
      const scope = selectedSaveScope ?? 'private'
      const promptMetadata: SaveSessionPromptMetadata = {
        model,
        prompt_mode: promptMode,
        preprocessing_mode: preprocessingMode,
        bounding_box: boundingBox,
        prompt_points: promptPoints,
        created_at: new Date().toISOString(),
      }
      const result = await saveSession(file, maskBlob, scope, selectedSavePath, promptMetadata)
      pushToast('success', `Saved to ${scope}/${result.path}`)
      bumpFolderTreeVersion()
    } catch (error) {
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
  }
}
