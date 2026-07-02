# Copilot Instructions for FREEDomCalculator

## Build, test, and lint/type-check commands
- Install deps: `npm install`
- Dev server: `npm run dev`
- Production build: `npm run build`
- Type-check (strict TS): `npm run typecheck`
- PWA production build + preview: `npm run pwa:build` then `npm run pwa:preview`
- Deploy to GitHub Pages branch: `npm run deploy` (runs `predeploy` -> `npm run build`)

### Testing status
- There is currently no automated test runner configured (`package.json` has no `test` script and no `*.test.*`/`*.spec.*` files).

## High-level architecture
- `src/main.tsx` is the app bootstrap: React `StrictMode` + `react-error-boundary` around `<App />`, with shared CSS imports.
- `src/App.tsx` is the shell/router-like layer: it defines calculator metadata (id/labels/icon/component), renders tab navigation, and **statically imports** every calculator. Lazy-loading via `React.lazy()`/`Suspense` was intentionally removed — dynamic imports fail in the WebContainer dev sandbox ("Failed to fetch dynamically imported module"), and the calculators share `recharts` (loaded once regardless), so code-splitting buys little. Keep the static-import pattern.
- Each calculator in `src/components/*Calculator.tsx` is a self-contained feature module (inputs, validation, compute logic, explanatory content, and chart/table output) rather than splitting logic into separate service layers.
- Shared calculator plumbing is centralized in:
  - `src/lib/calculator-validation.ts` for `NumericOrEmpty`, numeric guards, and field-name formatting.
  - `src/lib/formatters.ts` for currency/comma parsing/formatting used by text inputs and result display.
  - `src/components/ui/calculate-button.tsx` for the common Calculate CTA.
- Persistence is local-state-first: `src/hooks/useLocalStorage.ts` backs every calculator with inputs (each uses a unique key and an optional shape-guard validator; HP-12C has no inputs to persist).
- Build/deploy is Vite + GitHub Pages:
  - `vite.config.ts` sets `base: '/FREEDomCalculator/'`, `@` alias -> `src`, PWA manifest/workbox config, and writes `dist/.nojekyll` on build.
  - `.github/workflows/deploy.yml` is the canonical Node build/deploy pipeline uploading `dist` to Pages. `npm run deploy` (`gh-pages -d dist`) is a manual fallback for publishing from a local build.

## Key repository conventions
- Use `@/...` imports (configured in `tsconfig.json` + `vite.config.ts`) instead of long relative paths.
- Calculator numeric inputs are modeled as `NumericOrEmpty` to support blank form state; convert with `toNumber()` only at calculation time.
- For currency-like text inputs, use `formatNumberWithCommas()` for display and `parseFormattedNumber()` on change; avoid ad-hoc parsing.
- Validation pattern in calculators: validate first, set a user-facing error string, and return early before calculations.
- Keep calculator UX consistent with existing modules:
  - Input grid -> `CalculateButton` -> error alert/results cards/charts.
  - Include educational explanation/“Key Lesson” cards in the calculator body.
- GitHub Pages assumptions are hardcoded in config (`/FREEDomCalculator/` base/scope/start URL); preserve these when adjusting routing, assets, or PWA config.
