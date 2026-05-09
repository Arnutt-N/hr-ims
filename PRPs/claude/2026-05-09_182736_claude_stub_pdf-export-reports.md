# PRP STUB: PDF Export for Maintenance Reports

**Metadata**
- Agent: Claude (Opus 4.7)
- Timestamp: 2026-05-09 18:27:36 +07:00
- Status: **STUB — full plan TBD; user requested deferral from main maintenance PRP v4**
- Depends on: main Maintenance Workflow PRP v4 dashboard pages (`/reports/maintenance` or `/maintenance/dashboard`) shipped first
- Estimated start: after main PRP Phase 3+4 land

---

## Premise

Main PRP v4 ships dashboards with charts (StatusPieChart, SeverityBarChart, CostByDepartmentChart, TechnicianProductivityTable, etc.). Owner asked: "Export PDF report" — let users download a printable summary suitable for management review or audit.

This is **not** the same as v4's `/maintenance/[id]/print` (single work order print). PDF export here = aggregate report covering N requests over a date range, formatted for non-tech stakeholders.

## Why this is its own PRP, not part of main

- **Library decision required:** PDF in Node.js / Next.js has 5+ viable approaches:
  - `@react-pdf/renderer` — render React tree to PDF (good DX, large bundle)
  - `pdfkit` — imperative API (small, mature, fiddly layout)
  - `puppeteer` / `playwright` — render HTML to PDF via headless browser (best layout fidelity, heavy infrastructure)
  - `jspdf` — client-side (browser-only, limited charts)
  - `html-pdf-node` — wraps Chromium (similar to puppeteer)
  Each has trade-offs in bundle size, output quality, deployment complexity. Decision needs design review.
- **Template design is its own deliverable:** cover page, table of contents, charts as images, tabular sections, footer with generation timestamp + filters applied — this is a documentation artifact, not a feature spike.
- **Localization considerations:** Thai font embedding (Noto Sans Thai already used in repo) — must be embedded in PDF, not relied on system fonts.

## Sketch of scope (refine when starting)

**Server Actions:**
- `exportMaintenanceReport(filters)` — runs same `getMaintenanceStats` logic, then renders to PDF
  - Returns: `Buffer` or temporary URL (UploadThing? Local fs?)
  - Auth: admin/superadmin/auditor

**UI:**
- "Export PDF" button on `/reports/maintenance`
- Loading state during generation (server-side render takes 2-5s)
- Download triggered by `<a href={result.url} download>` or fetch+blob

**Library:**
- Likely `@react-pdf/renderer` for design consistency with React stack
- Reuse chart data (not the visual charts — re-render as static SVG/PNG)

**Tests:**
- Vitest snapshot the PDF byte-output for known fixture data (deterministic byte hashing)
- Manual test: download a generated PDF and visually inspect

## Open questions

1. **Library:** `@react-pdf/renderer` or `puppeteer`? (Affects deploy complexity — puppeteer needs Chromium installed)
2. **Storage:** generate on-demand (in memory, return Buffer) or queue + email link (BullMQ)?
3. **Chart rendering:** render same Recharts components in PDF or pre-render to PNG via canvas/sharp?
4. **Localization:** Thai labels required — confirm font embedding works with chosen library
5. **Authorization:** include filter params in PDF metadata for audit trail?

## Resume checklist

- [ ] Main PRP v4 dashboards shipped + stable
- [ ] User confirms which library to use (after spike if needed)
- [ ] Decide 5 open questions above
- [ ] Write full PRP following the v4 template
