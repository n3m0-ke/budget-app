# Security and authentication smoke tests

These are staging/manual integration checks. The source archive did not include a configured Firebase Emulator test harness or browser automation dependency, so these must be run against a staging Firebase project before deployment.

## Login, sign-up, and logout

1. Start the app with `npm run dev` and open `http://localhost:3000/signup`.
2. Create a unique test account. Expected: the account is created and the app redirects to `/`.
3. Refresh `/`. Expected: the authenticated session is restored; protected content does not flash the login redirect while Firebase is initializing.
4. Use **Sign Out** in the top-right menu. Expected: the app signs out and navigates to `/login`.
5. Open `/transactions` while signed out. Expected: the app redirects to `/login` and does not render transaction data.
6. Log in at `/login` with the test account. Expected: the app returns to `/`.
7. Attempt login with an incorrect password. Expected: an error is shown and no protected page is opened.

## Cross-account Firestore authorization

Run this only in a staging Firebase project. Deploy `firestore.rules` to that project before testing. Do not experiment against production data.

1. Create two test accounts, A and B, and record their Firebase UIDs.
2. With account A authenticated, create and read a test document at `/users/{A_UID}/transactions/rules-test`. Expected: allowed.
3. While authenticated as A, attempt to read `/users/{B_UID}/transactions/rules-test`. Expected: denied by Firestore security rules.
4. While authenticated as A, attempt to create, update, or delete `/users/{B_UID}/transactions/rules-test`. Expected: each write is denied.
5. Repeat with A and B reversed. Expected: the same isolation.
6. Attempt to read/write a path outside `/users/{your UID}/...`. Expected: denied by the default-deny rule.

Deploy rules only after reviewing the target project:

```bash
firebase deploy --only firestore:rules --project YOUR_STAGING_PROJECT_ID
```

## Financial workflow regression checks

1. Add an ordinary expense. Verify no new `savings_ledger` or `chama_ledger` record is created.
2. Add a Savings transaction. Verify exactly one savings deposit linked to the transaction.
3. Add a Chama Contribution. Verify exactly one `chama_ledger` contribution with `chamaId: null`.
4. Add Money Lost and Money Recovered. Verify neither creates a savings or Chama ledger movement; Money Recovered reduces net spend in monthly analysis.
5. Try two withdrawals that individually fit the same starting balance but combined exceed it. Only the first valid operation should succeed; the second should fail after the transaction rechecks the authoritative balance.
6. Allocate funds to a Chama and verify the unallocated payout and Chama contribution are both written, or neither is written.
7. Close a budget from both Monthly Analysis and Monthly Summary in separate attempts. The first close should transfer the remaining amount once; the second should not create another transfer.
