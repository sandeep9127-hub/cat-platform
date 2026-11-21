# CAT Hub v2: full feature test plan

*Run on the test address (`cat-hub` project, CAT Vercel team) before `hub.agroecologyindia.org` moves. **Claude** = checked by Claude; **You** = needs Sandeep (sign-in, microphone, inbox). Record result as ✅ / ❌ with a note.*

## 0. Access and safety
| # | Test | What should happen | Who |
|---|---|---|---|
| 0.1 | Open the test address without the preview password | Preview gate page | Claude |
| 0.2 | Unlock with the preview password | Home page | You |
| 0.3 | `/admin` while signed out | Redirect to sign-in | Claude |
| 0.4 | Sign in by email link (your CAT address) | Email arrives; link signs you in; admin opens on the Inbox | You |
| 0.5 | `/hr` | Redirects to Team Flow | Claude |
| 0.6 | An unknown address | 404 page with header and footer | Claude |

## 1. Public site and design refresh
| # | Test | What should happen | Who |
|---|---|---|---|
| 1.1 | Home | Headline, Atlas map, Ask band, no developer text | Claude + You (look) |
| 1.2 | Solutions Atlas `/map` | Dot clouds, clusters split on zoom, Nationwide strip; 52 programmes (34 placed + 18 nationwide) | Claude + You |
| 1.3 | Fact sheet (e.g. Odisha Millets Mission) | Field-guide layout with drawing | You |
| 1.4 | Old duplicate link `/factsheet/odisha-millets-mission` | Redirects to the kept sheet | Claude |
| 1.5 | Landscapes list and a landscape page | Loads; tabs pinned under header | Claude + You |
| 1.6 | Landscape Budget page | Summary; "Request the full investment table" link; no download buttons | Claude |
| 1.7 | Organisations map and submit form | Map loads; a test submission is accepted (rate-limited) | You |
| 1.8 | Phone width (375 px) | Pages usable, no sideways scroll | You |

## 2. Ask (AI answers)
| # | Test | What should happen | Who |
|---|---|---|---|
| 2.1 | Landscape question ("What is Patratu's total investment and phase split?") | ₹65.11 cr, phases; citations with section and page | Claude |
| 2.2 | HLPE question ("What does HLPE say agroecology is?") | Cites HLPE Report 14; link to /principles | Claude |
| 2.3 | Off-topic question ("Who won the IPL?") | Declines politely, no made-up answer | Claude |
| 2.4 | Follow-up ("and in Vempalli?") | Understands the follow-up | You |
| 2.5 | Stop mid-answer, then New chat | Stops; new conversation starts | You |
| 2.6 | Compare ("Compare Rajnagar and Vempalli on water") | Side-by-side table with citations | Claude |
| 2.7 | Solution matchmaker ("drought-prone smallholders, millet") | Ranked Atlas programmes with reasons | Claude |
| 2.8 | Note ("Make me a note on Mau's tourism plans") | Note card with citations; Copy only (no PDF download) | You |
| 2.9 | Budget chart ("Chart Ahwa's budget by category") | Chart from approved figures | You |
| 2.10 | Diagram ("Diagram how the Vempalli Pashu Sakhi model works") | Cited flow diagram | You |
| 2.11 | Voice: talk, interrupt mid-answer | Hears you, answers aloud, stops when you speak | You (microphone) |

## 3. Investment tables and access
| # | Test | What should happen | Who |
|---|---|---|---|
| 3.1 | Admin → Budget tables → a landscape | Full table: search, filters, sort, column groups, grouping, row detail | You |
| 3.2 | Currency INR → USD → EUR | Amounts convert; "indicative ECB rates" note | You |
| 3.3 | Create a share link for yourself, "Email it to" your address | Email with link arrives; link opens the view-only table | You |
| 3.4 | Revoke that link | Link shows "not available" | You |
| 3.5 | `/request-access` form as a visitor (use your own email) | Thank-you message; approver email to you only | You |
| 3.6 | Click Approve in that email → confirm page → Approve and send link | Link email arrives at the requester address | You |
| 3.7 | Open the approval email link again | "This link isn't active" | You |
| 3.8 | Admin → Access requests | Shows the decision, by email, with link status and views | You |
| 3.9 | Budget changes screen | Empty now (approved baseline); will fill after sheet edits | You |

## 4. Library and editor tools
| # | Test | What should happen | Who |
|---|---|---|---|
| 4.1 | Admin → Inbox | All waiting items, oldest first, age badges; Take it / Snooze work | You |
| 4.2 | Admin → Documents: upload a small test PDF | "Published vN: … passages"; appears in the list | You (needs R2 CORS for the test address) |
| 4.3 | Admin → Briefs → Patratu (and one more) | Key figures, six sections, hover citations | You |
| 4.4 | Admin → Report changes | Four reports with August → November changes | You |
| 4.5 | Admin → Quality | Spend vs caps, AI services, Ask stats, test-set scores, queues, sync runs, library | You |
| 4.6 | Admin → Fact sheets: edit and save a sheet | Saves; matchmaker index refreshes | You |
| 4.7 | Admin → Source changes | Empty list with explanation | You |

## 5. Background jobs (after go-live, from GitHub)
| # | Test | What should happen | Who |
|---|---|---|---|
| 5.1 | Run "Drive sync" manually as a dry run (Actions tab) | Completes; 0 changes | You + Claude |
| 5.2 | First nightly run at 02:30 IST | Quality → Drive sync and AI services show the run | Claude |

## Not in this release
Monday.com board (parked). Pangi report (waiting for the file; upload via Documents). Notes as PDF (off until you decide).
