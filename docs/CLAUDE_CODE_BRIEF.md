# KCC — Brief for Claude Code: hard test, responsive, and scroll animations

> Written for Claude Code by Mohamed (owner). Read this whole file before touching code.
> ## ⚡ FAST MODE — OVERRIDES the "stop after each phase" rule
> I have a meeting soon. **Do not stop between phases and do not ask me for confirmation** —
> run everything to the end in one go. Only stop if something is truly blocking
> (e.g. `mongod` can't be installed, or a business decision that can't be guessed — then
> pick the safest option, note it in the report, and keep going).
>
> **Speed must not cost correctness.** Nothing is "done" until it is verified:
> - Every fix is proven by a test that failed before and passes after, or by a screenshot.
> - Before the final summary: `lint`, `tsc --noEmit`, `npm test`, `npm run test:e2e`, `npm run build` all green.
> - Do not rewrite working code to "improve" it. No big refactors. Minimal, safe diffs.
> - If something can't be finished safely, leave it out and list it as open — never ship half-broken.
>
> **Priority order (do in this order, so the most important is ready first):**
> 1. Baseline green (Phase 1).
> 2. Blocker/High workflow bugs + admin/customer screens not refreshing (Phase 2 — the journey tests B, C and the permission matrix first; D–G after).
> 3. Responsive, especially 1920 / 3840 / phone (Phase 3).
> 4. Travelling product (Phase 4.1–4.2), with placeholder image.
> 5. Extra animations (4.3) — only what passes the performance budget.
> 6. Final verification + `docs/QA_REPORT.md` with a short "ready for the meeting" summary at the top.
>
> Commit after each priority on the branch so every step is safe to roll back.

---

## 0. Ground rules (read first)

- **Branch:** create `feat/qa-responsive-motion` from the current branch. Never push, never merge, never force anything without asking me.
- **Never touch the live database.** `.env.local` points at production Atlas. All tests run against a throwaway MongoDB (that is what `tests/helpers.ts` already does). If `mongod` is missing on this Mac, install it (`brew tap mongodb/brew && brew install mongodb-community`) or tell me — do not fall back to the real URI.
- **Never commit** `CREDENTIALS.local.*`, `.env*`, `*.xlsx`. They are git-ignored; keep it that way.
- **Keep what already exists working:**
  - Audit trail rules (README → "Audit log"): any new route that writes is wrapped in `audited()`; any new model gets `auditTrail`. `npm test` enforces this.
  - CMS editability (`useCmsSection`) — never hardcode copy that is currently CMS-driven.
  - Bilingual AR/EN + RTL (`LanguageContext`). Every new string goes in both dictionaries; run `npm run i18n:check`.
  - Light/dark theme (`ThemeContext`).
  - `prefers-reduced-motion` (already handled in `globals.css` ~line 486) — every new animation must respect it.
- The current design is good and the owner likes it. **Add to it, don't replace it.**
- Small, focused commits with clear messages.

---

## Phase 1 — Baseline

1. `npm install --legacy-peer-deps` if needed.
2. Run and record results in `docs/QA_REPORT.md`:
   `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run test:e2e`, `npm run i18n:check`, `npm run verify:step-order`, `npm run build`.
3. Fix anything already broken before adding new work (and note it in the report).

---

## Phase 2 — Hard test of the full business workflow

Source of truth: `docs/WORKFLOW.md`, `src/lib/orderWorkflow.ts`, `src/lib/sops.ts`, `src/lib/roles.ts`,
`src/lib/rolePermissions.ts`, `src/lib/accounting.ts`, `src/lib/inventory.ts`, `src/lib/crmFlow.ts`.

### 2.1 Journeys to cover end-to-end (write them as e2e tests in `tests/e2e/full-journey.test.ts`)

A. **Sample request** — public `/order/sample` quiz (every step, both a category-scoped path and a general path, fragrance, packaging, notes, attachments) → submit → order created with full brief, `timeline[0]`, totals, promo/referral if any → admin notification raised.
B. **Sample free path** — Submitted → Under Review → Approved → Queued for Production (skipping billing) → In Production → Quality Check (fail once → loops back with reason → pass) → Production Complete → Ready to Ship → (try Shipped with no rep → must be blocked) → assign rep → Shipped → Out for Delivery (failed attempt → back to Shipped with reason) → Delivered → Closed → customer feedback.
C. **Paid / bulk order** — `/order/bulk` → … → Quotation Sent (customer gets the price email — mock SMTP) → Awaiting Payment → Payment Received (accountant) → production … → Closed. Check invoice, payment, ZATCA QR, accounting entries, totals and VAT.
D. **Sample → bulk conversion** — a customer who had a sample requests a bulk order of the same product. Check the link between the two is kept (CRM / client profile / order history) and nothing is re-asked unnecessarily.
E. **Side exits** — On Hold (and resume), Rejected, Cancelled from every stage where they are allowed; each must require a written reason.
F. **Inventory** — production pulls materials from the store automatically; check stock movements, insufficient-stock behaviour, and that a cancelled order does not leave stock wrong.
G. **CRM** — an order puts the client on the CRM; first logged action moves Upcoming → Current; KPIs count correctly.

### 2.2 Permission matrix (negative tests matter most)

For **every** transition in §6 of `WORKFLOW.md`, for **every** one of the 11 roles: call the API directly (not just the UI) and assert allowed roles succeed and every other role gets 403 and the order is unchanged. Also check the sidebar/page guards match the API guards (no page a role can open but cannot use, and no API a role can call that its UI hides).

### 2.3 Does each side see the change, and how fast?

Today admin pages refresh by polling (`src/lib/useLivePoll.ts`, 15 s, used only in: admin home, orders, customers, inbox, referrals, NotificationBell, OrdersStats). There is no real-time push (`NEXT_PUBLIC_SOCKET_URL` exists but no socket is used).

1. Map every screen that shows order/sample/invoice/stock/CRM data — admin **and** customer (`/account/*`) — and record: does it update without a manual reload after another user changes the data? After how long?
2. Report every screen that does **not** update (e.g. order detail page, production, logistics, accounting, inventory, customer my-samples/my-orders).
3. Fix: every such screen uses `useLivePoll` (or TanStack Query `refetchInterval` + `refetchOnWindowFocus`), and every mutation invalidates the related queries so the acting user sees it instantly. Consider 5–8 s on the order detail/production/logistics boards.
4. Optional, only if clean: Server-Sent Events endpoint for order changes. It must work on Netlify/Render serverless — if it can't, stay with polling. Do **not** add Socket.IO.

### 2.4 SOPs vs code

Compare `src/lib/sops.ts` and `/admin/sops` with what the code actually enforces. Every step a SOP describes must exist and behave as written; every "system" line must actually happen automatically. List mismatches and fix the code or the SOP text (ask me if it's a business decision).

### 2.5 Also check

Emails (mock transport) fire at the right moments; notifications reach the right roles; audit log has a readable sentence for each move; PDFs/Excel exports open; customer pages show the correct status and timeline in both languages; rate limiting on public forms; form validation (Zod) messages in AR/EN.

**Output:** `docs/QA_REPORT.md` — a table: `ID | Area | Severity (Blocker/High/Med/Low) | Steps | Expected | Actual | Status (fixed in <commit> / open)`. Fix Blocker/High; list Med/Low for me.

---

## Phase 3 — Responsive: from a small phone to a giant event screen

The site will be shown on a **very large screen at an event** (assume 4K 3840×2160 and possibly a wide LED wall like 5760×1080 or 7680×2160), and also on phones down to 320 px. Content must **scale with the screen**, not sit in a small box in the middle or overflow.

1. Test widths: 320, 375, 414, 768, 1024, 1280, 1440, 1920, 2560, 3840, plus 5760×1080 and portrait 1080×1920 (vertical totem screen). Both AR (RTL) and EN, both themes. Public site, order quiz, account pages, and the admin panel.
2. Install Playwright as a devDependency and write `scripts/screenshots.ts` that captures every public page at every width into `qa-screenshots/` (git-ignored). Use it before and after.
3. Approach:
   - Add Tailwind v4 breakpoints in `@theme`: `--breakpoint-3xl: 1920px; --breakpoint-4xl: 2560px; --breakpoint-5xl: 3840px;`.
   - Fluid type and spacing with `clamp()`; above ~1920 px let the root font-size grow (e.g. `html { font-size: clamp(16px, 0.55vw + 6px, 32px) }` tuned so 4K looks like 1080p scaled up, not tiny).
   - Containers (`max-w-7xl` etc.) must widen / scale on 3xl+; no fixed-px heights that clip text.
   - Images: hero currently loads Unsplash at `w=1920` — serve a 3840 source for big screens (`srcset`/`sizes`), and lighter ones on mobile.
   - No horizontal scroll at any width; tap targets ≥ 44 px on mobile; navbar/menu works at every size.
4. Optional "event mode": `?event=1` hides login/cart-type UI, enlarges type a little more, and can auto-scroll slowly through the homepage for unattended display. Only if cheap.

---

## Phase 4 — Motion: the travelling product (main feature)

### 4.1 The idea

Like the product sites on Instagram: a product (a cosmetic bottle/jar) sits in the **hero**. As the user scrolls, the **same product travels down with them** into the next section and lands in a new spot there, with a creative move (rotation, tilt, scale, a little 3D flip), then continues into the next section and lands again somewhere else, and so on. It should feel like one object moving through the page, not separate images fading in.

Suggested choreography (adjust if something looks better):
| Section | Product state |
|---|---|
| Hero | Big, centred or end-side, slow idle float + soft light sweep across it |
| → Services | Scrolls down while rotating ~-15°→+8°, shrinks, lands beside the services cards |
| → Stats | Spins (Y-axis feel), passes behind the numbers, counters tick as it passes |
| → Vision 2030 | Tilts and lands on a "pedestal"/glow spot |
| → Process | Moves along the process steps, pausing at each step (scroll-scrubbed) |
| → CTA | Comes back to centre, scales up, CTA button appears beside it ("Request a sample") |

### 4.2 How to build it

- Use **Framer Motion** (already installed): `useScroll`, `useTransform`, `useSpring` for smoothing.
- One `<TravellingProduct />` layer, `position: fixed` (or sticky inside a wrapper), rendered once on the home page.
- Each section places an invisible anchor: `<div data-product-slot="services" />` where the product should land. Measure anchors in document coordinates on mount/resize (`ResizeObserver`), never on every scroll frame.
- Map scroll position → interpolate x, y, scale, rotate, rotateY between consecutive slots. Animate **only `transform` and `opacity`** (translate3d / scale / rotate). No animating top/left/width/height, no layout reads inside scroll callbacks.
- RTL: mirror horizontal positions when `dir="rtl"`.
- Mobile (< 768 px): simpler path — smaller product, mostly vertical moves, fewer stops. Reduced motion: no travel; product shows statically in each section.
- Product image comes from a prop / CMS field (e.g. `cms.hero.productImage`) with fallback `/images/hero-product.png`. For now use a placeholder (a transparent-background cosmetic bottle PNG/WebP; `public/images/bottle.png` exists but is 636×280 landscape — fine as a temporary stand-in, or find a better transparent placeholder). **The owner will send the real product photo later — swapping it must be a one-file change or done from the admin CMS, with no code change.**
- Depth without 3D cost: a soft shadow that stretches/shrinks with height, a specular highlight gradient that sweeps as it rotates. `three` is installed; only use a real 3D model if it's lazy-loaded, has a 2D fallback, and keeps the performance budget below.

### 4.3 More motion across the site (keep it tasteful, luxury-cosmetics feel)

- Headline reveals word-by-word with a mask (split by **words**, never letters — Arabic letters must stay joined).
- Section entrances: clip-path / mask reveals instead of only fade-up.
- Parallax depth on hero background and the existing orbs (scroll-linked).
- Stats counters animate when in view (if not already).
- Client logos / certificates as a slow infinite marquee (pauses on hover).
- Magnetic hover on primary buttons (desktop pointer only).
- Cards: subtle tilt-on-hover (desktop only), image zoom inside a mask.
- Smooth page transitions between public pages.
- Optional smooth scrolling (Lenis) only if it does not break anchor links, the quiz, or mobile.
- Sample quiz: step transitions, progress bar animation, small success celebration on submit.
- Apply the same language to inner pages (about, production, factories, portfolio, certificates) via a shared `PageHero` / reveal component — not copy-paste.

### 4.4 Performance budget (must pass — check it, don't assume)

- 60 fps scrolling on a mid-range phone (Chrome DevTools 4× CPU throttle) and on a 4K screen. No long tasks > 50 ms while scrolling.
- Lighthouse mobile: Performance ≥ 85, CLS < 0.05, LCP < 2.5 s. Report before/after numbers in the QA report.
- No layout shift from animations; hero LCP image is not delayed by animation JS.
- Animation code for the home page is code-split / lazy where possible; no new heavy dependency without telling me why.

---

## Phase 5 — Final check

1. Re-run everything from Phase 1 — all green.
2. Re-run the screenshot script at all widths; put a short before/after list in the report.
3. Re-run the full-journey e2e tests.
4. Final summary for me in `docs/QA_REPORT.md`: what was broken, what was fixed, what is still open, and what I need to decide.

## What I (Mohamed) will provide later
- The real product photo(s) for the travelling product (transparent PNG/WebP). Tell me the exact size/format you want.
