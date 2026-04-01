# Tags Runtime Sanitization

Date: 2026-04-01
AI: CodeX

## Summary

Fixed the `Tags` page runtime failure caused by oversized and unsafe inventory names being passed directly into QR generation. Also cleaned up item rendering so suspicious payload text and mojibake image fallbacks do not surface in the UI.

## Changes

- Added safe tag value generation in `frontend/next-app/app/(dashboard)/tags/page.tsx`
- Added display-name sanitization and fallback labels for suspicious or oversized names
- Updated preview and print tag rendering to use sanitized values
- Updated item list rendering to use safe image URLs with icon fallback instead of broken text

## Verification

- `npx tsc --noEmit`
- `npx next build --webpack`
- Browser check against `/tags` with real DB payloads:
  - `{{mustache}}`
  - long `<script...>` payload

Artifacts were written to `output/playwright/tags-page-check.json` and `output/playwright/tags-page-check.png` but were not committed.
