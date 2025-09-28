Perfect — let’s wrap this into a \*\*clean playbook\*\* you can drop into a `.md` file. I’ll:



1\. Extract only the \*\*working SQL + function code\*\* in order (no retries/errors).

2\. Keep all the \*\*Lovable app code\*\* in sequence.

3\. Add a \*\*Recommendations \& To-Do\*\* section (what’s left before go-live).

4\. End with the \*\*next-session starting prompt\*\*.



---



\# 🐝 Hive AI Platform Build Playbook



\## ✅ Working SQL Migrations



```sql

-- Example: roles table

create table app.roles (

&nbsp; id uuid primary key default gen\_random\_uuid(),

&nbsp; name text not null unique

);



insert into app.roles (name)

values ('admin'), ('user');



-- Example: organizations table

create table app.organizations (

&nbsp; id uuid primary key default gen\_random\_uuid(),

&nbsp; name text not null,

&nbsp; created\_at timestamp with time zone default now()

);



-- Example: user\_orgs mapping table

create table app.user\_orgs (

&nbsp; user\_id uuid references auth.users(id),

&nbsp; org\_id uuid references app.organizations(id),

&nbsp; role\_id uuid references app.roles(id),

&nbsp; primary key (user\_id, org\_id)

);



-- Example: sessions table

create table app.sessions (

&nbsp; id uuid primary key default gen\_random\_uuid(),

&nbsp; org\_id uuid references app.organizations(id),

&nbsp; created\_by uuid references auth.users(id),

&nbsp; mode text not null check (mode in ('council','debate','pipeline','shadow')),

&nbsp; rubric\_id text,

&nbsp; created\_at timestamp with time zone default now()

);



-- Example: turns table

create table app.turns (

&nbsp; id uuid primary key default gen\_random\_uuid(),

&nbsp; session\_id uuid references app.sessions(id),

&nbsp; prompt text not null,

&nbsp; context\_hash text,

&nbsp; created\_at timestamp with time zone default now()

);



-- Example: messages table

create table app.messages (

&nbsp; id uuid primary key default gen\_random\_uuid(),

&nbsp; turn\_id uuid references app.turns(id),

&nbsp; model\_key text not null,

&nbsp; role text not null,

&nbsp; content text not null,

&nbsp; token\_usage int,

&nbsp; latency\_ms int,

&nbsp; score float,

&nbsp; created\_at timestamp with time zone default now()

);



-- Example: verdicts table

create table app.verdicts (

&nbsp; id uuid primary key default gen\_random\_uuid(),

&nbsp; turn\_id uuid references app.turns(id),

&nbsp; final\_answer text,

&nbsp; confidence float,

&nbsp; rationale text,

&nbsp; dissent text,

&nbsp; created\_at timestamp with time zone default now()

);

```



---



\## ✅ Working Functions



```sql

-- Function: add\_user\_to\_org

create or replace function app.add\_user\_to\_org(user\_id uuid, org\_id uuid, role\_name text)

returns void as $$

declare

&nbsp; role\_id uuid;

begin

&nbsp; select id into role\_id from app.roles where name = role\_name;

&nbsp; if role\_id is null then

&nbsp;   raise exception 'Role % does not exist', role\_name;

&nbsp; end if;



&nbsp; insert into app.user\_orgs(user\_id, org\_id, role\_id)

&nbsp; values (user\_id, org\_id, role\_id)

&nbsp; on conflict (user\_id, org\_id) do update

&nbsp; set role\_id = excluded.role\_id;

end;

$$ language plpgsql;

```



```sql

-- Function: create\_org\_with\_admin

create or replace function app.create\_org\_with\_admin(org\_name text, admin\_user uuid)

returns uuid as $$

declare

&nbsp; org\_id uuid;

begin

&nbsp; insert into app.organizations(name) values (org\_name) returning id into org\_id;

&nbsp; perform app.add\_user\_to\_org(admin\_user, org\_id, 'admin');

&nbsp; return org\_id;

end;

$$ language plpgsql;

```



---



\## ✅ Lovable (Next.js / API Example)



```ts

// src/app/api/auth/\[...nextauth]/route.ts

import NextAuth from "next-auth";

import { authOptions } from "@/lib/auth";



const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

export { authOptions } from "@/lib/auth";

```



```ts

// src/app/api/chat/route.ts (simplified orchestrator)

import { NextResponse } from "next/server";

import { callModel } from "@/lib/models";

import { getContext } from "@/lib/context";

import { scoreAnswer } from "@/lib/rubric";



export async function POST(req: Request) {

&nbsp; const { sessionId, userPrompt } = await req.json();



&nbsp; const ctx = await getContext(sessionId);

&nbsp; const models = \["gpt-4o", "claude-3", "gemini-pro"];



&nbsp; const results = await Promise.all(

&nbsp;   models.map(m => callModel(m, userPrompt, ctx))

&nbsp; );



&nbsp; const scored = results.map(r => ({

&nbsp;   ...r,

&nbsp;   score: scoreAnswer(r.content, userPrompt),

&nbsp; }));



&nbsp; const best = scored.reduce((a, b) => (a.score > b.score ? a : b));

&nbsp; return NextResponse.json({ final: best, panel: scored });

}

```



---



\## 📝 Recommendations \& To-Do Before Go-Live



\### \*\*Database\*\*



\* ✅ Core tables (roles, orgs, sessions, turns, messages, verdicts) created.

\* ⬜ Add \*\*RLS (Row Level Security) policies\*\* for all org-scoped tables.

\* ⬜ Seed test data for 2 orgs, 5 users, and sample sessions.



\### \*\*Backend\*\*



\* ✅ NextAuth route working.

\* ⬜ Harden `/api/chat` with error handling + early-exit logic (cancel slow models).

\* ⬜ Add \*\*cost/latency budget\*\* controls.

\* ⬜ Add \*\*shadow verification mode\*\* (Model B checks Model A).



\### \*\*Frontend\*\*



\* ⬜ Build \*\*Session Panel UI\*\* (multi-column outputs with confidence meter).

\* ⬜ Add “Compare models” button → triggers council mode.

\* ⬜ Add dissent chips when models disagree.



\### \*\*DevOps\*\*



\* ⬜ Health checks for `/api/auth` and `/api/chat`.

\* ⬜ Logging for cost, latency, confidence per call.

\* ⬜ Deployment pipeline → staging slot to production swap.



\### \*\*Post-30 Day High Impact\*\*



\* ⬜ Group sessions (council / debate / pipeline / shadow).

\* ⬜ Arbitration service with rubric scoring.

\* ⬜ Full audit trail (who saw what, when).



---



\## 🚀 Next Chat Starting Prompt



\*\*Prompt:\*\*

“Let’s implement Row Level Security (RLS) policies for all org-scoped tables so that users only see their own organization’s data. Please generate the SQL for RLS policies on `organizations`, `user\_orgs`, `sessions`, `turns`, `messages`, and `verdicts`, ensuring service-role bypass but strict tenant isolation.”



---



Would you like me to also prep the \*\*UI wireframe for the Session Panel\*\* (multi-model council view) so your devs can see exactly how it should look in Next.js before we dive into RLS?



