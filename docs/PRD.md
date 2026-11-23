# Bit by Bit: Product Requirements Document (PRD)

**Owner:** Sijabulile Ncube
**Version:** 1.0
**Date:** 23 November 2026
**Status:** Approved for build

---

## 1. Overview

Bit by Bit is a mobile-first web app that lets small shops manage lay-bys digitally. The shop owner creates a lay-by plan for a customer, the customer tracks their balance and due dates, payments are recorded with proof, and the owner sees which lay-bys are on track, overdue or ready to collect.

See [BUSINESS.md](../BUSINESS.md) for the problem, market and business model.

## 2. Goals

| Goal | How we know it works |
|---|---|
| Customers always know where their lay-by stands | Customer sees paid, balance, due date and progress for every lay-by |
| Every payment has a record | Every payment has a status (pending, confirmed, rejected) and proof or a cash note |
| Owners see problems early | Dashboard shows overdue lay-bys and the total outstanding |

## 3. Non-goals (not in this version)

- In-app card or EFT payments (proof upload and cash recording only)
- SMS or WhatsApp reminders
- Stock / inventory management
- Multiple branches and staff accounts
- Credit checks or any form of lending

## 4. User roles

| Role | Description | Can do |
|---|---|---|
| **Customer** | A person paying off goods on lay-by | Register, see their own lay-bys, see payment history, upload proof of payment |
| **Shop owner** | Owner of a small shop (the paying customer) | Register a shop, create lay-bys for customers, record cash payments, confirm or reject payments, mark lay-bys as collected or cancelled, see the dashboard |

A user has exactly one role, chosen at sign-up. Roles are stored in the database and checked on the backend, never trusted from the frontend.

## 5. Lay-by rules

- **Deposit:** at least 10% of the price (set when the lay-by is created)
- **Term:** 1 to 6 months
- **Instalment:** (price minus deposit) divided by the number of months, with the last instalment rounded so the total is exact
- **Statuses:** `active` → `completed` (fully paid) → `collected` (item handed over), or `cancelled`
- **Overdue:** an instalment that is not confirmed by its due date
- **Paid amount:** only **confirmed** payments count towards the balance

## 6. User stories

### Auth
- **US-01** As a new user, I can sign up with email and password and choose Customer or Shop owner.
- **US-02** As a shop owner, I enter my shop name and area when I sign up.
- **US-03** As a user, I can log in and log out, and I'm sent to the right dashboard for my role.
- **US-04** As a user, I cannot open pages or call APIs that belong to the other role.

### Lay-by plans (Must 2)
- **US-05** As a shop owner, I can create a lay-by: customer email, item name, item photo (optional), price, deposit, term in months.
- **US-06** As a shop owner, I see the instalment amount and due dates calculated before I save.
- **US-07** As a shop owner, I can mark a completed lay-by as collected, or cancel a lay-by with a reason.

### Customer view (Must 3)
- **US-08** As a customer, I see a list of my lay-bys with item, shop, progress bar, balance and next due date.
- **US-09** As a customer, I can open a lay-by and see the payment schedule and payment history.

### Payments (Must 4)
- **US-10** As a customer, I can upload proof of payment (image or PDF, max 5 MB) with the amount paid.
- **US-11** As a shop owner, I can record a cash payment that is confirmed immediately.
- **US-12** As a shop owner, I can confirm or reject a customer's proof of payment, with a reason if rejected.
- **US-13** When the confirmed total reaches the price, the lay-by automatically becomes `completed`.

### Owner dashboard (Must 5)
- **US-14** As a shop owner, I see totals: active lay-bys, overdue lay-bys, ready to collect, payments waiting for review and total outstanding (R).
- **US-15** As a shop owner, I can filter my lay-bys by status and search by customer name.

## 7. Must features and acceptance criteria

### M1: Log-in and roles
- [ ] Sign up, log in and log out work through Supabase Auth
- [ ] A `profiles` row stores the role (`customer` or `owner`), and owners get a `shops` row
- [ ] Express middleware verifies the JWT and role on every protected route
- [ ] A customer calling an owner-only endpoint gets `403`

### M2: Create lay-by
- [ ] The owner can create a lay-by linked to a customer account by email
- [ ] Deposit below 10% or term outside 1 to 6 months is rejected with a clear message
- [ ] The instalment schedule is generated and stored, and the totals add up exactly to the price
- [ ] The deposit is saved as the first confirmed payment

### M3: Customer lay-by view
- [ ] The customer sees only their own lay-bys
- [ ] Paid, balance and progress use confirmed payments only
- [ ] The next due date and overdue state are shown

### M4: Payments
- [ ] A proof upload goes to Supabase Storage, and the payment is saved as `pending`
- [ ] Only the customer and the lay-by's shop owner can view the file
- [ ] The owner can confirm or reject a payment, and a cash payment is saved as `confirmed`
- [ ] A payment can't take the balance below R0
- [ ] The lay-by becomes `completed` when it is fully paid

### M5: Owner dashboard
- [ ] Shows active, overdue, ready-to-collect and pending-review counts plus total outstanding
- [ ] The numbers come from the real database, not sample data

## 8. Data model (Supabase Postgres)

```
profiles      id (uuid, = auth.users.id), full_name, phone, role ('customer'|'owner'), created_at
shops         id, owner_id → profiles, name, area, created_at
laybys        id, shop_id → shops, customer_id → profiles, item_name, item_photo_path,
              price (numeric), deposit (numeric), term_months (int),
              status ('active'|'completed'|'collected'|'cancelled'), cancel_reason, created_at
instalments   id, layby_id → laybys, due_date (date), amount (numeric), seq (int)
payments      id, layby_id → laybys, amount (numeric), method ('deposit'|'cash'|'eft'),
              status ('pending'|'confirmed'|'rejected'), proof_path, reject_reason,
              created_by → profiles, reviewed_at, created_at
```

## 9. Permission rules (enforced on the backend)

| Table | Customer | Shop owner |
|---|---|---|
| shops | Read shops they have a lay-by with | Full access to own shop |
| laybys | Read own lay-bys | Create, read and update lay-bys of own shop |
| instalments | Read for own lay-bys | Read for own shop's lay-bys (created by the server) |
| payments | Create `pending` EFT payments and read own | Read own shop's payments, create cash payments, confirm or reject |
| storage `proofs/` | Upload and read own files | Read files for own shop's lay-bys |

These are enforced with **Row Level Security policies** in Postgres **and** role checks in Express middleware.

## 10. API (Express)

| Method | Endpoint | Role |
|---|---|---|
| GET | `/api/me` | any |
| POST | `/api/laybys` | owner |
| GET | `/api/laybys` | customer (own), owner (shop) |
| GET | `/api/laybys/:id` | customer (own), owner (shop) |
| PATCH | `/api/laybys/:id` (collect / cancel) | owner |
| POST | `/api/laybys/:id/payments` | customer (EFT + proof), owner (cash) |
| PATCH | `/api/payments/:id` (confirm / reject) | owner |
| GET | `/api/dashboard` | owner |

## 11. Screens (Stitch)

**Shared:** Landing page, Sign up (with role choice), Log in
**Customer:** My lay-bys (list with progress), Lay-by detail (schedule + history), Upload proof of payment
**Shop owner:** Dashboard (summary cards), All lay-bys (filter + search), Create lay-by (with schedule preview), Lay-by detail (record cash, collect, cancel), Payments to review

Mobile-first, and also responsive on desktop.

## 12. Non-functional requirements

- **Performance:** pages load in under 3 seconds on 3G
- **Low data:** compressed images, no heavy libraries
- **Security:** HTTPS only, JWT verified on every request, RLS on every table, file type and size checked on upload
- **Privacy (POPIA):** collect only what's needed, and never show one customer's lay-bys to another customer or shop
- **Money:** amounts stored as numeric (not floats), shown in Rands with 2 decimals
- **Accessibility:** large tap targets, good colour contrast, labelled form fields
- **Quality:** TDD, with tests for permissions and the lay-by maths; CI runs lint, typecheck, test and build on every PR

## 13. Signature features (what makes Bit by Bit stand out)

Built after the Must features, in this order. Each one is small, testable and shows a different skill.

### S1: Lay-by risk score (credit risk thinking, built test-first)
Each active lay-by gets a **risk level** (Low, Medium, High) so the owner can act before a customer gives up.
- Calculated in a pure function `riskScore(layby, payments, today)` with unit tests
- Inputs: days overdue, number of missed instalments, % paid so far, days since last payment
- Shown as a coloured badge on the owner's lay-by list and dashboard ("3 lay-bys at high risk")
- **Acceptance:** the same inputs always give the same score; a lay-by with 2+ missed instalments is High; a lay-by more than 80% paid with no missed instalments is Low

### S2: One-tap WhatsApp reminder
- An owner button "Remind on WhatsApp" opens WhatsApp with a ready-made message: *"Hi Thandi, your lay-by for the school blazer at Kasi Kids Wear has R350 due on 30 Nov. Balance: R700. Thank you!"*
- Uses a `wa.me` link, so no paid API is needed
- **Acceptance:** the message includes the correct name, item, amount due, date and balance

### S3: Digital receipts and lay-by slip with QR code
- Every confirmed payment gets a **downloadable PDF receipt** (shop, item, amount, date, new balance, reference number)
- Every lay-by has a printable **slip with a QR code** that opens the lay-by in the app, replacing the paper lay-by card
- **Acceptance:** receipt totals match the database; the QR code opens the correct lay-by (and only for the right customer or owner)

### S4: Progress milestones
- The customer sees milestone badges at 25%, 50%, 75% and a celebration screen at 100% ("It's yours! Collect it at Kasi Kids Wear")
- Encourages on-time payments with a gentle "on-time streak" count
- **Acceptance:** milestones appear only from confirmed payments

### S5: Installable and multilingual
- **PWA:** customers can "Add to home screen" and open it like an app, with no app store needed
- **Language switch:** English, isiZulu and Sesotho for the customer screens
- **Acceptance:** Lighthouse PWA check passes; switching language changes all customer-facing labels

## 14. Should / Could (after Must and signature features)

- **Should:** WhatsApp/SMS due-date reminders, customer invite link (no sign-up needed to view), cancellation and refund rules from the Consumer Protection Act built in
- **Could:** in-app payments (PayFast/Ozow), payment reliability record, multi-branch and staff accounts, monthly PDF statements

## 15. Success metrics

See BUSINESS.md, section 4: completed lay-bys, on-time payments, fewer disputes, and shop retention.
