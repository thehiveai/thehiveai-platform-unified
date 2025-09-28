# Hive AI – MVP First Step Planning (Part 1 Summary)

## Overview
This document captures the planning and design phase for Hive AI MVP (Q4 2025). It includes all clarifying questions, recommendations, and locked decisions.

---

## Locked Decisions

### 1) Day-1 Connector
- **Decision:** Microsoft Teams is the single Day-1 connector.  
- Rationale: Law firm fit, synergy with BeeTrace, easy adoption features.

### 2) Law Firm Lens
- **Decision:** Include DLP for law firms (regex for matter numbers + PII) and default disclaimer “Not legal advice.”

### 3) Trials
- **Decision:** No free trials at MVP. Manual promo credits allowed via Admin Console.  
- Rationale: Revenue-first posture, avoid trial abuse, sales-led onboarding.

### 4) Admin Console
- **Day-1:** Firewall toggle, governance knobs, retention, billing dashboard, audit viewer.  
- **Day-30:** Audit export, connector health panel, spend dashboards.

### 5) Citations
- **Decision:** Citations enabled by default for B2B tenants. Admins can toggle.

### 6) Models
- **Decision:** Show GPT, Claude, Gemini in chat UI. GPT default. Admins can disable models.  
- FOMO factor: Greyed-out when disabled.

### 7) Alerts
- **Decision:** SEV1/SEV2 = In-app + Teams + Email. SEV3 = weekly digest (email).

### 8) Onboarding
- **Decision:** Invite-only onboarding for MVP (2025). Self-serve later.

### 9) File Types
- **Decision:** Support PDF, DOCX, TXT, PNG, JPG, XLSX, PPTX.  
- Google Suite via Drive connector only.

### 10) Imports
- **Decision:** Concierge-only imports, **except ChatGPT `.html` export imports**, which feed into a Context Profile Dashboard.  
- Dashboard shows: facts, stable facts, confidence %, categories, AI profile summary.

### 11) HiveMAP
- **Decision:** Included free for 4 months with B2B packages, then $499/mo. Unlimited users/orgs.

### 12) Legal Holds
- **Decision:** Global Admin only can apply/remove legal holds.

### 13) Audit Exports
- **Decision:** Viewer-only at MVP. Export comes Day-30.

### 14) Trials (revisited)
- **Decision:** No visible trials. Manual promo credits allowed. (Confirmed.)

### 15) Incident Comms
- **Decision:** All incident/status comms from `gohive.ai`.  
- Parent domain reserved for corporate use.

### 16) SEV1/2 Hours
- **Decision:** MVP = business hours only (ET). Best effort after-hours.  
- Formal 24/7 on-call post-GA.

### 17) Model Picker
- **Decision:** Visible in chat UI at MVP. GPT active, Claude/Gemini greyed if not enabled.

### 18) Disclaimers
- **Decision:** Default disclaimers per vertical. Law firms = “Not legal advice.”  
- Admin toggle available.

### 19) DPA & Subprocessors
- **Decision:** Publish DPA + Subprocessors list at `gohive.ai/legal`. Update quarterly.

### 20) Privacy Defaults
- **Decision:** Explicit policy: “Customer data is never used to train models.”  
- Shown in onboarding + Privacy Policy.

---

## Next Step (Part 2)
- Build **MVP First Step Spec**:  
  - Feature list  
  - Acceptance criteria  
  - Dependencies (tools, APIs, hosting)  
  - Sequenced backlog (Day-1 → Day-30)

---

**Status:** Planning & design (Part 1) complete.  
**Next Chat Goal:** Narrow scope to MVP-first step execution plan.
