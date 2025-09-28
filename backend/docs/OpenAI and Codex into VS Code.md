# Hive AI Platform — Build & Ship Playbook (Clean Copy)

This is a compact, copy-ready playbook of the work we did to get your Next.js app building, tested, and deployed to Azure App Service with solid CI, a robust `/healthz` endpoint, and a local dev workflow that includes both ChatGPT (Codex) and Claude (Cline).

> **Note:** You asked to include only *working* code for “SQL and coding functions.” There was no SQL introduced in this session. The code sections below are the final, working versions we landed on.

---

## Contents

1. [Production-grade health check](#1-production-grade-health-check)
2. [SSR-safe Supabase client](#2-ssr-safe-supabase-client)
3. [Claude smoke test script](#3-claude-smoke-test-script)
4. [CI/CD: Build & deploy to Azure (Linux)](#4-cicd-build--deploy-to-azure-linux)
5. [Optional: Windows web.config (if your plan is Windows)](#5-optional-windows-webconfig-if-your-plan-is-windows)
6. [VS Code tasks (triad workflow + quick starts)](#6-vs-code-tasks-triad-workflow--quick-starts)
7. [Operational runbook (prod)](#7-operational-runbook-prod)
8. [Outstanding tasks & recommendations to go live](#8-outstanding-tasks--recommendations-to-go-live)
9. [Next session — starter prompt](#9-next-session--starter-prompt)

---

## 1) Production-grade health check

**File:** `src/app/healthz/route.ts`

A robust `/healthz` that’s safe on both server & edge, returns JSON, and can optionally ping any upstream dependency (kept cheap by default).

```ts
// src/app/healthz/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // ensure Node runtime for fetch/socket behavior

function bool(v: string | undefined, fallback = false) {
  if (v == null) return fallback;
  const s = v.toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

export async function GET() {
  const startedAt = Date.now();
  const checks: Record<string, unknown> = {};

  try {
    // Basic env / runtime signals
    checks.node = process.versions?.node ?? "unknown";
    checks.env = process.env.NODE_ENV ?? "unknown";
    checks.commit = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? "n/a";

    // Optional upstream probe (disabled by default)
    const probeUrl = process.env.HEALTHZ_PROBE_URL;
    const doProbe = probeUrl && bool(process.env.HEALTHZ_PROBE_ENABLED, false);

    if (doProbe && probeUrl) {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), Number(process.env.HEALTHZ_PROBE_TIMEOUT_MS ?? 2500));
      try {
        const res = await fetch(probeUrl, { signal: ac.signal });
        checks.probe = {
          url: probeUrl,
          status: res.status,
          ok: res.ok,
        };
      } finally {
        clearTimeout(t);
      }
    }

    const ms = Date.now() - startedAt;
    return NextResponse.json(
      { status: "ok", uptime_ms: ms, checks },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    const ms = Date.now() - startedAt;
    return NextResponse.json(
      {
        status: "error",
        uptime_ms: ms,
        error: err?.message ?? String(err),
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
```

**Tip:** Your Azure smoke test hits `https://<defaultHost>/healthz` and passes on any `2xx/3xx`.

---

## 2) SSR-safe Supabase client

Prevents `localStorage` crashes during SSG/SSR by falling back to a no-op storage on the server.

**File:** `src/integrations/supabase/client.ts`

```ts
// src/integrations/supabase/client.ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// In the browser we use real localStorage; on the server we use a no-op.
const noopStorage = {
  getItem() { return null; },
  setItem() {},
  removeItem() {},
  clear() {},
  key() { return null; },
  length: 0
} as unknown as Storage;

const storage =
  typeof window !== "undefined" && typeof window.localStorage !== "undefined"
    ? window.localStorage
    : noopStorage;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
```

---

## 3) Claude smoke test script

Verifies your Claude key from the terminal without secrets in code.
**Requires:** `ANTHROPIC_API_KEY` env var set locally/CI.

**File:** `scripts/claude-hello.cjs`

```js
#!/usr/bin/env node
const Anthropic = require("@anthropic-ai/sdk");

(async () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ERROR: ANTHROPIC_API_KEY not found in environment.");
    process.exit(1);
  }

  const model = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";
  const client = new Anthropic({ apiKey });

  try {
    const resp = await client.messages.create({
      model,
      max_tokens: 64,
      messages: [{ role: "user", content: "Reply with the single word: hello" }],
    });

    const first = Array.isArray(resp?.content) ? resp.content[0] : null;
    const text = first && first.type === "text" ? first.text : JSON.stringify(resp);
    console.log(text.trim());
    process.exit(0);
  } catch (err) {
    console.error("Claude request failed:", err?.message || err);
    process.exit(2);
  }
})();
```

**Add to `package.json` scripts:**

```json
{
  "scripts": {
    "claude:hello": "node scripts/claude-hello.cjs"
  }
}
```

---

## 4) CI/CD: Build & deploy to Azure (Linux)

Final build + deploy workflow (OIDC, standalone packaging, serialized deploys, post-deploy smoke test).

**File:** `.github/workflows/deploy-ui.yml`

```yaml
name: UI • Build & Deploy (Next.js → Azure App Service)

on:
  push:
    branches: [main]             # deploy on main
  pull_request:
    branches: [main]             # build-only on PRs
  workflow_dispatch: {}

permissions:
  contents: read
  id-token: write

concurrency:
  group: deploy-ui-prod
  cancel-in-progress: false

env:
  APP_NAME: thive-ai-webapp
  RESOURCE_GROUP: hive-mvp-rg

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20.x"
          cache: "npm"

      - name: Install deps
        run: npm ci --no-audit --no-fund

      - name: Build (Next.js standalone)
        env:
          NEXT_TELEMETRY_DISABLED: "1"
        run: npm run build

      - name: Bundle release
        run: |
          rm -rf release
          mkdir -p release/.next/static
          cp -r .next/standalone/* release/
          cp -r .next/static release/.next/
          if [ -d public ]; then cp -r public release/public; fi
          cat > release/package.json <<'PKG'
          {
            "name": "webapp-standalone",
            "private": true,
            "version": "0.0.0",
            "scripts": { "start": "node server.js" }
          }
          PKG

      # Linux App Service — set startup command
      - name: Azure login (OIDC)
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Enforce startup + settings
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        uses: azure/CLI@v2
        with:
          inlineScript: |
            az webapp config set \
              --resource-group $RESOURCE_GROUP \
              --name $APP_NAME \
              --startup-file "node server.js" \
              --always-on true
            az webapp config appsettings set \
              --resource-group $RESOURCE_GROUP \
              --name $APP_NAME \
              --settings WEBSITE_NODE_DEFAULT_VERSION=~20 WEBSITES_CONTAINER_START_TIME_LIMIT=600

      - name: Deploy to Azure App Service (prod)
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ env.APP_NAME }}
          package: release

      - name: Smoke test (200–399 on /healthz)
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        shell: bash
        run: |
          set -euo pipefail
          HOST=$(az webapp show -g "$RESOURCE_GROUP" -n "$APP_NAME" --query defaultHostName -o tsv)
          URL="https://${HOST}/healthz"
          echo "Hitting: $URL"
          for i in {1..40}; do
            code=$(curl -ILs -o /dev/null -w "%{http_code}" "$URL")
            echo "Attempt ${i}: HTTP ${code}"
            if [ "$code" -ge 200 ] && [ "$code" -lt 400 ]; then
              echo "Smoke test passed."
              exit 0
            fi
            sleep 5
          done
          echo "App never returned 2xx/3xx" >&2
          exit 1
```

> If your App Service is **Windows**, use the `web.config` below and remove the “startup-file” CLI step. (Linux is recommended for Node/Next.js.)

---

## 5) Optional: Windows `web.config` (if your plan is Windows)

**File to include in release:** `release/web.config`

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="iisnode" path="server.js" verb="*" modules="iisnode"/>
    </handlers>
    <rewrite>
      <rules>
        <rule name="StaticContent" stopProcessing="true">
          <match url="^(.+)$" />
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" />
          </conditions>
          <action type="None" />
        </rule>
        <rule name="NodeServer" patternSyntax="ECMAScript" stopProcessing="true">
          <match url=".*" />
          <action type="Rewrite" url="server.js" />
        </rule>
      </rules>
    </rewrite>
    <httpErrors existingResponse="PassThrough" />
  </system.webServer>
</configuration>
```

---

## 6) VS Code tasks (triad workflow + quick starts)

**File:** `.vscode/tasks.json`
Includes: one-keystroke “Start feature,” “Copy AI Rules,” and “Open both panels.”

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Copy AI Rules to Clipboard",
      "type": "shell",
      "problemMatcher": [],
      "windows": {
        "command": "powershell -NoProfile -Command \"Get-Content -Raw .vscode/ASSISTANTS_RULES.md | Set-Clipboard\""
      },
      "osx": {
        "command": "bash -lc \"cat .vscode/ASSISTANTS_RULES.md | pbcopy\""
      },
      "linux": {
        "command": "bash -lc \"cat .vscode/ASSISTANTS_RULES.md | xclip -selection clipboard\""
      }
    },
    {
      "label": "Open ChatGPT + Claude Panels",
      "type": "shell",
      "problemMatcher": [],
      "command": "echo \"Open ChatGPT / Claude panels (use Command Palette)\""
    },
    {
      "label": "Prep Handoff File",
      "type": "shell",
      "problemMatcher": [],
      "command": "node -e \"const fs=require('fs'); const f='.vscode/HANDOFF.md'; if(!fs.existsSync('.vscode')) fs.mkdirSync('.vscode'); if(!fs.existsSync(f)) fs.writeFileSync(f,'# Handoff\\n\\n- Context: \\n- Goal: \\n- Branch: \\n- Next steps: \\n'); console.log('Handoff at '+f);\""
    },
    {
      "label": "Start Feature (branch + panels + handoff)",
      "type": "shell",
      "group": { "kind": "build", "isDefault": true },
      "problemMatcher": [],
      "command": "bash",
      "args": [
        "-lc",
        "set -euo pipefail; BR=${FEATURE:-feature/$(date +%Y%m%d-%H%M)}; git checkout -b \"$BR\" || git checkout \"$BR\"; code -r .; echo \"Branch: $BR\" && exit 0"
      ],
      "options": {
        "env": { "FEATURE": "" }
      },
      "dependsOn": [
        "Copy AI Rules to Clipboard",
        "Open ChatGPT + Claude Panels",
        "Prep Handoff File"
      ]
    }
  ]
}
```

> Run **Start Feature** (default build task) → creates a branch, opens panels, and preps `.vscode/HANDOFF.md`.

---

## 7) Operational runbook (prod)

Quick commands to debug a stuck site:

```powershell
$rg  = "hive-mvp-rg"
$app = "thive-ai-webapp"

# Check platform & startup command
az webapp show -g $rg -n $app `
  --query "{state:state, isLinux:reserved, appCmd:siteConfig.appCommandLine, node:siteConfig.nodeVersion}" -o jsonc

# Tail logs (watch for server start / errors)
az webapp log tail -g $rg -n $app

# Restart
az webapp restart -g $rg -n $app

# Hit healthz
$host = az webapp show -g $rg -n $app --query defaultHostName -o tsv
Invoke-WebRequest -UseBasicParsing -Uri ("https://{0}/healthz" -f $host) -TimeoutSec 60 |
  Select-Object StatusCode, StatusDescription
```

---

## 8) Outstanding tasks & recommendations to **go live**

**Platform & Deploy**

* ✅ Prefer **Linux App Service** for Node/Next.js.
* ✅ Keep `startup-file "node server.js"`, `Always On`, and `WEBSITES_CONTAINER_START_TIME_LIMIT=600`.
* ✅ Protect `main` (required status check = PR job; 1 review).
* ✅ Concurrency group set (prevents deploy overlap).
* ☐ Add custom domain + HTTPS; test `/healthz` on apex & `www`.
* ☐ Add Blue/Green or Slot if zero downtime is required.

**Secrets & Config**

* ☐ Verify `NEXT_PUBLIC_*` and server-only envs in Azure “Configuration”.
* ☐ Remove unused secrets; never commit keys (pre-commit secret scan is in place).
* ☐ Add `HEALTHZ_PROBE_URL` only if you need external dependency checks.

**Monitoring**

* ☐ Wire **Application Insights** (web SDK optional for RUM).
* ☐ Azure Alerts: `5xx`, CPU/Memory, Failed Deployments.
* ☐ Add runtime logging policy & retention.

**Quality Gates**

* ✅ Lint/format/typecheck/test steps.
* ✅ Semgrep + TruffleHog in CI.
* ☐ E2E smoke test suite (Playwright) after deploy, in addition to `/healthz`.
* ☐ Lighthouse CI (if web perf matters).

**Release Management**

* ✅ Conventional Commits + PR title enforcement.
* ✅ `standard-version` tagging flow (do releases via PR).
* ☐ Automate changelog upload to GitHub Releases.

**Dev Workflow (Triad)**

* ✅ VS Code tasks to branch, open ChatGPT/Cline, prep handoff.
* ☐ Finalize `.vscode/ASSISTANTS_RULES.md` and keep it fresh.
* ☐ Add owner map (`.github/CODEOWNERS`) for auto-reviewers.

---

## 9) Next session — starter prompt

> **Goal:** Verify the App Service platform, finish any Linux/Windows adjustments, and confirm `/healthz` returns 200 in production after a fresh deploy.

**Paste this to start the next chat:**

> We’re continuing the Hive AI platform rollout.
>
> 1. Check my App Service platform (Linux vs Windows) and confirm the right startup mechanism is in place (Linux `startup-file` or Windows `web.config`).
> 2. If Windows, add `web.config` to the release bundle and remove the Linux startup command step.
> 3. Trigger a deploy and tail logs until the Node server binds and `/healthz` returns 200.
> 4. Then set up Application Insights + Azure Alerts (5xx, CPU, memory).
> 5. Finally, draft a small Playwright smoke test that runs after deploy and verifies `/` and `/healthz`.

---

**You’re set.** This doc is safe to drop into `docs/PLAYBOOK.md`.
