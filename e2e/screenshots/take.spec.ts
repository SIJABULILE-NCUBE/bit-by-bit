import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CUSTOMER, OWNER, logIn, logOut } from '../tests/helpers'

// every picture goes into docs/screenshots/<name>-<mobile|desktop>.png
const here = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(here, '../../docs/screenshots')

async function snap(page: Page, name: string, projectName: string) {
  // give fonts and images a moment so nothing is half-drawn
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: path.join(outDir, `${name}-${projectName}.png`), fullPage: true })
}

test('README screenshots', async ({ page }, testInfo) => {
  const device = testInfo.project.name

  // landing page
  await page.goto('/')
  await snap(page, '1-landing', device)

  // owner: dashboard, create lay-by (filled in, with the schedule preview) and payments to review
  await logIn(page, OWNER)
  await expect(page.getByText('Total outstanding')).toBeVisible()
  await snap(page, '2-owner-dashboard', device)

  await page.goto('/owner/laybys/new')
  await page.getByLabel('Customer email').fill(CUSTOMER.email)
  await page.getByLabel('Item name').fill('Matric dance suit')
  await page.getByLabel('Price').fill('2400')
  await page.getByLabel('Deposit', { exact: true }).fill('480')
  await page.getByRole('radio', { name: '4 months' }).check({ force: true })
  await expect(page.getByText(/4 × R 480,00/)).toBeVisible()
  await snap(page, '3-create-layby', device)

  await page.goto('/owner/payments')
  await expect(page.getByRole('button', { name: 'Confirm payment' }).first()).toBeVisible()
  await snap(page, '4-payments-to-review', device)

  // customer: my lay-bys and one lay-by's detail
  await logOut(page)
  await logIn(page, CUSTOMER)
  await expect(page.getByRole('heading', { name: 'My lay-bys' })).toBeVisible()
  await expect(page.getByText('School blazer + 2 shirts')).toBeVisible()
  await snap(page, '5-customer-laybys', device)

  await page.getByRole('listitem').filter({ hasText: 'School blazer + 2 shirts' }).getByRole('link', { name: /view details/i }).click()
  await expect(page.getByRole('region', { name: 'Payment schedule' })).toBeVisible()
  await snap(page, '6-layby-detail', device)
})
