# IDOR review and isolated live verification

Date: 2026-11-13 20:14 ICT. Tested local `main` at `a6c28d5`.

## Findings

1. **Critical, reproduced end to end.** The Next.js proxy copies incoming identity headers and injects the internal key even for an anonymous request (`frontend/next-app/proxy.ts:20`). The backend trusts the resulting headers (`backend/src/middleware/auth.ts:57`), and the fallback rewrite connects them (`frontend/next-app/next.config.mjs:30`). With a synthetic SQLite database and loopback-only servers, Playwright Chromium reached `/api/stock-levels/2/1`: anonymous returned 401; an anonymous request carrying forged identity and admin role headers returned 200 and the synthetic stock value. This verifies the local checkout, not deployment. PR #26 exists and is open; its current head was not reviewed in this run. A separate local hardening worktree also exists and was not modified.
2. **Warehouse stock disclosure, reproduced.** A synthetic user with no warehouse assignment obtained the available quantity of another warehouse by submitting an oversized transfer request. `backend/src/routes/stock-transfers.ts:115` checks authentication but not source warehouse access and returns `available` at line 142. This issue predates PR #31 according to the backend review. Authorization policy for creating transfers should be confirmed.
3. **Security suite reports a false Jest pass.** `backend/src/tests/security/authz/idor.test.ts` has no Jest assertions. The helper records failures but does not fail the test. The isolated run reported 13 Jest passes while its own summary recorded 10 passes and 3 failures. All three failing cases used obsolete routes or methods and returned 404: inventory PUT, request approval POST, and stock adjustment POST. Other cases also treat missing routes as protection. This suite cannot establish IDOR closure.
4. **Request list crosses users, reproduced.** A synthetic ordinary user received only their own requests, while a synthetic technician received requests belonging to other users. `backend/src/controllers/requestController.ts:50` only applies owner filtering when the primary role is `user`. Determine the intended visibility for each role before changing behavior.
5. **Null-warehouse request transition, reproduced.** A synthetic approver assigned to warehouse 1 received 404 when attempting to reject a request assigned to warehouse 2, but received 200 and changed the status of an unrelated user's request with `warehouseId=null` and no request items. See `backend/src/routes/requests.ts:30`. Confirm whether the policy intentionally permits this case.
6. **Former asset holder can check in a returned item, reproduced.** A synthetic user whose approved borrow had `returnedAt` set could call `checkInAsset` after the item was assigned to another holder. An unrelated item with no borrow history was rejected. The test invoked the unchanged Server Action through a test-only route in the isolated frontend copy, after establishing a synthetic NextAuth session. The action returned success and the synthetic database contained a new check history row. See `frontend/next-app/lib/actions/assets.ts:65`.

## Additional source review, not live verified

- `frontend/next-app/lib/actions/requests.ts:47` has no apparent transition guard before processing an approved return, so repeated approvals may increase stock again. Verify the full workflow before remediation.
- `frontend/next-app/lib/actions/inventory.ts:47` returns all `stockLevels` to authenticated callers. Whether that is allowed depends on the unresolved V20/catalog policy.
- Routes changed from JWT authentication to internal-header authentication may affect direct Express API consumers; verify the intended external API contract.

## Verification

- Backend and frontend used an isolated SQLite database with synthetic records and loopback ports 43191 and 43192. The frontend source was archived from the current commit; dependencies were read from the existing `halfbeak` worktree. Its Next.js version 16.2.5 matches this checkout's lockfile. Environment variables were restricted to test values.
- Browser end-to-end check: anonymous 401, forged headers 200. The security assertion intentionally failed. A separate Node HTTP check reproduced the same result.
- Real stock-level controls: anonymous 401, assigned approver 200, unassigned warehouse 404, admin 200, ordinary user 404. Transfer stock disclosure returned 400 with the synthetic available quantity.
- Request controls: the ordinary user's list was limited to their own fixture; the technician's list included other users' fixtures. A synthetic approver's reject action returned 404 for another warehouse and 200 for a null-warehouse request. No email or Telegram credentials were configured in the isolated process.
- Holder control: a Playwright-created synthetic session invoked the action through a test-only route in the copied frontend. An unrelated item was denied, but an item returned by that user and now held by someone else was accepted. The synthetic database confirmed one new history row, the different current holder, and the completed return marker. This route is not part of the application checkout.
- `idor.test.ts`: Jest 13/13 passes but internal summary 10/13 passes, 3/13 failures. A temporary Jest config disabled type diagnostics because this checkout lacks installed backend dependencies; test source was not modified.
- `npm ci` for backend failed because npm's existing `allow-remote=none` setting blocks a remote tarball. Frontend install initially failed on peer dependencies; a CI-compatible retry was stopped while preparing the isolated run. No npm policy or lockfile was changed. Failed installation left partial ignored `node_modules` directories in this checkout.

## Follow-up

- Review and validate the existing proxy fix against current main; do not overwrite the separate worktree. Treat the locally reproduced exposure as unresolved until the fix is integrated and verified.
- At 20:54 ICT, PR #26 was open and draft at `ddde6d11`; the displayed CI results were from 2026-11-10 and its mergeability was unknown. No review of that head was performed in this run.
- Repair the IDOR suite to assert security outcomes, use current routes, require positive controls, and run against isolated fixtures.
- Investigate the other source findings and resolve V20/V21 policy with the owner.
