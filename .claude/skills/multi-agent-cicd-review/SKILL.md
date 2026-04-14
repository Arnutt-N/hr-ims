---
name: multi-agent-cicd-review
description: Orchestrate parallel multi-agent review of the HR-IMS codebase and GitHub Actions CI/CD pipelines. Dispatches specialized reviewers (security, quality, CI/CD, schema, performance) in parallel and consolidates findings into one actionable report.
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["review codebase", "review ci", "review cicd", "multi-agent review", "audit pipeline", "review pr", "pre-merge review"]
  file_patterns: [".github/workflows/*.yml", "frontend/next-app/**/*.ts", "backend/**/*.ts", "backend/prisma/schema.prisma"]
  context: code review, CI/CD audit, pre-merge checks, release readiness
mcp_servers:
  - github
personas:
  - reviewer
  - security
  - architect
---

# Multi-Agent CI/CD & Codebase Review

## Core Role

Coordinate a fan-out review of HR-IMS across **five parallel specialist agents**, then fan-in their findings into a single prioritized report. Each agent owns one dimension and does NOT overlap with the others — this keeps the main context window clean and maximizes coverage.

Use this skill when the user asks for:
- Pre-merge / pre-release code review
- CI/CD pipeline audit
- "Review the whole codebase"
- PR readiness check across multiple concerns

---

## HR-IMS CI/CD Surface Area

Know the pipeline before reviewing it:

| Workflow | Path | Triggers | Jobs |
|---|---|---|---|
| CI | `.github/workflows/ci.yml` | `pull_request` / `push` to `main`, manual | `frontend`, `backend`, `vercel-build`, `tidb-schema` |
| Security E2E | `.github/workflows/security-e2e.yml` | `workflow_dispatch` (nightly cron commented out) | `security` (OWASP E2E with live backend + Redis) |

**Shared conventions** — flag deviations:
- Node 24, `actions/checkout@v6`, `actions/setup-node@v6`
- Concurrency groups with `cancel-in-progress: true`
- Dual Prisma strategy: SQLite source schema → MySQL-flavored TiDB via `backend/scripts/prepare-tidb-prisma.js`
- Frontend uses `npm ci --legacy-peer-deps` (React 19 peer ranges); backend uses plain `npm ci`
- Vercel parity job reads `frontend/next-app/vercel.json` for install/build/output

---

## Review Dimensions (the five agents)

Each runs in a **single parallel `Agent` batch**. Keep prompts self-contained — subagents don't share context.

### 1. `cicd-reviewer` — GitHub Actions pipeline
- Action versions pinned & current (`checkout@v6`, `setup-node@v6`, `upload-artifact@v4`)
- Secrets never echoed; `GITHUB_TOKEN` permissions least-privilege
- Concurrency + `cancel-in-progress` on every workflow
- Cache keys include lockfiles; `cache-dependency-path` correct
- Node/Prisma env vars sane (no real DB URLs, only dummies)
- Matrix coverage gaps (does `vercel-build` still mirror `vercel.json`?)
- Service containers healthy (Redis for `security-e2e`)
- `continue-on-error` / `if: always()` used intentionally, not as crutches

### 2. `security-reviewer` — OWASP + auth surface
- Delegates to the repo's `security-scanner` skill patterns
- Server Actions in `frontend/next-app/lib/actions/*` check `session` + role
- Multi-role check queries `userRoles`, not only `session.user.role`
- Zod validation on every `formData` entrypoint
- Bcrypt cost factor ≥ 10 in password hashing paths
- No `$queryRawUnsafe`, no string-concat queries
- `tokenVersion` invalidation respected in JWT callbacks
- `INTERNAL_API_KEY` bypass path (`backend/src/middleware/auth.ts`) is gated by `NODE_ENV !== 'production'`

### 3. `schema-reviewer` — Prisma & migrations
- `backend/prisma/schema.prisma` is the single source of truth
- No schema drift vs. migrations; `prisma migrate status` would be clean
- TiDB transform (`prepare-tidb-prisma.js`) covers any new SQLite-only syntax
- `AuditLog` FKs, indexes on hot query paths (`userId`, `createdAt`, `tableName`)
- Generators for both `client` and `client_frontend` present

### 4. `quality-reviewer` — code quality & architecture
- Server Actions follow the `auth → authorize → validate → mutate → audit → revalidate` pattern
- `revalidatePath()` called after mutations
- No business logic duplicated in Express routes that Server Actions already own
- TypeScript: no `any`, no unsafe casts around Prisma types
- Tests exist for new Server Actions (`frontend/next-app/tests/` with Vitest)
- Audit-log entries for every CUD in `AuditLog` table

### 5. `perf-reviewer` — performance & N+1
- N+1 queries in Prisma (`include` vs. separate `findMany` loops)
- Missing `select` where full records aren't needed
- Unbatched `Promise.all` opportunities
- Next.js: `dynamic = 'force-dynamic'` used only where required
- Bundle bloat: client components that should be server components

---

## Orchestration Protocol

### Step 1 — Scope detection

Before dispatching agents, determine scope:
1. **PR-scoped**: read the PR diff via `mcp__github__pull_request_read` + `mcp__github__get_commit`. Pass only changed paths to each agent.
2. **Branch-scoped**: `git diff main...HEAD --name-only` — feed path list to agents.
3. **Full repo**: no filter; each agent surveys its own dimension end-to-end.

Ask the user once if ambiguous. Default: branch-scoped if on a non-`main` branch.

### Step 2 — Fan out (single message, five `Agent` calls)

Dispatch all five in **one assistant turn** so they run concurrently. Use `subagent_type: "Explore"` for read-only reviewers (they don't write code).

Skeleton prompt each agent receives:
```
You are the <dimension> reviewer for HR-IMS.

Scope: <PR #N diff | branch claude/... | full repo>
Changed files: <list or "all">

Responsibilities (ONLY these — do not stray):
  <bulleted list from the dimension section above>

HR-IMS context you need:
  - Monorepo: frontend/next-app + backend, shared Prisma schema at backend/prisma/schema.prisma
  - Server Actions in frontend/next-app/lib/actions/* are the main mutation surface
  - CI workflows: .github/workflows/{ci,security-e2e}.yml
  - <any extra context the dimension needs>

Return a report in EXACTLY this shape (max 400 words):
  ## <dimension> findings
  ### Blockers (must fix before merge)
  - path:line — problem — suggested fix
  ### Warnings (should fix)
  - ...
  ### Nits (optional)
  - ...
  ### Verdict: PASS | PASS-WITH-WARNINGS | BLOCK
```

### Step 3 — Fan in

After all five return, the orchestrator (you) produces the consolidated report below. Do **not** re-investigate — trust each specialist in its lane. If two agents surface the same file, merge into one entry tagged with both dimensions.

---

## Consolidated Report Format

```markdown
# Multi-Agent Review — <scope>

**Scope:** <PR | branch | repo>   **Commits reviewed:** <range>
**Agents:** cicd ✅ | security ✅ | schema ✅ | quality ✅ | perf ✅

## Overall verdict: PASS | PASS-WITH-WARNINGS | BLOCK

## Blockers (N)
| # | File:Line | Dimension(s) | Problem | Fix |
|---|-----------|--------------|---------|-----|
| 1 | ... | security, quality | ... | ... |

## Warnings (N)
<same table>

## Nits (N)
<bulleted, one line each>

## Dimension verdicts
- CI/CD: <verdict> — <one-line summary>
- Security: <verdict> — ...
- Schema: <verdict> — ...
- Quality: <verdict> — ...
- Performance: <verdict> — ...

## Suggested next actions
1. ...
2. ...
```

---

## When to use vs. skip

**Use** when:
- User says "review", "audit", "pre-merge check", "PR ready?"
- Diff touches ≥ 3 of: workflows, Server Actions, Prisma schema, auth, package.json
- Before tagging a release

**Skip** (single-agent is enough) when:
- Single file / single-concern change (e.g. copy tweak, CSS-only)
- User already specified which dimension they care about ("just check security")
- Scope is so small the orchestration overhead costs more than it saves

---

## Integration with other skills

This skill is an **orchestrator**, not a reimplementer. Each dimension agent is told to apply patterns from:
- `security-scanner` — OWASP checks
- `prisma-helper` — schema and query review
- `rbac-guard` — authorization review
- `audit-logger` — audit-log coverage
- `test-generator` — test coverage gaps
- `query-optimizer` / `performance-monitor` — perf dimension
- `error-handler` — error-handling consistency

Reference them by name in the subagent prompt; do not copy their contents inline.

---

## Handoff

After producing the consolidated report, create a handoff log at
`project-log-md/handoff/logs/YYYY-MM-DD_HHmm_claude_code_to_any.md`
per the project's AI Collaboration Protocol (CLAUDE.md). Summarize:
- Scope reviewed
- Blockers remaining
- Which dimension agents found each issue

---

*Version: 1.0.0 | For HR-IMS Project*
