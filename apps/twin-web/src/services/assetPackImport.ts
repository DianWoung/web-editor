export type AssetPackImportFile = {
  name: string
  webkitRelativePath?: string
}

export type GroupedAssetPackFiles<T extends AssetPackImportFile = AssetPackImportFile> = Record<
  string,
  {
    assetFile?: T
    portsFile?: T
    glbFile?: T
  }
>

function resolveAssetFolder(file: AssetPackImportFile): string | null {
  const rel = file.webkitRelativePath
  if (!rel) return null
  const parts = rel.split('/').filter(Boolean)
  if (parts.length < 2) return null
  return parts[parts.length - 2] ?? null
}

export function collectAssetPackFiles<T extends AssetPackImportFile>(files: T[]): GroupedAssetPackFiles<T> {
  const grouped: GroupedAssetPackFiles<T> = {}

  for (const file of files) {
    const assetFolder = resolveAssetFolder(file)
    if (!assetFolder) continue

    grouped[assetFolder] ??= {}
    if (file.name === 'asset.json') grouped[assetFolder]!.assetFile = file
    else if (file.name === 'ports.json') grouped[assetFolder]!.portsFile = file
    else if (file.name === 'model.glb') grouped[assetFolder]!.glbFile = file
  }

  return grouped
}
