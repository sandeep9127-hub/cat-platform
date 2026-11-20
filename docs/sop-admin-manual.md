# Transformation Hub — Admin User Manual

> How to log in and update content on the Hub. For deploys, publishing pipeline, and
> maintenance, see the **[Operator Runbook](./sop-operator-runbook.md)**.

## 1. Logging in

- Admin area is protected by **email + password** (NextAuth).
- Admins are **named individuals**; there is one org-owned recovery account.
- The **Team page** lists who has access.

## 2. Where content lives (this trips people up)

The Hub draws content from **two different places**. Knowing which is which is the
single most important thing for an editor:

| Content | Lives in | How to change |
|---|---|---|
| Landscape page profile (at-a-glance, context, challenges, priorities, interventions) | **Code** — `lib/data/*` | Edit the file → re-run `ingest-page-profile.ts` → push |
| Landscape **status badge** (in preparation / published) | **Code** — `lipStatus` in `lib/data/landscapes.ts` | Edit the flag → push |
| Budget figures + lines | **Database** — `landscape_budget_lines` | Via the ingest pipeline (workbook), not by hand |
| Narrative / RAG answers | **Database** — embedded chunks | Via ingest scripts |
| Solutions Atlas pins | **Database** — `factsheet_chunks` | Via the factsheet generation batch |

> Rule of thumb: **page text & status = code; budget, search answers & Atlas pins =
> database (via scripts).** You don't edit the database by hand.

## 3. "Publish" is a pipeline, not a button

When someone says "publish landscape X," that means the **full ingest pipeline** —
ingest → reproject → flip status → push → verify — **not** just toggling a flag.
The detailed steps are in the [Operator Runbook §3](./sop-operator-runbook.md).
A flag flip alone will show a status badge with no underlying data behind it.

## 4. The Ask assistant (what to tell users)

- It answers **only from the Hub's curated library**, never the open web.
- If nothing in the library is relevant enough, it **refuses honestly** rather than
  guessing — this is by design (source-verified).
- Every answer carries **inline citations** linking to the source.

## 5. Who to contact

| Need | Contact |
|---|---|
| Add / update a landscape | Operator (see Runbook §7) |
| Generate a new Atlas factsheet | Operator |
| Admin access request | Platform owner |
| Something is down | Operator → Platform owner |
