# Deploying Bit by Bit

My setup: the **API** (Express, `server/`) runs on **Render**, the **website** (React, `client/`) runs on **Vercel**, and the **database, logins and files** live on **Supabase**.

Do it in this order, because each step needs a URL from the one before:

1. Render (API) → gives me the API URL
2. Vercel (website) → needs the API URL, gives me the website URL
3. Back to Render → set `CLIENT_URL` to the website URL
4. Supabase → allow the website URL for log-in emails

> Never paste real keys into this file, `render.yaml` or any other file in git. They only go into the Render / Vercel dashboards (and my local `.env` files, which git ignores).

---

## Where to find the Supabase values

Supabase dashboard → my project:

| Value | Where |
|---|---|
| Project URL | **Project Settings → Data API** (or **Connect**) → Project URL, like `https://abcdefghijklmnop.supabase.co` |
| anon / publishable key | **Project Settings → API Keys** → `anon` `public` (or the *publishable* key) |
| service_role / secret key | **Project Settings → API Keys** → `service_role` (or a *secret* key). **Server only, never in the client.** |

---

## 1. Render (the API)

`render.yaml` in the repo root already describes the service, so Render can set it up as a **Blueprint**.

1. Go to <https://dashboard.render.com> and sign in with GitHub.
2. **New +** → **Blueprint**.
3. Connect the `bit-by-bit` repo (give Render access to it if asked).
4. Render finds `render.yaml` and shows a service called **bit-by-bit-api**. It asks me for the values marked `sync: false`:

   | Key | Value |
   |---|---|
   | `SUPABASE_URL` | the Supabase Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | the Supabase service_role / secret key |
   | `CLIENT_URL` | for now `http://localhost:5173` (I change it in step 3) |

   `PORT` is set by Render itself. Don't add it. `NODE_VERSION=22` is already in `render.yaml`.
   `SUPABASE_JWT_SECRET` isn't used by the code yet (I check tokens with `supabase.auth.getUser`), so I leave it out.

5. Click **Apply** / **Deploy Blueprint** and wait for the build to go green.
6. Copy the URL at the top of the service page, like `https://bit-by-bit-api.onrender.com`.
7. Check it: open `https://bit-by-bit-api.onrender.com/api/health`. It should say `{"status":"ok"}`.

Note: on the free plan the API falls asleep after about 15 minutes with no visits, so the first request after that can take up to a minute.

## 2. Vercel (the website)

1. Go to <https://vercel.com/new> and sign in with GitHub.
2. **Import** the `bit-by-bit` repo.
3. On the "Configure Project" screen:
   - **Root Directory:** click **Edit** → choose `client`
   - **Framework Preset:** Vite (it usually picks this itself)
   - Build command `npm run build` and output folder `dist` (the defaults)
4. Open **Environment Variables** and add:

   | Key | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | the Supabase Project URL |
   | `VITE_SUPABASE_ANON_KEY` | the Supabase anon / publishable key (**not** the service_role key) |
   | `VITE_API_URL` | the Render URL from step 1, **no slash at the end**, like `https://bit-by-bit-api.onrender.com` |

5. Click **Deploy**.
6. Copy the website URL, like `https://bit-by-bit.vercel.app`.

Good to know:
- `client/vercel.json` sends every page address to `index.html`, so refreshing on `/owner/laybys` works instead of giving a 404.
- The client reuses `server/src/services/laybyMath.ts` for the schedule preview. Vercel includes files outside the Root Directory by default (**Settings → Build and Deployment → Root Directory → "Include files outside the root directory in the Build Step"**). Leave that switched **on**.
- `VITE_` values are baked in when the site builds. If I change one, I go to **Deployments → ⋯ → Redeploy**.

## 3. Back to Render: set CLIENT_URL

1. Render → **bit-by-bit-api** → **Environment**.
2. Change `CLIENT_URL` to the Vercel URL, like `https://bit-by-bit.vercel.app` (no slash at the end).
   To keep local development working too, I can use a comma-separated list:
   `https://bit-by-bit.vercel.app,http://localhost:5173`
3. **Save Changes**. Render redeploys by itself.

## 4. Supabase: allow the website URL

So the "confirm your email" link sends people to the live site:

1. Supabase → **Authentication → URL Configuration**.
2. **Site URL:** `https://bit-by-bit.vercel.app`
3. **Redirect URLs:** add `https://bit-by-bit.vercel.app/**` and `http://localhost:5173/**`
4. **Save**.

## 5. Check it all works

1. Open the Vercel URL and sign up as a **shop owner**, then log in. I should land on the shop dashboard.
2. In another browser (or a private window), sign up as a **customer**.
3. As the owner, create a lay-by for the customer's email.
4. As the customer, check it shows under **My lay-bys**.

If the website says it can't load things, open the browser console (F12):
- **CORS error** → `CLIENT_URL` on Render doesn't match the website URL exactly.
- **Failed to fetch / timeout** → the Render API is waking up, so wait a minute and refresh.
- **401** → `SUPABASE_URL` on Render and `VITE_SUPABASE_URL` on Vercel must be the same project.

## All environment variables in one place

**Render (server):** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CLIENT_URL`, `NODE_VERSION=22` (from `render.yaml`). `PORT` is automatic.

**Vercel (client):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`
