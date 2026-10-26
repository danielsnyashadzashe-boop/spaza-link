# SpazaLink

**Full shelves. Safe stock. Bank ready.**

SpazaLink is a B2B web app for South African township spaza shops. It links shops to verified wholesalers, tracks their stock, and turns their trading history into a Financial Health Report they can take to a bank.

The idea comes from **Rethabile Madonsela** (founder and idea owner).

It's a live app that processes real user data against MongoDB Atlas, with sign-in handled by Clerk. Nothing in it is a static mock-up.

| Screen | What it does |
|---|---|
| **Inventory Dashboard** (`/dashboard`) | Compliance score that updates as CIPC, BEE and tax documents are uploaded or removed. Colour-coded stock tracker. A low-stock alert slides down when an item drops into Red. **Quick Fix** adds the missing quantity to the cart and opens checkout. |
| **Ordering & Checkout** (`/order`) | A catalogue of verified products only, each with SABS / Verified Supplier badges. The cart shows bulk discounts as a separate line. Payment toggles are PayShap, Instant EFT and Cash on Delivery. A live delivery timeline follows each order. |
| **Financial Portal** (`/finance`) | Monthly spend chart and bank scorecard (total spent, on-time payments, credit health), plus a one-tap **Financial Health Report PDF** with the SpazaLink logo. |

## Quick start

```bash
npm install
cp .env.example .env.local     # fill in MONGODB_URI and REPORT_SIGNING_SECRET
npx clerk@latest env pull      # writes the Clerk keys for the linked "Spaza Link" app
npm run seed                   # wholesalers, catalogue, two demo shops + their Clerk users, sample PDFs
npm run dev                    # http://localhost:3000
```

Before you submit, run the security checks against a production build:

```bash
npm run build && npm start     # terminal 1
npm run test:brief             # terminal 2: 80 checks, one per item in the project brief (writes BRIEF_TEST_REPORT.md)
npm run test:security          # terminal 2: 66 security, role, demo shop and data wall checks
```

> **Windows clock.** Clerk rejects session tokens that look "issued in the future". If your PC clock is more than a few seconds off, sign-in loops back to the sign-in page. Sync it under *Settings → Time & language → Date & time → Sync now*.

### Demo accounts (for the slides)

| | Email | Password |
|---|---|---|
| Demo shop (Thandi's Spaza, Soweto) | `thandi+clerk_test@spazalink.co.za` | `Spaza@2026` |
| Second shop, for showing the data walls (Sipho's Corner Store) | `sipho+clerk_test@spazalink.co.za` | `Spaza@2026` |
| Platform admin (admin portal) | `admin+clerk_test@spazalink.co.za` | `Spaza@2026` |

If Clerk asks for a verification code, enter **424242**. That code works for any `+clerk_test` address on a development instance. The same accounts are shown on the sign-in page with copy buttons.

Thandi's shop is preloaded with stock in all three colours, six months of orders, and CIPC + BEE documents (85% Ready). Sipho's shop has no documents, so you can demo uploads live with `samples/sample_cipc_certificate.pdf` and `samples/sample_bee_affidavit.pdf`. Run `npm run seed` again at any time to reset both demo shops. It also resets the demo users' passwords in Clerk.

### What the seed loads

- **8 shops.** Thandi and Sipho have logins. Six community shops (Tembisa, Mamelodi, Alexandra, Umlazi, Soshanguve and Mdantsane) have data only, so the admin graphs have a real network to show.
- **7 wholesalers:** five verified, one pending and one rejected.
- **47 products** across nine categories. Three are unverified, which proves the safety gate.
- **About 117 stock lines and 140 orders** over six months, with payments, delivery timelines and compliance documents. A few late payers make the credit health scores vary.

## Demo shop for everyone

**Thandi's Spaza** is the shared demo shop (`isDemo: true` in the seed).

- **No shop yet:** anyone signed in without their own shop sees it by default. A welcome popup and a banner explain this and offer **Register my own shop**.
- **View only:** the server refuses every change made in demo mode with 403 `DEMO_READ_ONLY`.
- **After registering:** the new owner sees only their own shop, which starts empty, with no demo data mixed in. Shop owners can still peek at the demo with the **Demo shop** button in the header.
- **Data walls stay intact:** only the shop marked as the demo is ever shared. Every other shop stays walled, and the security suite checks this.

## Admin portal (`/admin`)

Open to the **Platform admin** role only. The role is stored in the Clerk user's `publicMetadata.role` and checked on the server for every admin request. Everyone else gets an "Admins only" screen, and the API answers 403.

| Page | What it shows | Forms and actions |
|---|---|---|
| Overview | Key figures, registrations per month, newest shops, order value, orders, deliveries by status, payment mix, best sellers, sales by category, stock health per shop, credit health, compliance, critical stock, recent orders | Platform report download (PDF or PowerPoint) |
| Shops | Every shop with joined date, compliance, a stock-health bar, orders, spend, on-time rate and credit health. Includes credit health and compliance charts | Select a shop for its monthly spend chart |
| Orders | Every order with payment outcome. Includes a status donut and payment outcome chart | Status tabs, search, Move on (advances delivery) |
| Products | The catalogue, with a status donut and products per category | Add product, with a live price check chart against its category. Edit price, bulk deal and verification |
| Suppliers | Every wholesaler, with a status donut, wholesalers per province and order value per wholesaler | Add supplier, with a live province chart. Change verification inline |
| Guide | A plain-language explanation of how SpazaLink works | |

All charts are shadcn/ui charts (`src/components/charts.tsx`).

When anyone signs in, a one-time notice explains that access is role based today, and that full RBAC is coming: named permissions per role, with an audit trail.

## Downloadable reports

Each report offers a choice of **PDF document** or **PowerPoint slides** (native, editable charts):

- **Financial Health Report** (shop owner, `/finance`): `GET /api/report?format=pdf|pptx`
- **Platform report** (admin, `/admin`): `GET /api/admin/report?format=pdf|pptx`

## Demo script (from the user journey)

1. **Sign up.** Register through Clerk (email or Google), then fill in the one-step **Register your shop** form.
2. **Get compliant.** Sign in as Sipho and upload the two sample PDFs. The score climbs 15% → 50% → 85% Ready.
3. **Track stock.** As Thandi, the list shows Green, Yellow and Red bars.
4. **Get alerted.** Tap **−** on Sunflower Cooking Oil until it drops below 20% (2 of 12). The bar turns Red and the alert slides down.
5. **Quick Fix.** Tap it. The missing quantity lands in the cart and checkout opens.
6. **Buy safely.** Point out the trust badges and the bulk-discount line.
7. **Pay.** Choose PayShap (the phone number is prefilled) and place the order. The button stays disabled until a payment method is chosen.
8. **Track delivery.** Use **Next status** (which plays the wholesaler) to move the order through Order Placed → Packing → Out for Delivery → Delivered. The timeline polls every 4 s.
9. **Build a record.** On `/finance`, this month's point on the chart now includes the new order.
10. **Unlock credit.** Tap **Download PDF** to get the Financial Health Report.

> Payments run in **sandbox mode**: no money moves. State this on the slides.

## Design

- **Palette (taken from the logo):** navy `#062654` for trust and primary actions, pink `#F2366D` for energy and highlights, and mustard `#F4AF23` for attention, savings and Quick Fix, all on a soft blush background. Stock status keeps its own green, amber and red.
- **Components:** [shadcn/ui](https://ui.shadcn.com) (Radix) in `src/components/ui`, wrapped by the app's kit in `src/components/kit.tsx`: Button, Card, Input, Badge, Select, AlertDialog for destructive confirmations, and Sonner toasts. Clerk's screens use `@clerk/ui`'s shadcn theme in the same colours.
- **Logo:** the master artwork is `brand/spaza-link.png` (a copy is in `public/brand/`). `npm run brand` cuts out the white background and generates:
  - the header lockup, the stacked logo and the mark
  - `favicon.ico`, `icon.png`, `apple-icon.png`
  - the PWA icons
  - a link-preview image (`opengraph-image.png`)

  The logo appears in the site header, the app header, the sign-in panel, the About section, the footer and the PDF report.
- **Copy:** the interface avoids dashes by design.

## Decisions on the brief's open questions

- **Stock colour bands:** Red is under 20% of full capacity, Yellow is 20–50%, Green is over 50% (`src/lib/rules.ts`).
- **Compliance score:** shop profile complete = 15, CIPC = 35, BEE = 35, SARS tax clearance = 15. A profile plus CIPC and BEE gives **85% Ready**.
- **Credit Health Status:** a 0–100 score made of on-time payments (50%), active months in the last six (30%) and spend consistency (20%). The labels are **Good ≥ 70**, **Fair ≥ 45**, otherwise **At Risk**.
- **Bulk discounts:** each product has its own rule (e.g. *buy 6+, save 6%*). Prices and discounts are always recomputed on the server from the catalogue.

## Technical architecture

```
Shop owner (phone / desktop, installable PWA)
        │ HTTPS
        ▼
Next.js 16 app (App Router, Tailwind CSS 4, shadcn/ui)
  ├─ Clerk: sign-in / sign-up pages, UserButton, session cookies
  ├─ proxy.ts: clerkMiddleware(), app pages require a session
  ├─ Inventory Dashboard ─┐
  ├─ Ordering & Checkout ─┼─ client components → /api/* route handlers
  ├─ Financial Portal ────┘
  └─ API routes: Clerk auth() → owner's shop → shop-walled data layer → MongoDB
        ▼
MongoDB Atlas (collections + GridFS "documents" bucket)
```

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router), Tailwind CSS 4, shadcn/ui (Radix), lucide icons, Recharts |
| Backend | Next.js API route handlers (Node.js runtime) |
| Database | MongoDB Atlas, with application-level row security (`src/lib/walled.ts`) |
| Auth | **Clerk** (`@clerk/nextjs`): email/password, Google, email codes, device verification, bot and brute-force protection |
| File storage | MongoDB GridFS (`documents` bucket) |
| PDF reports | `pdf-lib`, generated server-side |
| Hosting | Vercel (set the env vars below) |
| Build file | Installable PWA (`public/manifest.webmanifest`); can be wrapped as a signed APK with Bubblewrap / PWABuilder |

### How "RLS" works without Postgres

- Clerk identifies the user. Each Clerk user owns exactly one shop, and `shops.ownerUserId` is unique.
- Every API route runs through `withShop()` (`src/lib/api.ts`). It calls Clerk's `auth()`, looks up that user's shop, and hands the handler a `walled(db, shopId)` accessor.
- `walled()` merges `shopId` into every filter, insert, update, delete and aggregation. It's written last, so request data can never override it.
- The shop is taken only from the verified Clerk session, never from the request body or URL.
- Asking for another shop's record returns **404**.
- A signed-in user with no shop yet gets **409 `NO_SHOP`**, and the app sends them to `/onboarding`.

## Database plan

| Collection | Holds | Key fields | Walled by shop |
|---|---|---|---|
| `shops` | One per spaza shop | ownerUserId (Clerk user id, unique), name, location, phone | Yes (owner = session user) |
| `compliance_documents` | CIPC / BEE / TAX uploads | shopId, type, fileId → GridFS, filename, mime, size, uploadedAt | Yes |
| `suppliers` | Wholesalers | name, region, verificationStatus, badges | No (read-only) |
| `products` | Wholesaler catalogue | supplierId, name, unit, price, bulkRule, badges, verificationStatus | No (read-only) |
| `stock_items` | The shop's own stock | shopId, productId, quantity, fullCapacity | Yes |
| `orders` | Each order placed | shopId, orderNumber, subtotal, discount, total, paymentMethod, status | Yes |
| `order_items` | Lines in an order | shopId, orderId, productId, quantity, unitPrice, discount, lineTotal | Yes |
| `order_status_events` | Delivery timeline steps | shopId, orderId, status, changedAt | Yes |
| `payments` | Payment records | shopId, orderId, method, amount, status, paidAt, paidOnTime, sandbox | Yes |
| `documents.files` / `.chunks` | GridFS file storage | metadata.shopId, metadata.type | Yes (served only via a walled lookup) |

User accounts, passwords and sessions live in Clerk, not in MongoDB.

## SSDL (Secure Software Development Lifecycle)

| Stage | What we do | Evidence / notes |
|---|---|---|
| Requirements | Protect shop documents, orders, payments, financial reports and identities | Walled collections are listed in `src/lib/walled.ts`; identities are delegated to Clerk |
| Design | Threat-model the three screens; one data-access path per shop | Clerk session → owner's shop → `walled()`; read-only catalogue; server-side pricing |
| Implementation | Input cleaning, upload filters, secrets out of code, HTTPS only | `src/lib/validation.ts` (zod + text cleaning), `src/lib/uploads.ts` (extension + MIME + magic bytes + 5 MB), `.env.local` ignored by git, HSTS and security headers in `next.config.ts` |
| Testing | Cross-account access, roles, bad input and upload tests; every brief item | `npm run test:security` (55 checks) and `npm run test:brief` (77 checks), all passing against real Clerk sessions and MongoDB |
| Deployment | Environment variables for keys; least-privilege database user | Env vars in Vercel; Atlas user with `readWrite` on `spazalink` only; Clerk production instance via `npx clerk@latest deploy` |
| Maintenance | Dependency updates, error logging, access review | `npm audit`; server errors logged as `[api]` without leaking details; Clerk dashboard for sessions and users |

### Security checklist

- [x] Row security enforced and tested on every shop collection (`walled.ts` + test suite)
- [x] Authentication on every app page and API route (Clerk middleware + `auth()` in each route)
- [x] Role-based access: the admin portal and admin API require the Platform admin role; shop owners get 403
- [x] Server-side input validation (zod). Script tags and SQL fragments are stored as plain text, and NoSQL operator objects are rejected
- [x] Upload type and 5 MB limits. A `.exe`, a renamed `.exe` and a 6 MB PDF are each refused with a clear message
- [x] Passwords handled by Clerk (never stored by SpazaLink), with breached-password checks, lockout after 10 failed attempts, and new-device verification
- [x] API keys and secrets in environment variables only
- [x] Extra protections: same-origin check on writes, `nosniff` / `X-Frame-Options: DENY` / HSTS, and `Cache-Control: no-store` on documents and reports

## Environment variables

| Name | Purpose |
|---|---|
| `MONGODB_URI`, `MONGODB_DB` | Atlas connection |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk (pulled with `npx clerk@latest env pull`) |
| `REPORT_SIGNING_SECRET` | Signs the integrity code printed on Financial Health Reports |

## Deploying to Vercel

1. Push this folder to GitHub and import it in Vercel.
2. Add the environment variables above.
3. In Atlas → Network Access, allow Vercel to connect.
4. After deploying, sign in to the live URL from a fresh browser with a demo account.
5. Before real users arrive: claim a production Clerk instance with `npx clerk@latest deploy` and swap in production keys. The current keys are for a development instance.

> Vercel limits request bodies to 4.5 MB, so on Vercel the practical upload limit is about 4.4 MB. The server still enforces the 5 MB rule.

## Project layout

```
brand/spaza-link.png        master logo artwork
src/
  proxy.ts                  clerkMiddleware page protection
  components/ui/            shadcn/ui components
  components/kit.tsx        SpazaLink UI kit on top of shadcn
  components/logo.tsx       Logo (lockup / mark / full) + BrandStripe
  lib/
    rules.ts                business rules shared by client and server
    walled.ts               application-level row security
    api.ts                  withShop() / withUser() on Clerk auth(), errors, origin check
    clerk-appearance.ts     Clerk theme in SpazaLink colours
    validation.ts, uploads.ts, services.ts, db.ts, ...
  app/
    page.tsx                landing + About
    (auth)/sign-in, sign-up, onboarding
    (app)/dashboard, order, finance
    api/...                 route handlers
scripts/
  seed.mjs                  demo data + Clerk demo users
  security-check.mjs        SSDL test evidence
  brand-assets.mjs          logo, favicon and share image generation
```
