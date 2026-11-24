import { defineConfig } from '@playwright/test'

// npm run screenshots: takes the README screenshots of the LIVE site, on a phone and on a desktop
// (kept separate from my normal e2e test so `npx playwright test` doesn't run it)
export default defineConfig({
  testDir: './screenshots',
  workers: 1,
  // the live API on Render's free plan can take up to a minute to wake up
  timeout: 180_000,
  expect: { timeout: 60_000 },
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'https://bit-by-bit-xpql.vercel.app',
  },
  projects: [
    {
      name: 'mobile',
      use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    },
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1366, height: 900 } } },
  ],
})
