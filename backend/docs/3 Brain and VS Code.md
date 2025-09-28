Here's your **clean, paste-ready playbook** (single doc). It only includes **working SQL + code** and **omits all failed attempts**. It's organized for Windows/PowerShell + Next.js App Router. Copy everything into a `.md` file.

---

# Hive AI Platform — 3-Brain Playbook (Clean Copy)

This is the distilled setup we now have running: a Next.js 14 app with a **3-brain** starter UI, **Markdown + image attachments**, **thread export**, and **local smoke tests**. It includes only the final, working SQL and code you need.

> **Env note:** do **not** paste secrets here. Put them in `.env.local`.

---

## 0) Environment & Vars

**Node/Tools**

* Node.js: **v20.17.0**
* npm: **10.8.2**
* VS Code on Windows; tasks configured.

**`.env.local` (names only; set your real values):**

```ini
# Required
NEXT_PUBLIC_SUPABASE_URL=<your Supabase URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
SUPABASE_URL=<same as NEXT_PUBLIC_SUPABASE_URL>
SUPABASE_SERVICE_ROLE=<service role key (server only)>
DEFAULT_ORG_ID=<UUID for your org>  # e.g. 00000000-0000-0000-0000-000000000001
IMPORT_CREATED_BY=<your user UUID>

# Providers (set whichever you use)
OPENAI_API_KEY=<…>
ANTHROPIC_API_KEY=<…>
GOOGLE_API_KEY=<…>

# Optional (if using Azure OpenAI instead of OpenAI)
AZURE_OPENAI_ENDPOINT=<…>          # e.g. https://eastus.api.cognitive.microsoft.com/
AZURE_OPENAI_API_KEY=<…>
```

---

## 1) Health Check (JSON, no surprises)

**File:** `src/app/healthz/route.ts`

```ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function bool(v?: string, fallback = false) {
  if (!v) return fallback;
  const s = v.toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

const HEADERS: Record<string, string> = {
  "content-type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

export async function GET() {
  const startedAt = Date.now();
  try {
    const checks: Record<string, unknown> = {};
    checks.node = process.versions?.node ?? "unknown";
    checks.env = process.env.NODE_ENV ?? "unknown";
    checks.commit = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? "n/a";

    const probeUrl = process.env.HEALTHZ_PROBE_URL;
    const doProbe = probeUrl && bool(process.env.HEALTHZ_PROBE_ENABLED, false);
    if (doProbe && probeUrl) {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), Number(process.env.HEALTHZ_PROBE_TIMEOUT_MS ?? 2500));
      try {
        const res = await fetch(probeUrl, { signal: ac.signal });
        checks.probe = { url: probeUrl, status: res.status, ok: res.ok };
      } finally { clearTimeout(t); }
    }

    const ms = Date.now() - startedAt;
    return new Response(JSON.stringify({ status: "ok", uptime_ms: ms, checks }), { status: 200, headers: HEADERS });
  } catch (err: any) {
    const ms = Date.now() - startedAt;
    return new Response(JSON.stringify({ status: "error", uptime_ms: ms, error: err?.message ?? String(err) }), {
      status: 500, headers: HEADERS
    });
  }
}
```

---

## 2) Markdown Rendering (client-only, hydration-safe)

**File:** `src/components/Markdown.tsx`

```tsx
"use client";
import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Client-only Markdown to avoid SSR hydration errors.
 * Unwraps <p> that would contain <pre>.
 */
export default function Markdown({ children }: { children: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div suppressHydrationWarning className="min-h-[1rem]" />;

  const components: any = {
    p({ children, ...props }: any) {
      const hasPre = React.Children.toArray(children).some(
        (c: any) => c?.type === "pre" || c?.props?.mdxType === "pre"
      );
      return hasPre ? <>{children}</> : <p {...props}>{children}</p>;
    },
    li({ children, ...props }: any) {
      const arr = React.Children.toArray(children);
      if (arr.length === 1) {
        const el: any = arr[0];
        if (el?.type === "p") {
          const pc = React.Children.toArray(el.props.children);
          const hasPre = pc.some((c: any) => c?.type === "pre" || c?.props?.mdxType === "pre");
          if (hasPre) return <li {...props}>{pc}</li>;
        }
      }
      return <li {...props}>{children}</li>;
    },
  };

  return (
    <div className="prose prose-sm max-w-none" suppressHydrationWarning>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children ?? ""}
      </ReactMarkdown>
    </div>
  );
}
```

> If you also use `MarkdownView.tsx`, make it the same pattern (client-only, same components).

---

## 3) Start 3-Brain UI (provider/model, clears on success, refreshes)

**File:** `src/components/Start3Brain.tsx`

```tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ProviderId = "openai" | "anthropic" | "google";

const CATALOG: Record<ProviderId, string[]> = {
  openai: ["gpt-4o-mini"],                       // adjust if needed
  anthropic: ["claude-3-7-sonnet-latest"],       // keep only what you have
  google: ["gemini-1.5-flash-latest"],
};

export default function Start3Brain({ threadId }: { threadId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [provider, setProvider] = useState<ProviderId>("openai");
  const [model, setModel] = useState<string>(CATALOG.openai[0]);
  const models = useMemo(() => CATALOG[provider] ?? CATALOG.openai, [provider]);

  useEffect(() => { if (!models.includes(model)) setModel(models[0]); /* eslint-disable-next-line */ }, [provider]);

  async function start() {
    const prompt = text.trim();
    if (!prompt) return;

    const body = { thread_id: threadId, prompt, provider, model, stream: false };
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    let json: any = null;
    try { json = await res.json(); } catch {}
    if (!res.ok || json?.error) {
      console.error("Chat error:", json ?? (await res.text()));
      return;
    }
    if (json?.persisted) {
      setText("");            // clear prompt on success
      router.refresh();       // reload server data → right pane shows reply
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">Seed prompt for 3-brain</label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full h-40 rounded border p-3 text-sm"
      />

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">Provider:</span>
          <select className="border rounded px-2 py-1 text-sm" value={provider} onChange={(e) => setProvider(e.target.value as ProviderId)}>
            <option value="openai">openai</option>
            <option value="anthropic">anthropic</option>
            <option value="google">google</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm">Model:</span>
          <select className="border rounded px-2 py-1 text-sm" value={model} onChange={(e) => setModel(e.target.value)}>
            {models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <button onClick={start} className="rounded bg-black text-white px-4 py-2 text-sm">
          Start 3-brain session
        </button>
      </div>

      <div className="text-xs text-gray-500">POST /api/chat → persist</div>
    </div>
  );
}
```

> This is intentionally **client-only**, clears the prompt after success, and calls `router.refresh()`.

---

## 4) Thread Page: render client-only UI pieces

To prevent server/client mismatches, dynamically import client pieces.

**In** `src/app/threads/[id]/page.tsx` add/ensure:

```tsx
import nextDynamic from "next/dynamic";

// client-only components
const Markdown = nextDynamic(() => import("@/components/Markdown"), { ssr: false });
const ClientStart3Brain = nextDynamic(() => import("@/components/Start3Brain"), { ssr: false });

// ...inside your component render:
{/* Left side: prompt/attachments */}
<ClientStart3Brain threadId={id} />

{/* Right side: messages */}
<Markdown>{message.content}</Markdown>
```

> Keep your existing imports (e.g., `ExportThreadButton`, uploaders, etc.). Only change these to dynamic imports.

---

## 5) Export Thread as Markdown (fixed filename header)

**File:** `src/app/api/threads/[id]/export/route.ts`

```ts
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // your existing admin client

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const threadId = params.id;

  // Fetch messages in order (adjust schema/table names if needed)
  const { data: msgs, error } = await supabaseAdmin
    .from("messages")
    .select("created_at, role, provider, model_id, content")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const lines: string[] = [];
  lines.push(`# Thread ${threadId}`);
  for (const m of msgs ?? []) {
    const hdr = `### ${m.role}${m.provider ? ` (${m.provider}${m.model_id ? `:${m.model_id}` : ""})` : ""}`;
    lines.push(hdr, "", (m.content ?? "").toString(), "");
  }
  const md = lines.join("\n");

  const asciiName = `thread-${threadId}.md`;
  const utf8Param = `utf-8''thread-${encodeURIComponent(threadId)}.md`;

  return new Response(md, {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="${asciiName}"; filename*=${utf8Param}`,
      "Cache-Control": "no-store",
    },
  });
}
```

---

## 6) Import multiple `.md` files into **one** thread (with archive)

**File:** `scripts/import-thread-md.cjs`

```js
"use strict";

const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// Load .env.local
try {
  if (fs.existsSync(".env.local")) {
    for (const l of fs.readFileSync(".env.local","utf8").split(/\r?\n/)) {
      if (!l || /^#/.test(l) || !l.includes("=")) continue;
      const i = l.indexOf("="), k = l.slice(0,i).trim(), v = l.slice(i+1).trim();
      if (k && !process.env[k]) process.env[k] = v;
    }
  }
} catch {}

function requireEnv(name, alt) {
  const v = process.env[name] ?? (alt ? process.env[alt] : undefined);
  if (!v) throw new Error(`Missing env: ${name}${alt ? ` (or ${alt})` : ""}`);
  return v;
}

(async function main() {
  const TITLE = "Hive AI Platform — Master";     // create/use this title
  const SRC   = "C:\\HiveSessions\\HiveAI";      // local folder with .md
  const ARCHIVE = true;

  const SUPABASE_URL = requireEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const SERVICE_KEY  = requireEnv("SUPABASE_SERVICE_ROLE", "SUPABASE_SERVICE_ROLE_KEY");
  const ORG_ID       = requireEnv("DEFAULT_ORG_ID");
  const CREATED_BY   = requireEnv("IMPORT_CREATED_BY");

  if (!fs.existsSync(SRC)) {
    fs.mkdirSync(SRC, { recursive: true });
    console.log(`Created source folder: ${SRC}`);
    console.log("Add .md files then rerun.");
    return;
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { db:{schema:"app"}, auth:{persistSession:false} });

  // find or create thread by title (newest if multiple)
  let threadId = null;
  {
    const { data, error } = await sb
      .from("threads")
      .select("id,created_at").eq("org_id", ORG_ID).eq("title", TITLE)
      .order("created_at", { ascending: false }).limit(1);
    if (error) throw error;
    if (data && data.length) {
      threadId = data[0].id;
      console.log(`Using thread: ${threadId}`);
    } else {
      const { data: t, error: tErr } = await sb
        .from("threads")
        .insert([{ org_id: ORG_ID, title: TITLE, created_by: CREATED_BY }])
        .select("id").single();
      if (tErr) throw tErr;
      threadId = t.id;
      console.log(`Created thread: ${TITLE} (${threadId})`);
    }
  }

  // files by mtime (oldest→newest)
  const entries = await fsp.readdir(SRC, { withFileTypes:true });
  let files = entries.filter(e => e.isFile() && /\.md$/i.test(e.name)).map(e => path.join(SRC, e.name));
  if (!files.length) { console.log("No .md files found in:", SRC); return; }
  const stats = await Promise.all(files.map(f => fsp.stat(f)));
  files = files.map((f,i)=>({ f, m: stats[i].mtimeMs })).sort((a,b)=>a.m-b.m).map(x=>x.f);

  // ensure archive bucket
  if (ARCHIVE) {
    try {
      const { data: buckets } = await sb.storage.listBuckets();
      const exists = (buckets || []).some(b => b.name === "hive-sessions");
      if (!exists) await sb.storage.createBucket("hive-sessions", { public:false });
    } catch {}
  }

  let ok=0, fail=0;
  for (const file of files) {
    const base = path.basename(file);
    try {
      const content = await fsp.readFile(file, "utf8");

      // archive (best effort)
      if (ARCHIVE) {
        try {
          const remotePath = `${threadId}/markdown/${base}`.replace(/\\/g,"/");
          const { error: upErr } = await sb.storage.from("hive-sessions")
            .upload(remotePath, new Blob([content], { type: "text/markdown" }), { upsert: true });
          if (upErr) console.log(`ARCHIVE WARN — ${base}: ${upErr.message}`);
        } catch {}
      }

      // persist one message per file
      const { error: mErr } = await sb.from("messages").insert([{
        org_id: ORG_ID, thread_id: threadId, role: "user", content,
        provider: null, model_id: null, input_tokens: 0, output_tokens: 0, created_by: CREATED_BY
      }]);
      if (mErr) throw mErr;

      console.log(`OK    — ${base}`); ok++;
    } catch (e) {
      console.log(`FAIL  — ${base}: ${e?.message || e}`); fail++;
    }
  }

  console.log("\nSummary:");
  console.log(`  Thread : ${threadId}`);
  console.log(`  Title  : ${TITLE}`);
  console.log(`  Source : ${SRC}`);
  console.log(`  Archive: ${ARCHIVE ? "yes" : "no"}`);
  console.log(`  Appended: ${ok}`);
  console.log(`  Failed  : ${fail}`);
})();
```

Run:

```powershell
node scripts\import-thread-md.cjs
```

---

## 7) Buckets for images & markdown

**Recommendation (consistent paths):**

* **Bucket:** `hive-uploads` → **images at** `attachments/<threadId>/…`
* **Bucket:** `hive-sessions` → **markdown at** `<threadId>/markdown/…`

> This keeps images out of the markdown archive and groups by thread.

---

## 8) Local smoke test (healthz + export)

**File:** `scripts/smoke.cjs`

```js
"use strict";

const DEFAULT_BASE   = "http://localhost:3000";
const DEFAULT_THREAD = "600ee896-9140-4265-9115-22b91f65f7d3"; // your master thread

const base = (process.env.SMOKE_URL || DEFAULT_BASE).replace(/\/+$/, "");
const threadId = process.env.SMOKE_THREAD_ID || DEFAULT_THREAD;

async function get(url, { timeout = 8000 } = {}) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeout);
  try { return await fetch(url, { signal: ac.signal, redirect: "follow" }); }
  finally { clearTimeout(t); }
}
function ok(cond, msg) { if (!cond) throw new Error("✗ " + msg); console.log("✓", msg); }

(async () => {
  try {
    console.log(`SMOKE → ${base}`);

    const r1 = await get(`${base}/healthz`);
    ok(r1.status >= 200 && r1.status < 400, `/healthz HTTP ${r1.status}`);
    ok((r1.headers.get("content-type")||"").includes("application/json"), "/healthz returns JSON");
    const j = await r1.json().catch(()=>null);
    ok(j && (j.status === "ok" || j.status === "error"), "/healthz has status field");

    const r2 = await get(`${base}/api/threads/${threadId}/export`);
    ok(r2.status >= 200 && r2.status < 400, `/api/threads/:id/export HTTP ${r2.status}`);
    ok((r2.headers.get("content-type")||"").includes("text/markdown"), "export returns markdown");
    ok(/attachment;/.test(r2.headers.get("content-disposition")||""), "export has Content-Disposition");
    const text = await r2.text();
    ok(text.length > 0, "export body non-empty");

    console.log("\nAll good ✅");
    process.exit(0);
  } catch (e) {
    console.error("\nSmoke failed ❌", e.message || e);
    process.exit(2);
  }
})();
```

**Wire & run:**

```powershell
npm pkg set scripts.smoke="node scripts/smoke.cjs"
npm run smoke
```

---

## 9) One-click thread backup to local `.md`

**File:** `scripts/export-thread.cjs`

```js
"use strict";
const BASE = "http://localhost:3000";
const THREAD_ID = "600ee896-9140-4265-9115-22b91f65f7d3";
const fs = require("fs");
const path = require("path");

(async () => {
  const url = `${BASE.replace(/\/+$/,"")}/api/threads/${THREAD_ID}/export`;
  const res = await fetch(url);
  if (!res.ok) { console.error(`Export failed: HTTP ${res.status}`); process.exit(2); }
  const md = await res.text();
  if (!md || md.length < 10) { console.error("Export returned empty content."); process.exit(2); }
  const ts = new Date().toISOString().replace(/[-:T]/g,"").slice(0,15);
  const dir = "backups"; if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  const file = path.join(dir, `HiveAI-Master-${ts}.md`);
  fs.writeFileSync(file, md, { encoding: "utf8" });
  console.log("Saved:", file);
})();
```

**Wire & run:**

```powershell
npm pkg set scripts."export:master"="node scripts/export-thread.cjs"
npm run export:master
```

---

## 10) Supabase SQL (providers enum fix)

Your `app.messages.provider` uses enum **`app.model_provider`**. Add the missing values:

```sql
DO $$ BEGIN
  ALTER TYPE app.model_provider ADD VALUE IF NOT EXISTS 'anthropic';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE app.model_provider ADD VALUE IF NOT EXISTS 'google';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

---

## 11) VS Code tasks (Dev + Smoke + quick open)

**File:** `.vscode/tasks.json`

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Dev: Start (Next.js)",
      "type": "npm",
      "script": "dev",
      "group": { "kind": "build", "isDefault": true },
      "presentation": { "reveal": "always", "panel": "dedicated" }
    },
    {
      "label": "Smoke: Run",
      "type": "npm",
      "script": "smoke",
      "group": { "kind": "test", "isDefault": true },
      "presentation": { "reveal": "always", "panel": "dedicated" }
    },
    {
      "label": "Open: Healthz",
      "type": "shell",
      "windows": { "command": "powershell -NoProfile -Command \"Start-Process 'http://localhost:3000/healthz'\"" }
    },
    {
      "label": "Open: Master Thread",
      "type": "shell",
      "windows": { "command": "powershell -NoProfile -Command \"Start-Process 'http://localhost:3000/threads/600ee896-9140-4265-9115-22b91f65f7d3'\"" }
    }
  ]
}
```

> Shortcuts: set **Build**/**Test** in VS Code to trigger Dev/Smoke (you already did).

---

## 12) UX decisions we locked in

* **Left pane**: persistent prompt box (3-brain starter), **attachments** (images), **markdown import**.
* **Right pane**: responses/history (Markdown-rendered).
* **Return to Home** button on thread page.
* **Hide threads** client-side; state persists in localStorage (server view unaffected).
* **Export .md** button at top of thread.

---

## 13) Outstanding tasks to go live (my recommendations)

**A. Provider routing (server)**

* Ensure `/api/chat` dispatches correctly:

  * `provider=openai` → OpenAI (or Azure OpenAI) path.
  * `provider=anthropic` → Anthropic Messages API.
  * `provider=google` → **Google Gemini** (fix fallback that currently routes to OpenAI).
* Persist `{ provider, model_id }` with the assistant message (it's doing so for OpenAI; confirm for Anthropic/Google now that enum fixed).

**B. RLS & Storage Policies**

* **app.threads/messages**: enforce org-scoped access with RLS (read/write where `org_id` matches JWT claim).
* **Storage buckets**:

  * `hive-uploads`: allow authenticated users in the org to upload/read `attachments/<threadId>/…`.
  * `hive-sessions`: server-only writes (archive), reads via signed URLs if needed.

**C. Auth**

* NextAuth is currently "off" in dev (404 on `/api/auth/session`). Decide on provider (Azure AD, etc.) and wire session→JWT → inject `org_id` claim for RLS.

**D. UX polish**

* Hide/pin threads persisted to DB per user (optional), not just localStorage.
* Prevent duplicate thread titles on **create** (DB unique index on `(org_id, lower(title))` or enforce in UI).
* Drag-drop **.md** alongside images (already added "Import Markdown" pane; keep it below prompt).
* Provider/model picker: auto-detect deployed models; pre-populate from a `chat_models` table.

**E. CI/CD**

* Keep the GitHub Actions deploy (Linux App Service) with `/healthz` smoke-test.
* Add a post-deploy `/api/threads/:id/export` smoke to confirm Supabase + app connectivity.

**F. Telemetry & logs**

* Add simple server logs & client error boundary around chat pane.
* Persist request/response IDs for provider calls to ease debugging.

---

## 14) Quick runbook

```powershell
# Start dev server
npm run dev

# Import all .md into the master thread (once you have files)
node scripts\import-thread-md.cjs

# Smoke test (healthz + export)
npm run smoke

# Backup master thread to local .md
npm run export:master
```

---

## 15) Starter prompt for next session

```text
You are the Hive 3-brain orchestrator (OpenAI + Anthropic + Google).
Use the entire "Hive AI Platform — Master" thread as context.

Deliver in concise bullets:
1) Finalize server routing in /api/chat so provider=google hits Gemini (not OpenAI), and confirm persistence {provider, model_id}.
2) Propose RLS policies (SQL) for threads/messages scoped by org_id; outline storage policies for hive-uploads and hive-sessions.
3) Auth plan: NextAuth with Azure AD — list env vars, callback URL, and how we inject org_id claim for RLS.
4) UX: enforce unique (org_id, lower(title)) for thread titles; plan a migration + UI guard.
5) Post-deploy checks: curl /healthz and export; error budget and alerting thresholds.

Return only the plan and exact SQL/route diffs we need to apply.
```

---

If you want, I can next generate the **Google/Gemini server patch** for `/api/chat` (no placeholders, using your `GOOGLE_API_KEY`) so "google" stops falling back to OpenAI.
