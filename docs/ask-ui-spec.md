# Ask and AI features: agreed UI spec

Agreed with Sandeep on 21 Nov 2026 after the clickable demos (private artifact: https://claude.ai/artifact/Vr9ybtLNkKnbZ5dnkxbiZE). He accepted the recommended option in every area, and asked for the emoji mic to be replaced with a line icon.

This spec covers the reader-facing UI only. It sits on top of the Ask v2 backend (`lib/ask/v2.ts`, behind `ASK_V2=on`) and does not change the SSE contract.

**Who builds what**
- The main Ask session builds everything here except the home page: `components/agent/*`, `app/(public)/agent`, the BrandBar link, the landscape-page ask bar and the Search hand-off.
- The UI session (`feat/ui-refresh`) builds the home-page band (E3) from this spec.

**House rules that apply throughout** (from `DESIGN.md`): cream/teal palette, hairline-grid panels (`gap-px bg-line border border-line`), all Inter, no em dashes in copy, no side-stripe accents, no gradient text. Icons are lucide line icons, never emoji. Muted text must reach 4.5:1 on cream (the UI audit found `#807c72` at 3.95:1).

---

## Summary of decisions

| # | Area | Decision |
|---|---|---|
| 0 | Ask first screen | **A.** Show a real cited answer first, with landscape chips |
| 0b | Entry points | **E1–E4 all.** Header box, landscape-page ask bar, home band (UI session), Search hand-off |
| 1 | Ask v2 | **A.** Sources panel beside the answer on desktop; bottom sheet on mobile |
| 2 | Compare landscapes | **A.** Side-by-side table, a citation chip in every cell, "Show only differences" |
| 3 | Solution matchmaker | **A.** Ranked cards with "why it fits", plain fit labels |
| 4 | Notes and charts | **A.** Note card in the thread with Download PDF; charts inline with "Show the numbers" |
| 5 | Voice | **Both.** Voice in the composer on desktop, full-screen voice mode on phones |

---

## 0. First screen of /agent (empty state)

Replaces today's "Powered by AI" eyebrow, "What would you like to know?" and the 4 random prompt pills.

**Layout, top to bottom**
1. Heading: **"Ask the 10 landscape plans"** (the count comes from the library, not hard-coded).
2. One line: "Every answer quotes the page it came from. If something isn't in the plans, the Hub says so."
3. **Example answer card**, labelled "Example answer":
   - A real question and a short answer, 2 sentences with `[n]` chips.
   - Clicking a chip shows the full citation label (document · section path · page) and its relevance label.
   - An "Ask this →" button runs the question for real.
   - The example is a stored, real answer (not generated on page load). Keep 3 (Patratu livestock, Rajnagar water, one more) and rotate them by day.
4. **Composer**: large, the main object on the page. It holds the input, a mic button (lucide `Mic`) and a send button. The placeholder is "Ask about any landscape, or pick one below".
5. **Landscape chips**: one horizontally scrolling row of the 10 landscapes. Tapping a chip sets the scope and fills the placeholder with that landscape's best question (it does not send).
6. **Proof line**: "10 landscape plans · 580 interventions · Answers in about 5 s", from live counts.

**Mobile:** the same order. The composer is pinned to the bottom at thumb height, and the example card and chips scroll above it.

**Per-landscape starter questions** (used by the chips, the landscape ask bar and the scope menu):

| Landscape | Starters |
|---|---|
| Patratu | What does Patratu's plan say about livestock? · Who pays for Patratu's plan? · What didn't work in past Patratu interventions? |
| Rajnagar | How does Rajnagar budget for water? · Which villages get farm ponds first? · What role do women's SHGs play in Rajnagar? |
| Vempalli | How does Vempalli use drip irrigation? · How is groundwater tracked in Vempalli? · What does Vempalli's plan cost in total? |
| Patharpratima | How does Patharpratima plan for saline flooding? · What does the plan say about fisheries? · Which crops suit Patharpratima's soils? |
| Chitrakonda | Which crops does Chitrakonda's plan promote? · How are tribal collectives involved? · What is the plan size for Chitrakonda? |
| Dantewada | What role does forest produce play in Dantewada? · Who are the partners on the ground? · How does the plan support millets? |
| Ahwa | What is planned for millets in Ahwa? · How does Ahwa's plan handle water in the dry season? · Who funds Ahwa's plan? |
| Dharashiv | How does Dharashiv's plan tackle drought? · What does the plan say about soil health? · Which state schemes does it use? |
| Mau | What does Mau's plan say about soil health? · How are FPOs involved in Mau? · What is the biggest cost in Mau's plan? |
| Khatarshnong–Laitkroh | How are community institutions involved in Khatarshnong–Laitkroh? · What does the plan say about shifting cultivation? · Who pays for the plan? |

Check each starter against the test set before launch: every starter must clear the 0.55 refusal floor. Avoid "what changed" questions until version diffs are searchable (they score about 0.66 today).

Refero references: Voicenotes Ask AI with an answered example, Anthropic docs Ask AI, ChatGPT iOS home chips, Copilot iOS home.

## 0b. Entry points

- **E1. Header (BrandBar), all pages.**
  - Replace the uppercase mono "ASK THE HUB" pill with a sentence-case box that looks typeable: "Ask about any landscape…" and a solid "Ask" button inside it.
  - Clicking it opens `/agent` with the cursor in the composer.
  - Below 640 px, keep a compact "Ask" button in the bar.
- **E2. Landscape pages** (`/landscape/[slug]`).
  - An "Ask about {Landscape}" bar under the landscape tabs: an input plus the 3 starters for that landscape.
  - Submitting goes to `/agent?scope={slug}` with the question.
  - Starter text is sans serif (today's FloatingAsk starters are serif italic, which the design rules no longer allow).
- **E3. Home page band (UI session, `feat/ui-refresh`).**
  - An "Ask the Hub" block using the same example-answer card as section 0: a question, a one-line cited answer with a citation chip, and a small composer "Ask your own question".
  - It rotates between the same 3 stored examples.
- **E4. Search** (`/search`).
  - Heading changes from "Ask the library." to **"Search the library"**.
  - When there is a query, one row sits above the results: "Want a cited answer instead? **Ask the Hub about "{q}"** →", which opens `/agent` with the query.
  - Search stays plain search, so there is one AI entry point.
- The 404 page link stays as it is.

## 1. Ask v2 conversation

**Page layout**
- The whole page is the conversation, with the composer pinned to the bottom.
- Header row: the scope chip and **New chat** (top right).
- Desktop at 1024 px and up: the thread is about 60% wide, with the **sources panel** on the right at about 40%.
- Narrower screens: no panel. Citations open in a **bottom sheet** with a drag handle.

**Staged status** (one block per answer, above the text)
1. "Searching the library" (spinner).
2. "Reading N sources" as `meta` arrives, with the source names ticking in under it ("Rajnagar LIP p.37 · …").
3. "Writing the answer" on the first `delta`.
4. On `done` it folds to one line, "Answered from the library · Read N sources · 4.1 s", which reopens on tap.

**Answer body**
- Answers are prose with `[n]` after each cited sentence, as v2 sends them. Render markdown when it appears (lists, tables, bold).
- `[n]` becomes a citation chip: teal tint, filled teal on hover or when active. Chips are keyboard-focusable (Enter opens the source).
- Under each answer: **Copy**, **Retry**, **Make a note** (section 4).
- **Suggested follow-ups**: 3 full-width rows labelled "Ask next", not small pills. One may hand off to Compare or Matchmaker when the question names two landscapes or a problem.

**Sources panel (desktop)**
- Header: "Sources · N".
- One card per citation: number, document, section path (from the citation `label`), page, and a relevance label.
- Clicking a chip highlights its card and opens a **page preview** under it: section and page, the cited passage highlighted (from `preview`), and "Open page N ↗". Until the page viewer exists, that link goes to the citation `url` (`/landscape/{slug}`).
- Sources that were retrieved but not cited are shown greyed under "Also read".

**Relevance labels.** Never show the raw score. Show a 3-bar meter and a word:

| Score | Label |
|---|---|
| 0.85 and up | Strong match |
| 0.70 to 0.84 | Good match |
| 0.55 to 0.69 | Related |

These are set from the calibration run (real questions scored 0.61–0.93, median 0.89; refusal floor 0.55). Keep them in one helper so they can be retuned.

**Stop and New chat**
- While streaming, **Send becomes Stop**. Stop keeps the partial text, tags it "■ Stopped" and offers Retry. The backend saves the turn with `interrupted = true`.
- **New chat** clears the thread and starts a new `conversationId`.
- History restores after a refresh (`GET /api/agent?history=latest`).

**Refusals** ("not in the library")
- An amber-tinted box with the label **"Not in the library"**.
- One plain sentence on what was searched and that nothing was close enough, so the Hub did not guess.
- "Closest we have" (another landscape or section, when retrieval has one) and **Suggest a document**.
- The status line reads "Searched · N sources".

**Accessibility**
- A polite live region announces "Answer ready" or "Not in the library" when `done` arrives.
- The input is labelled. Escape and outside-click close the sheet and menus.
- The scope chip must not cover the input on mobile.

Refero references: ChatGPT deep research sources panel, Perplexity sources panel, Delphi citations drawer, Meta AI steps drawer, ChatGPT iOS citations sheet, Voicenotes suggestions, Parallel evidence modal.

## 2. Compare landscapes

- The answer arrives in the thread as a short summary sentence followed by a **side-by-side table**:
  - Rows are aspects, grouped (money, approach, who pays, gaps).
  - Columns are landscapes.
- **Every cell** carries its own citation chip. Clicking a chip opens a popover with the full label, the relevance label and "Open page".
- Where a plan says nothing, the cell shows an amber **"Not in the documents"** tag, never a dash.
- Cells that differ get a light teal tint. The **"Show only differences"** toggle hides rows where the landscapes match.
- Actions: Copy table (CSV with sources), Make a note, ＋ Add a landscape. Past 3 landscapes, switch to one block per landscape.
- Mobile: the table scrolls sideways with the first column pinned.
- Backend note: comparisons need retrieval per landscape (single-pass scores about 0.61).

Refero references: Intercom plan grid, Reclaim compare table, Xbox two-model compare, Memotron differences toggle.

## 3. Solution matchmaker

- Keep the reader's problem text on screen. Pick out its key needs as underlined phrases (for example rainfed uplands, women farmers, soil fertility, small budget, payback within 2 years).
- **Ranked cards**, one per Atlas programme:
  - Rank, title, source line, and a **fit label**: "Strong fit" (teal fill) or "Partial fit" (amber). Never a percentage.
  - **Reasons**: one line per need, marked ✓ meets, ◐ partly, or ○ not in the documents, each with a citation chip. Hovering or tapping a reason highlights the matching phrase in the problem text.
  - An **Evidence** line with a cited outcome.
  - Actions: Open in Atlas, Ask about this (opens Ask scoped to the programme), **Not a fit** (logged as feedback for ranking).

Refero references: Kinhive suggested matches and "Good match" callout, Parallel per-criterion verdicts.

## 4. Notes, summaries, charts and diagrams

**Note card** ("make me a note on X")
- A card in the thread:
  - An eyebrow line: "Note · {date} · from N documents".
  - A title, 3 to 5 bullet points with citation chips, and numbered footnotes with the full citation labels.
  - Actions: **Download PDF**, Copy, Save.
- The PDF matches the card: A4, CAT header (wordmark and date), the same text, sources as footnotes and a link back to the Hub. File name: `cat-note-{slug}.pdf`.
- Show a toast after Download or Copy.

**Charts and diagrams** (drawn as code, never image generation)
- Inline SVG in the CAT palette: teal for the first series, slate `#646d95` for the second, amber reserved for highlights.
- Axis and label text uses theme tokens so it reads in dark mode.
- Every chart has a title, a legend when there are 2 or more series, a one-line caption with citation chips, and a **"Show the numbers"** toggle that reveals the data table.
- Diagrams (flows such as "how a farm pond gets funded") use one fixed vocabulary:
  - teal-tint boxes with a teal border for steps;
  - amber for an outside funder;
  - teal arrows;
  - a citation chip on the caption.
- No charting library (as `DESIGN.md` says); hand-built SVG components.

Refero references: Copilot in-thread summary, Cohere Coral chart in chat, Cofounder share toast.

## 5. Voice conversation

**One engine, two layouts**
- Desktop (720 px and up): voice lives **inside the composer**.
  - The mic button turns the input into a live bar showing a waveform and the words as they are heard.
  - The thread keeps the spoken turns with their citations.
- Phones: **full-screen voice mode**, with:
  - a header showing the state;
  - a language row (English, हिन्दी, বাংলা, తెలుగు, मराठी, and ଓଡ଼ିଆ marked "text only");
  - one large state circle;
  - large captions;
  - a "Speak over it" hint while speaking;
  - a bottom dock: keyboard, mic, end.

**States**, each with its own colour, shown as a label and on the circle or waveform:

| State | Colour | What shows |
|---|---|---|
| Listening | teal | Live words as heard (Soniox partials) |
| Thinking | slate | "Searching N sources…" |
| Speaking | amber | Captions streaming with the audio |

**Interruption.** The moment new speech is detected while the Hub is speaking:
- playback stops;
- the Claude request is cancelled;
- the cut-off turn gets an amber **"Interrupted"** tag;
- the state goes straight back to Listening.

**Other rules**
- When the session ends, every turn stays in the chat with its sources ("Voice session ended · 1 min 12 s").
- Odia shows a short note: "Odia is text only for now".
- Icons are lucide line icons: `Mic`, `Keyboard`, `X`; a filled square for stop. No emoji. The mic button fills teal while a session is live.

Refero references: ChatGPT iOS voice flow, Comet assistant voice session, WhatsApp Meta AI voice, ElevenReader in-book voice, Siri processing, Hark composer dictation.

---

## SSE contract used by this UI (unchanged)

- `meta`: `conversationId` and `citations[]`. Each citation has:
  - `index`, `type` (`"landscape"`);
  - `label` ("{document} · {section path} · p. {page}");
  - `url`, `preview`, `score`;
  - `document`, `section`, `pageStart`, `pageEnd`.
  - The UI drives "Reading N sources" from `citations.length`, and the panel from the citations themselves.
- `delta`: `text`. The first delta switches the status to "Writing".
- `done`: `refused`. This folds the status and shows follow-ups, or the refusal box.
- `error`: an inline error under the turn: what went wrong and a Retry button.

Follow-up questions need a source: either a new `done.followUps` field from the backend, or a small client-side generator. The main Ask session should pick one.

## Open items

- The page viewer for "Open page N" (until then, link to `/landscape/{slug}`).
- Patharpratima's report has no Word headings, so its citations will show coarse section paths.
- Starter questions need a pass against the test set before launch (see section 0).
