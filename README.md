# IndiqueCraft — Manufacturing Management System

A production-ready MVP for managing silver product factory operations in Jaipur, India.

## What It Does

- **Customer Orders** — create multi-item orders, track status end-to-end
- **Vendor Raw Material** — request, follow-up, and record partial/full material receipts
- **Production Tracking** — move each item through plating → polishing → finishing → packing
- **Dispatch** — full or partial dispatch with transporter/tracking details
- **Dashboards** — owner overview, purchase, production floor, and dispatch views
- **Reports** — aging, delayed, vendor pending, raw material pending, dispatch summary

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| ORM | Prisma |
| Database | PostgreSQL (Supabase / Neon free tier) |
| Auth | NextAuth v4 — credentials (email/password) |
| UI | Tailwind CSS + Lucide icons |
| Hosting | Vercel free tier |

---

## Local Development Setup

### Prerequisites

- Node.js 18+
- PostgreSQL (local or remote)
- Git

### 1. Clone and install

```bash
git clone <your-repo-url>
cd indiquecraft
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Local PostgreSQL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/indiquecraft?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/indiquecraft?schema=public"

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"   # openssl rand -base64 32
```

### 3. Create the database (local PostgreSQL)

```bash
createdb indiquecraft
# or via psql: CREATE DATABASE indiquecraft;
```

### 4. Run migrations and generate Prisma client

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Seed demo data

```bash
npm run db:seed
```

### 6. Start dev server

```bash
npm run dev
```

Open http://localhost:3000

---

## Demo Login Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@indiquecraft.com | admin123 |
| Owner | owner@indiquecraft.com | owner123 |
| Order Manager | orders@indiquecraft.com | order123 |
| Purchase Coordinator | purchase@indiquecraft.com | purch123 |
| Production Manager | production@indiquecraft.com | prod123 |
| Dispatch Manager | dispatch@indiquecraft.com | disp123 |

---

## Folder Structure

```
indiquecraft/
├── app/
│   ├── (auth)/login/page.tsx        # Login page
│   ├── (dashboard)/
│   │   ├── layout.tsx               # Protected layout with sidebar
│   │   ├── dashboard/page.tsx       # Owner/role-based dashboard
│   │   ├── customers/               # Customer CRUD + detail
│   │   ├── products/                # Product catalogue
│   │   ├── vendors/                 # Vendor management
│   │   ├── orders/                  # Order list + new + detail
│   │   ├── vendor-requests/         # VR list + new + detail
│   │   ├── production/              # Production floor view
│   │   ├── dispatch/                # Dispatch queue
│   │   └── reports/                 # Configurable reports
│   ├── api/
│   │   ├── auth/[...nextauth]/      # NextAuth handler
│   │   ├── customers/               # CRUD
│   │   ├── products/                # CRUD
│   │   ├── vendors/                 # CRUD
│   │   ├── orders/                  # CRUD + status update
│   │   ├── vendor-requests/         # CRUD + receipt endpoint
│   │   ├── production/              # Stage update + log
│   │   ├── dispatch/                # Create dispatch
│   │   ├── dashboard/               # Aggregated KPIs
│   │   └── reports/                 # Report queries
│   ├── layout.tsx
│   ├── page.tsx                     # Redirect to /dashboard or /login
│   └── providers.tsx
├── components/
│   ├── ui/                          # Button, Input, Select, Modal, Card, Badge…
│   ├── shared/                      # DataTable, StatusBadge, PageHeader, StatCard…
│   └── layout/                      # Sidebar, Topbar
├── hooks/use-debounce.ts
├── lib/
│   ├── auth.ts                      # NextAuth config
│   ├── constants.ts                 # Status labels + color maps
│   ├── db.ts                        # Prisma singleton
│   └── utils.ts                     # Helpers
├── prisma/
│   ├── schema.prisma                # Full relational schema
│   └── seed.ts                      # Demo data
├── types/next-auth.d.ts
├── .env.example
└── README.md
```

---

## Database Schema

```
users              → auth and roles
customers          → party master
products           → product catalogue (SKUs)
vendors            → raw material suppliers
orders             → customer orders
order_items        → line items with production stage
vendor_requests    → material requests to vendors
vendor_request_items → per-item request quantities
material_receipts  → receipt log (supports partial)
production_logs    → audit trail of stage changes
dispatches         → dispatch records
dispatch_items     → per-item dispatch quantities
```

---

## Deployment on Vercel + Supabase (Free Tier)

### Step 1 — Supabase Setup

1. Go to https://supabase.com → New project
2. Region: Singapore (closest to India)
3. **Settings → Database → Connection string**:
   - Transaction pooler (port 6543) → `DATABASE_URL`
   - Direct connection (port 5432) → `DIRECT_URL`

**Important**: append `?pgbouncer=true&connection_limit=1` to the pooled URL.

```
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres"
```

### Step 1b — Neon Setup (alternative)

1. Go to https://neon.tech → New project
2. Copy **pooled connection string** → `DATABASE_URL`
3. Copy **direct connection string** → `DIRECT_URL`

### Step 2 — Run Migrations on Production DB

From your local machine:

```bash
DATABASE_URL="<production-pooled-url>" \
DIRECT_URL="<production-direct-url>" \
npx prisma migrate deploy
```

### Step 3 — Deploy to Vercel

**Option A: CLI**
```bash
npm i -g vercel
vercel login
vercel --prod
```

**Option B: GitHub**
1. Push to GitHub
2. vercel.com → Import project → Select repo
3. Vercel auto-detects Next.js

### Step 4 — Environment Variables in Vercel

Vercel dashboard → Project → Settings → Environment Variables:

```
DATABASE_URL       = <production pooled URL>
DIRECT_URL         = <production direct URL>
NEXTAUTH_URL       = https://your-project.vercel.app
NEXTAUTH_SECRET    = <openssl rand -base64 32>
```

### Step 5 — Seed Production (optional)

```bash
DATABASE_URL="<production-url>" DIRECT_URL="<direct-url>" npm run db:seed
```

---

## NPM Scripts

```bash
npm run dev           # Dev server
npm run build         # Production build (includes prisma generate)
npm run db:migrate    # Deploy pending migrations
npm run db:push       # Push schema directly (dev only, no migration file)
npm run db:generate   # Regenerate Prisma client
npm run db:seed       # Seed demo data
npm run db:studio     # Open Prisma Studio (visual DB browser)
```

---

## Business Rules Implemented

| Rule | How |
|---|---|
| Order auto-status | Any item with `rawMaterialRequired=true` → status `RAW_MATERIAL_PENDING` |
| VR pending qty | `pendingQty = requestedQty - receivedQty`, auto-calculated on each receipt |
| VR status auto-update | All items received → `FULLY_RECEIVED`; some → `PARTIALLY_RECEIVED` |
| Stage advance on receipt | VR fully received → linked order items: `WAITING_MATERIAL` → `MANUFACTURING` |
| Order auto-advance | All items `COMPLETED` → order → `READY_TO_DISPATCH` |
| Delayed days | `today - promisedDeliveryDate` shown in red if positive |
| Partial dispatch | Dispatcher selects qty per item; `isPartial` flag set automatically |
| Audit trail | Every production stage change logged with timestamp + user + person |

---

## Adding New Users

Run this from Prisma Studio or a script:

```ts
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

await db.user.create({
  data: {
    name: "New User",
    email: "user@factory.com",
    passwordHash: await bcrypt.hash("password123", 10),
    role: "ORDER_MANAGER",
  },
});
```

Roles: `ADMIN`, `OWNER`, `ORDER_MANAGER`, `PURCHASE_COORDINATOR`, `PRODUCTION_MANAGER`, `DISPATCH_MANAGER`

---

## Future Enhancements

- WhatsApp notifications (Twilio/360Dialog) for overdue vendor requests
- Product image upload via Cloudinary
- Silver weight / inventory tracking
- Customer dispatch SMS/WhatsApp notification
- Invoice and billing module
- Mobile PWA with camera-based dispatch scanning

---

## Architecture Notes

- **Monolithic Next.js** — all API routes = serverless functions on Vercel
- **Prisma + pgbouncer** — mandatory for serverless; use `pgbouncer=true` param in DATABASE_URL
- **No background workers** — delayed status is computed on-the-fly from dates
- **Free-tier friendly** — zero paid services required for full MVP operation
