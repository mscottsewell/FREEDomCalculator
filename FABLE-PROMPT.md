# Fable Prompt — FREEDomCalculator: Review + "Paycheck Estimator" Spec

> Paste everything below the line into Fable. It contains two independent tasks.
> Task 1 is **read-only** (review). Task 2 is a **spec-authoring** task (no app code changes).
> Do not modify application source for either task — your only outputs are the two Markdown deliverables described below.

---

## Context you must load first

You are working in the **FREEDomCalculator** repo — a React financial-literacy calculator suite for university students, deployed to GitHub Pages.

Before doing anything, read these files to learn the real conventions (do not assume — verify against the code):

- `.github/copilot-instructions.md` — stated architecture and conventions (note: some claims may be stale; trust the code over the doc and flag mismatches).
- `src/App.tsx` — the app shell and the **calculator registry** (`calculators` array). New tabs are registered here. Note that calculators are **statically imported** (the code comment explains why: WebContainer dynamic-import failures + shared `recharts` dep), even though the instructions file mentions lazy-loading. Preserve the static-import pattern.
- `src/components/AutoLoanCalculator.tsx` — a representative calculator: hero banner, input grid, validation-first flow, `CalculateButton`, results cards, amortization table.
- `src/lib/calculator-validation.ts` — `NumericOrEmpty`, `isValidNumber`, `toNumber`, `validateCalculatorInputs`, `formatFieldName`.
- `src/lib/formatters.ts` — `formatCurrency`, `formatNumberWithCommas`, `parseFormattedNumber`, `formatPercentage`, `parsePercentage` (Intl singletons — never construct `Intl` per call).
- `src/lib/insurance-rates.ts` — the pattern for a **documented, sourced data table** with citations in the header comment. The Paycheck Estimator will need a similar `paycheck-tax-tables.ts`.
- `src/hooks/useLocalStorage.ts` — SSR-safe local persistence hook (replaces GitHub Spark `useKV`), used per-calculator with a unique string key.
- `src/components/ui/calculate-button.tsx` and the other `src/components/ui/*` primitives (Card, Input, Label, Alert, Table, Select, Switch) — always reuse these; do not introduce new UI libraries.
- `package.json`, `vite.config.ts`, `tsconfig.json` — stack: React 19, Vite 6, TypeScript **strict**, Tailwind v4, Radix UI, `recharts`, `@phosphor-icons/react`. Base path is `/FREEDomCalculator/`. No test runner is configured. Commands: `npm run dev`, `npm run build`, `npm run typecheck`, `npm run deploy`.

Key conventions to honor everywhere:
- Use `@/...` path imports, never long relative paths.
- Model numeric inputs as `NumericOrEmpty`; convert with `toNumber()` only at calculation time.
- Currency-like text inputs use `formatNumberWithCommas()` for display + `parseFormattedNumber()` on change.
- Validate first → set a user-facing error string → return early before computing.
- Each calculator is a self-contained module (inputs, validation, compute, results, charts, and an educational "Key Lesson" card). No separate service layer.
- Keep GitHub Pages assumptions intact (`/FREEDomCalculator/` base/scope/start URL).

---

## TASK 1 — Deep code & architecture review (READ-ONLY, NO CHANGES)

Perform a thorough review of the whole app for **security, performance, and stability**. Make **zero code changes**. Produce a single Markdown report at `docs/CODE-REVIEW.md` that a junior developer or a lesser model can execute without further guidance.

Cover at minimum:

1. **Security**
   - `localStorage` usage: untrusted `JSON.parse`, key collisions, schema drift when stored shapes change, quota/exception handling.
   - `dangerouslySetInnerHTML` / SVG injection / any raw HTML rendering.
   - Dependency risk: outdated or unmaintained packages, known-vuln versions, unused deps.
   - GitHub Pages / PWA specifics: service-worker cache poisoning, stale-asset traps, external links missing `rel="noopener noreferrer"`.
   - Client-only app: confirm there are no secrets, tokens, or API keys committed.

2. **Performance**
   - `recharts` bundle weight and whether the static-import-all approach causes an oversized initial bundle; quantify with a build if useful.
   - Unnecessary re-renders, missing memoization on expensive compute/tables, large amortization loops building big arrays in render paths.
   - `Intl` construction, list virtualization needs for long tables, image/SVG asset sizes.

3. **Stability & correctness**
   - Edge cases in financial math (division-by-zero, zero-rate branches, negative/NaN/Infinity, extreme inputs, rounding drift).
   - TypeScript strictness gaps: non-null assertions (`data!`), `any` casts (e.g. in `formatters.ts`), unhandled `undefined` from `useLocalStorage`.
   - Error boundary coverage, consistency of validation patterns across calculators, accessibility (labels, focus, ARIA, contrast).

**Output format for `docs/CODE-REVIEW.md`:**
- Executive summary (health snapshot, top 5 risks).
- A findings table: `ID | Area | Severity (Critical/High/Med/Low) | File:line | Issue | Why it matters`.
- For each finding, a **Recommended change** section written as concrete, hand-off-ready instructions: exact file, what to change, before/after sketch or pseudocode, and acceptance criteria. Keep each actionable by a lesser model.
- A prioritized backlog (quick wins vs. larger refactors).
- Explicitly list any mismatches between `.github/copilot-instructions.md` and the actual code.

Do not implement anything. This task ends when `docs/CODE-REVIEW.md` exists.

---

## TASK 2 — Full spec for a new "Paycheck Estimator" tab (SPEC ONLY, NO APP CODE)

Author a complete, buildable specification at `docs/PAYCHECK-ESTIMATOR-SPEC.md` for a new calculator tab, designed so one or more agents on a **lesser model (e.g. Opus 4.8 or GPT-5.5)** can implement and deploy it end-to-end without ambiguity. Do **not** write the calculator itself — only the spec.

**Audience & purpose:** University students planning for their first job. Given a gross salary (or hourly rate), it estimates **take-home pay** after federal income tax, FICA (Social Security + Medicare), a chosen state's income tax, and optional pre-tax deductions (401(k), health premiums) — plus a plain-English breakdown and a budget-oriented "what this means monthly" view.

**Reference implementations to evaluate and learn from (study features, inputs, disclosures, and especially their cited data sources):**
- https://digitalcalculators.net/paycheck-calculator/ — note its references/sources for tax brackets and rates.
- https://easybudgetplanners.com/paycheck-calculator — note its take-home breakdown and budgeting framing.

In the spec, include a short comparison of these two, and recommend which features fit our student audience and app style (and which to skip to avoid scope creep).

**The spec must define:**

1. **Feature scope & UX**
   - Inputs (as `NumericOrEmpty` where numeric): gross salary or hourly + hours/week, pay frequency (annual/monthly/biweekly/weekly/hourly) via `Select`, filing status, state (`Select`), pre-tax 401(k) %, pre-tax health premium, optional additional withholding.
   - Outputs: gross per period, federal tax, Social Security, Medicare (incl. additional Medicare threshold if in scope — decide and state it), state tax, total deductions, **net take-home** per period and annualized, effective tax rate, and a monthly budget snapshot.
   - Layout must match existing calculators: hero banner → input grid → `CalculateButton` → error `Alert` → results cards → a `recharts` breakdown (e.g. stacked/pie of gross→deductions→net) → an educational **"Key Lesson"** card (e.g. "why your first paycheck is smaller than your salary/12").

2. **Data & math model**
   - Specify a new `src/lib/paycheck-tax-tables.ts` mirroring the `insurance-rates.ts` documentation pattern: a header comment with **explicit, dated SOURCES and citation URLs** for every rate used.
   - Provide the **2026** federal brackets by filing status, standard deduction, Social Security wage base + rate, Medicare rate (+ additional Medicare threshold), and a **state tax model**. Decide the state approach and justify it: full 50-state brackets vs. a curated subset vs. flat-rate approximation with a clear "estimate only" disclaimer. Include the exact numbers or a clearly marked TODO table the implementer fills from cited sources.
   - Give precise formulas (marginal bracket application, FICA caps, pre-tax ordering) with worked numeric examples the implementer can turn into assertions.
   - Include prominent educational disclaimers (estimate only; ignores local taxes, credits, etc.).

3. **Integration steps (exact, ordered)**
   - New file: `src/components/PaycheckCalculator.tsx` (name/convention consistent with siblings).
   - Register in `src/App.tsx`: import, add to the `calculators` array with `id`, `labels.short`/`labels.full`, a Phosphor `icon` (suggest a candidate, e.g. `Money`/`Wallet`), and `component`. Specify where in tab order.
   - `useLocalStorage` key (unique, e.g. `paycheck-calculator`) and default input values.
   - Reuse `calculator-validation`, `formatters`, and `ui/*`; forbid new dependencies.

4. **Acceptance criteria & verification**
   - Concrete test cases with expected take-home values (so the implementer can self-verify by hand since there is no test runner).
   - `npm run typecheck` must pass with strict TS; `npm run build` must succeed; tab renders, persists inputs, handles edge cases (0, blank, very high income above SS cap, hourly conversion).
   - Deployment note: works under the `/FREEDomCalculator/` base with no new config.

5. **Task breakdown for lesser-model agents**
   - Split into independently assignable subtasks (e.g. A: data table + sources; B: component UI + wiring; C: chart + Key Lesson; D: App.tsx registration + verification), each with inputs, outputs, and a done-definition.

**Output format for `docs/PAYCHECK-ESTIMATOR-SPEC.md`:** structured Markdown with the sections above, all numbers or clearly-marked TODOs with source URLs, and copy-paste-ready snippets for the `App.tsx` registry entry and the `paycheck-tax-tables.ts` header/shape. The spec must be complete enough that a junior dev or lesser model needs no further clarification.

Do not implement the feature. This task ends when `docs/PAYCHECK-ESTIMATOR-SPEC.md` exists.

---

## Ground rules for both tasks
- No application source changes. Deliverables are the two `docs/*.md` files only.
- Verify claims against the actual code; cite `file:line`.
- Prefer existing utilities and UI primitives; never add dependencies in the spec without strong justification.
- Keep instructions explicit and sequential — assume the implementer is a lesser model that will not infer missing steps.
