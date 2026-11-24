# Bit by Bit: Loom script (5 minutes)

**Total:** about 1:30 investor pitch + 3:30 live demo.
**Live app:** https://bit-by-bit-xpql.vercel.app

## Before I press record
- [ ] Reset the demo data: `cd server && npm run seed` (the demo confirms the waiting slip, so I reset it before every take)
- [ ] Wake the API up: open https://bit-by-bit-api.onrender.com/api/health and wait for `{"status":"ok"}` (Render's free plan sleeps)
- [ ] Two browser windows side by side:
  - **Window A (normal):** logged in as the owner, `owner@bit-by-bit.test` / `BitByBit2026!`
  - **Window B (private / incognito):** logged in as the customer, `customer@bit-by-bit.test` / `BitByBit2026!`
- [ ] A small PDF or photo on the desktop called `eft-slip.pdf` to upload
- [ ] Phone on silent, notifications off, browser zoom at 100%

---

## Part 1: Investor pitch (0:00 to 1:30)

*(Camera on me, or the landing page on screen.)*

**Problem (0:00 to 0:20)**
> "Every January, South African parents put school uniforms on lay-by. It's how families buy without debt: pay a deposit, pay it off monthly, take it home when it's paid. But in small shops, lay-by still runs on a paper card and a handwritten book. Customers lose the card and forget what they owe. Owners page through books, chase people who stopped paying, and keep stock on the shelf that may never be collected."

**Customer (0:20 to 0:35)**
> "My paying customer is the small independent shop with one to three branches: school wear, clothing, furniture, appliances, phones. Their customers are working families, and they use Bit by Bit for free."

**Solution (0:35 to 0:50)**
> "Bit by Bit puts the lay-by on both phones. The shop creates the plan, the customer sees their balance and due dates, every payment is recorded with proof, and the owner sees at a glance what's on track, overdue or ready to collect. No interest, no credit check, no debt."

**Impact and money (0:50 to 1:05)**
> "The goal is more lay-bys completed (from about 60% to 80%) and far fewer arguments about balances. Shops get 20 lay-bys free, then R149 a month for Growth, or R349 for several branches. 300 Growth shops is about R45 000 a month in recurring revenue."

**Go-to-market and competition (1:05 to 1:20)**
> "I start with walk-in pilots in January, when school-uniform lay-bys peak, then let customers pull in other shops with their lay-by link. Paper is free but gets lost. Big retailers' systems aren't available to small shops. And 'buy now, pay later' is credit, with fees and debt. Bit by Bit is built only for lay-by, and debt-free by design."

**Why me (1:20 to 1:30)**
> "I've spent over 10 years in credit risk and banking. I know how payment behaviour predicts who will drop off. That's why every lay-by in Bit by Bit gets a risk score, so a shop can act before a customer gives up. Let me show you."

---

## Part 2: Live demo (1:30 to 5:00)

### 1. Owner dashboard (1:30 to 2:05), Window A
- Show **Shop dashboard** for **Kasi Kids Wear**.
> "This is Sipho's shop. Every number comes straight from the database: R 1 560,00 still owed to him, 2 active lay-bys, 1 overdue, 1 ready to collect and 1 slip to check."
- Point at the red **"1 lay-by at high risk"** banner and click it.
> "This is my credit-risk scorecard. Thandi's winter jacket has two missed instalments, so it's High risk. It's a pure, unit-tested function: two or more missed is always High, over 80% paid with nothing missed is always Low."

### 2. Lay-by detail and WhatsApp (2:05 to 2:35), Window A
- Click **Winter school jacket**.
> "I can see why it's high risk: 2 instalments missed and R 540,00 overdue since October."
- Hover over **Remind on WhatsApp** (don't send).
> "One tap opens WhatsApp with the message ready: her name, the item, the amount overdue and her balance. No paid SMS service needed."

### 3. Create a lay-by (2:35 to 3:15), Window A
- Click **Lay-bys**, then **+ New lay-by**.
- Customer email `customer@bit-by-bit.test`, item `Matric dance suit`, price `2400`, tap **25%** for the deposit, term **4M**.
> "As I type, the schedule builds itself: R 600,00 deposit today, then 4 × R 450,00. It uses the same maths file as the server, so the preview always matches what's saved. A deposit under 10%, or a term over 6 months, is refused."
- Click **Create lay-by →** and show the "created" message.

### 4. Customer view and proof upload (3:15 to 4:00), Window B
- Refresh **My lay-bys**.
> "Thandi sees the new suit straight away, with every lay-by's balance, progress and next payment."
- Open **School blazer + 2 shirts**: point at the schedule (paid, next, upcoming) and the payment history.
- Click **Upload proof of payment**, leave R 250,00, choose `eft-slip.pdf`, click **Send proof**.
> "The slip goes to a private storage bucket. It's saved as pending, so it doesn't count yet. If I try to pay more than I owe, it's refused, on the phone and again on the server."

### 5. Payments to review (4:00 to 4:35), Window A
- Click **Payments**.
> "Sipho checks the slip against his bank account."
- Click **View proof** on a slip (it opens through a link that expires in 5 minutes), then go back and click **Confirm payment**.
> "Confirmed, so now it counts. If it was wrong, he'd reject it with a reason that Thandi sees."

### 6. Cash, paid up and collected (4:35 to 4:50), Window A
- Click **Dashboard**, then click **School shoes + backpack** under *Needs attention*.
> "When a lay-by is fully paid it becomes paid up by itself. When Thandi fetches the shoes, Sipho marks it as collected. Cash at the counter is one box: Record cash payment."
- Click **Mark as collected**.

### 7. Wrap up (4:50 to 5:00)
> "Built with React, Express and Supabase, with row level security, more than 250 automated tests and a Playwright end-to-end test. Bit by Bit: own it bit by bit. Thank you!"

---

## If something goes wrong while recording
- **The page is stuck loading:** the API is waking up. Say "the free server is waking up" and refresh after 30 seconds.
- **The slip is already confirmed:** I forgot to run `npm run seed`. Stop, run it, and start again.
- **"No customer has signed up":** check the email is exactly `customer@bit-by-bit.test`.
