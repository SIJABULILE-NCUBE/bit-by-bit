import { expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// my seeded test logins (see server/scripts/seed.ts)
export const OWNER = { email: 'owner@bit-by-bit.test', password: 'BitByBit2026!' }
export const CUSTOMER = { email: 'customer@bit-by-bit.test', password: 'BitByBit2026!' }

// every lay-by my e2e test makes starts with this, so I can find and delete them afterwards
export const E2E_PREFIX = 'E2E test item'

export async function logIn(page: Page, who: { email: string; password: string }) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(who.email)
  await page.getByLabel('Password', { exact: true }).fill(who.password)
  await page.getByRole('button', { name: 'Log in' }).click()
}

export async function logOut(page: Page) {
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page).toHaveURL(/\/(login)?$/)
}

// deletes the lay-bys my test made (using the service role key from server/.env, which never leaves my machine)
export async function deleteE2ELaybys() {
  const here = path.dirname(fileURLToPath(import.meta.url))
  config({ path: path.join(here, '../../server/.env'), quiet: true })
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return
  const supabase = createClient(url, key, { auth: { persistSession: false } })

  // I try a few times, in case the network blips
  for (let attempt = 1; ; attempt++) {
    const { error } = await supabase.from('laybys').delete().like('item_name', `${E2E_PREFIX}%`)
    if (!error) return
    if (attempt === 3) throw new Error(`cleanup failed: ${error.message}`)
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
}
