# PR Review: #6 — feat: unified page loader for consistent navigation UX

**Reviewed**: 2026-04-13
**Author**: Arnutt-N
**Branch**: feat/unified-page-loader → main
**Decision**: APPROVE (with minor comments)

## Summary

Solid UX improvement. Introduces a single `PageLoader` component and adds Next.js App Router `loading.tsx` Suspense fallbacks to 13 dashboard segments, replacing 9 inconsistent inline loaders. Accessibility, reduced-motion, and animation choices are all well-handled. Two small consistency nits and one pre-existing semantic issue worth flagging.

## Findings

### CRITICAL
None.

### HIGH
None.

### MEDIUM

**1. Hardcoded English label breaks the "unified" promise**
`frontend/next-app/app/(dashboard)/history/page.tsx:65`
```tsx
if (loading) return <PageLoader label="Loading history..." />;
```
Every other converted page uses `t('common.loading')`. History still ships a hardcoded English string that bypasses i18n. Given the PR's stated goal of unifying loading text, this should be `t('common.loading')` to match cart/dashboard/maintenance/my-assets/reports/users.

**2. `dashboard/page.tsx` renders a "Loading..." on what is actually a null/error state**
`frontend/next-app/app/(dashboard)/dashboard/page.tsx:18`
```tsx
const stats = await getDashboardStats();
if (!stats) return <PageLoader label={t('common.loading')} />;
```
`DashboardPage` is an `async` Server Component — by the time render reaches line 18, `stats` has already resolved. A null value here means "fetch failed / empty", not "still loading". This is pre-existing behavior (the old code also said "Loading..."), so it's not a regression, but the new visual spinner makes the misleading state more prominent. Consider an empty-state / error fallback instead.

### LOW

**3. Inconsistent label usage**
`settings/page.tsx:94` and `tags/page.tsx:348` call `<PageLoader />` with no label, while other converted pages pass `t('common.loading')`. Pick one convention — either always pass the i18n label or always omit it (letting the `sr-only` fallback carry a11y).

**4. PR description vs. code: `min-h`**
PR body says "`min-h-[50vh]`", code uses `min-h-[60vh]` at `components/ui/page-loader.tsx:27`. Harmless but a documentation drift.

**5. Client-boundary cost for the Suspense fallback**
`loading.tsx` files re-export the `'use client'` `PageLoader`. This means the Next.js Suspense fallback ships framer-motion's client runtime into every dashboard route's loading state. A pure-CSS spinner would stream entirely from the server with zero JS. Acceptable trade-off given animation quality, but worth knowing — if bundle budget becomes a concern later, split `PageLoader` into a static server-safe variant for `loading.tsx` and keep the motion version for in-page `if (loading)` branches.

**6. `reports/page.tsx` keeps the old inline div for the empty-state branch**
`reports/page.tsx:67`:
```tsx
if (!stats) return <div className="p-8 text-center text-slate-500">No data available</div>;
```
Not a loader issue, but shows the page still has two UX patterns for non-happy-path rendering. Out of scope for this PR.

## Validation Results

| Check | Result |
|---|---|
| Type check (`tsc --noEmit`) | **Pass** (exit 0) |
| Lint | Skipped |
| Tests | Skipped (PR body asserts 3/3 pass) |
| Build | Skipped |

## Files Reviewed

**Added (14):**
- `components/ui/page-loader.tsx`
- `app/(dashboard)/{cart,dashboard,history,inventory,maintenance,my-assets,reports,requests,scanner,settings,tags,users,warehouse}/loading.tsx`

**Modified (9):**
- `app/(dashboard)/{cart,dashboard,history,maintenance,my-assets,reports,settings,tags,users}/page.tsx`

## Recommendation

APPROVE. The two medium findings are small polish items. Suggest fixing #1 (swap the hardcoded string for `t('common.loading')`) in a follow-up commit on this branch before merge, since it directly undermines the PR's own "unified" goal. Everything else can ship or be addressed later.
