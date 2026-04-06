# Samanta LMS — Loan Management System

A production-ready loan management system for microfinance and local loan businesses. Built with Next.js 14 (App Router), PostgreSQL, Prisma, Tailwind, and a custom JWT auth layer.

Includes an **Admin Web Panel**, **Employee Web Panel**, and a **PWA-ready Employee Mobile interface** (installable on Android, wrap with Capacitor for the Play Store).

## ⭐ Star Feature — Unified Date-wise Collection

The hardest problem in a multi-cadence loan business is: "Who is due today?" Samanta solves this by **pre-generating the full repayment schedule** at disbursement. Whether a loan is daily, weekly or monthly, each installment becomes a row in `RepaymentSchedule` with a `dueDate`. The collection screen then runs a single indexed query — `WHERE dueDate = :date` — that returns every customer due on any given day across all loan types, in one unified list.

See the implementation at:
- `src/server/services/collection-service.ts` — `getDueList()` and `recordPayment()`
- `src/features/collections/collection-center.tsx` — shared admin/employee UI
- `src/app/api/v1/collections/due/route.ts` — unified endpoint

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Backend | Next.js Route Handlers |
| Database | PostgreSQL 14+ |
| ORM | Prisma 5 |
| Auth | Custom JWT (access + refresh) in httpOnly cookies |
| Forms | React Hook Form–style controlled inputs + Zod validation |
| UI | Tailwind CSS + shadcn/ui primitives |
| Icons | lucide-react |
| Dates | dayjs |
| Toasts | sonner |
| Storage | Hostinger File Storage (S3-compatible abstraction) |
| Hosting | Hostinger VPS / Node host |

---

## Setup

### 1. Prerequisites

- Node.js 18.17+ (20 LTS recommended)
- PostgreSQL 14+
- npm or pnpm

### 2. Install

```bash
npm install
```

### 3. Configure environment

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

Critical values:
- `DATABASE_URL` — your PostgreSQL connection string
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` — generate long random strings:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
- `SEED_ADMIN_LOGIN` / `SEED_ADMIN_PASSWORD` — initial admin credentials

### 4. Create database schema

```bash
npm run db:push       # or: npm run db:migrate (for migration history)
```

### 5. Seed demo data

```bash
npm run db:seed
```

This creates:
- 1 Super Admin (default: `admin` / `Admin@123`)
- 3 branches
- 9 employees (default pwd: `Employee@123`)
- 45 customers
- ~27 active loans across daily/weekly/monthly types
- Pre-generated schedules with realistic paid/missed history so you see data on the dashboard and collection screen immediately

### 6. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000 and log in with `admin` / `Admin@123`.

### 7. Nightly overdue job

Run manually:

```bash
npm run cron:overdue
```

On Hostinger, add a cron entry (runs at 00:15 daily):

```
15 0 * * * cd /home/username/samanta && npm run cron:overdue >> logs/overdue.log 2>&1
```

---

## Project Structure

```
samanta/
├─ prisma/
│  ├─ schema.prisma           # Full DB schema
│  └─ seed.ts                 # Demo data seeder
├─ scripts/
│  └─ cron-overdue.ts         # Nightly overdue/NPA job
├─ public/
│  └─ manifest.json           # PWA manifest
├─ src/
│  ├─ app/
│  │  ├─ (admin)/admin/...    # Admin panel routes
│  │  ├─ (employee)/employee/.# Employee panel routes
│  │  ├─ (auth)/login/        # Login page
│  │  └─ api/v1/              # All REST endpoints
│  ├─ components/
│  │  ├─ ui/                  # shadcn-style primitives
│  │  └─ layout/              # Sidebar, Topbar
│  ├─ features/               # Feature-sliced domain UI
│  │  ├─ customers/
│  │  ├─ loans/
│  │  └─ collections/         # ⭐ The star feature
│  ├─ server/
│  │  ├─ db.ts                # Prisma client singleton
│  │  ├─ auth/                # JWT, password, session, guards
│  │  ├─ services/            # Loan calculator, schedule, collections, disburse
│  │  ├─ counters.ts          # Sequential ID generators
│  │  └─ audit.ts             # Audit log writer
│  ├─ lib/
│  │  ├─ zod-schemas/         # Shared client/server validation
│  │  ├─ dayjs.ts
│  │  ├─ formatters.ts
│  │  ├─ constants.ts
│  │  ├─ api.ts               # Response helpers
│  │  └─ utils.ts             # cn()
│  └─ middleware.ts           # Route-level auth + role gating
└─ package.json
```

---

## API Reference (v1)

All endpoints live under `/api/v1`. Authentication via httpOnly cookies set on login.

### Auth
- `POST /auth/login` — `{ loginId, password }` → sets cookies
- `POST /auth/logout` — destroys session
- `GET  /auth/me` — current user

### Branches
- `GET /branches`
- `POST /branches` *(admin)*
- `GET/PATCH/DELETE /branches/:id`

### Employees
- `GET /employees`
- `POST /employees` *(admin)*
- `GET/PATCH /employees/:id`
- `POST /employees/:id/reset-password`

### Customers
- `GET /customers?q=&branchId=`
- `POST /customers`
- `GET/PATCH /customers/:id`

### Loan Applications
- `GET /loan-applications?status=&branchId=`
- `POST /loan-applications` — auto-calculates interest/EMI/maturity
- `POST /loan-applications/calculate` — preview calculation
- `GET /loan-applications/:id`
- `POST /loan-applications/:id/approve` *(admin)*
- `POST /loan-applications/:id/reject` *(admin)*
- `POST /loan-applications/:id/disburse` *(admin)* — creates LoanAccount + schedule

### Loans
- `GET /loans?status=&type=`
- `GET /loans/:id`

### ⭐ Collections (Unified)
- `GET /collections/due?date=YYYY-MM-DD&branchId=&employeeId=&loanType=&status=&q=&mode=DUE_ON|DUE_UPTO`
- `POST /collections/pay` — record payment (idempotent via `clientRef`)

---

## Business Rules (enforced server-side)

1. Only `SUPER_ADMIN` / `ADMIN` can approve, reject, or disburse loan applications
2. Employees can only see customers/loans in their assigned branch, and only loans assigned to them
3. `BRANCH_MANAGER` sees everything in their branch
4. Repayment schedules are generated atomically with loan disbursement (single Prisma transaction)
5. Payments lock the loan account and update schedule + account atomically
6. Closed loans are excluded from the due list
7. Every sensitive action writes an `AuditLog` row
8. Idempotency: `Payment.clientRef` prevents duplicate inserts from mobile offline retries

---

## Roles and Data Scoping

Scoping is enforced via `src/server/auth/guards.ts`:

```ts
scopeWhere(user)       // Customer/Application level
loanScopeWhere(user)   // LoanAccount level — EMPLOYEE adds assignedEmployeeId
```

The client never gets to choose `branchId` or `assignedEmployeeId` for data it's not allowed to see.

---

## Mobile / PWA

The employee panel is mobile-responsive out of the box. To turn it into an installable app:

1. A `public/manifest.json` is included.
2. Add a service worker for offline caching (next step — not yet implemented).
3. For Play Store distribution, wrap with [Capacitor](https://capacitorjs.com/):
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android
   npx cap init samanta-lms com.samanta.lms --web-dir=out
   npx cap add android
   npx cap copy
   npx cap open android
   ```

---

## Hostinger Deployment

1. **Provision** a Hostinger VPS with Node.js and PostgreSQL.
2. **Clone** the repo:
   ```bash
   git clone <your-repo-url> samanta
   cd samanta
   ```
3. **Install** production dependencies:
   ```bash
   npm ci --omit=dev
   # Then install dev deps needed for build:
   npm install --save-dev prisma typescript @types/node
   ```
4. **Configure** `.env` with production values.
5. **Build**:
   ```bash
   npm run build
   ```
6. **Run** with a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start npm --name samanta -- start
   pm2 save
   pm2 startup
   ```
7. **Reverse proxy** with nginx pointing to port 3000.
8. **Cron** the overdue job as shown above.
9. **File storage**: set `STORAGE_*` env vars to your Hostinger object storage credentials; the storage adapter in `src/server/storage/` (to be added) reads them.

---

## Roadmap / Not Yet Implemented

Core MVP is complete. Future work:
- [ ] Service worker + IndexedDB offline queue for mobile collections
- [ ] Capacitor Android build scripts
- [ ] PDF receipt rendering (`@react-pdf/renderer`)
- [ ] Excel exports (`exceljs`)
- [ ] Fully implemented reports (12 templates)
- [ ] SMS/WhatsApp notification adapters
- [ ] Forgot-password flow
- [ ] Two-factor authentication for admin
- [ ] Document OCR for Aadhaar/PAN extraction
- [ ] Branch manager UI for his own branch
- [ ] Charts on dashboard (Recharts)
- [ ] File upload to Hostinger storage
- [ ] Loan restructuring / top-up loans
- [ ] Customer self-service portal
- [ ] NPA management workflow

---

## Default Credentials (after seed)

| Role | Login ID | Password |
|---|---|---|
| Super Admin | `admin` | `Admin@123` |
| Employees | (see employee list) | `Employee@123` |

**Change these in production.**

---

## License

Proprietary. © Your Company.
