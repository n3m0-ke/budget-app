This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

## Financial-integrity fixes and tests

- Run the pure accounting-rule tests with `npm test` (or `npm run test:finance`).
- `dateOfTransaction` is the canonical business date. `createdAt` is metadata and must not be used to group spending by day/month.
- Transaction category effects are centralized in `lib/financeRules.js`: `Savings` adds one savings deposit; `Chama Contribution` adds one contribution to the unallocated Chama pool; ordinary expenses, `Money Lost`, and `Money Recovered` do not automatically move money into savings or Chama ledgers.
- Critical multi-document operations use Firestore transactions and stable operation IDs. The `account_balances` documents are initialized from the existing ledger the first time a protected operation needs a balance. All future writes to these balances must continue to go through the operations in `lib/financeOperations.ts`.
- Budget creation/opening funds and budget closure/remaining-funds transfer are atomic. Both budget screens use the same close operation.
- Before making new Chama allocations after deploying this patch, use **Repair legacy Chama entries** in the Chamas section once. It removes only old `source: transaction` ledger entries linked to an existing transaction whose category is not `Chama Contribution`, then recalculates the unallocated Chama balance. Review the confirmation carefully; unlinked historical entries are intentionally left untouched.
- `firestore.rules` limits all `/users/{uid}/...` access to the authenticated user whose UID matches `{uid}` and denies other paths by default. Review and deploy these rules to the intended Firebase project before using the updated app.
- The unused, unauthenticated `/api/dashboard/summary` endpoint was removed. If a custom server API is added later, verify its Firebase ID token server-side (Firebase Admin `verifyIdToken`) and derive the user UID from the verified token rather than accepting a query-string UID.
- Follow `tests/SECURITY_AND_AUTH_SMOKE_TESTS.md` for manual auth, cross-account access, and financial workflow checks. These integration checks still need to be run against a staging Firebase project.
- Copy `.env.example` to `.env.local` and fill in the Firebase web app configuration before running locally. Do not commit `.env.local` or service credentials.

Legacy `lib/migrateSavings.ts`, `lib/migrateUnallocated.ts`, and `lib/migrateChama.ts` are one-off scripts from the original project. Do not rerun them after `account_balances` documents have been initialized without reviewing their idempotency and balance updates first.
