import { defineConfig, devices } from '@playwright/test'

// my end-to-end test runs the REAL app in a real browser:
// by default it starts my API (port 4000) and React app (port 5173) locally, using server/.env and client/.env
// set E2E_BASE_URL to test a deployed site instead, e.g. E2E_BASE_URL=https://bit-by-bit-xpql.vercel.app
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'
const local = !process.env.E2E_BASE_URL

export default defineConfig({
  testDir: './tests',
  // one flow, one browser, nice and simple
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  // the live API on Render's free plan can take up to a minute to wake up
  timeout: local ? 60_000 : 120_000,
  expect: { timeout: local ? 20_000 : 60_000 },
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: local
    ? [
        { command: 'npm run dev --prefix ../server', url: 'http://localhost:4000/api/health', reuseExistingServer: true },
        {
          command: 'npm run dev --prefix ../client -- --port 5173 --strictPort',
          url: 'http://localhost:5173',
          reuseExistingServer: true,
        },
      ]
    : undefined,
})
