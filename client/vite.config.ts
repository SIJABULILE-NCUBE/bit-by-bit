/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// vite config for Bit by Bit
// I added tailwind as a plugin here (tailwind v4 way) and set up vitest too
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // jsdom so my tests can "pretend" to be a browser
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
  },
})
