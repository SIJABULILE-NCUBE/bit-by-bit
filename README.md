# Bit by Bit 🛍️

**Own it bit by bit.**

**Bit by Bit helps small South African shops run lay-bys digitally, so customers can pay off goods in instalments with no interest and no debt, and shop owners always know who has paid what.**

| | |
|---|---|
| 🌐 Live app | _coming soon_ |
| 🎨 Stitch designs | _https://stitch.google.com/projects/10601282457004177971_ |
| 🎥 Loom demo | _coming soon_ |

### Test logins
| Role | Email | Password |
|---|---|---|
| Customer | customer@bit-by-bit.test | _set after deploy_ |
| Shop owner | owner@bit-by-bit.test | _set after deploy_ |

---

## 📄 Docs
- [BUSINESS.md](./BUSINESS.md): problem, customer, impact, business model, go-to-market, competition
- [Product Requirements (PRD)](./docs/PRD.md)
- [Implementation Plan](./IMPLEMENTATION_PLAN.md)
- [Designs](./docs/designs/)

## ✨ Features (Must)
1. Log-in with Customer and Shop owner roles
2. The shop owner creates a lay-by plan (item, price, deposit, term, instalments)
3. Customers see their lay-bys: paid, balance, next due date and progress
4. Payments with proof-of-payment upload (or cash recorded by the owner), confirmed by the owner
5. Owner dashboard: active, overdue and ready-to-collect lay-bys

## 🌟 Signature features
- **Lay-by risk score:** Low / Medium / High badges so shops can act before a customer gives up (credit-risk logic, fully unit tested)
- **One-tap WhatsApp reminders:** a ready-made message with the amount due and balance
- **PDF receipts and QR lay-by slips:** proof for every payment, replacing the paper lay-by card
- **Progress milestones:** 25 / 50 / 75% badges, an on-time streak and an "It's yours!" celebration
- **Installable and multilingual:** add to home screen (PWA), with English, isiZulu and Sesotho

## 🖼️ Screenshots
_coming soon_

## 🛠️ Tech stack
- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **Database and auth:** Supabase (Postgres, Auth, Storage, Row Level Security)
- **Testing:** Vitest, React Testing Library, Supertest
- **CI:** GitHub Actions (lint, typecheck, test and build on every PR)
- **Hosting:** Vercel (frontend), Render (backend), Supabase (database)

## 🏗️ Architecture
```
React (Vercel)  ──HTTPS──>  Express API (Render)  ──>  Supabase Postgres (RLS)
      │                            │
      └── Supabase Auth (JWT) ─────┘ verifies the token and role on every request
                                   └──> Supabase Storage (proof of payment files)
```
Permissions are enforced twice on the backend: Express middleware checks the role, and Postgres Row Level Security makes sure customers only see their own lay-bys and shop owners only see their own shop's lay-bys.

## 💻 Run it locally
```bash
git clone https://github.com/SIJABULILE-NCUBE/bit-by-bit.git
cd bit-by-bit

# backend
cd server
cp .env.example .env   # add your Supabase URL and keys
npm install
npm run dev

# frontend (new terminal)
cd client
cp .env.example .env
npm install
npm run dev
```

## 🧪 Run the tests
```bash
cd server && npm test
cd client && npm test
```

## ⚠️ Known issues
_none yet_

---
Built by **Sijabulile Ncube** · [GitHub](https://github.com/Sijabulile-Ncube) · [LinkedIn](https://linkedin.com/in/sijabulilemn)
