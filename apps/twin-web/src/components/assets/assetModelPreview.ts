export function getAssetPreviewModelUrl(assetKey: string | null | undefined, explicitModelUrl: string | null | undefined) {
  if (explicitModelUrl) {
    return explicitModelUrl
  }

  if (!assetKey) {
    return null
  }

  return `/equipment/${assetKey}/model.glb`
}

export function canRenderModelCanvas() {
  return typeof window !== 'undefined' && 'ResizeObserver' in window
}
