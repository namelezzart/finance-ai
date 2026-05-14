# Finance AI — Project Context

## Overview
Personal finance analytics app that parses bank CSV exports (Tinkoff, Sber, Alfa), categorizes spending, and delivers AI-powered insights via charts and LLM advice.

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.2 (App Router), TypeScript strict |
| Database | Supabase (PostgreSQL + Row Level Security) |
| Auth | Supabase Auth (email/password) |
| Styling | Tailwind CSS + shadcn/ui (Nova preset) |
| Charts | Recharts |
| AI | Groq API — llama-3.3-70b-versatile |
| Deployment | Vercel (planned) |

## Important: Real Project Structure
All source files live inside `src/` — Next.js was initialized with src directory.

```
finance-ai/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── layout.tsx           # centered card layout, no sidebar
│   │   │   ├── login/page.tsx       # email + password login
│   │   │   └── register/page.tsx    # registration
│   │   ├── dashboard/
│   │   │   ├── layout.tsx           # sidebar layout
│   │   │   ├── page.tsx             # overview (stub)
│   │   │   ├── upload/page.tsx      # CSV upload with drag-and-drop
│   │   │   ├── transactions/page.tsx # (stub)
│   │   │   ├── analytics/page.tsx   # (stub)
│   │   │   └── history/page.tsx     # (stub)
│   │   ├── api/
│   │   │   └── parse-csv/route.ts   # CSV parsing + Supabase save
│   │   ├── layout.tsx
│   │   └── page.tsx                 # redirects → /login or /dashboard
│   ├── components/
│   │   ├── ui/                      # shadcn/ui components
│   │   └── Sidebar.tsx              # nav sidebar with logout
│   ├── lib/
│   │   └── parsers/
│   │       ├── normalize.ts         # normalizeDate, normalizeAmount, detectBank
│   │       ├── alfa.ts              # Alfa-bank parser
│   │       ├── tinkoff.ts           # Tinkoff parser
│   │       ├── sber.ts              # Sber parser
│   │       └── index.ts             # re-exports all parsers
│   ├── types/
│   │   └── index.ts                 # Transaction, Bank, Upload, CATEGORIES
│   └── utils/
│       └── supabase/
│           ├── client.ts            # createBrowserClient
│           └── server.ts            # createServerClient (async, uses cookies)
├── proxy.ts                         # auth guard (Next.js 16 renamed middleware→proxy)
├── tsconfig.json                    # paths: "@/*" → "./src/*"
├── .env.local
└── PROJECT.md
```

## Environment Variables (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://qrukbkxxexlxpyxbkpmz.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-key>
GROQ_API_KEY=<server-only-groq-key>
```

## Critical Next.js 16 Differences
- `middleware.ts` is now `proxy.ts` with exported function named `proxy` (not `middleware`)
- Turbopack is on by default and cannot be disabled
- shadcn/ui now uses presets (Nova = Lucide + Geist)

## Supabase Setup
- Project ref: `qrukbkxxexlxpyxbkpmz`
- Auth: email confirm is DISABLED (for dev)
- Uses `@supabase/ssr` package (NOT deprecated `auth-helpers-nextjs`)
- Key name: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (not ANON_KEY)
- server.ts uses async createClient(): `const supabase = await createClient()`

## Database Schema
```sql
create table uploads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  file_name   text not null,
  bank        text not null,          -- 'tinkoff' | 'sber' | 'alfa'
  row_count   int,
  status      text default 'pending', -- 'pending' | 'done' | 'error'
  created_at  timestamptz default now()
);

create table transactions (
  id          uuid primary key default gen_random_uuid(),
  upload_id   uuid references uploads not null,
  user_id     uuid references auth.users not null,
  date        date not null,
  amount      numeric(12,2) not null,  -- negative = expense, positive = income
  description text,
  category    text,
  merchant    text,
  raw_data    jsonb
);

alter table uploads      enable row level security;
alter table transactions enable row level security;

create policy "own uploads"      on uploads      for all using (user_id = auth.uid());
create policy "own transactions" on transactions for all using (user_id = auth.uid());
```

## CSV Formats (verified from real files)

### Alfa-bank (mobile app) — verified with real file
- Encoding: UTF-8 with BOM
- Delimiter: comma `,` — NOT semicolon
- Headers: `operationDate,transactionDate,accountName,accountNumber,cardName,cardNumber,merchant,amount,currency,status,category,mcc,type,comment,bonusValue,bonusTitle`
- Date: `DD.MM.YYYY`
- Amount: always positive; direction from `type` field
- `type = "Списание"` → expense (negative), `"Пополнение"` → income (positive)
- Category in Russian: "Продукты", "Транспорт", "Такси" etc.

### Tinkoff — not yet verified with real file
- Encoding: UTF-8 with BOM
- Delimiter: semicolon `;`
- Key columns: `Дата операции`, `Сумма операции`, `Описание`, `Категория`, `MCC`, `Статус`
- Date: `DD.MM.YYYY HH:MM:SS` — split on space, take index [0]
- Amount: signed string, e.g. `-1 500,00` (space as thousands separator)
- Only process rows where `Статус === "OK"`

### Sber — not yet verified with real file
- Encoding: Windows-1251 → convert to UTF-8 server-side via TextDecoder
- Delimiter: semicolon `;`
- Key columns: `Дата операции`, `Описание операции`, `Сумма операции`, `Подразделение`
- Date: `DD.MM.YYYY`
- Amount: signed string

## Types (src/types/index.ts)
```typescript
export interface Transaction {
  id?: string;
  uploadId: string;
  userId: string;
  date: string;       // ISO 8601: "2026-04-04"
  amount: number;     // negative = expense, positive = income
  description: string;
  category: string;
  merchant?: string;
  rawData?: Record<string, string>;
}

export type Bank = "tinkoff" | "sber" | "alfa";
export type UploadStatus = "pending" | "done" | "error";

export const CATEGORIES = [
  "food_groceries", "food_restaurants",
  "transport_public", "transport_taxi", "transport_fuel",
  "housing_utilities", "housing_rent",
  "health_pharmacy", "health_services",
  "entertainment_streaming", "entertainment_leisure",
  "shopping_clothes", "shopping_electronics", "shopping_other",
  "education", "travel", "transfers", "income", "other",
] as const;
```

## Key Conventions
- All source files in `src/` — tsconfig paths: `"@/*": ["./src/*"]`
- Server Components by default — `"use client"` only for hooks/events
- `createClient()` from server.ts is async — always `await createClient()`
- API routes: always return `{ error: string }` on failure
- Dates stored as ISO 8601 in DB (`YYYY-MM-DD`)
- Amounts: numeric(12,2) — negative for expenses
- CSV parsing always server-side — never in browser
- Groq API calls always server-side — never expose GROQ_API_KEY to client
- User-facing text in Russian, code/comments in English
- Recharts components must be `"use client"` (uses browser APIs)
- All comments in files are in Russian for the developer to study

## Current Status — В ПРОДЕ
Все основные фичи выкачены, приложение работает в production. Список ниже описывает реальное состояние и известные проблемы.

### Готово и работает
- Auth (login / register / logout) через Supabase
- proxy.ts — auth guard на все защищённые роуты
- Dashboard + sidebar (desktop) и bottom-nav + top-bar (mobile)
- Upload UI с drag-and-drop
- CSV парсеры (Alfa / Tinkoff / Sber) — протестированы на реальных файлах
- API `/api/parse-csv`, `/api/analyze`, `/api/uploads/[id]`
- Страница транзакций с фильтрами
- Аналитика на Recharts
- Groq AI-анализ расходов
- История загрузок
- Vercel deploy
- Темы dark/light с переключателем
- Адаптивная вёрстка под mobile

### Известные проблемы / технический долг
- ⚠️ Адаптив требует доработки — отдельные страницы могут плыть на узких экранах
- Нет автоматических тестов (unit / e2e)
- Bundle size не профилировался — Recharts может быть тяжёлым
- Supabase индексы по транзакциям не добавлены, возможны медленные запросы на больших объёмах
- Accessibility-аудит не проводился

## Notes for AI Assistants
- Next.js version is 16, NOT 14
- `proxy.ts` in root (not middleware.ts) — export `async function proxy()`
- Supabase key: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- shadcn components: `src/components/ui/`
- Parsers: `src/lib/parsers/`
- Supabase clients: `src/utils/supabase/` (not src/lib/supabase/)
- Do NOT use `@supabase/auth-helpers-nextjs`
- Recharts always in client components
- All files should include Russian comments explaining concepts
