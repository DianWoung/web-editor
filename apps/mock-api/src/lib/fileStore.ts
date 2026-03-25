import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { ZodType } from 'zod'

import { HttpError } from './httpErrors.ts'

async function ensureParentDir(filePath: string) {
  await mkdir(path.dirname(filePath), { recursive: true })
}

export async function readJsonFile<T>(filePath: string, schema: ZodType<T>): Promise<T> {
  let text: string
  try {
    text = await readFile(filePath, 'utf8')
  } catch (error) {
    throw new HttpError(500, `读取文件失败：${filePath}`)
  }

  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new HttpError(500, `JSON 解析失败：${filePath}`)
  }

  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    throw new HttpError(500, `数据校验失败：${filePath}`)
  }
  return parsed.data
}

export async function writeJsonFile<T>(filePath: string, data: T) {
  await ensureParentDir(filePath)
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
}
