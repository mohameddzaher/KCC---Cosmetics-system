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

### Decision needed from you

**P1-06, the lint backlog.** The build and the tests do not depend on lint, so
this does not block the rest of the brief. Two ways forward:

1. **Fix it all.** Type the 272 `any`s properly and rewrite the 18 effects.
   This is about a day of mechanical work and touches most API routes and the
   quiz, so it is a risk in itself.
2. **Fix what matters only (recommended).** Fix the effects and the
   memoization (real React 19 issues) during Phases 2 and 3, where those files
   are touched anyway. Keep `no-explicit-any` as a warning instead of an error,
   so `npm run lint` passes and new code is still flagged.
