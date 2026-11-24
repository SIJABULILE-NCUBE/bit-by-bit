// npm run seed
// creates (or resets) my two test logins and 3 demo lay-bys in the Supabase project from server/.env
// it's safe to run again and again: it updates the test users and replaces ONLY their demo lay-bys
import 'dotenv/config'
import { createClient, type User } from '@supabase/supabase-js'
import { todayInSA } from '../src/services/laybyMath.js'
import { demoLaybys } from './demoData.js'

const PASSWORD = 'BitByBit2026!'

const OWNER = {
  email: 'owner@bit-by-bit.test',
  metadata: { full_name: 'Sipho Dlamini', phone: '+27831234567', role: 'owner', shop_name: 'Kasi Kids Wear', shop_area: 'Soweto' },
}
const CUSTOMER = {
  email: 'customer@bit-by-bit.test',
  metadata: { full_name: 'Thandi Mokoena', phone: '+27821234567', role: 'customer' },
}

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to server/.env first')
  process.exit(1)
}
// the service role key skips RLS, which a seed script needs (it only ever runs on my machine)
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

// throws with a clear message if a Supabase call failed
// (and after that check, data can't be null any more)
function check<R extends { data: unknown; error: { message: string } | null }>(
  result: R,
  what: string,
): NonNullable<R['data']> {
  if (result.error) throw new Error(`${what}: ${result.error.message}`)
  return result.data as NonNullable<R['data']>
}

async function findUserByEmail(email: string): Promise<User | null> {
  // the admin API lists users page by page
  for (let page = 1; ; page++) {
    const { users } = check(await supabase.auth.admin.listUsers({ page, perPage: 200 }), 'list users')
    const found = users.find((u) => u.email === email)
    if (found) return found
    if (users.length < 200) return null
  }
}

// creates the login, or resets its password and details if it's already there
async function ensureUser(email: string, metadata: Record<string, string>): Promise<string> {
  const existing = await findUserByEmail(email)
  if (existing) {
    check(
      await supabase.auth.admin.updateUserById(existing.id, { password: PASSWORD, email_confirm: true, user_metadata: metadata }),
      `update ${email}`,
    )
    console.log(`✓ ${email} already existed, password reset`)
    return existing.id
  }
  // my sign-up trigger makes the profile (and the shop for owners) from this metadata
  const { user } = check(
    await supabase.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: metadata }),
    `create ${email}`,
  )
  console.log(`✓ created ${email}`)
  return user!.id
}

async function main() {
  const ownerId = await ensureUser(OWNER.email, OWNER.metadata)
  const customerId = await ensureUser(CUSTOMER.email, CUSTOMER.metadata)

  // the trigger only runs on create, so I set the profile details again to be sure
  for (const [id, m] of [
    [ownerId, OWNER.metadata],
    [customerId, CUSTOMER.metadata],
  ] as const) {
    check(
      await supabase.from('profiles').update({ full_name: m.full_name, phone: m.phone, role: m.role }).eq('id', id),
      'update profile',
    )
  }

  // the owner's shop (make it if it's missing, rename it if it isn't right)
  const shops = check(await supabase.from('shops').select('id').eq('owner_id', ownerId).order('created_at'), 'find shop')
  let shopId = shops[0]?.id as string | undefined
  if (shopId) {
    check(await supabase.from('shops').update({ name: 'Kasi Kids Wear', area: 'Soweto' }).eq('id', shopId), 'rename shop')
  } else {
    const shop = check(
      await supabase.from('shops').insert({ owner_id: ownerId, name: 'Kasi Kids Wear', area: 'Soweto' }).select('id').single(),
      'create shop',
    )
    shopId = shop.id
  }
  console.log('✓ shop Kasi Kids Wear')

  // wipe the old demo lay-bys between these two test accounts (and their proof files)
  // deleting a lay-by also deletes its instalments and payments (on delete cascade)
  const old = check(
    await supabase.from('laybys').select('id').eq('shop_id', shopId).eq('customer_id', customerId),
    'find old lay-bys',
  )
  for (const { id } of old) {
    const files = check(await supabase.storage.from('proofs').list(id), 'list old proofs')
    if (files.length > 0) {
      check(await supabase.storage.from('proofs').remove(files.map((f) => `${id}/${f.name}`)), 'remove old proofs')
    }
  }
  if (old.length > 0) {
    check(await supabase.from('laybys').delete().in('id', old.map((l) => l.id)), 'delete old lay-bys')
  }

  // a tiny but real PDF, so "View proof" has something to open
  const samplePdf = new Blob(
    [
      '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj ' +
        '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 160]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj ' +
        '4 0 obj<</Length 92>>stream\nBT /F1 14 Tf 20 120 Td (Bit by Bit demo EFT slip) Tj 0 -30 Td (Amount: R 250,00) Tj ET\nendstream endobj ' +
        '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
    ],
    { type: 'application/pdf' },
  )

  const today = todayInSA()
  for (const demo of demoLaybys(today)) {
    const layby = check(
      await supabase
        .from('laybys')
        .insert({
          shop_id: shopId,
          customer_id: customerId,
          item_name: demo.itemName,
          price: demo.price,
          deposit: demo.deposit,
          term_months: demo.termMonths,
          status: demo.status,
          created_at: `${demo.createdOn}T09:00:00+02:00`,
        })
        .select('id')
        .single(),
      'create lay-by',
    )

    check(
      await supabase
        .from('instalments')
        .insert(demo.instalments.map((i) => ({ layby_id: layby.id, seq: i.seq, due_date: i.dueDate, amount: i.amount }))),
      'create instalments',
    )

    for (const [n, p] of demo.payments.entries()) {
      let proofPath: string | null = null
      if (p.withProof) {
        proofPath = `${layby.id}/demo-eft-slip.pdf`
        check(
          await supabase.storage.from('proofs').upload(proofPath, samplePdf, { contentType: 'application/pdf', upsert: true }),
          'upload sample proof',
        )
      }
      // the customer sends EFT slips; the owner records the deposit and cash
      const createdBy = p.method === 'eft' ? customerId : ownerId
      // a different minute for each one, so they sort in the right order
      const at = `${p.date}T10:${String(n).padStart(2, '0')}:00+02:00`
      check(
        await supabase.from('payments').insert({
          layby_id: layby.id,
          amount: p.amount,
          method: p.method,
          status: p.status,
          proof_path: proofPath,
          reject_reason: p.rejectReason ?? null,
          created_by: createdBy,
          created_at: at,
          reviewed_at: p.status === 'pending' ? null : at,
        }),
        'create payment',
      )
    }
    console.log(`✓ lay-by "${demo.itemName}" (${demo.label})`)
  }

  console.log(`\nDone! Log in with ${OWNER.email} or ${CUSTOMER.email}, password ${PASSWORD}`)
}

main().catch((err) => {
  console.error('Seed failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
