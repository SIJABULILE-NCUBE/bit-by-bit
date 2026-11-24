import { defineConfig } from 'vitest/config'

// tests run in plain Node (no browser needed for an API)
export default defineConfig({
  test: {
    environment: 'node',
  },
})
