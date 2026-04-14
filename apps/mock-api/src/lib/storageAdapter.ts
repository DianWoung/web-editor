import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { HttpError } from './httpErrors.ts'

export type StoredUpload = {
  id: string
  fileName: string
  storageKey: string
  publicUrl: string
  mimeType: string
  sizeBytes: number
  createdAt: string
}

export type UploadableFile = {
  originalname: string
  mimetype: string
  size: number
  buffer: Buffer
}

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

function sanitizeFileName(fileName: string) {
  const baseName = path.basename(fileName).trim() || 'model.glb'
  return baseName.replace(/[^a-zA-Z0-9._-]+/g, '-')
}

export function createStorageAdapter(dataRoot: string) {
  const uploadsRoot = path.join(dataRoot, 'storage', 'asset-uploads')

  async function saveModelUpload(file: UploadableFile): Promise<StoredUpload> {
    const id = createId('upload')
    const fileName = sanitizeFileName(file.originalname)
    const storageKey = path.posix.join('asset-uploads', id, fileName)
    const absoluteDir = path.join(uploadsRoot, id)
    const absolutePath = path.join(absoluteDir, fileName)
    const createdAt = new Date().toISOString()

    await mkdir(absoluteDir, { recursive: true })
    await writeFile(absolutePath, file.buffer)

    return {
      id,
      fileName,
      storageKey,
      publicUrl: `/api/assets/uploads/${id}/${fileName}`,
      mimeType: file.mimetype || 'application/octet-stream',
      sizeBytes: file.size,
      createdAt,
    }
  }

  async function readUpload(uploadId: string, fileName: string) {
    const safeName = sanitizeFileName(fileName)
    const absolutePath = path.join(uploadsRoot, uploadId, safeName)
    try {
      const buffer = await readFile(absolutePath)
      return { absolutePath, buffer }
    } catch {
      throw new HttpError(404, `上传文件不存在：${uploadId}/${safeName}`)
    }
  }

  return {
    saveModelUpload,
    readUpload,
  }
}
