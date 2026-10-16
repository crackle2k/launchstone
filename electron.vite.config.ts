import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  main: { build: { rollupOptions: { input: resolve('electron/main.ts') } } },
  preload: {
    build: {
      rollupOptions: {
        input: resolve('electron/preload.ts'),
        output: { format: 'cjs', entryFileNames: 'index.cjs' },
      },
    },
  },
  renderer: {
    root: '.',
    plugins: [
      react(),
      {
        name: 'development-refresh-csp',
        apply: 'serve',
        transformIndexHtml: (html) =>
          html.replace(
            "script-src 'self';",
            "script-src 'self' 'unsafe-inline';",
          ),
      },
    ],
    build: { rollupOptions: { input: resolve('index.html') } },
  },
})
