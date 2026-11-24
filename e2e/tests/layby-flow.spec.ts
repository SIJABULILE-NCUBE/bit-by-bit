import { test, expect } from '@playwright/test'
import { CUSTOMER, E2E_PREFIX, OWNER, deleteE2ELaybys, logIn, logOut } from './helpers'

// I tidy up before (in case an old run crashed) and after, so the demo data stays clean
test.beforeAll(deleteE2ELaybys)
test.afterAll(deleteE2ELaybys)

test('the owner creates a lay-by and the customer sees it', async ({ page }) => {
  const itemName = `${E2E_PREFIX} ${Date.now()}`

  // 1. the shop owner logs in and lands on their dashboard
  await logIn(page, OWNER)
  await expect(page.getByRole('heading', { name: 'Shop dashboard' })).toBeVisible()

  // 2. they create a R800 lay-by with a R100 deposit over 2 months for the test customer
  await page.getByRole('link', { name: '+ New lay-by' }).first().click()
  await page.getByLabel('Customer email').fill(CUSTOMER.email)
  await page.getByLabel('Item name').fill(itemName)
  await page.getByLabel('Price').fill('800')
  await page.getByLabel('Deposit', { exact: true }).fill('100')
  // the term buttons are radios hidden behind "1M ... 6M" labels, so I tick the radio itself
  await page.getByRole('radio', { name: '2 months' }).check({ force: true })
  // the live preview splits the R700 left into 2 x R350
  await expect(page.getByText(/2 × R 350,00/)).toBeVisible()
  await page.getByRole('button', { name: /create lay-by/i }).click()
  await expect(page.getByRole('status')).toContainText(`Lay-by for ${itemName} created`)

  // 3. the customer logs in and sees it, with the right balance
  await logOut(page)
  await logIn(page, CUSTOMER)
  await expect(page.getByRole('heading', { name: 'My lay-bys' })).toBeVisible()
  const card = page.getByRole('listitem').filter({ hasText: itemName })
  await expect(card).toBeVisible()
  await expect(card).toContainText('Kasi Kids Wear')
  await expect(card).toContainText('R 700,00')

  // 4. and can open it to see the schedule
  await card.getByRole('link').first().click()
  await expect(page.getByRole('heading', { name: itemName })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Payment schedule' }).getByRole('listitem')).toHaveCount(2)
})
