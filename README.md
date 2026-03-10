# GSC Renewal Hub

A contract renewal tracking dashboard for GSC, built with React, Vite, and Supabase.

## Features

- **Role-based access** — Admin and Director roles with PIN-based login
- **Contract records** — Add, edit, and delete renewal contracts
- **File attachments** — Upload and store supporting documents via Supabase Storage
- **Search & filter** — Search by client name or filter by director
- **CSV export** — Export the full register to a CSV file
- **Summary dashboard** — View total contracts, amounts, and renewal stats

## Tech Stack

- **Frontend** — React 18, TypeScript, Vite
- **UI** — Tailwind CSS, shadcn/ui
- **Database** — Supabase (PostgreSQL)
- **File Storage** — Supabase Storage
- **Hosting** — Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Vercel](https://vercel.com) account

### 1. Clone the repository

```bash
git clone https://github.com/researchgscintime/renewal_hub.git
cd renewal_hub
npm install
```

### 2. Set up environment variables

Create a `.env` file in the root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Set up the Supabase database

Run this SQL in your Supabase **SQL Editor**:

```sql
CREATE TABLE records (
  id                  TEXT PRIMARY KEY,
  client_name         TEXT NOT NULL,
  contract_amount     NUMERIC(15, 2) NOT NULL DEFAULT 0,
  signed_date         TEXT,
  updated_by          TEXT,
  attachment_name     TEXT DEFAULT '',
  attachment_type     TEXT DEFAULT '',
  attachment_data_url TEXT DEFAULT '',
  notes               TEXT DEFAULT '',
  created_at          TEXT,
  updated_at          TEXT
);

ALTER TABLE records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON records FOR ALL TO anon USING (true) WITH CHECK (true);
```

### 4. Set up Supabase Storage

1. Go to **Supabase → Storage** and create a bucket named `attachments` (set to **Public**)
2. Add these policies on the bucket:
   - **INSERT** for `anon` role — WITH CHECK: `true`
   - **SELECT** for `anon` role — USING: `true`

### 5. Run locally

```bash
npm run dev
```

## Deployment (Vercel)

1. Push the repo to GitHub
2. Import the project on [Vercel](https://vercel.com)
3. Add the environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
4. Deploy

## Users & Roles

| Role | Permissions |
| --- | --- |
| **Admin** | View all records, add/edit/delete any record, assign to any director |
| **Director** | View all records, add/edit their own records only |

User credentials are managed in `src/lib/constants.ts`.
