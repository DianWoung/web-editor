import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'

function listAncestorDirs(startDir: string) {
  const dirs: string[] = []
  let current = path.resolve(startDir)
  while (!dirs.includes(current)) {
    dirs.push(current)
    const parent = path.dirname(current)
    if (parent === current) {
      break
    }
    current = parent
  }
  return dirs
}

function resolveImportPackModel(repoRoot: string, assetKey: string) {
  const importPacksRoot = path.join(repoRoot, 'assets', 'import-packs')
  if (!existsSync(importPacksRoot)) {
    return null
  }

  for (const packName of readdirSync(importPacksRoot, { withFileTypes: true })) {
    if (!packName.isDirectory()) {
      continue
    }
    const candidate = path.join(importPacksRoot, packName.name, assetKey, 'model.glb')
    if (existsSync(candidate)) {
      return candidate
    }
  }

  return null
}

export function resolveLegacyModelPath(dataRoot: string, assetKey: string) {
  const directDataPath = path.join(dataRoot, 'equipment', assetKey, 'model.glb')
  if (existsSync(directDataPath)) {
    return directDataPath
  }

  for (const ancestorDir of listAncestorDirs(dataRoot)) {
    const importPackModel = resolveImportPackModel(ancestorDir, assetKey)
    if (importPackModel) {
      return importPackModel
    }

    const publicEquipmentModel = path.join(ancestorDir, 'apps', 'twin-web', 'public', 'equipment', assetKey, 'model.glb')
    if (existsSync(publicEquipmentModel)) {
      return publicEquipmentModel
    }
  }

  return null
}
