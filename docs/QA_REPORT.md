# KCC — QA report

Working branch: `feat/qa-responsive-motion` (from `main` at `7ddd10b`). Nothing pushed.
Brief: `docs/CLAUDE_CODE_BRIEF.md`.

Every test and build in this report ran against a throwaway MongoDB. The live
database was not opened, read or written.

---

## Phase 1 — Baseline

### Results

| Check | Before | After the Phase 1 fixes |
|---|---|---|
| `npm run lint` | **Fails**: 381 problems (299 errors, 82 warnings) | Fails: 375 problems (293 errors, 82 warnings); see P1-06 |
| `npx tsc --noEmit` | Pass, 0 errors | Pass, 0 errors |
| `npm test` (unit) | Pass, 50/50 | Pass, 50/50 |
| `npm run test:e2e` | Pass, 75/75 (but its build read production, see P1-01) | Pass, 75/75, build on a throwaway DB |
| `npm run i18n:check` | Pass, 905 strings, 0 missing Arabic | Pass |
| `npm run verify:step-order` | Pass, all rules hold | Pass |
| `npm run build` | Pass, with 2 warnings (P1-02, P1-03) | Pass, no warnings |

`npm run build` on its own still uses `.env.local` (production), because that is
what a deploy needs. To build locally without touching production:
`MONGODB_URI=mongodb://127.0.0.1:<port>/kcc_build npm run build` against a local
`mongod`, or use `npm run test:e2e`, which does this for you.

### Findings

| ID | Area | Severity | Steps | Expected | Actual | Status |
|---|---|---|---|---|---|---|
| P1-01 | Test safety | **High** | `npm run test:e2e` | The tests never touch the live DB | Its `next build` prerenders pages whose SEO metadata is read from MongoDB (`src/lib/seoData.ts`), so every run read production through `.env.local`. Reads only, nothing written | Fixed: `scripts/test-e2e.ts` builds against a throwaway `mongod` |
| P1-02 | Build | Low | `npm run build` | No warnings | "Next.js inferred your workspace root": a `package-lock.json` in the home folder made Next pick `~` as the root | Fixed: `turbopack.root` set in `next.config.ts` (the home-folder files were left alone) |
| P1-03 | Models | Low | `npm run build` | No warnings | Mongoose "Duplicate schema index" for 13 unique keys, each declared on the field and again with `schema.index()` | Fixed: the second declaration removed. Same index name and the same unique rule, so no change in the database |
| P1-04 | Live refresh | Med | Lint on `src/lib/useLivePoll.ts` | — | The hook assigned the latest callback to a ref during render, which React 19 / the React Compiler flags as unsafe | Fixed: `useEffectEvent` |
| P1-05 | Code | Low | Lint | — | `prefer-const` in 5 API routes | Fixed |
| P1-06 | Code quality | Low | `npm run lint` | Lint passes | Still fails: 272 `no-explicit-any`, 18 "setState synchronously within an effect" (mostly reading localStorage on mount: Navbar, theme, language, quiz flow), 3 "memoization could not be preserved" (admin layout), 61 unused-variable warnings. None breaks the build or a test | **Open, needs a decision** (below) |

### Decision taken on P1-06

You chose option 2: `no-explicit-any` is a warning, and the 21 React 19 errors
are fixed (commit `43d7fc8`). `npm run lint` now passes with 0 errors. Two of
the 21 (theme and language, one read of a saved choice after hydration) are kept
as they were, with a comment explaining why: moving that read into render would
make the server and browser disagree on the first paint.

### Original options

**P1-06, the lint backlog.** The build and the tests do not depend on lint, so
this does not block the rest of the brief. Two ways forward:

1. **Fix it all.** Type the 272 `any`s properly and rewrite the 18 effects.
   This is about a day of mechanical work and touches most API routes and the
   quiz, so it is a risk in itself.
2. **Fix what matters only (recommended).** Fix the effects and the
   memoization (real React 19 issues) during Phases 2 and 3, where those files
   are touched anyway. Keep `no-explicit-any` as a warning instead of an error,
   so `npm run lint` passes and new code is still flagged.

---

## Phase 2 — The business workflow, tested hard

New tests:
- `tests/e2e/full-journey.test.ts` (18 tests): journeys A–G, the permission
  matrix, and the check that each page matches its API.
- `tests/e2e/live-refresh.test.ts` (5 tests, real browser through Playwright).
- `tests/unit/workflow-i18n.test.ts`.

Mail is checked against a local mock SMTP server (`tests/mockSmtp.ts`). Nothing
is sent anywhere.

### What is covered

| Journey | What the test proves |
|---|---|
| A. Sample request | The quiz payload, built by the real `buildOrderPayload` for both a category-scoped and a general brief, arrives whole: brief, category answers, notes, fragrance, packaging and attachments. `timeline[0]` names the customer; the total stays 0 until the team prices it; the promo is held. The new-order bell and the team email fire. The customer cannot set the status, internal notes or negative totals, and no one signed out can order. |
| B. Free sample | Submitted → Closed, including a failed QC (it needs a reason) and a failed delivery (it needs a reason). Shipping is blocked until a courier is named. Feedback works only after delivery and only from the owner. Each move sends its email and leaves a readable audit line. |
| C. Paid bulk order | A quotation without a price is refused. The price email reaches the customer with the VAT included. The invoice is created by itself (`INV-YYYY-NNNNN`, 15% VAT), and the customer's copy carries a ZATCA QR with the VAT and CR numbers; no other customer can open it. Only finance or the account manager confirms payment, and the books reconcile. |
| D. Sample → bulk | The bulk order keeps its link to the sample and the brief, both sit on the same CRM account, and another customer's sample cannot be linked. |
| E. Side exits | Every hold, reject and cancel, from every stage that allows it, needs a reason. A held order resumes. Closed, rejected and cancelled orders go nowhere. |
| F. Store | An order cancelled before production takes nothing from stock. A start the stock cannot cover is refused, with the shortages listed. (Consumption, returns, average cost and concurrency are in `inventory.test.ts`.) |
| G. CRM | An order puts the client on the CRM. A target account goes Upcoming → Current on its first visit and is owned by the rep who made it. The KPIs count the visit. |
| Permission matrix | All 29 moves in WORKFLOW.md §6, each tried by all 11 roles through the API (≈ 320 calls): allowed roles succeed, every other role gets 403 and the order is unchanged. A second test fails if the code gains a move the table does not list. |
| Page ↔ API | For every staff role and 15 sidebar pages: a page shows in the sidebar exactly when its API answers that role. A customer reaches none of them. |

### Does each side see the change, and how fast? (2.3)

Measured in a real browser: one person keeps a page open while someone else
moves the order through the API.

| Screen | Before | After | Measured |
|---|---|---|---|
| Admin order page | Never updated (one fetch when it opened) | Silent refresh every 8 s, and when you return to the tab; never overwrites notes being typed | 7.8 s |
| Production board / Logistics board | Never updated | Every 8 s | 8.4 s |
| Materials card on the order | Only when the status changed | Every 8 s, never while editing | — |
| Inventory | Never updated | Every 15 s, silent | — |
| My queue (dashboard) | Never updated | Every 15 s | — |
| Customer: sample / order page | Polled **every second**, even with the tab in the background (heavy on Render) | Every 8 s, paused while hidden, immediate on return | 7.8 s |
| Customer: my samples / my orders lists | Never updated | Every 15 s | 14.4 s |
| Customer: feedback form | Appeared only after a reload | Appears when the status changes to Delivered | — |
| Accounting, CRM, audit, client file (`useApi`) | Never refreshed, not even on returning to the tab | Every 30 s and on return to the tab; the old data stays on screen meanwhile | 29.4 s (invoice list) |
| Dashboard, orders list, customers, inbox, referrals, notifications | Already 15–30 s | Unchanged | — |

Each page that performs an action reloads its own data straight after, so the
person acting sees the result at once (checked for every `useApi` page that
writes). A Server-Sent Events push was **not** added: Render's free plan
sleeps and drops long connections, and polling already shows a change within
seconds.

### Findings

| ID | Area | Severity | Steps | Expected | Actual | Status |
|---|---|---|---|---|---|---|
| P2-01 | Dispatch | **Blocker** | Logistics opens a Ready-to-Ship order to name the courier, then "Assign rep & ship" | Dispatch names the courier and ships (SOP 6) | Logistics had no way to name a courier: the API sent them to the customer branch (403), and the assignment card only showed to `orders.assign`. Shipping depended on someone else | Fixed: dispatch can set courier name, phone and tracking number, nothing else (other fields → 403, recorded as refused). The order page shows them a courier-only card |
| P2-02 | Orders / privacy | High | A customer creates a bulk order with `convertedFromSample` set to another customer's sample id | The link is refused | It was stored, and the order page showed that sample's number, type and status | Fixed: only the customer's own sample is linked |
| P2-03 | Live refresh | High | Keep the order page, production or logistics board open while another desk moves the order | The page follows | They never updated until reloaded | Fixed (table above) |
| P2-04 | Performance | Med | Leave a customer order page open | Light polling | One request per second per open tab, background tabs included | Fixed: 8 s, paused while hidden |
| P2-05 | Production board | Med | The factory finishes an order | It shows under "Completed" | The factory's list left out "Production Complete", so that column was always empty | Fixed: the factory's scope includes what it just finished |
| P2-06 | Inbox / permissions | Med | Sign in as STAFF and open Inbox | Messages load | The page showed (`inbox.view`) but its API demanded `inbox.act` → empty with an error. Subscribers tab and delete buttons also showed to roles whose API refuses them | Fixed: reading needs `inbox.view`, acting `inbox.act`; the subscribers tab only for `cms.manage` |
| P2-07 | Customer feedback | Low | Order becomes Delivered while the customer's page is open | The rating form appears | Only after a reload | Fixed |
| P2-08 | Bilingual | Low | Contact form error in the Arabic site | Arabic message | English server text shown as-is | Fixed: translated on screen |
| P2-09 | SOP text | Low | SOPs → Account manager | Lists every status in their queue | "On Hold" was missing | Fixed |
| P2-10 | Docs | Low | WORKFLOW.md §6 | Every move listed | Holds, cancels, resume and revised quotation were missing | Fixed |
| P2-11 | Validation | Low | — | The brief expects Zod validation messages in Arabic and English | The project uses no Zod; each route validates by hand, with English messages. Public-form messages are now translated on screen | Open. Moving all routes to Zod is a refactor, so not done in this pass |
| P2-12 | Workflow | Med | Put a Queued-for-Production order on hold, then press Resume | — | Resume always goes back to "Under Review", even for an order held on the factory floor, so it has to be approved and released again | **Open: business decision.** Kept as is (the safer option: the order is looked at again). Change it only if you want a held production order to return to the queue directly |
| P2-13 | Orders API | Low | `GET /api/orders?limit=100000` | A capped page size | `limit` has no upper bound (it is still scoped to what the caller may see) | Open |
| P2-14 | Notifications | Low | — | Notifications reach the right roles | The bell lists every notification to every staff member; the "owner" of each move is stored but not used to filter | Open: a design change, listed for you |

Rate limiting on public forms is in place and tested: contact (5 per 10 min per
IP), newsletter (5 per 10 min), login (10 per 5 min), registration, uploads,
reviews and the AI chat.
