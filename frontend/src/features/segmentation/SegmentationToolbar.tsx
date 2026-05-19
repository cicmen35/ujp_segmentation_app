import { useState } from 'react'

import { savePromptPreset, fetchPromptPreset } from '../../lib/api/client'
import { useSessionStore } from '../../lib/store/session'
import { SegmentPanel } from './SegmentPanel'

type ToastKind = 'success' | 'error'

type SegmentationToolbarProps = {
  isLoggedIn: boolean
  onReset: () => void
  onUndo: () => void
  hasPromptData: boolean
  pushToast: (kind: ToastKind, message: string) => void
}

export function SegmentationToolbar({
  isLoggedIn,
  onReset,
  onUndo,
  hasPromptData,
  pushToast,
}: SegmentationToolbarProps) {
  const model = useSessionStore((state) => state.model)
  const promptMode = useSessionStore((state) => state.promptMode)
  const preprocessingMode = useSessionStore((state) => state.preprocessingMode)
  const boundingBox = useSessionStore((state) => state.boundingBox)
  const promptPoints = useSessionStore((state) => state.promptPoints)
  const setModel = useSessionStore((state) => state.setModel)
  const setPromptMode = useSessionStore((state) => state.setPromptMode)
  const setPreprocessingMode = useSessionStore((state) => state.setPreprocessingMode)
  const setBoundingBox = useSessionStore((state) => state.setBoundingBox)
  const setPromptPoints = useSessionStore((state) => state.setPromptPoints)

  const [isApplyingPromptPreset, setIsApplyingPromptPreset] = useState(false)
  const [isSavingPromptPreset, setIsSavingPromptPreset] = useState(false)

  const handleApplyPromptPreset = async () => {
    setIsApplyingPromptPreset(true)

    try {
      const preset = await fetchPromptPreset()
      if (!preset) {
        pushToast('error', 'No preferred prompt saved yet')
        return
      }

      setModel(preset.model)
      setPromptMode(preset.prompt_mode)
      setPreprocessingMode(preset.preprocessing_mode)
      setBoundingBox(preset.bounding_box)
      setPromptPoints(preset.prompt_points)
      pushToast('success', 'Preferred prompt applied')
    } catch (error) {
      pushToast('error', error instanceof Error ? error.message : 'Failed to apply preferred prompt')
    } finally {
      setIsApplyingPromptPreset(false)
    }
  }

  const handleSavePromptPreset = async () => {
    setIsSavingPromptPreset(true)

    try {
      await savePromptPreset({
        model,
        prompt_mode: promptMode,
        preprocessing_mode: preprocessingMode,
        bounding_box: boundingBox,
        prompt_points: promptPoints,
      })
      pushToast('success', 'Preferred prompt saved')
    } catch (error) {
      pushToast('error', error instanceof Error ? error.message : 'Failed to save preferred prompt')
    } finally {
      setIsSavingPromptPreset(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onReset}
        className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
      >
        Reset
      </button>

      <button
        type="button"
        onClick={onUndo}
        className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white"
        disabled={!hasPromptData}
      >
        Undo
      </button>

      <SegmentPanel />

      {isLoggedIn && (
        <>
          {hasPromptData && (
            <button
              type="button"
              onClick={handleSavePromptPreset}
              disabled={isSavingPromptPreset}
              className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingPromptPreset ? 'Saving preset...' : 'Save preferred prompt'}
            </button>
          )}

          <button
            type="button"
            onClick={handleApplyPromptPreset}
            disabled={isApplyingPromptPreset}
            className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isApplyingPromptPreset ? 'Applying preset...' : 'Apply preferred prompt'}
          </button>
        </>
      )}
    </>
  )
}
