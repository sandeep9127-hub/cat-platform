# CAT Hub v2: switch-over runbook

*Prepared 21 Nov 2026. The release is the local branch `release/hub-v2` (folder `~/code/cat-platform-release`): `main` + `feat/claude-model-routing` + `feat/ui-refresh`. Nothing here has been done yet; each step that touches an outside service needs Sandeep's go-ahead.*

## The one rule

**Don't merge into `main` until step 6.** The current live site is the Vercel project in Sandeep's personal account. It deploys `main` automatically, with the old database. Merging early would put the new code on the live site against the wrong database.

## 1. Vercel project (CAT team `agroecologyindia`)

1. Log the Vercel CLI in to the CAT account: `vercel login`.
2. Create the project `cat-hub` in the CAT team. Don't connect it to GitHub yet (step 6).
3. Add these environment variables (Production and Preview). The values are in `.env.local`, with the exceptions noted:

| Variable | Value |
|---|---|
| `DATABASE_URL` | the value of **`DATABASE_URL_CAT`** (the new CAT database, *not* the old `DATABASE_URL`) |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_WORKSPACE_ID` | the CAT workspace key (the *last* `ANTHROPIC_API_KEY` line in `.env.local`) |
| `VOYAGE_API_KEY`, `SONIOX_API_KEY` | as in `.env.local` |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | as in `.env.local` |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | as in `.env.local`; the from-address should be one people recognise as CAT |
| `AUTH_SECRET` | **new** random value (`openssl rand -base64 32`) |
| `AUTH_URL` | the site address, e.g. `https://hub.agroecologyindia.org` (not `localhost`) |
| `NEXT_PUBLIC_SITE_URL` | the same site address. Share links and approval emails need it |
| `CRON_SECRET` | **new** random value (Vercel sends it to the weekly cron jobs) |
| `ASK_V2` | `on` |
| `PREVIEW_GATE` | `on` until launch, then `off` |
| `AGENT_DAILY_USD_CEILING`, `INGESTION_DAILY_USD_CEILING`, `INGESTION_RUN_USD_CEILING` | `15`, `25`, `25` |
| `ASK_VOICE` | `on` to enable voice conversation in Ask (needs `SONIOX_API_KEY`; try it with a real microphone on the test deploy first) |
| `VOICE_DAILY_USD_CEILING` | `3` (daily cap for voice; each session reserves about $0.14) |
| Optional | `ACCESS_APPROVER_EMAILS` (who approves table requests; default: all admins and editors), `NOTE_PDF=on` (notes downloadable as PDF; default off), `ACCESS_REQUEST_EMAIL=off` / `SUBMISSION_EMAIL=off` (switch those emails off) |

Not needed on Vercel: `DATABASE_URL_RAG`, `NEON_API_KEY`, `NVIDIA_API_KEY`, `OPENROUTER_*` (old), and the Google service account (the Drive sync runs in GitHub Actions).

4. In Cloudflare R2 → bucket `cat-hub-documents` → Settings → CORS, allow `PUT` with the `Content-Type` header from the test address and the final site address. Admin → Documents uploads go from the browser straight to R2.

## 2. Test deploy (private)

From `~/code/cat-platform-release`, deploy to Vercel without touching GitHub:

```bash
vercel deploy --scope agroecologyindia
```

The preview gate stays on, so only people with the preview password can see it.

## 3. Check the test deploy

- Home, Solutions Atlas map, a landscape page and its Budget page, Ask (a question with page citations), Compare, a fact sheet, `/hr`.
- Admin sign-in by email link, then Quality (spend, service health, test-set score), Budget tables (open one; create a share link to yourself and open it), Access requests, Report changes.
- `/request-access`: submit a request with your own email. The approver email arrives; Approve; the link email arrives; the link opens the table.

## 4. GitHub (nightly Drive sync and health check)

In the repository's **production** environment (Settings → Environments), restricted to the `main` branch, add the secrets:

- `CAT_DATABASE_URL`, `ANTHROPIC_API_KEY`, `ANTHROPIC_WORKSPACE_ID`, `VOYAGE_API_KEY`, `SONIOX_API_KEY`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`
- `GOOGLE_SA_JSON` (the contents of `.secrets/google-sa.json`), `DRIVE_FINAL_FOLDER_ID`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`

Also add the variable `SYNC_EMAIL=on` once the digest recipients are decided.

## 5. Data catch-up just before going live

The CAT database was copied from production on 20 Nov. Anything people added to the live site since then (organisation submissions, contributions, edits) must be copied across again just before switching:

- re-copy the changed app tables (same script as on 20 Nov); and
- run `npx tsx scripts/drive-sync.ts` once, so the reports and budget sheets are current.

## 6. Switch-over (reversible)

1. Merge `release/hub-v2` into `main` and push.
2. **Before pushing**, disconnect the old personal Vercel project from the GitHub repo (or pause its auto-deploys), so it doesn't deploy the new code against the old database.
3. Connect the CAT `cat-hub` project to the repo, with `main` as its production branch.
4. Move the domain from the old project to `cat-hub`.
5. Set `PREVIEW_GATE=off` on `cat-hub` and redeploy.

## 7. Rollback (30 days)

The old Vercel project and old database stay untouched. To roll back, move the domain back to the old project. Nothing is lost on the new side.

## 8. After going live

- The first nightly run (02:30 IST) should show in Quality → Drive sync and AI services.
- Re-run the test set after any search or model change: `npx tsx scripts/run-eval.ts`.
