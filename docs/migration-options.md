# Transformation Hub — Migration & Cost Options

> Decision document for moving the Hub off personal accounts onto company-owned
> infrastructure. Prepared as the action item from the **CAT Tracker Discussion
> (24 Jun 2026)**.

## TL;DR (recommendation)

1. **Migrate by transferring ownership in place** — move the Vercel project into a
   company-owned Vercel **Team**, and transfer the Neon **project** into a company
   Neon **org**. No data is moved, no DNS changes, the live URL is untouched.
2. **Do _not_ recreate from the GitHub repo** except as disaster recovery —
   recreating forces a full re-ingest of published landscape data, which violates
   our hard rule (*never re-ingest a published landscape without the canonical
   source file*).
3. **Traffic does not drive cost.** Visitor AI runs on free tiers; at 1K or 1L
   clicks/month the marginal cost is ≈ ₹0. The real decision is **terms of service +
   ownership**, not the bill.
4. **Recommended spend: Vercel Pro ($20/mo ≈ ₹1,700)** to be commercial-clean and
   team-owned, rather than sit a launched org site on a personal *non-commercial*
   free tier. Apply for nonprofit credits in parallel.
5. **Rotate every secret on transfer** (DB URL, NVIDIA key, OpenRouter key, preview
   token). The repo is public — treat all secrets as needing rotation regardless.

---

## 1. Current state (what we're migrating from)

| Layer | Today | Owner |
|---|---|---|
| Frontend / hosting | **Vercel** (region `bom1`), auto-deploy from `main` | Personal account |
| Database | **Neon Postgres 17** + pgvector (schema `cat`) | Personal account |
| Code | **GitHub repo — public** (`sandeep9127-hub/cat-platform`) | Personal account |
| DNS | `hub.agroecologyindia.org` — Cloudflare A-record | Org (Cloudflare) |
| AI — visitor path | NVIDIA-hosted embeddings + Kimi K2 chat | **Free tier** |
| AI — admin path | OpenRouter / Gemini Flash (factsheet generation only) | Pay-per-use, batch |

Only the first three rows live on a personal account. DNS already sits with the org.

---

## 2. Migration approach — two options

### Option A — Transfer in place ✅ (recommended)

| Step | How | Effect |
|---|---|---|
| Vercel | Project → Settings → **Transfer** into a company-owned Vercel Team | Keeps URL, deploy history, env vars, analytics |
| Neon | **Transfer project** into a company Neon org | **Data preserved** — zero re-ingest |
| GitHub | Transfer repo to a company GitHub org (or keep, add org as admin) | Pipeline (`push main` → deploy) unchanged |
| DNS | No change | `hub.agroecologyindia.org` keeps resolving |
| Secrets | Re-enter once in the new Vercel Team, **rotated** | Clean break from personal account |

**Downtime:** effectively none. **Risk:** low. **Effort:** ~1 hour + secret rotation.

### Option B — Recreate from the public repo (fallback only)

Re-import the repo into a fresh company Vercel project, stand up a new Neon DB, and
re-run all ingest scripts.

> ❌ **Dealbreaker:** this re-ingests 11 published landscapes from scratch. Per our
> rule, published landscape data must **never** be re-ingested without the canonical
> source files, and DB rows aren't recoverable. Use this path **only** if ownership
> transfer is genuinely blocked — and only with every canonical source file in hand.

**Keep B documented purely as disaster recovery:** because the repo is public, the
Hub *can* be rebuilt from zero if an account is ever lost. That is a resilience
feature, not the migration plan.

---

## 3. Cost framework

### What actually costs money

- **Visitor AI = free.** Embeddings (`nv-embedqa-e5-v5`) and the Ask model (Kimi K2)
  run on **NVIDIA's free tier**. A user asking questions costs ≈ ₹0.
- **Admin AI = small, batch, not per-visitor.** Only factsheet *generation*
  (OpenRouter / Gemini Flash) is paid, and it's run by an admin in batches — paise
  per fact sheet, unrelated to public traffic.
- **The real lever is the hosting tier + commercial-use terms**, not volume.

### Scenario table

| | **1K clicks / mo** | **1L (100K) clicks / mo** |
|---|---|---|
| Vercel (Hobby, free) | Comfortably within limits | Still within technical limits, but Hobby is **non-commercial-use only** — a poor fit for a public org site |
| Neon (Free, <500 MB) | Fine | Fine for current data; upgrade only if storage grows |
| AI — visitor | ≈ ₹0 (free tier) | ≈ ₹0 (free tier) |
| AI — admin factsheets | a few ₹ per batch | a few ₹ per batch |
| **Effective monthly cost** | **₹0** | **₹0** |
| **Caveat** | On a *personal, non-commercial* tier | Same — ToS + bus-factor exposure |

### Recommended posture

| Plan | Cost | Why |
|---|---|---|
| **Stay free (Hobby)** | ₹0 | Works technically, but a launched org/partner-facing site on a *personal non-commercial* tier is a quiet ToS + ownership liability |
| **Vercel Pro** ✅ | **$20/mo ≈ ₹1,700** | Commercial-clean, company-owned, real team seats, better analytics. AI stays free regardless of traffic |
| Neon Launch (only if needed) | ~$19/mo | Only when data outgrows the 500 MB free tier — not needed today |

> **Recommendation:** budget **~₹1,700/mo (Vercel Pro)** and keep Neon free for now.
> This is "best without losing quality," consistent with *we're building a good
> product, not saving costs*. Total realistic run-rate: **₹0–3,400/mo**.

> **Apply for nonprofit credits** (Vercel for Nonprofits, Neon startup/nonprofit
> programs) — these can make Pro free. Apply in parallel, but **don't block the
> transfer on it.**

---

## 4. Access control

Three distinct layers — keep them separate:

1. **Platform ownership** — the Vercel **Team** and Neon **org** are owned by a
   *company account*, not an individual. This is the migration itself.
2. **App admin** — the Hub's own email+password login (NextAuth) + the Team page.
   Recommend **named individual admins** (audit trail) plus **one org-owned recovery
   account**. Avoid a single shared mailbox as the only key.
3. **Secrets** — on transfer, **rotate all**: `DATABASE_URL`, `NVIDIA_API_KEY`,
   `OPENROUTER_API_KEY` / `ANTHROPIC_API_KEY`, and the preview gate token. They have
   lived in a personal account and the repo is public. Store in a **company password
   vault**, never in a doc or commit.

---

## 5. Migration checklist

- [ ] Create company-owned Vercel Team + Neon org (org email, not personal).
- [ ] Apply for Vercel / Neon nonprofit credits (parallel, non-blocking).
- [ ] **Transfer** Vercel project into the Team (Option A).
- [ ] **Transfer** Neon project into the org (data preserved).
- [ ] Transfer (or co-own) the GitHub repo under a company org.
- [ ] **Rotate every secret**; store in the company vault; update Vercel env vars.
- [ ] Verify a deploy still ships via `git push origin main` (never the Vercel CLI).
- [ ] Confirm `hub.agroecologyindia.org` still resolves + the Ask path + a landscape
      page render correctly.
- [ ] Decide Hobby vs Pro; upgrade to Pro if proceeding with the recommendation.
- [ ] Record final ownership + admin list in the SOP.
