import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')

  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            if (id.includes('echarts')) return 'charts-vendor'
            if (id.includes('troika-three-text') || id.includes('/troika-')) return 'troika-vendor'
            if (id.includes('three-stdlib')) return 'three-stdlib-vendor'
            if (id.includes('react-reconciler')) return 'react-reconciler-vendor'
            if (id.includes('@react-three/fiber')) return 'r3f-vendor'
            if (id.includes('/three/')) return 'three-core-vendor'
            if (id.includes('react-router-dom') || id.includes('/react-dom/') || id.includes('/react/')) {
              return 'react-vendor'
            }
            if (id.includes('/zod/')) return 'validation-vendor'
            return undefined
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: env.VITE_PROXY_API_TARGET || 'http://127.0.0.1:3001',
          changeOrigin: true,
        },
      },
    },
  }
})
