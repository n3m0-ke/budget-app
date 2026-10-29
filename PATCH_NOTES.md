# Priority-fix patch notes

## Implemented in this patch

- Centralized transaction category accounting rules and added automated unit tests for ordinary expense, Savings, Chama Contribution, Money Lost, and Money Recovered.
- Replaced direct transaction writes in the dashboard and Transactions page with a single Firestore transaction that validates the budget is open and atomically creates the transaction plus any required ledger movement.
- Added per-user balance documents initialized from existing ledger entries, and transaction-based withdrawals/allocations that check current balance and update paired ledger entries atomically.
- Added stable operation IDs and duplicate-operation checks for transactions, withdrawals, Chama allocations, and budget closure.
- Made budget creation plus its opening unallocated-funds deposit atomic.
- Unified budget closure from Monthly Analysis and Monthly Summary; it marks the budget closed and records a deterministic remaining-funds transfer in one Firestore transaction.
- Added Firebase auth initialization loading state and an app-wide authenticated layout gate; sign-up now routes to `/` after auth state is confirmed.
- Standardized newly written business dates on `dateOfTransaction` and changed transaction ordering to use that field.
- Removed the unused `/api/dashboard/summary` endpoint rather than leave an unauthenticated userId-query API in place.
- Added owner-scoped Firestore rules with default deny, plus manual auth/security smoke-test instructions.
- Added an explicit, confirmed repair action for historical Chama ledger entries linked to existing non-Chama-Contribution transactions.
- Removed the supplied `.env` and `firebase-debug.log` from this patched archive; use `.env.example` to create a local `.env.local`.

## Verification status

- `node --test tests/*.test.mjs`: passed (5 tests).
- A Next.js production build and full TypeScript check could not be completed in this environment because project dependencies were not installed and package installation timed out. Run `npm ci`, `npm test`, and `npm run build` locally before deployment.
- The Firebase security rules and end-to-end auth/balance workflows still require staging-project verification. Follow `tests/SECURITY_AND_AUTH_SMOKE_TESTS.md`.

## Important before using the updated app

1. Copy `.env.example` to `.env.local` and fill in the Firebase web configuration.
2. Review and deploy `firestore.rules` to the intended Firebase project.
3. In the Chamas section, run **Repair legacy Chama entries** once after reviewing its confirmation. This addresses the historical entries created by the previous unconditional ledger write.
4. Run the manual security and financial workflow smoke tests against staging before production use.
