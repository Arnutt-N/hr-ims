# Lighthouse Baseline — DEFERRED

**Status**: not run.

## Reason

Lighthouse requires a headless Chrome binary and a running production build of the Next.js app on a reachable URL. In this sandbox:

- No Chrome / Chromium binary installed (`which chromium`, `which google-chrome` → not found).
- No production build present at `frontend/next-app/.next/`.
- No public URL routable to the dev server.

## Targets (per the PRP)

When run during Phase F, Lighthouse should be invoked against these routes:

- `/login`
- `/dashboard`
- `/inventory`
- `/requests`

## Budgets (Phase F enforcement)

- Performance ≥ 80
- Accessibility ≥ 95
- Best Practices ≥ 90

## To unblock

```bash
npm install -g @lhci/cli
cd frontend/next-app && npm run build && npm run start &
sleep 5
lhci autorun --upload.target=filesystem --upload.outputDir=./lhci-report
```

Or use the `treosh/lighthouse-ci-action` GitHub Action in `ci.yml` (Phase F adds this).
