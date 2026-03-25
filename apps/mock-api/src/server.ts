import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createApp } from './app.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataRoot = path.resolve(__dirname, '../data')
const port = Number(process.env.PORT ?? 3001)

createApp({ dataRoot }).listen(port, () => {
  console.log(`[mock-api] listening on http://127.0.0.1:${port}`)
})
