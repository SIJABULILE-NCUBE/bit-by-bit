# Bit by Bit: Implementation Plan

Built from [docs/PRD.md](./docs/PRD.md) and the Stitch designs in [docs/designs/](./docs/designs/).

**Way of working:** every task is a GitHub Issue → its own branch → a small PR → CI passes → merge to `main`.
**Branch names:** `feat/<issue-no>-short-name`, `fix/...`, `docs/...`, `chore/...`
**Commits:** small and clear, e.g. `feat(laybys): calculate instalment schedule`
**TDD:** write the failing test first, make it pass, then clean up.

---

## Tech stack

| Layer | Tool |
|---|---|
| Frontend | React + TypeScript + Vite, Tailwind CSS, React Router |
| Backend | Node.js + Express + TypeScript |
| Database / Auth / Files | Supabase (Postgres, Auth, Storage, Row Level Security) |
| Tests | Vitest, React Testing Library, Supertest |
| CI | GitHub Actions: lint, typecheck, test, build on every PR |
| Hosting | Vercel (client), Render (server), Supabase (database) |

## Folder structure

```
bit-by-bit/
├── client/            React app
│   └── src/
│       ├── components/
│       ├── pages/customer/  pages/owner/  pages/auth/
│       ├── lib/        api.ts, supabase.ts, money.ts
│       └── context/    AuthContext.tsx
├── server/            Express API
│   └── src/
│       ├── routes/     laybys, payments, dashboard, me
│       ├── middleware/ requireAuth.ts, requireRole.ts
│       ├── services/   laybyMath.ts (pure functions, easy to test)
│       └── tests/
├── supabase/migrations/   SQL: tables + RLS policies
├── docs/              PRD.md, designs/
└── .github/workflows/ci.yml
```

---

## Phase 0: Setup (Mon morning)
- [x] Repo, BUSINESS.md, README, PRD
- [ ] Stitch designs exported to docs/designs/
- [ ] IMPLEMENTATION_PLAN.md and `.gitignore` (this PR)
- [ ] Create GitHub Issues from the list below

## Phase 1: Frontend foundation (Mon afternoon)
- [ ] Scaffold `client/` with Vite + React + TS + Tailwind
- [ ] Theme from Stitch, layout, bottom nav
- [ ] Landing, Sign up (role choice) and Log in pages (UI only)
- [ ] Customer and Shop owner pages as routed shells, matching the Stitch designs

## Phase 2: Backend, database and auth (Tue morning)
- [ ] Create the Supabase project, migrations for all 5 tables (PRD section 8)
- [ ] RLS policies for every table and the `proofs` storage bucket (PRD section 9)
- [ ] Scaffold `server/` with Express + TS, health check route
- [ ] `requireAuth` and `requireRole` middleware, **tests first**
- [ ] `laybyMath.ts`: instalment schedule, balance, overdue, completed, **tests first**
- [ ] Connect sign up / log in in the client, save the role in `profiles`, redirect by role
- [ ] CI workflow: lint, typecheck, test, build for client and server

## Phase 3: Deploy + first Must features (Tue afternoon)
- [ ] Deploy the server to Render and the client to Vercel, with env vars set
- [ ] **M2** Owner creates a lay-by with schedule preview
- [ ] **M3** Customer sees their lay-bys with progress and balance
- [ ] Seed the test logins (customer and owner) and add them to the README

## Phase 4: Remaining Must features (Tue evening to Wed morning)
- [ ] **M4** Payments: proof upload, cash recording, confirm / reject, auto-complete
- [ ] **M5** Owner dashboard: totals, overdue, ready to collect, outstanding
- [ ] Collect and cancel actions
- [ ] Responsive check on mobile and desktop

## Phase 4b: Signature features (Wed morning, in order, stop when time runs out)
- [ ] **S1** `riskScore()` service, **tests first**, plus badges on the owner list and dashboard
- [ ] **S2** WhatsApp reminder button (`wa.me` link with a pre-filled message), with a test for the message text
- [ ] **S3** PDF receipt per confirmed payment and a QR lay-by slip
- [ ] **S4** Progress milestones and the "It's yours!" screen
- [ ] **S5** PWA manifest and language switch (English, isiZulu, Sesotho)

## Phase 5: Polish and submit (Wed until 15:30)
- [ ] Loading, empty and error states, no placeholder data
- [ ] README: live link, screenshots, architecture, known issues
- [ ] Record the Loom (max 5 min): investor pitch, then a live demo
- [ ] Final submission post before 15:30

---

## What gets tested (TDD)

| Area | Tests |
|---|---|
| Middleware | No token → 401; wrong role → 403; correct role → passes |
| Lay-by maths | Schedule adds up exactly to the price; deposit under 10% rejected; term outside 1 to 6 rejected; balance counts confirmed payments only; overdue after due date; completed when fully paid |
| Payments | Customer can only pay own lay-by; can't overpay; only the shop's owner can confirm or reject |
| Dashboard | Totals match the seeded data |
| Client | Sign-up form validation, role redirect, money formatting (R 1 250,00) |

## Environment variables

**server/.env**
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
CLIENT_URL=
PORT=4000
```
**client/.env**
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=
```

---

## GitHub Issues

| # | Title | Phase | Label |
|---|---|---|---|
| 1 | Add implementation plan and .gitignore | 0 | docs |
| 2 | Scaffold React + TS + Tailwind client | 1 | frontend |
| 3 | App layout, theme and routing from Stitch designs | 1 | frontend |
| 4 | Landing, Sign up and Log in pages | 1 | frontend |
| 5 | Customer page shells (my lay-bys, detail, upload proof) | 1 | frontend |
| 6 | Owner page shells (dashboard, lay-bys, create, detail, review) | 1 | frontend |
| 7 | Supabase migrations: tables and RLS policies | 2 | backend |
| 8 | Scaffold Express + TS server with health check | 2 | backend |
| 9 | Auth and role middleware with tests | 2 | backend |
| 10 | Lay-by maths service with tests | 2 | backend |
| 11 | Connect sign up / log in and role redirect | 2 | full-stack |
| 12 | CI: lint, typecheck, test and build on every PR | 2 | chore |
| 13 | Deploy server (Render) and client (Vercel) | 3 | chore |
| 14 | M2: Create lay-by with schedule preview | 3 | feature |
| 15 | M3: Customer lay-by list and detail | 3 | feature |
| 16 | M4: Payments (proof upload, cash, confirm / reject) | 4 | feature |
| 17 | M5: Owner dashboard | 4 | feature |
| 18 | Seed test logins and demo data | 3 | chore |
| 19 | Responsive polish, empty and error states | 5 | frontend |
| 20 | README completion, screenshots and Loom | 5 | docs |
| 21 | S1: Lay-by risk score with tests | 4b | feature |
| 22 | S2: One-tap WhatsApp reminder | 4b | feature |
| 23 | S3: PDF receipts and QR lay-by slip | 4b | feature |
| 24 | S4: Progress milestones and celebration screen | 4b | feature |
| 25 | S5: PWA and language switch | 4b | feature |
