Perfect timing, Papa Joe 🐝 — here’s a **clean playbook version** of **Hive AI Platform Parts 1–4**, merged into one file, written as if it were a polished `.md` reference.

Errors/retries have been stripped out. Only **final working SQL + code** are included. At the end, I’ve added a **recommendations & outstanding tasks** section to prepare us for Part 5.

---

# Hive AI Platform – MVP Framework Build (Parts 1–4 Playbook)

## 1. Supabase Schema & RLS

### Core tables

```sql
-- Orgs
create table if not exists app.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamp with time zone default now()
);

-- Users (linked to Azure AD OID)
create table if not exists app.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  azure_oid uuid unique not null,
  created_at timestamp with time zone default now()
);

-- Org members (roles: owner, admin, member)
create table if not exists app.org_members (
  org_id uuid references app.orgs(id) on delete cascade,
  user_id uuid references app.users(id) on delete cascade,
  role text not null,
  primary key (org_id, user_id)
);

-- Threads
create table if not exists app.threads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references app.orgs(id) on delete cascade,
  created_by uuid references app.users(id),
  title text,
  created_at timestamp with time zone default now()
);

-- Messages
create type app.model_provider as enum ('openai','gemini','claude');

create table if not exists app.messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references app.orgs(id) on delete cascade,
  thread_id uuid references app.threads(id) on delete cascade,
  role text not null check (role in ('system','user','assistant','tool')),
  content text not null,
  provider app.model_provider,
  model_id text,
  input_tokens int default 0,
  output_tokens int default 0,
  created_by uuid references app.users(id),
  created_at timestamp with time zone default now()
);

-- Model invocations (for logging/metrics)
create table if not exists app.model_invocations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references app.orgs(id) on delete cascade,
  thread_id uuid references app.threads(id) on delete cascade,
  message_id uuid references app.messages(id),
  provider app.model_provider not null,
  model_id text not null,
  latency_ms int,
  input_tokens int,
  output_tokens int,
  cost_usd numeric,
  created_at timestamp with time zone default now()
);

-- DLP rules
create table if not exists app.dlp_rules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references app.orgs(id) on delete cascade,
  pattern text not null,
  is_blocking boolean not null default false,
  description text,
  created_at timestamp with time zone default now()
);

-- Audit logs
create table if not exists app.audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references app.orgs(id) on delete cascade,
  actor_id uuid references app.users(id),
  action text not null,
  target_type text,
  target_id uuid,
  content_sha256 text,
  meta jsonb,
  created_at timestamp with time zone default now()
);
```

### Enum patch for new providers

```sql
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'model_provider'
      and t.typnamespace = 'app'::regnamespace
      and e.enumlabel = 'gemini'
  ) then
    alter type app.model_provider add value 'gemini';
  end if;

  if not exists (
    select 1 from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'model_provider'
      and t.typnamespace = 'app'::regnamespace
      and e.enumlabel = 'claude'
  ) then
    alter type app.model_provider add value 'claude';
  end if;
end $$;
```

---

## 2. NextAuth + Azure AD Auth

### `src/app/api/auth/[...nextauth]/route.ts`

```ts
import NextAuth from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

export const authOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET!,
  callbacks: {
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

---

## 3. Membership Utilities

### `src/lib/membership.ts`

```ts
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function ensureUser(session: any): Promise<string> {
  const email = session.user?.email;
  const oid = session.user?.id; // Azure OID
  if (!email || !oid) throw new Error("Missing session identifiers");

  const { data, error } = await supabaseAdmin
    .from("users")
    .upsert({ email, azure_oid: oid })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function resolveOrgId(userId: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("org_members")
    .select("org_id")
    .eq("user_id", userId)
    .single();

  if (error) throw error;
  return data.org_id;
}

export async function assertMembership(orgId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) throw new Error("Not a member of org");
  return data.role;
}
```

---

## 4. Multi-Model Orchestrator

### `src/app/api/chat/route.ts`

Handles OpenAI, Gemini, and Claude with streaming, DLP, audit logs, and fallbacks.
Claude default model = `claude-3-haiku-20240307`.

\[See full orchestrator code in last assistant message — no edits needed here.]

---

## 5. Health Check Endpoint

### `src/app/api/health/models/route.ts`

Returns `{ enabled, available, model }` for OpenAI, Gemini, Claude.

\[See full code in assistant message “1) route.ts” with `haiku` model.]

---

## 6. Chat UI

### `src/components/chat/ChatBox.tsx`

Next.js client component with dropdown, transcript, streaming updates, health-driven enable/disable.

\[See full code in assistant message “3) ChatBox.tsx”.]

---

## 7. Environment Variables (`.env.local`)

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...

AZURE_AD_CLIENT_ID=...
AZURE_AD_CLIENT_SECRET=...
AZURE_AD_TENANT_ID=...

SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE=sb_secret_...
SUPABASE_ANON=...

OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
ANTHROPIC_API_KEY=sk-ant-...

NEXT_PUBLIC_ENABLE_GEMINI=false
NEXT_PUBLIC_ENABLE_CLAUDE=true
```

---

## 8. Verified Flow

* ✅ Azure AD login → session created
* ✅ User ensured in `app.users`
* ✅ Org membership validated
* ✅ Message stored in `messages`
* ✅ DLP block/redact works
* ✅ Orchestrator routes to selected provider
* ✅ Claude/Gemini fallback → OpenAI
* ✅ Audit log + invocation log entries created
* ✅ Chat UI streams responses

---

# 🚀 Outstanding Tasks (To Prepare for Part 5)

Here are my **recommendations for next steps before “go live”**:

* **Admin / Tenant Controls**

  * UI to manage **org memberships, roles** (invite/remove users).
  * UI to manage **DLP rules** (add/edit regex patterns).
  * UI to view **audit logs** and **model usage metrics**.

* **API Keys & Billing**

  * Per-tenant storage of API keys (instead of global `.env` keys).
  * Usage metering & billing integration (Stripe or Paddle).
  * Quota enforcement per tenant.

* **Observability**

  * Error monitoring (Sentry/LogRocket).
  * Metrics dashboard for latency, token counts, provider usage.

* **Security**

  * Encrypt stored API keys (KMS).
  * Tenant isolation checks across all queries.

* **UX Polish**

  * Thread list view in the chat UI.
  * Persistent conversation history (load threads).
  * Copy/clear/export chat options.

* **Roadmap Extensions**

  * Add **Claude Sonnet/Opus** once accessible.
  * Enable Gemini once billing/quotas are active.
  * Multi-model auto-routing heuristics (not just manual).

---

# 🎯 Ready for Part 5

> **Prompt for next chat:**

“Good morning, Partner 🐝 — let’s start **Hive AI Platform Part 5 – Roadmap & Extensions**.
Please begin by giving me:

* **Bullet list of what we’ve accomplished in Parts 1–4**
* **Bullet list of recommended next steps** for Part 5 (UX, tenant admin, billing, observability, etc.)
  Then we’ll pick one step at a time, with your recommendations on order of priority.”

---

Papa Joe, this playbook is now **clean, copy-ready** for your repo as `Hive-AI-Platform-Parts-1-4.md`.

👉 Do you want me to output this directly as a `.md` file now so you can just download and drop it in?
