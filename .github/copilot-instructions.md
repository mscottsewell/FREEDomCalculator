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
- `src/App.tsx` is the shell/router-like layer: it defines calculator metadata (id/name/icon/component), renders tab navigation, and lazy-loads calculators with `Suspense`.
- Each calculator in `src/components/*Calculator.tsx` is a self-contained feature module (inputs, validation, compute logic, explanatory content, and chart/table output) rather than splitting logic into separate service layers.
- Shared calculator plumbing is centralized in:
  - `src/lib/calculator-validation.ts` for `NumericOrEmpty`, numeric guards, and field-name formatting.
  - `src/lib/formatters.ts` for currency/comma parsing/formatting used by text inputs and result display.
  - `src/components/ui/calculate-button.tsx` for the common Calculate CTA.
- Persistence is local-state-first: `src/hooks/useLocalStorage.ts` is used by calculators that should keep inputs between sessions (not all calculators use it).
- Build/deploy is Vite + GitHub Pages:
  - `vite.config.ts` sets `base: '/FREEDomCalculator/'`, `@` alias -> `src`, PWA manifest/workbox config, and writes `dist/.nojekyll` on build.
  - `.github/workflows/deploy.yml` is the active Node build/deploy pipeline uploading `dist` to Pages.

## Key repository conventions
- Use `@/...` imports (configured in `tsconfig.json` + `vite.config.ts`) instead of long relative paths.
- Calculator numeric inputs are modeled as `NumericOrEmpty` to support blank form state; convert with `toNumber()` only at calculation time.
- For currency-like text inputs, use `formatNumberWithCommas()` for display and `parseFormattedNumber()` on change; avoid ad-hoc parsing.
- Validation pattern in calculators: validate first, set a user-facing error string, and return early before calculations.
- Keep calculator UX consistent with existing modules:
  - Input grid -> `CalculateButton` -> error alert/results cards/charts.
  - Include educational explanation/“Key Lesson” cards in the calculator body.
- GitHub Pages assumptions are hardcoded in config (`/FREEDomCalculator/` base/scope/start URL); preserve these when adjusting routing, assets, or PWA config.
