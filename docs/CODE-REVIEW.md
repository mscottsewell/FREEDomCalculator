# FREEDomCalculator — Code & Architecture Review

**Date:** 2026-07-02
**Scope:** Full application review — security, performance, stability/correctness. Read-only; no code was changed.
**Verified against:** a fresh `npm run build` (passes), `npm audit` (0 vulnerabilities), `npm outdated`, and direct source inspection. All file/line references are from the current `main` branch.

---

## 1. Executive Summary

**Overall health: good.** This is a small, client-only, dependency-light React app with no secrets, no server, no user-generated HTML, and zero known-vulnerable packages. The shared-utility conventions (`NumericOrEmpty`, `formatters.ts` Intl singletons, validate-first flow) are applied consistently. The most significant problems are *product/stability* contradictions (a PWA that un-installs itself), *type-safety erosion* around `useLocalStorage` (`data!` assertions on data that can be corrupted), and a handful of financial-math edge cases that produce `NaN`/`Infinity` or educationally misleading numbers.

### Top 5 risks

1. **The PWA is registered and then immediately destroyed on every load** — `main.tsx` purges all service workers and caches while `vite.config.ts` installs one. Offline support (advertised prominently in `README.md`) does not work, and every fresh session pays an extra full page reload. (Finding ST-1)
2. **`localStorage` data is trusted blindly** — `useLocalStorage` returns whatever `JSON.parse` produces, and calculators dereference it with `data!.field` non-null assertions. A stale or hand-edited stored shape can put strings/null where numbers are expected and crash or silently miscompute. (Findings SEC-1, ST-2)
3. **Compound Interest calculator mixes compounding models** — deposits are always compounded monthly even when "Annually" is selected, so the "Compounding Frequency" control misleads students for its primary use case. (Finding ST-4)
4. **Single 890 kB JS chunk (262 kB gzip)** — everything (React, recharts, all 9 calculators) ships in one file. The static-import decision is documented and should be preserved, but a `manualChunks` vendor split would restore caching granularity without touching import style. (Finding PERF-1)
5. **Silent 600-month truncation and `NaN`/`Infinity` edge cases** in Credit Card, Inflation, and TVM calculators can show wrong numbers with no error. (Findings ST-5, ST-6, ST-7)

### What's already healthy (no action needed)

- `npm audit`: **0 vulnerabilities** (prod and dev). Dependencies are within one minor version of latest except deliberate majors (Vite 6 vs 8, TS 5.9 vs 6 — both fine).
- No secrets, tokens, or API keys anywhere in `src/` (grep for `api[_-]?key|secret|token|password`: no hits).
- No user-controlled HTML: the only `dangerouslySetInnerHTML` is in the unused shadcn `chart.tsx` (see SEC-3).
- `Intl` formatters are module-level singletons ([formatters.ts:3-12](../src/lib/formatters.ts)) — the expensive-construction trap is already avoided and documented.
- Inputs are labeled (`Label htmlFor` pairs with input `id`s), scroll arrows have `aria-label`s, error messages render in `Alert` components.
- Error boundary wraps the whole app ([main.tsx:49-55](../src/main.tsx)).

---

## 2. Findings Table

| ID | Area | Severity | File:line | Issue | Why it matters |
|------|-------------|----------|-----------|-------|----------------|
| ST-1 | Stability/PWA | **High** | [src/main.tsx:21-47](../src/main.tsx) vs [vite.config.ts:12-71](../vite.config.ts) | `purgeServiceWorkers()` unregisters the SW and deletes all caches on every load, while VitePWA (`registerType: 'autoUpdate'`) re-registers it via injected `registerSW.js` | Offline support is dead despite README advertising it; every fresh browser session performs register → purge → forced reload (extra full page load); wasted 1.1 MB precache work on every visit |
| SEC-1 | Security | **Medium** | [src/hooks/useLocalStorage.ts:10-11](../src/hooks/useLocalStorage.ts) | `JSON.parse(item)` result is returned as `T` with no shape validation; schema drift between releases is undetected | Corrupt/stale/hand-edited values flow into calculators typed as numbers; combined with ST-2 this can crash the tab or silently compute garbage |
| ST-2 | Stability/TS | **Medium** | [AutoLoanCalculator.tsx:53-75](../src/components/AutoLoanCalculator.tsx), [CreditCardCalculator.tsx:114-342](../src/components/CreditCardCalculator.tsx), [MortgageCalculator.tsx:70-96](../src/components/MortgageCalculator.tsx), [TimeValueOfMoneyCalculator.tsx:196-466](../src/components/TimeValueOfMoneyCalculator.tsx) | ~35 `data!.` non-null assertions on state that comes from `useLocalStorage`/`useState` | The assertions paper over exactly the case SEC-1 creates; strict TS is being defeated where it matters most |
| ST-4 | Correctness | **Medium** | [CompoundInterestCalculator.tsx:85-108](../src/components/CompoundInterestCalculator.tsx) | Principal growth honors the selected compounding frequency (`n`), but monthly deposits always compound at `r/12` regardless of selection; results/chart never mix models consistently | The calculator's own headline control ("Compounding Frequency") doesn't do what students are told it does when deposits are present — an educational-accuracy bug in an educational app |
| ST-5 | Correctness | **Medium** | [CreditCardCalculator.tsx:126-198](../src/components/CreditCardCalculator.tsx) | Loop caps at 600 months but falls through to `setResults` with no warning; also `minimumPayment` is treated as a **dollar floor** (`Math.max(minimumPayment, interest + 1% of balance)`) while validation messages call it a "percentage" ([line 215-217](../src/components/CreditCardCalculator.tsx)) | A user who genuinely never pays off sees "600 months" presented as a real payoff time; the dollar-vs-percentage confusion misleads both users and future maintainers |
| ST-6 | Correctness | **Medium** | [InflationCalculator.tsx:60-88](../src/components/InflationCalculator.tsx) | `isValidNumber` accepts 0 and negatives: `currentAmount = 0` → `percentageLost = NaN` rendered; `inflationRate = -100` → division by `Math.pow(0, years)` → `Infinity`; negative `years` silently yields an empty chart | NaN/Infinity render directly into the results cards; `validateCalculatorInputs` (which rejects `<= 0`) exists in the shared lib but this calculator rolls its own check with `isValidNumber` only |
| ST-7 | Correctness | **Medium** | [TimeValueOfMoneyCalculator.tsx:117-176](../src/components/TimeValueOfMoneyCalculator.tsx) | Newton-Raphson `solveForRate`/`solveForPeriods` return the last iterate even when convergence failed (`df` near zero → `break` → return garbage); no residual check on exit | For pathological inputs (sign-consistent cash flows, no real root) the calculator confidently displays a wrong rate/period instead of an error |
| PERF-1 | Performance | **Medium** | [vite.config.ts](../vite.config.ts) build output | Single `index-*.js` chunk: **889.6 kB (262.2 kB gzip)**; Vite itself warns at build time | One changed line anywhere invalidates the entire cached bundle for returning users; initial parse cost on low-end devices; fix does **not** require abandoning static imports (see recommendation) |
| PERF-2 | Performance | Low | [CreditCardCalculator.tsx:161-196](../src/components/CreditCardCalculator.tsx), [AutoLoanCalculator.tsx:89+](../src/components/AutoLoanCalculator.tsx), [MortgageCalculator.tsx](../src/components/MortgageCalculator.tsx) | Amortization tables render up to 600 (credit card) / 360+ (mortgage) `TableRow`s with no virtualization or pagination in the monthly view | Noticeable render jank on tablets (the primary classroom device per README's iPad instructions); yearly view mitigates but monthly is one click away |
| PERF-3 | Performance | Low | [RetirementPlanner.tsx:99-108](../src/components/RetirementPlanner.tsx) | Chart loop calls `simulate(y)` (itself O(y·12)) for every year → O(years²) total, plus a second `simulate(elapsed)` per point | Harmless at realistic scale (~24k iterations for 65-year span) but a quadratic pattern worth a comment or single-pass rewrite if anyone extends it |
| SEC-2 | Security | Low | [HP12cCalculator.tsx:35](../src/components/HP12cCalculator.tsx) | `window.open('https://mscottsewell.github.io/HP12c/', '_blank')` without `'noopener'`; iframe on line 44 has no `sandbox` attribute | `window.open` (unlike anchor `target="_blank"`) does **not** default to noopener — the opened page gets `window.opener`. Same-owner destination today, but a compromised or transferred HP12c repo could redirect this app (reverse tabnabbing) |
| SEC-3 | Security | Low | [src/components/ui/chart.tsx:81](../src/components/ui/chart.tsx) | `dangerouslySetInnerHTML` in `ChartStyle` — and the module is **imported by nothing** (grep confirms zero consumers) | Input is developer-authored config today, but it's injectable CSS sitting in the tree; simplest mitigation is deleting the unused file |
| SEC-4 | Security/PWA | Low | [vite.config.ts:51-66](../vite.config.ts) | Runtime `CacheFirst` rule for `fonts.googleapis.com` with `cacheableResponse: { statuses: [0, 200] }`, but the app loads no Google Fonts (no link in `index.html`, none in CSS) | Dead config; caching opaque (status 0) responses for a year is the classic cache-poisoning-adjacent pattern — remove rather than audit |
| ST-3 | Stability/TS | Low | [src/lib/formatters.ts:30](../src/lib/formatters.ts) | `return cleanValue as any` — `parseFormattedNumber` can return the string `'-'` or `'-.'` typed as `NumericOrEmpty` | Type lie; downstream `isValidNumber` happens to reject it and `toNumber` returns 0, so no runtime bug today — but the escape hatch invites one |
| ST-8 | Consistency | Low | [App.tsx:42-52](../src/App.tsx) + component sources | Only 3 of 9 calculators persist inputs (`autoloan-calculator`, `creditcard-calculator`, `mortgage-calculator`); README claims "Your inputs are saved automatically" ([README.md:227](../README.md)) | Inconsistent UX and a false product claim; Retirement/Compound/Inflation/Insurance/TVM lose state on tab close |
| ST-9 | Stability | Low | [src/hooks/useLocalStorage.ts:20-27](../src/hooks/useLocalStorage.ts) | The persist `useEffect` writes the **default value** to storage on first mount (before any user edit), and there is no `storage`-event sync between tabs | First-visit writes are harmless but mask "never used" state; two open tabs of the same calculator silently overwrite each other (last-write-wins per keystroke) |
| ST-10 | Correctness | Low | [CompoundInterestCalculator.tsx:111-112](../src/components/CompoundInterestCalculator.tsx) | `totalInterest = finalAmount - totalDeposits` can be negative at 0% rate + rounding; results card shows it unguarded (chart clamps with `Math.max(0, …)` but results don't) | A student can see "-$0" or small negative interest; trivial fix, visible confusion |
| A11Y-1 | Accessibility | Low | All calculator charts | recharts `ResponsiveContainer` output has no `role="img"`/`aria-label` and no text alternative for the data | Screen-reader users get nothing from the primary visualization; each chart already has an adjacent results card, so a one-line `aria-label` on the wrapper is 90% of the fix |
| A11Y-2 | Accessibility | Low | e.g. [CompoundInterestCalculator.tsx:204-215](../src/components/CompoundInterestCalculator.tsx) and all `type="number"` inputs | Native `type="number"` inputs change value on mouse-wheel scroll while focused | Classic accidental-input-change trap on a page that scrolls; students silently change "Interest Rate" while scrolling the page |
| DEP-1 | Dependencies | Low | [package.json:41](../package.json) | `"path": "^0.12.7"` in devDependencies — this is a userland npm shim of the Node built-in; `vite.config.ts` resolves the real built-in anyway | Unmaintained package (last publish ~2015) sitting in the tree for no reason; also `react-is` and `workbox-window` have zero direct imports in `src/` (transitive needs are declared by their consumers, not by the app) |

---

## 3. Recommended Changes (hand-off-ready)

Each item below is written so a junior developer or a smaller model can execute it without further context. Do them as independent commits in the order listed within each priority band (§4).

### ST-1 — Decide the PWA's fate (pick exactly one option)

**Files:** `src/main.tsx`, `vite.config.ts`, `README.md`

The repo currently does both of these, which cannot coexist:
- `vite.config.ts:12-71` — VitePWA generates `sw.js` + auto-injects `registerSW.js` into `dist/index.html` (verified in a fresh build).
- `src/main.tsx:21-47` — `purgeServiceWorkers()` unregisters every SW, deletes every cache, and forces one reload per browser session.

**Option A — restore the PWA (recommended; README markets it heavily):**
1. In `src/main.tsx`, delete the entire `purgeServiceWorkers` function (lines 11-45) and its call site (line 47). The block comment explains it existed for the WebContainer dev sandbox; VitePWA's `devOptions.enabled: false` already keeps the SW out of `npm run dev`, so the purge is only "protecting" production, where it instead breaks the feature.
2. Rebuild (`npm run build`) and verify `dist/index.html` still contains the `registerSW.js` script tag.
3. Verify with `npm run pwa:preview`: load the page, DevTools → Application → Service Workers shows an **activated, non-purged** worker after reload; toggle offline and confirm the app still loads.

**Option B — remove the PWA entirely:**
1. Delete the `VitePWA(...)` plugin block from `vite.config.ts` and the `vite-plugin-pwa`/`workbox-window` dev deps.
2. Keep `purgeServiceWorkers()` for one release (it cleans up existing installs), then delete it.
3. Rewrite README's "Install as an App"/offline sections.

**Acceptance criteria:** a fresh production visit performs no self-reload (Network tab shows one document load); either offline mode works (A) or nothing registers a SW (B); README matches reality.

### SEC-1 + ST-2 — Validate persisted state once, delete every `data!`

**Files:** `src/hooks/useLocalStorage.ts`, then the three consumers.

1. Extend the hook with an optional validator, defaulting to accept:

```ts
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  validate?: (parsed: unknown) => parsed is T
): [T, Dispatch<SetStateAction<T>>] {
  const getStoredValue = () => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return defaultValue;
      const parsed: unknown = JSON.parse(item);
      if (validate && !validate(parsed)) return defaultValue;  // schema drift → fall back
      return parsed as T;
    } catch { return defaultValue; }
  };
  // ... rest unchanged
```

2. In each consumer, pass a small guard. Example for `AutoLoanCalculator.tsx`:

```ts
const isAutoLoanData = (v: unknown): v is AutoLoanData =>
  typeof v === 'object' && v !== null &&
  ['loanAmount', 'interestRate', 'loanTerm'].every(
    k => { const x = (v as Record<string, unknown>)[k]; return x === '' || typeof x === 'number'; }
  );
```

3. Because the hook now always returns a valid `T`, mechanically replace every `data!.` with `data.` and every `data?.` with `data.` in `AutoLoanCalculator.tsx`, `CreditCardCalculator.tsx`, `MortgageCalculator.tsx`, `TimeValueOfMoneyCalculator.tsx` (TVM uses plain `useState` — its `data!` assertions are already unnecessary and can be dropped with no other change). Also delete the dead `safeCurrent` fallback object at `CreditCardCalculator.tsx:224-230`.

**Acceptance criteria:** `grep -rn 'data!' src/` returns zero hits; `npm run typecheck` passes; manually setting `localStorage['autoloan-calculator'] = '"garbage"'` and reloading shows defaults instead of a crash.

### ST-4 — Make Compound Interest honor the frequency selector

**File:** `src/components/CompoundInterestCalculator.tsx:84-155`

Choose the simpler correct model: when frequency = Annually **and** deposit frequency = monthly, either (a) compound deposits annually using end-of-year lump sums (`12 × additionalDeposit` per year at annual rate), or (b) — simpler and defensible — state in the UI that deposits always compound at the deposit frequency. Recommended: (a), because the control claims to change the math.

Concrete change for (a): in both `calculate()` and the chart loop, replace the deposit branch's hardcoded `r / 12` with a rate/period pair derived from `data.compoundingFrequency`:

```ts
// n = data.compoundingFrequency (1 or 12)
const periodsPerYear = data.depositFrequency === 'monthly' ? 12 : 1
const effPeriodRate = Math.pow(1 + r / n, n / periodsPerYear) - 1  // equivalent rate per deposit period
// then: FV = deposit * ((1+effPeriodRate)^(periodsPerYear*t) - 1) / effPeriodRate  (0-rate branch unchanged)
```

Also clamp the results card: `totalInterest: Math.max(0, finalAmount - totalDeposits)` (fixes ST-10 in the same commit).

**Acceptance criteria (hand-check):** principal 0, deposit $100/mo, 12% annual, 1 year — Monthly compounding → $1,268.25; Annual compounding → $1,268.25 must **change** to the annually-equivalent figure ($1,261.62 with the effective-rate method). Both must equal the deposit sum ($1,200) at 0% rate.

### ST-5 — Credit Card: surface the 600-month cap and fix the minimum-payment naming

**File:** `src/components/CreditCardCalculator.tsx`

1. After the `while` loop (line 177), add: `if (currentBalance > 0.01) { setError('This balance won\'t be paid off within 50 years at this payment. Showing the first 50 years only.'); }` — keep the results but with the warning visible (do **not** early-return; the truncated schedule is still educational).
2. The `minimumPayment` field is a **dollar** floor (used as `Math.max(minimumPayment, interest + 1% of balance)` at line 134-137). Fix the two validation messages at lines 215-217 that call it a "percentage", and check the input's `Label` text renders "Minimum Payment ($)" not "%".

**Acceptance criteria:** balance $5,000, APR 30%, fixed payment $126 → warning appears (interest ≈ $125/mo); the word "percentage" no longer appears in this file except where a true percentage is meant.

### ST-6 — Inflation: reuse the shared validator

**File:** `src/components/InflationCalculator.tsx:42-49`

Replace the local `isValidNumber`-only check with the existing `validateCalculatorInputs` from `@/lib/calculator-validation` (it already rejects `<= 0`) for `currentAmount` and `years`; add one explicit range check `if (toNumber(data.inflationRate) <= -100) return 'Inflation rate must be greater than -100%'` (negative rates are legitimate — deflation — so don't force positive).

**Acceptance criteria:** amount 0 → error, not NaN; rate −100 → error, not Infinity; rate −2 → valid deflation result; existing happy path unchanged.

### ST-7 — TVM: fail loudly when the solver doesn't converge

**File:** `src/components/TimeValueOfMoneyCalculator.tsx:117-176`

In `solveForRate` and `solveForPeriods`, track convergence and return `NaN` on failure instead of the last iterate:

- On loop exit (max iterations reached or `df` underflow `break`), re-evaluate the residual `f`; if `Math.abs(f) > 0.01` return `NaN`.
- The existing caller already guards `if (solvedValue === null || isNaN(solvedValue) || !isFinite(solvedValue))` (verify at the `switch` result handling around line 323) — if it doesn't, add that guard with the error message `'No solution found for these inputs — check your cash-flow signs (money out is negative, money in is positive).'`

**Acceptance criteria:** PV = 1000, PMT = 100, FV = 5000, N = 10 (all positive — no sign change, no root) → error message, not a number. Standard case PV = −5000, PMT = −6000, FV = 1,000,000, solve I/Y over 20 → still returns ≈ 8% region result.

### PERF-1 — Vendor chunk split (keeps static imports)

**File:** `vite.config.ts`

Add to `defineConfig`:

```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        react: ['react', 'react-dom'],
        recharts: ['recharts'],
      },
    },
  },
},
```

This is a pure build-output change — **no `React.lazy`, no dynamic imports**, so the WebContainer constraint documented in `App.tsx:18-21` is untouched. React/recharts (~600 kB of the 890) become long-lived cached chunks; app-code edits only invalidate the small app chunk.

**Acceptance criteria:** `npm run build` emits ≥3 JS chunks; the largest is under 500 kB minified (warning gone or reduced); `npm run pwa:preview` loads and all 9 tabs render.

### SEC-2 — HP-12C embed hardening

**File:** `src/components/HP12cCalculator.tsx`

1. Line 35: `window.open('https://mscottsewell.github.io/HP12c/', '_blank', 'noopener,noreferrer')`.
2. Line 44-50: add `sandbox="allow-scripts allow-same-origin"` to the `<iframe>` (the calculator needs scripts; it does not need popups, top-navigation, or forms).

**Acceptance criteria:** pop-out still opens the calculator; embedded calculator still functions (keys click, display updates); `window.opener` is `null` in the popped-out tab's console.

### SEC-3 / SEC-4 / DEP-1 — Dead-weight removal (one commit)

1. Delete `src/components/ui/chart.tsx` (zero importers — verify first with `grep -rn "ui/chart" src/`).
2. Delete the `runtimeCaching` block for `fonts.googleapis.com` in `vite.config.ts:51-66` (no Google Fonts are loaded).
3. `npm uninstall path` (devDependency shim of a Node built-in). Optionally audit `react-is` and `workbox-window` — neither is imported in `src/`; remove if `npm run build` and `npm run dev` still pass without them.
4. While in `src/assets/images/`: `college-logo.svg` and `FHU_COB.svg` have no importers (`BellTower.svg` is the only one used, in `App.tsx:16`) — delete or consciously keep.

**Acceptance criteria:** `npm run typecheck`, `npm run build`, `npm run dev` all pass; bundle size does not increase.

### ST-3 — Remove the `as any` in `parseFormattedNumber`

**File:** `src/lib/formatters.ts:26-33`

The `'-'`/`'-.'` passthrough exists so users can type a leading minus. Fix the type instead of lying: change the return type to `NumericOrEmpty | '-' | '-.'`, **or** simpler — return `''` for those partials and accept that a lone `-` clears the field (check each text-input consumer's UX before choosing). Either way, delete `as any`.

**Acceptance criteria:** `grep -n "as any" src/lib/formatters.ts` → no hits; typing `-5000` into TVM's Present Value field still works.

### ST-8 — Persistence consistency + honest README

Add `useLocalStorage` (with validators per SEC-1) to the six non-persisting calculators, keys: `retirement-planner`, `compound-calculator`, `inflation-calculator`, `insurance-calculator`, `tvm-calculator` (HP-12C has no inputs to persist). Or, if persistence is deliberately scoped, change README line 227 ("Your inputs are saved automatically") to name the three calculators that persist.

**Acceptance criteria:** every calculator with inputs either persists across a reload or the README no longer claims it does.

### ST-9 — `useLocalStorage` polish (optional, do with SEC-1)

Skip the initial write when the stored value equals the default (track a `hydrated` ref), and add a `storage` event listener to sync across tabs. Low value for a classroom app — acceptable to mark "won't fix" explicitly.

### A11Y-1 / A11Y-2 — Accessibility quick wins

1. On each chart wrapper `div` (e.g. `CompoundInterestCalculator.tsx:313`), add `role="img"` and a computed `aria-label`, e.g. `` aria-label={`Growth chart: ${formatCurrency(results.finalAmount)} after ${data.years} years`} ``.
2. Global fix for wheel-changes-number: in `src/index.css` add nothing — instead add one shared handler in `src/components/ui/input.tsx`: `onWheel={(e) => (e.target as HTMLElement).blur()}` applied when `type === 'number'`.

**Acceptance criteria:** VoiceOver/NVDA announces each chart; scrolling the page with cursor over a focused numeric input no longer changes its value.

---

## 4. Prioritized Backlog

**Quick wins (≤1 hour each, do first):**
1. ST-1 Option A — delete `purgeServiceWorkers` (biggest user-visible payoff per line changed)
2. PERF-1 — `manualChunks` split
3. SEC-2 — `noopener` + iframe `sandbox`
4. SEC-3/SEC-4/DEP-1 — dead-weight deletion commit
5. ST-10 — clamp negative interest display (fold into ST-4 if doing both)
6. ST-6 — Inflation validation
7. ST-5 — credit-card cap warning + label fix

**Medium (half-day):**
8. SEC-1 + ST-2 — validated `useLocalStorage` + purge all `data!` (touch 4 files, mechanical)
9. ST-7 — TVM solver convergence guards
10. A11Y-1/A11Y-2
11. ST-3 — formatter type fix

**Larger / needs a product decision:**
12. ST-4 — compound-frequency math model (needs agreement on model (a) vs (b))
13. ST-8 — persistence rollout to all calculators (or README correction — 5 minutes if you choose honesty over feature)
14. PERF-2 — table pagination/virtualization for monthly amortization views (only if tablet jank is actually reported)

---

## 5. Mismatches: `.github/copilot-instructions.md` vs. actual code

| Claim in copilot-instructions.md | Reality | Action |
|---|---|---|
| "`src/App.tsx` … **lazy-loads calculators with `Suspense`**" (§ High-level architecture) | All 9 calculators are **statically imported** ([App.tsx:18-30](../src/App.tsx)) with a comment explicitly explaining why lazy-loading was removed | Update the doc; this is the exact trap the App.tsx comment warns future contributors about |
| "`.github/workflows/deploy.yml` is the active … pipeline" | The file exists, **and** `package.json` also has a `gh-pages -d dist` deploy script — two deploy paths | Doc should state which is canonical (the workflow) and that `npm run deploy` is the manual fallback, or the script should be removed |
| "Persistence is local-state-first: `useLocalStorage` … used by calculators that should keep inputs (not all calculators use it)" | Technically true, but "should" is doing heavy lifting: only 3 of 9 use it, and the README contradicts both (see ST-8) | Align doc + README + code (pick per ST-8) |
| README (not copilot-instructions, but same class of drift): "State Management: React hooks with **GitHub Spark KV store**" ([README.md:138](../README.md)) | Spark's `useKV` was replaced by `useLocalStorage` (the hook's own docstring says so) | Update README |
| README: "six comprehensive financial calculators" ([README.md:74](../README.md)) | There are **nine** tabs (Retirement, Compound, Inflation, Insurance, TVM, Credit Card, Auto Loan, Mortgage, HP-12C) | Update README |
| README: "Offline Access … even without internet connection" | Broken by ST-1 until resolved | Resolve ST-1 first, then doc |

---

*End of review. No application source was modified. All build artifacts referenced (bundle sizes, dist/index.html contents) come from `npm run build` executed on 2026-07-02.*
