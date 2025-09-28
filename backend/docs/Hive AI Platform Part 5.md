# Hive MVP – Clean Playbook (Next.js 14, Azure App Service, Supabase, Next-Auth)

This is a **clean, copy-pasteable** playbook that reflects what we converged on: a fresh Next.js 14 app with only the **working** code, sane configs, and a minimal deployment path to **Azure App Service**. I’ve removed false starts and retries so you can drop this into a `.md` and hand it to anyone.

---

## 0) Prereqs

* Node 20.x
* Azure Web App (Windows or Linux)
* GitHub repo (you’re using `ole-papa-joe/hivemind-ai-hub`)
* Supabase project (service role key)
* Values ready for:

  * `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE`
  * `NEXTAUTH_SECRET`
  * `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID`
  * `CRON_TOKEN` (used by the retention admin route)

---

## 1) Create a clean Next.js 14 app (no Tailwind initially)

```bash
# safe place
cd ~
npx create-next-app@14 --ts --app --src-dir --eslint --use-npm --no-tailwind --import-alias "@/*" hive-next14-clean

cd hive-next14-clean
npm run build # sanity check: should pass
```

---

## 2) Install runtime deps we actually use

```bash
npm i next-auth @supabase/supabase-js
```

*(We’ll add Tailwind & UI deps later after core API/auth builds successfully.)*

---

## 3) Project structure (only the files we need now)

```
src/
  app/
    api/
      auth/[...nextauth]/route.ts
      diag/route.ts
      admin/retention/run-all/route.ts
  lib/
    auth.ts
    supabaseAdmin.ts
    retention.ts
```

Create the files below verbatim.

---

## 4) Working code (copy exactly)

### 4.1 `src/lib/auth.ts`

```ts
// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

const {
  AZURE_AD_CLIENT_ID,
  AZURE_AD_CLIENT_SECRET,
  AZURE_AD_TENANT_ID,
  NEXTAUTH_SECRET,
} = process.env;

if (!AZURE_AD_CLIENT_ID || !AZURE_AD_CLIENT_SECRET || !AZURE_AD_TENANT_ID || !NEXTAUTH_SECRET) {
  throw new Error("Missing Azure AD / NEXTAUTH env vars.");
}

export const authOptions: NextAuthOptions = {
  secret: NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    AzureADProvider({
      clientId: AZURE_AD_CLIENT_ID,
      clientSecret: AZURE_AD_CLIENT_SECRET,
      tenantId: AZURE_AD_TENANT_ID,
      authorization: { params: { scope: "openid profile email" } },
      // map Azure AD v2 profile claims into a consistent shape
      profile(profile) {
        return {
          id: (profile as any).oid ?? (profile as any).sub,
          name: (profile as any).name ?? null,
          email:
            (profile as any).email ??
            (profile as any).preferred_username ??
            null,
          oid: (profile as any).oid ?? null,
          upn: (profile as any).upn ?? null,
          preferred_username: (profile as any).preferred_username ?? null,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, profile }) {
      const p = (profile ?? {}) as any;
      if (p.oid) token.oid = p.oid;
      if (p.upn) token.upn = p.upn;
      if (p.preferred_username) token.preferred_username = p.preferred_username;
      if (!token.email) token.email = p.email ?? p.upn ?? token.email ?? null;
      return token;
    },
    async session({ session, token }) {
      (session.user as any).oid = (token as any).oid ?? null;
      (session.user as any).upn = (token as any).upn ?? null;
      (session.user as any).preferred_username =
        (token as any).preferred_username ?? null;
      return session;
    },
  },
};
```

### 4.2 `src/app/api/auth/[...nextauth]/route.ts`

```ts
// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
// re-export so other routes can import from here if desired
export { authOptions } from "@/lib/auth";
```

### 4.3 `src/lib/supabaseAdmin.ts`

```ts
// src/lib/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE.");
}

export const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
});
```

### 4.4 `src/lib/retention.ts`

```ts
// src/lib/retention.ts
import { sbAdmin } from "./supabaseAdmin";

export async function listOrgIds(): Promise<string[]> {
  const { data, error } = await sbAdmin
    .from("orgs")
    .select("id")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((r: any) => r.id as string);
}

// Purge one org's related rows by foreign key (adjust table names to your schema)
export async function purgeOrgOnce(
  orgId: string,
  opts: { dryRun?: boolean } = {}
) {
  const dryRun = !!opts.dryRun;
  if (dryRun) return { orgId, deleted: false, dryRun: true };

  const tables = ["invites", "memberships", "audits", "dlp_rules", "org_settings"];
  for (const t of tables) {
    const { error } = await sbAdmin.from(t).delete().eq("org_id", orgId);
    if (error) throw new Error(`[${t}] ${error.message}`);
  }

  const { error: orgErr } = await sbAdmin.from("orgs").delete().eq("id", orgId);
  if (orgErr) throw new Error(`[orgs] ${orgErr.message}`);

  return { orgId, deleted: true, dryRun: false };
}
```

### 4.5 `src/app/api/admin/retention/run-all/route.ts`

```ts
// src/app/api/admin/retention/run-all/route.ts
import { NextResponse } from "next/server";
import { listOrgIds, purgeOrgOnce } from "@/lib/retention";
import { timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export async function POST(req: Request) {
  const cronHeader = req.headers.get("x-cron-token") ?? "";
  const expected = process.env.CRON_TOKEN ?? "";
  if (!expected || !safeEqual(cronHeader, expected)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { source, dryRun } = await req.json().catch(() => ({}));
  const orgIds = await listOrgIds();

  const results: Record<string, unknown> = {};
  for (const id of orgIds) {
    try {
      results[id] = await purgeOrgOnce(id, { dryRun });
    } catch (e: any) {
      results[id] = { error: e?.message ?? String(e) };
    }
  }

  return NextResponse.json({ ok: true, source, dryRun: !!dryRun, results });
}
```

### 4.6 `src/app/api/diag/route.ts`

```ts
// src/app/api/diag/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    time: new Date().toISOString(),
    runtime: process.env.NEXT_RUNTIME ?? "node",
  });
}
```

---

## 5) Minimal config to **build without lint/type blocks** (we’ll tighten later)

### 5.1 `next.config.mjs`

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true }, // temporary while migrating
};

export default nextConfig;
```

### 5.2 `tsconfig.json` (ensure alias)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "strict": true,
    "noEmit": true,
    "incremental": true,
    "jsx": "preserve",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["next-env.d.ts", "src/**/*", "next.config.mjs"],
  "exclude": ["node_modules"]
}
```

---

## 6) Environment variables

Create `.env.local` locally and mirror to Azure App Settings:

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=***your_random_32+_string***

AZURE_AD_CLIENT_ID=***
AZURE_AD_CLIENT_SECRET=***
AZURE_AD_TENANT_ID=***

SUPABASE_URL=***
SUPABASE_SERVICE_ROLE=***

CRON_TOKEN=***a_strong_shared_secret***
```

In **Azure App Service**:

* Add the same as **Application settings**.
* If Windows plan: set `WEBSITE_NODE_DEFAULT_VERSION` = `~20`.
* If Linux plan: Oryx will detect Node 20 from lockfile.

---

## 7) Build & sanity test locally

```bash
npm run build
npm run start
# Then hit:
#   http://localhost:3000/api/diag
```

Test the retention endpoint (PowerShell):

```powershell
$base = "http://localhost:3000"
$token = "<your CRON_TOKEN>"

Invoke-RestMethod -Uri "$base/api/diag" -Method GET

Invoke-RestMethod `
  -Uri "$base/api/admin/retention/run-all" `
  -Method POST `
  -Headers @{ 'X-Cron-Token' = $token; 'Content-Type'='application/json' } `
  -Body '{"source":"local-test","dryRun":true}'
```

You should get `{ ok: true, dryRun: true, ... }`.

---

## 8) (Optional now) Add Tailwind + UI later

Once the **core APIs build and deploy clean**, add Tailwind + UI deps (shadcn etc.). That was the source of most build noise earlier; let’s add it **after** we’re green in prod.

If/when you’re ready, install:

```bash
npm i -D tailwindcss postcss autoprefixer tailwindcss-animate
npx tailwindcss init -p
```

* `postcss.config.mjs`

  ```js
  export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
  ```
* `tailwind.config.js`

  ```js
  /** @type {import('tailwindcss').Config} */
  module.exports = {
    content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}", "./src/pages/**/*.{ts,tsx}"],
    theme: { extend: {} },
    plugins: [require("tailwindcss-animate")],
  };
  ```
* `src/app/globals.css`

  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  ```

*(Do this **after** the first successful deploy to avoid chasing CSS config errors while we stabilize the platform.)*

---

## 9) Deploy to Azure – **GitHub Actions** (Publish Profile)

Add a secret to the repo: `AZURE_WEBAPP_PUBLISH_PROFILE` (paste the XML publish profile you downloaded from the App Service).

### `.github/workflows/azure-webapp.yml`

> ✅ Use **Windows** job if your App Service is Windows + web.config/iisnode.
> ✅ Use **Linux** job otherwise (simpler).
> Pick **one** section.

**Linux (recommended)**

```yaml
name: Build & Deploy (Linux)

on:
  push:
    branches: [ "main" ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - name: Zip workspace
        run: zip -r package.zip .next public package.json package-lock.json next.config.mjs
      - name: Deploy to Azure Web App
        uses: azure/webapps-deploy@v3
        with:
          app-name: thive-ai-webapp
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: package.zip
```

**Windows (if your App Service is Windows)**

Also add these files to repo root:

`server.js`

```js
const { createServer } = require("http");
const next = require("next");

const port = process.env.PORT || 3000;
const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
```

`web.config`

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="iisnode" path="server.js" verb="*" modules="iisnode" />
    </handlers>
    <rewrite>
      <rules>
        <rule name="NextJS" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll" trackAllCaptures="false" />
          <action type="Rewrite" url="server.js" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

Windows workflow:

```yaml
name: Build & Deploy (Windows)

on:
  push:
    branches: [ "main" ]

jobs:
  build-and-deploy:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - name: Zip package
        run: powershell Compress-Archive -Path .next,public,package.json,package-lock.json,next.config.mjs,server.js,web.config -DestinationPath package.zip -Force
      - name: Deploy to Azure Web App
        uses: azure/webapps-deploy@v3
        with:
          app-name: thive-ai-webapp
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: package.zip
```

---

## 10) Post-deploy verification (Azure)

PowerShell from your machine:

```powershell
$base = "https://<YOUR_APPNAME>.azurewebsites.net"
Invoke-RestMethod -Uri "$base/api/diag" -Method GET

$token = "<your CRON_TOKEN>"
Invoke-RestMethod `
  -Uri "$base/api/admin/retention/run-all" `
  -Method POST `
  -Headers @{ 'X-Cron-Token' = $token; 'Content-Type' = 'application/json' } `
  -Body '{"source":"prod-smoke-test","dryRun":true}'
```

---

## 11) Outstanding tasks (recommended order)

1. **Stabilize core API** (you’re basically there)

   * ✅ Auth (`/api/auth`) and basic routes (`/api/diag`, `/api/admin/retention/run-all`)
   * ✅ Env vars set in Azure

2. **Migrate business routes gradually**

   * Bring over admin routes **one by one** (audits, dlp, members, settings).
   * Change all `authOptions` imports to `@/lib/auth` (you already replaced 8 – that’s the right count).
   * Keep `next.config.mjs` ignore toggles until everything compiles, then remove and fix types/lints.

3. **Type cleanup**

   * Replace `any` in hot spots (`auth.ts`, `retention.ts`, admin routes) with explicit types.
   * Re-enable in `next.config.mjs`:

     ```js
     eslint: { ignoreDuringBuilds: false },
     typescript: { ignoreBuildErrors: false },
     ```

4. **Tailwind + UI pass**

   * Add Tailwind as in §8.
   * Only then add UI deps (shadcn, lucide, radix, clsx, tailwind-merge, etc.) and UI pages.
   * If you use those libs in existing components, add the packages first so builds stay green.

5. **Security & ops**

   * Rotate `NEXTAUTH_SECRET` & `CRON_TOKEN` for prod.
   * Audit Supabase RLS on `orgs`, `memberships`, `invites`, `audits`, `dlp_rules`, `org_settings`.
   * Add a **read-only** health endpoint (`/api/diag`) – already done.
   * Add Application Insights (optional) and set alerts on 5xx spikes.

6. **Deployment hygiene**

   * Keep GitHub Actions as **single source of deploys** (no more ZIP push & Kudu loops).
   * Protect `main` with required status checks (“Build & Deploy” must pass).
   * Document your **App Settings** in the repo as `infra/appsettings.sample.json` (no secrets).

7. **Smoke tests**

   * Add a tiny script that runs after deploy to hit `/api/diag` and `/api/admin/retention/run-all` with `dryRun=true`.

---

## 12) What we intentionally **did not** include (for clarity)

* Tailwind and shadcn plumbing (it was the source of most earlier build failures).
* Chat models (OpenAI/Anthropic/Gemini) – easy to add later once the platform is stable.
* Any SQL migrations (your Supabase schema may differ). The retention lib assumes tables:

  * `orgs(id, created_at)`, plus `invites`, `memberships`, `audits`, `dlp_rules`, `org_settings` with `org_id` FKs.

If you need starter SQL for a dev sandbox, we can add a minimal schema next session.

---

## 13) FAQ

**Q: Why Next.js 14 and not 15?**
Because `next-auth@4.24.x`’s peer range is `^12 || ^13 || ^14`. Using 14 avoids version churn while you stabilize APIs. We can bump to AuthJS v5 / app-router-native later.

**Q: Windows vs Linux App Service?**
Linux is simpler (no `server.js`/`web.config`). Use Windows only if you must (existing infra/policies).

**Q: Can we keep Tailwind/shadcn?**
Yes—add after first green deploy so we isolate CSS/tooling issues from core app issues.

---

## 14) One-liner “ready check”

```bash
# From a clean clone
npm ci && npm run build
# => should pass
```

If the build passes locally, push to `main` and the GitHub Action deploy should succeed.

---

## 15) Next-session starter prompt

> **Copy/paste this to kick off next time:**
>
> “I’ve deployed the clean Next.js 14 app with `/api/diag` and `/api/admin/retention/run-all` working. Help me:
>
> 1. add Tailwind safely, 2) migrate the `admin/*` routes one by one (audits, dlp, members, settings), 3) remove `any` types and re-enable ESLint/TS checks, and 4) optionally add the chat APIs. I’ll paste any build errors exactly as they appear.”
