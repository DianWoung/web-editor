import { create } from 'zustand'

export type TransformMode = 'translate' | 'rotate'
export type SnapGridOption = 0 | 0.25 | 0.5 | 1

type EditorUiState = {
  wireFrom: { deviceId: string; portId: string } | null
  transformMode: TransformMode
  lastError: string | null
  showGrid: boolean
  showPipes: boolean
  snapGrid: SnapGridOption
  cameraResetNonce: number
  flowEnabled: boolean
}

type EditorUiActions = {
  clearError: () => void
  setError: (msg: string | null) => void
  setTransformMode: (mode: TransformMode) => void
  setWireFrom: (wireFrom: { deviceId: string; portId: string } | null) => void
  setShowGrid: (showGrid: boolean) => void
  setShowPipes: (showPipes: boolean) => void
  setSnapGrid: (snapGrid: SnapGridOption) => void
  requestEditorCameraReset: () => void
  setFlowEnabled: (flowEnabled: boolean) => void
  resetTransientState: () => void
  reset: () => void
}

export type EditorUiStoreState = EditorUiState & EditorUiActions

export const editorUiDefaults: EditorUiState = {
  wireFrom: null,
  transformMode: 'translate',
  lastError: null,
  showGrid: true,
  showPipes: true,
  snapGrid: 0,
  cameraResetNonce: 0,
  flowEnabled: false,
}

export const useEditorUiStore = create<EditorUiStoreState>((set) => ({
  ...editorUiDefaults,

  clearError: () => set({ lastError: null }),
  setError: (lastError) => set({ lastError }),
  setTransformMode: (transformMode) => set({ transformMode }),
  setWireFrom: (wireFrom) => set({ wireFrom }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setShowPipes: (showPipes) => set({ showPipes }),
  setSnapGrid: (snapGrid) => set({ snapGrid }),
  requestEditorCameraReset: () =>
    set((state) => ({
      cameraResetNonce: state.cameraResetNonce + 1,
    })),
  setFlowEnabled: (flowEnabled) => set({ flowEnabled }),
  resetTransientState: () =>
    set((state) => ({
      ...state,
      wireFrom: null,
      lastError: null,
    })),
  reset: () => set({ ...editorUiDefaults }),
}))
