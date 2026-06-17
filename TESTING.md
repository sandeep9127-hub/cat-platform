# CAT Hub — Manual Testing Script

A step-by-step checklist for manually testing the Transformation Hub before/after releases.
Work top to bottom; tick **Pass/Fail** and jot anything odd in **Notes**. Test on **desktop and
a phone** for the layout sections.

## Before you start

- **Where to test:** the live site is <https://hub.agroecologyindia.org>. Pre-launch it sits behind a
  shared password — open any page, you'll be sent to a **/preview** unlock screen. Get the current
  preview password from the admin (Sandeep). Once unlocked, your browser remembers it for 30 days.
- **Browsers:** test in Chrome + one of Safari/Firefox. Try one full pass on a phone.
- **Reporting a bug:** note the **page URL**, **what you did**, **what you expected**, **what happened**,
  and a **screenshot**. Send to the admin or file against the repo.

Legend: ✅ works · ⚠️ works but odd · ❌ broken

---

## 1 · Access & navigation

| # | Step | Expected | Pass/Fail | Notes |
|---|------|----------|-----------|-------|
| 1.1 | Open the site fresh (or incognito) | Redirected to the **/preview** password screen | | |
| 1.2 | Enter the wrong password | Rejected, stays on the screen | | |
| 1.3 | Enter the correct password | Lands on the homepage; stays unlocked on refresh | | |
| 1.4 | Click through the top navigation (Landscapes, Organizations, Map, About, Principles, etc.) | Every link opens a real page, no 404 | | |
| 1.5 | Open a made-up URL e.g. `/landscape/does-not-exist` | A clean **404 / not-found** page (not a crash) | | |

## 2 · Landscapes wall + profile

Use a **published** landscape (has full data): **Patratu**, **Mau**, or **Dharashiv**.
The others (Ahwa, Chitrakonda, Dantewada, Khatarshnong-Laitkroh, Pangi, Patharpratima, Rajnagar,
Vempalli) are profile-only for now.

| # | Step | Expected | Pass/Fail | Notes |
|---|------|----------|-----------|-------|
| 2.1 | Open **/landscapes** | A wall of 11 landscape covers; each clickable | | |
| 2.2 | Open **Patratu** | Profile loads: hero, "at a glance" facts, context, challenges, priorities | | |
| 2.3 | The tab bar shows **Profile · Budget · Insights · Climate · Ask** | All five tabs present and clickable | | |
| 2.4 | Open an **in-preparation** landscape (e.g. Ahwa) | Profile shows; Budget/Climate say "in preparation" rather than breaking | | |
| 2.5 | Check the figures (area, population, households, villages) | Match the landscape's fact sheet | | |

## 3 · Currency toggle (INR / USD / EUR)

| # | Step | Expected | Pass/Fail | Notes |
|---|------|----------|-----------|-------|
| 3.1 | On a published landscape profile, find the **currency toggle** | It's at the **top-right** of the page | | |
| 3.2 | Switch INR → USD → EUR | **Every** money figure on the page updates (plan size, who-pays, etc.) | | |
| 3.3 | Switch to USD and note the small caption | Shows a live/indicative rate, e.g. "1 USD ≈ ₹…" | | |
| 3.4 | Move to the Budget tab, then Climate tab | The chosen currency **carries across tabs** | | |
| 3.5 | Reload the page | Currency choice is remembered | | |

## 4 · Budget tab ("Where the money goes")

| # | Step | Expected | Pass/Fail | Notes |
|---|------|----------|-----------|-------|
| 4.1 | Open **Patratu → Budget** | Total plan size shows (≈ ₹52 cr for Patratu) | | |
| 4.2 | "Who pays" bar | Government / Community / Grants / etc. add up to 100% | | |
| 4.3 | Delivery packages | Listed with shares; nothing blank or "undefined" | | |
| 4.4 | Repeat for **Mau** (≈ ₹42 cr) and **Dharashiv** (≈ ₹57.5 cr) | Totals and splits look sensible | | |

## 5 · Climate tab

Patratu is the one with full climate data.

| # | Step | Expected | Pass/Fail | Notes |
|---|------|----------|-----------|-------|
| 5.1 | Open **Patratu → Climate** | Headline climate value ≈ **₹407 cr** | | |
| 5.2 | The **investment-to-return** hero | Shows ≈ **7.9×** with two bars (cost vs value) that animate when scrolled into view | | |
| 5.3 | Hover (or tap on mobile) a track — **Resilience / Adaptation / Carbon** | That track highlights, others dim, headline shows its value | | |
| 5.4 | Co-benefit line | "Also generated… ≈ ₹550 cr… not counted twice" reads sensibly | | |
| 5.5 | Carbon footprint | Shows **42,973 tCO₂e · all tracks** | | |
| 5.6 | "By funder lens" **accordion** | Three rows; the largest (Resilience) is open; click to expand/collapse one at a time | | |
| 5.7 | Open the **Carbon investor** lens | Shows the **marketability split** (~5% creditable / ~95% shadow price) | | |
| 5.8 | "How the value is graded" | Collapsed by default; expands to T1/T2/T3 explanation | | |
| 5.9 | Switch currency to USD/EUR here | Figures convert; no ₹/$ mismatch | | |

## 6 · Geography picker (the big one)

Tested via the **organization submission form**. Goal: nobody should type a place name.

| # | Step | Expected | Pass/Fail | Notes |
|---|------|----------|-----------|-------|
| 6.1 | Go to **/organizations** → open the "add / contribute an organization" form | Form opens with a "Where they work" section | | |
| 6.2 | In a location row, **type "ramgar"** (misspelled) | Suggestions still surface **"Ramgarh"** (typo-tolerant) | | |
| 6.3 | Type **"patratu"** | Suggestions show the **full path**, e.g. "Patratu · Patratu, Ramgarh, Jharkhand" — and more than one "Patratu" is distinguishable | | |
| 6.4 | Pick one | It becomes a tidy chip showing the place + path; the typed box is replaced | | |
| 6.5 | Click the **×** on the chip | Clears and lets you search again | | |
| 6.6 | Add a second location row, search a different state's village | Works independently of the first | | |
| 6.7 | Keyboard only: type, **arrow down**, **Enter** | Can select without the mouse | | |
| 6.8 | Search something that doesn't exist e.g. "zzzzzz" | Friendly "no match" message, no crash | | |

## 7 · Organizations explorer + map

| # | Step | Expected | Pass/Fail | Notes |
|---|------|----------|-----------|-------|
| 7.1 | Open **/organizations** | List of organizations + a map of India with work-location markers | | |
| 7.2 | Filter by **state**, by **type**, by **domain** | List and map update together | | |
| 7.3 | Type in the search box | List filters live | | |
| 7.4 | Click a marker / an org card | Detail popup/panel with its work locations | | |
| 7.5 | Open **/map** | The Solutions Atlas map loads | | |

## 8 · Search, entries & Ask

| # | Step | Expected | Pass/Fail | Notes |
|---|------|----------|-----------|-------|
| 8.1 | Open **/search**, search "soil" or "millet" | Relevant results | | |
| 8.2 | Open a published case study (e.g. **/entry/odisha-millet-mission**) | Full narrative page renders | | |
| 8.3 | On a published landscape, click **Ask** | Opens the assistant (/agent) scoped to that landscape | | |
| 8.4 | Ask a question about the landscape | Gets a relevant, grounded answer (give it a few seconds) | | |

## 9 · Admin (staff only — needs login)

| # | Step | Expected | Pass/Fail | Notes |
|---|------|----------|-----------|-------|
| 9.1 | Open **/admin** while logged out | Redirected to sign-in | | |
| 9.2 | Sign in with admin credentials | Reaches the admin dashboard | | |
| 9.3 | Open Organizations, Submissions, Landscapes, Factsheets, Team | Each loads without error | | |
| 9.4 | Review a pending **submission** | The submitted org + its canonical locations show | | |

## 10 · Cross-cutting

| # | Step | Expected | Pass/Fail | Notes |
|---|------|----------|-----------|-------|
| 10.1 | Resize the browser / use a phone | Layouts reflow; no overlap or cut-off text | | |
| 10.2 | Tab through a page with the keyboard | Focus is visible and logical | | |
| 10.3 | Watch for slow pages | First load of a page may be slow on the preview build; a second visit should be quick | | |
| 10.4 | Any console errors? (DevTools → Console) | No red errors on the main flows | | |

---

## Appendix — automated smoke test (last run: 2026-06-17)

Run by the dev team against a local build. ✅ unless noted.

- **Pages (HTTP 200):** `/`, `/landscapes`, `/organizations`, `/map`, `/about`, `/principles`,
  `/funders`, `/editors`, `/style-guide`, `/search`, `/landscape/patratu` + `/budget` `/insights`
  `/climate` `/library`, `/landscape/mau/budget`, `/landscape/dharashiv/budget`,
  `/entry/<published-slug>`, `/agent`. ✅
- **Redirects:** `/landscape/<slug>/ask` → `/agent?scope=<slug>` (307, by design); `/admin` → sign-in
  (307, by design); unknown slug → 404. ✅
- **APIs (200):** `/api/rates`, `/api/geo/search`, `/api/geo/children`, `/api/organizations`. ✅
- **Geography search:** "ramgar"→Ramgarh, "patratoo"→Patratu, "patratu"→village with full path;
  fuzzy query over 262k villages ≈ 0.12s. ✅
- **Climate regression:** 7.9× ratio, 42,973 tCO₂e, funder-lens accordion all present. ✅
- **Note (not a bug):** published case studies live at **`/entry/<slug>`**. `/factsheet/<slug>` is a
  **separate route** backed by the admin fact-sheet generator (its own slug namespace), so entry slugs
  don't resolve there — open fact sheets from the **Admin → Factsheets** list, which links valid slugs. ✅
