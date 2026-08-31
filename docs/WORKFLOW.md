# KCC — End-to-end workflow

How a request travels through the system, from the moment a customer opens the
quiz to the moment they leave feedback on the delivered sample — and exactly
who is allowed to do what at each step.

- [1. Who can sign in](#1-who-can-sign-in)
- [2. The customer journey](#2-the-customer-journey)
- [3. What the customer actually answers](#3-what-the-customer-actually-answers)
- [4. What gets saved when they submit](#4-what-gets-saved-when-they-submit)
- [5. The order hand-off chain](#5-the-order-hand-off-chain)
- [6. Who may make each move](#6-who-may-make-each-move)
- [7. What the customer sees while they wait](#7-what-the-customer-sees-while-they-wait)
- [8. Feedback — closing the loop](#8-feedback--closing-the-loop)
- [9. Configuring the quiz](#9-configuring-the-quiz)
- [10. Where everything lives in the code](#10-where-everything-lives-in-the-code)
- [11. Rules the system enforces](#11-rules-the-system-enforces)

---

## 1. Who can sign in

Eleven roles, defined once in `src/lib/roles.ts`. Every role maps to a fixed
list of permissions; the sidebar, the page guards and the API guards all read
that same list, so adding a role in one place makes it work everywhere.

| Role | What it is for |
|------|----------------|
| **Super Admin** | Everything, including user management and system settings. |
| **Admin** | Full operational access across sales, production, content and finance. |
| **Sales** | Leads, customers, orders, promo codes, referrals. |
| **Account Manager** | Owns the customer relationship. Drives an order from intake to close. |
| **Factory / Production** | Sees only orders released to the factory. Makes, QCs and completes them. |
| **Logistics / Dispatch** | Assigns delivery reps, ships, confirms delivery. |
| **Accountant** | Invoices, payments, expenses, reports. Confirms payment on an order. |
| **Customer Support** | Inbox, customer enquiries, knowledge base. |
| **Content Editor** | Website content, news, SEO, the product catalogue tree. |
| **Staff (general)** | Read-mostly operational access plus content tools. |
| **Customer** | The portal only — their own samples, orders, profile and feedback. |

Accounts for every role are created by `npm run create:users`; the credentials
land in `CREDENTIALS.local.md` (gitignored).

**Ordering is closed.** There is no public sign-up path to the quiz — a
customer must have an account KCC created for them. `POST /api/orders` rejects
an unauthenticated request outright.

---

## 2. The customer journey

```
sign in
  └─ /order                    choose Sample or Bulk
       └─ /order/sample        the quiz
            ├─ 1  Your name              printed on the sample bottle
            ├─ 2  The brief              questions asked on every request
            ├─ 3  The product            category → its questions
            │                            → sub-family → its questions
            │                            → exact product → its questions
            ├─ 4  Technical specs        actives, oils, colour, packaging, scent
            └─ 5  Review & submit        edit any single answer, then send
                 └─ Thank-you screen with the reference number (SMP-…)
```

Three properties of this flow are deliberate:

- **Every step scrolls back to the top.** Answering a question near the bottom
  of a long list never leaves you stranded below the next one.
- **A category's questions are asked the moment that category is chosen** —
  pick "Body Care" and you are asked about body care before you are asked which
  sub-family. That is how a brief is taken in person.
- **Editing one answer from the review screen returns straight to the review.**
  The button even changes to "Save and return to review". No walking the rest
  of the survey again.

Progress is saved in the browser, so a customer can close the tab and come back
to the exact step they left.

---

## 3. What the customer actually answers

Nothing in the quiz is hardcoded. Every question is a database record an admin
can add, edit, reorder or hide.

**Scopes** — where a question is asked:

| Scope | Asked when | Example |
|-------|-----------|---------|
| `general` | Always, in the brief | "Which consumer segment?" |
| `main` | Right after a main category is picked | "Primary hair type" for Hair Care |
| `sub` | Right after a sub-family is picked | questions specific to Shampoo |
| `product` | Right after the exact product is picked | questions for one SKU |

**Widgets** — how they answer: single/multi chips, large cards, cards with
images, yes/no, short text, long text, a checklist where each item can carry
its own note, file upload slots, and the hero-ingredient sub-flow.

**Branching** — a question can declare "show only when…" conditions against an
earlier answer. That is how the four development paths work:

| First answer | What follows |
|--------------|--------------|
| New formula from scratch | straight on to the standard brief |
| Reformulation of an existing product | upload the product / INCI / formula → why reformulate (each reason takes its own note) → what must stay the same → what you are unhappy with |
| Matching a benchmark product | upload the benchmark → what you like → what you would improve → how close we should stay |
| Ready-made formula | same sequence as "new formula" |

Uploads (product photos, ingredient lists, existing formulas) are stored
**outside** the public folder and served through `/api/files/quiz/[name]`, which
requires a session and forces a download — an uploaded file can never execute
in the site's origin.

---

## 4. What gets saved when they submit

`POST /api/orders` creates one `Order` document containing:

- `orderNumber` — the customer-facing reference, e.g. `SMP-MTGH3GTR-QHX2`
- `type` — `sample` or `bulk`
- `status` — always starts at `Submitted`
- `customerInfo` — name, email, phone, company
- `surveyData` — the whole brief: general answers, category-scoped answers,
  chosen category path, technical specs, fragrance, packaging design, and every
  note the customer attached
- `timeline` — the first entry: *submitted by the customer*
- `totals`, promo/referral if any

A notification is raised for the admin team at the same moment.

---

## 5. The order hand-off chain

```
                    ┌──────────────────────────────────────────┐
   CUSTOMER  ──────▶│ Submitted                                │
                    └──────────────────────────────────────────┘
                                     │  acknowledge receipt
   ACCOUNT MANAGER ─────────────────▶│ Under Review
                                     │  approve
                                     ▼
                                     │ Approved
                       ┌─────────────┴─────────────┐
          send quote   │                           │  free sample —
                       ▼                           │  skip billing
                     Quotation Sent                │
                       │                           │
                       ▼                           │
                     Awaiting Payment              │
   ACCOUNTANT ────────▶│ Payment Received          │
                       └─────────────┬─────────────┘
                                     │  release to factory
                                     ▼
                              Queued for Production
   FACTORY ──────────────────────────▶│ In Production
                                      │ Quality Check   (rework loops back)
                                      ▼
                              Production Complete
   ACCOUNT MANAGER ───────────────────▶│ Ready to Ship
   LOGISTICS ──────────────────────────▶│ Shipped        (a rep must be assigned)
                                        │ Out for Delivery
                                        ▼
                                     Delivered
   ACCOUNT MANAGER ─────────────────────▶│ Closed
                                          │
   CUSTOMER ──────────────────────────────▶ leaves feedback ★
```

Side exits available at most points: **On Hold** (resumable), **Rejected**,
**Cancelled**. Both require a written reason.

Every move appends to the order's `timeline`: who did it, their role, the exact
time, and any note. That log is visible on the admin order page and can never
be edited away.

---

## 6. Who may make each move

| From → To | Who | Notes |
|-----------|-----|-------|
| Submitted → Under Review | Account Manager, Sales | "we have your request" |
| Under Review → Approved / Rejected / On Hold | Account Manager, Sales | rejection and hold need a reason |
| Approved → Quotation Sent | Account Manager, Sales | |
| Approved → Queued for Production | Account Manager, Sales | free samples skip the commercial leg |
| Quotation Sent → Awaiting Payment | Account Manager, Sales | |
| Awaiting Payment → Payment Received | **Accountant**, Account Manager | |
| Payment Received → Queued for Production | Account Manager, Sales | the hand-off to the factory |
| Queued → In Production | **Factory** | |
| In Production → Quality Check → Production Complete | **Factory** | failed QC loops back with a reason |
| Production Complete → Ready to Ship | Account Manager, Sales | sign-off before dispatch |
| Ready to Ship → Shipped | **Logistics** | blocked until a delivery rep is assigned |
| Shipped → Out for Delivery → Delivered | **Logistics** | a failed attempt returns to Shipped with a reason |
| Delivered → Closed | Account Manager, Sales | |

Admins and Super Admins may make any move.

**This is enforced on the server, not in the UI.** `POST /api/orders/[id]/transition`
is the only endpoint that can change a status — `PUT /api/orders/[id]` rejects a
`status` field on purpose. So the factory cannot mark an order delivered and
dispatch cannot start production, whatever the client sends.

### What each desk sees

- **Factory** → `/admin/production`. Only orders released to production, in four
  columns: Queue, In production, Quality check, Completed. Nothing else in the
  company is visible to them.
- **Logistics** → `/admin/logistics`. Ready to ship, In transit, Delivered.
- **Account Manager** → their assigned accounts, plus anything unassigned.
- **Every role** → a "My Queue" card at the top of the dashboard listing exactly
  the orders currently waiting on them.

---

## 7. What the customer sees while they wait

`/account/my-samples/[id]` and `/account/my-orders/[id]` show a six-stage
tracker — Received → Reviewed → Quotation → Production → Dispatch → Delivered —
driven by the same workflow definition the staff use. Internal statuses collapse
into those six, each with a plain-language line ("We are manufacturing your
formula", "Our rep is on the way to you"), in Arabic or English.

An order that is on hold, rejected or cancelled shows that state explicitly
rather than a misleading progress bar.

---

## 8. Feedback — closing the loop

Once an order reaches **Delivered** (or **Closed**), a feedback card appears on
the customer's order page:

- overall rating, 1–5
- per-aspect ratings: formula quality, packaging, communication, timing, value
- a free-text comment
- would they order it again?
- may KCC publish it as a testimonial?

Submitting notifies the team immediately — a low score should never sit unread.
The account manager replies from the order page in the admin panel, and that
reply appears under the customer's own feedback on their order page.

Customers can revise their feedback; there is exactly one record per order.

Endpoints: `GET/POST /api/orders/[id]/feedback` (customer), `PUT` (staff reply).

---

## 9. Configuring the quiz

**Admin → Sample Quiz** has three doors:

1. **Brief questions** — the shared questions asked on every request.
2. **Category questions** — the same editor, scoped to a main category or a
   sub-family. Pick the set from the dropdown at the top.
3. **Product spec configs** — the technical specs, per product.

Every question editor gives you: English and Arabic text, the answer widget,
the choices (drag to reorder, each with its own Arabic label and description),
required / visible / allow-note switches, branching conditions, and a live
preview of exactly what the customer will see.

### Configuring specs without opening every product

The spec tree is Category → Sub-family → Product, and you can configure at any
of the three levels:

- **Configure all** on a main category → writes that configuration onto every
  product in every sub-family beneath it.
- **Configure all** on a sub-family → writes it onto every product in that
  sub-family.
- **Opening a single product** → writes it onto that product only.

The rule is simply **the most recent save wins**. A save at any level writes
straight onto the product documents, so there is no hidden inherited layer to
reason about: configure a whole category in one pass, then fine-tune one product
afterwards, and the fine-tune sticks. The bulk dialog tells you how many
products it will overwrite, and warns you when those products currently differ
from each other.

Every change is live on the customer quiz immediately — no caching to clear.

### Editing the packaging questions

The packaging screen looks like one visual step to the customer, but it is
**five ordinary specs** in the admin panel, edited exactly like Oils & Extracts
or Actives — open a product under *Sample Quiz → Product Spec Configs* (or use
**Configure all** on a category) and you will find them in order:

| Spec | What it controls | Where it shows |
| --- | --- | --- |
| `product-packaging` | The pack itself — bottle, jar, tube, ampoule … | The studio's first tab |
| `package-cap` | Cap and dispenser — pump, sprayer, flip-top … | Tab 2 |
| `package-label` | How much of the pack the artwork covers | Tab 3 |
| `package-finish` | Glossy, matte, frosted, transparent, metallic | Tab 4 |
| `package-color` | The colour of the pack | Tab 5 |

Each carries a badge in the admin list saying it appears inside the 3D
packaging studio, so it is clear the change will not create a new question
screen. Practically:

- **Unticking an option** removes it from that tab.
- **Renaming the question** renames the tab.
- **Disabling the spec** removes the tab entirely — the customer keeps whatever
  default that part already had.
- **Renaming an option** in *Spec Option Masters* renames it in the studio.

One constraint that does not apply to any other spec: the studio can only draw
shapes it has artwork for. Adding a brand-new value to `product-packaging`,
`package-cap`, `package-label` or `package-finish` needs a matching shape in
`src/components/order/sample-quiz/widgets/packaging/shapes.tsx`; without one the
studio quietly skips it. Colours are the exception — a new colour only needs its
hex in the option's `meta`. `npx tsx scripts/seed-packaging-specs.ts` re-syncs
the masters with the shapes at any time and is safe to re-run.

### Two field names that look cryptic (they are meant to)

- **Internal key** (`developmentType`) — the name the answer is stored under in
  the order, and what "show only when…" rules point at. Generated from the
  question text; you rarely touch it. Changing it on a live question breaks
  existing rules and past answers, which is why it sits under *Advanced*.
- **Saved answer** (`better-performance`) — what lands in the order when a
  particular choice is picked. Also auto-generated. Only change it if another
  question branches on that exact value.

Neither is shown to the customer.

---

## 10. Where everything lives in the code

| Concern | File |
|---------|------|
| Roles & permissions | `src/lib/roles.ts` |
| Order state machine | `src/lib/orderWorkflow.ts` |
| Quiz step sequencing | `src/lib/sample-quiz/flow.ts` |
| Question model & scopes | `src/models/BriefQuestion.ts` |
| Per-product specs | `src/models/ProductSpecConfig.ts` |
| Feedback | `src/models/OrderFeedback.ts` |
| Status transitions API | `src/app/api/orders/[id]/transition/route.ts` |
| Bulk spec configuration API | `src/app/api/sample-quiz/product-config/bulk/route.ts` |
| Quiz attachments | `src/app/api/upload/quiz/`, `src/app/api/files/quiz/[name]/` |
| Design tokens (light + dark) | `src/app/globals.css` |
| Translations | `src/i18n/` (`t()` by key, `tx()` by English source string) |

---

## 11. Rules the system enforces

1. **Ordering requires an account KCC created.** No guest checkout.
2. **Status changes only through the transition endpoint**, and only by a role
   the workflow allows.
3. **An order cannot ship without a delivery rep assigned.**
4. **Rejections, holds, cancellations and failed QC require a written reason.**
5. **Every status change is recorded** with who, when and why.
6. **Customers see only their own orders.** The factory sees only what has been
   released to it; dispatch only what is ready to ship.
7. **Only a Super Admin can create or edit Admin accounts**, and the last Super
   Admin cannot be demoted or deleted.
8. **Nobody can change their own role.**
9. **Uploads are never served from the public folder** and never render inline.
10. **The customer quiz always reads live configuration** — an admin edit is
    visible on the next page load.

---

*Regenerate the role accounts with `npm run create:users`. Check translation
coverage with `npm run i18n:check`.*
