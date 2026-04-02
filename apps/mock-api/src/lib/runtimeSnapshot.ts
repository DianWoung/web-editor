import { access, readFile } from 'node:fs/promises'
import path from 'node:path'

import { HttpError } from './httpErrors.ts'
import { runtimeSnapshotSchema, type RuntimeSnapshot } from '../schemas.ts'

const SNAPSHOT_FILE_NAME = 'snapshot.json'

export async function readRuntimeSnapshot(dataRoot: string): Promise<RuntimeSnapshot | null> {
  const snapshotPath = path.join(dataRoot, 'runtime', SNAPSHOT_FILE_NAME)

  try {
    await access(snapshotPath)
  } catch {
    return null
  }

  let text: string
  try {
    text = await readFile(snapshotPath, 'utf8')
  } catch {
    throw new HttpError(500, `读取文件失败：${snapshotPath}`)
  }

  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new HttpError(500, `JSON 解析失败：${snapshotPath}`)
  }

  const parsed = runtimeSnapshotSchema.safeParse(json)
  if (!parsed.success) {
    throw new HttpError(500, `数据校验失败：${snapshotPath}`)
  }

  return parsed.data
}
