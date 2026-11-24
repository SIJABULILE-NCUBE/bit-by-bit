/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// vite config for Bit by Bit
// I added tailwind as a plugin here (tailwind v4 way) and set up vitest too
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    fs: {
      // I share the lay-by maths file with my server (see src/lib/laybyMath.ts),
      // so the dev server is allowed to read that one folder outside client/
      allow: ['.', '../server/src/services'],
    },
  },
  test: {
    // jsdom so my tests can "pretend" to be a browser
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
  },
})
