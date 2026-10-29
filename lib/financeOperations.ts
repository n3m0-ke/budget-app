import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getLedgerEffectForCategory, calculateMonthMetrics } from '@/lib/financeRules.mjs';

type LedgerKind = 'savings' | 'unallocated' | 'chama-unallocated';
type LedgerRow = Record<string, any>;

function validPositiveAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) throw new Error('Enter a valid amount greater than zero.');
}

function balanceRefFor(userId: string, kind: LedgerKind) {
  return doc(db, 'users', userId, 'account_balances', kind);
}

function ledgerCollectionFor(userId: string, kind: LedgerKind) {
  const name = kind === 'savings' ? 'savings_ledger' : kind === 'unallocated' ? 'unallocated_ledger' : 'chama_ledger';
  return collection(db, 'users', userId, name);
}

function balanceFromRows(kind: LedgerKind, rows: LedgerRow[]) {
  if (kind === 'savings' || kind === 'unallocated') {
    return rows.reduce((sum, row) => sum + (row.type === 'deposit' ? Number(row.amount || 0) : row.type === 'withdrawal' ? -Number(row.amount || 0) : 0), 0);
  }
  return rows.reduce((sum, row) => sum + (row.type === 'contribution' ? Number(row.amount || 0) : row.type === 'payout' ? -Number(row.amount || 0) : 0), 0);
}

async function getStartingBalance(balanceSnapshot: any) {
  if (!balanceSnapshot.exists()) throw new Error('The balance account is still initializing. Please retry the operation.');
  return Number(balanceSnapshot.data().balance || 0);
}

/**
 * Initializes a per-user aggregate from the current ledger exactly once. Every
 * app operation that mutates that ledger calls this first. After initialization,
 * balance documents serialize concurrent withdrawals/allocations in transactions.
 */
export async function ensureBalanceInitialized(userId: string, kind: LedgerKind) {
  const balanceRef = balanceRefFor(userId, kind);
  if ((await getDoc(balanceRef)).exists()) return;

  const ledgerRef = ledgerCollectionFor(userId, kind);
  const ledgerQuery = kind === 'chama-unallocated'
    ? query(ledgerRef, where('chamaId', '==', null))
    : query(ledgerRef);
  const ledgerSnapshot = await getDocs(ledgerQuery);
  const calculatedBalance = balanceFromRows(kind, ledgerSnapshot.docs.map((entry) => entry.data()));

  await runTransaction(db, async (transaction) => {
    const current = await transaction.get(balanceRef);
    if (!current.exists()) transaction.set(balanceRef, { balance: calculatedBalance, updatedAt: serverTimestamp() });
  });
}

async function ensureChamaBalanceInitialized(userId: string, chamaId: string) {
  const balanceRef = doc(db, 'users', userId, 'account_balances', `chama-${chamaId}`);
  if ((await getDoc(balanceRef)).exists()) return;
  const ledgerRef = collection(db, 'users', userId, 'chama_ledger');
  const snapshot = await getDocs(query(ledgerRef, where('chamaId', '==', chamaId)));
  const calculatedBalance = balanceFromRows('chama-unallocated', snapshot.docs.map((entry) => entry.data()));
  await runTransaction(db, async (transaction) => {
    const current = await transaction.get(balanceRef);
    if (!current.exists()) transaction.set(balanceRef, { balance: calculatedBalance, updatedAt: serverTimestamp() });
  });
}

function ledgerEntryRef(userId: string, kind: LedgerKind, id: string): DocumentReference {
  return doc(ledgerCollectionFor(userId, kind), id);
}

/** Creates a transaction and its category-specific ledger effect atomically. */
export async function createTransactionWithLedger(
  userId: string,
  transactionId: string,
  input: {
    budgetMonth: string;
    dateOfTransaction: string;
    category: string;
    amount: number;
    paidThrough: string;
    note?: string;
  },
) {
  validPositiveAmount(Number(input.amount));
  if (!/^\d{4}-\d{2}$/.test(input.budgetMonth)) throw new Error('Select a valid budget month.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateOfTransaction)) throw new Error('Select a valid transaction date.');
  if (!input.category?.trim()) throw new Error('Select a category.');

  const txRef = doc(db, 'users', userId, 'transactions', transactionId);
  const budgetRef = doc(db, 'users', userId, 'budgets', input.budgetMonth);
  const effect = getLedgerEffectForCategory(input.category);
  const kind: LedgerKind | null = effect === 'savings-deposit'
    ? 'savings'
    : effect === 'chama-unallocated-contribution'
      ? 'chama-unallocated'
      : null;
  if (kind) await ensureBalanceInitialized(userId, kind);

  await runTransaction(db, async (transaction) => {
    const existingTx = await transaction.get(txRef);
    if (existingTx.exists()) {
      const existing = existingTx.data();
      if (existing.category !== input.category || Number(existing.amount) !== Number(input.amount) || existing.budgetMonth !== input.budgetMonth || existing.dateOfTransaction !== input.dateOfTransaction || existing.paidThrough !== input.paidThrough || (existing.note || '') !== (input.note || '')) {
        throw new Error('This transaction request ID was already used for different details. Start a new transaction instead.');
      }
      return;
    }

    const budgetSnapshot = await transaction.get(budgetRef);
    if (!budgetSnapshot.exists()) throw new Error('The selected budget no longer exists.');
    const budget = budgetSnapshot.data();
    if (budget.closed) throw new Error('This budget is closed and cannot accept transactions.');
    const balanceRef = kind ? balanceRefFor(userId, kind) : null;
    const balanceSnapshot = balanceRef ? await transaction.get(balanceRef) : null;
    const startingBalance = balanceSnapshot ? await getStartingBalance(balanceSnapshot) : 0;

    transaction.set(txRef, {
      ...input,
      amount: Number(input.amount),
      dateOfTransaction: input.dateOfTransaction,
      createdAt: serverTimestamp(),
    });
    // Updating the budget revision serializes transaction creation against the
    // close-budget operation, preventing closure from missing a concurrent entry.
    transaction.update(budgetRef, {
      transactionRevision: Number(budget.transactionRevision || 0) + 1,
      updatedAt: serverTimestamp(),
    });

    if (kind === 'savings') {
      transaction.set(ledgerEntryRef(userId, 'savings', `transaction-${transactionId}`), {
        type: 'deposit', amount: Number(input.amount), timestamp: Date.now(), source: 'transaction',
        relatedTransactionId: transactionId, note: input.note || '', operationId: `transaction-${transactionId}`,
      });
      transaction.set(balanceRefFor(userId, 'savings'), { balance: startingBalance + Number(input.amount), updatedAt: serverTimestamp() });
    } else if (kind === 'chama-unallocated') {
      transaction.set(ledgerEntryRef(userId, 'chama-unallocated', `transaction-${transactionId}`), {
        chamaId: null, type: 'contribution', amount: Number(input.amount), timestamp: Date.now(),
        budgetMonth: input.budgetMonth, source: 'transaction', relatedTransactionId: transactionId,
        note: input.note || 'Chama contribution', operationId: `transaction-${transactionId}`,
      });
      transaction.set(balanceRefFor(userId, 'chama-unallocated'), { balance: startingBalance + Number(input.amount), updatedAt: serverTimestamp() });
    }
  });
}

/** Atomically records a savings/unallocated withdrawal with an idempotency key. */
export async function withdrawFromLedger(
  userId: string,
  kind: 'savings' | 'unallocated',
  operationId: string,
  amount: number,
  note = '',
) {
  validPositiveAmount(Number(amount));
  await ensureBalanceInitialized(userId, kind);
  const balanceRef = balanceRefFor(userId, kind);
  const operationRef = doc(db, 'users', userId, 'operations', operationId);
  const entryRef = ledgerEntryRef(userId, kind, operationId);

  await runTransaction(db, async (transaction) => {
    const operationSnapshot = await transaction.get(operationRef);
    if (operationSnapshot.exists()) {
      const existing = operationSnapshot.data();
      if (existing.type !== `${kind}-withdrawal` || Number(existing.amount) !== Number(amount)) throw new Error('This operation ID was already used for different withdrawal details.');
      return;
    }
    const balanceSnapshot = await transaction.get(balanceRef);
    const currentBalance = await getStartingBalance(balanceSnapshot);
    if (Number(amount) > currentBalance) throw new Error(`Insufficient ${kind === 'savings' ? 'savings' : 'unallocated'} funds.`);

    transaction.set(entryRef, { type: 'withdrawal', amount: Number(amount), timestamp: Date.now(), source: 'manual-withdrawal', note, relatedTransactionId: '', operationId });
    transaction.set(balanceRef, { balance: currentBalance - Number(amount), updatedAt: serverTimestamp() });
    transaction.set(operationRef, { type: `${kind}-withdrawal`, amount: Number(amount), createdAt: serverTimestamp() });
  });
}

/** Atomically moves money from the unallocated Chama pool into one Chama. */
export async function allocateChamaFunds(
  userId: string,
  operationId: string,
  chamaId: string,
  amount: number,
  note = '',
) {
  validPositiveAmount(Number(amount));
  if (!chamaId) throw new Error('Select a Chama.');
  await ensureBalanceInitialized(userId, 'chama-unallocated');
  await ensureChamaBalanceInitialized(userId, chamaId);

  const base = collection(db, 'users', userId, 'chama_ledger');
  const operationRef = doc(db, 'users', userId, 'operations', operationId);
  const chamaRef = doc(db, 'users', userId, 'chamas', chamaId);
  const unallocatedBalanceRef = balanceRefFor(userId, 'chama-unallocated');
  const chamaBalanceRef = doc(db, 'users', userId, 'account_balances', `chama-${chamaId}`);
  const withdrawalRef = doc(base, `${operationId}-out`);
  const contributionRef = doc(base, `${operationId}-in`);

  await runTransaction(db, async (transaction) => {
    const operationSnapshot = await transaction.get(operationRef);
    if (operationSnapshot.exists()) {
      const existing = operationSnapshot.data();
      if (existing.type !== 'chama-allocation' || existing.chamaId !== chamaId || Number(existing.amount) !== Number(amount)) throw new Error('This operation ID was already used for different allocation details.');
      return;
    }
    const chamaSnapshot = await transaction.get(chamaRef);
    if (!chamaSnapshot.exists()) throw new Error('The selected Chama no longer exists.');
    const unallocatedSnapshot = await transaction.get(unallocatedBalanceRef);
    const chamaBalanceSnapshot = await transaction.get(chamaBalanceRef);
    const unallocatedBalance = await getStartingBalance(unallocatedSnapshot);
    const chamaBalance = await getStartingBalance(chamaBalanceSnapshot);
    if (Number(amount) > unallocatedBalance) throw new Error('Insufficient unallocated Chama funds.');

    transaction.set(withdrawalRef, { chamaId: null, type: 'payout', amount: Number(amount), timestamp: Date.now(), source: 'manual', note: `Allocated to Chama ${chamaId}`, operationId });
    transaction.set(contributionRef, { chamaId, type: 'contribution', amount: Number(amount), timestamp: Date.now(), source: 'manual', note, operationId });
    transaction.set(unallocatedBalanceRef, { balance: unallocatedBalance - Number(amount), updatedAt: serverTimestamp() });
    transaction.set(chamaBalanceRef, { balance: chamaBalance + Number(amount), updatedAt: serverTimestamp() });
    transaction.set(operationRef, { type: 'chama-allocation', chamaId, amount: Number(amount), createdAt: serverTimestamp() });
  });
}

/** One shared, idempotent close-budget operation for every screen. */
export async function closeBudgetAndTransferRemainder(userId: string, month: string) {
  const budgetRef = doc(db, 'users', userId, 'budgets', month);
  const transferRef = doc(db, 'users', userId, 'unallocated_ledger', `budget-close-${month}`);
  const balanceRef = balanceRefFor(userId, 'unallocated');
  const txQuery = query(collection(db, 'users', userId, 'transactions'), where('budgetMonth', '==', month));
  await ensureBalanceInitialized(userId, 'unallocated');

  // The Web SDK transaction reads document references, not query snapshots.
  // Pair an outside month query with transactionRevision on the budget document;
  // all new transaction writes increment that revision in the same transaction.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const preflightBudget = await getDoc(budgetRef);
    if (!preflightBudget.exists()) throw new Error('The selected budget does not exist.');
    const preflightData = preflightBudget.data();
    if (preflightData.closed) {
      const priorTransfer = await getDoc(transferRef);
      if (priorTransfer.exists() || typeof preflightData.closureTransferAmount === 'number') return;
      throw new Error('This budget is already closed. Please reconcile its previous closure before retrying.');
    }
    const observedRevision = Number(preflightData.transactionRevision || 0);
    const transactionSnapshot = await getDocs(txQuery);
    const monthTransactions = transactionSnapshot.docs.map((entry) => ({ ...entry.data(), id: entry.id }));

    try {
      await runTransaction(db, async (transaction) => {
        const budgetSnapshot = await transaction.get(budgetRef);
        if (!budgetSnapshot.exists()) throw new Error('The selected budget does not exist.');
        const budget = budgetSnapshot.data();
        const transferSnapshot = await transaction.get(transferRef);
        if (budget.closed) {
          if (transferSnapshot.exists() || typeof budget.closureTransferAmount === 'number') return;
          throw new Error('This budget is already closed. Please reconcile its previous closure before retrying.');
        }
        if (Number(budget.transactionRevision || 0) !== observedRevision) throw new Error('STALE_BUDGET_SNAPSHOT');
        const balanceSnapshot = await transaction.get(balanceRef);
        const currentUnallocated = await getStartingBalance(balanceSnapshot);
        const totalBudget = Number(budget.total || 0);
        const metrics = calculateMonthMetrics(monthTransactions, month, totalBudget);
        const remaining = Math.max(0, metrics.remainingBudget);

        transaction.update(budgetRef, {
          closed: true,
          closedAt: serverTimestamp(),
          closureTransferAmount: remaining,
          transactionRevision: observedRevision + 1,
        });
        if (remaining > 0) {
          transaction.set(transferRef, {
            type: 'deposit', amount: remaining, timestamp: Date.now(), budgetMonth: month,
            source: 'budget-close', note: `Remaining balance from ${month}`, relatedTransactionId: '',
            operationId: `budget-close-${month}`,
          });
          transaction.set(balanceRef, { balance: currentUnallocated + remaining, updatedAt: serverTimestamp() });
        }
      });
      return;
    } catch (error) {
      if (error instanceof Error && error.message === 'STALE_BUDGET_SNAPSHOT' && attempt < 4) continue;
      throw error;
    }
  }
  throw new Error('Transactions are changing too quickly to close this budget safely. Please try again.');
}

/** Creates a budget and its opening unallocated deposit atomically. */
export async function createBudgetWithOpeningFunds(
  userId: string,
  month: string,
  categories: { name: string; amount: number | string; notes?: string }[],
  totalDebited: number,
) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Select a valid budget month.');
  if (!Number.isFinite(totalDebited) || totalDebited < 0) throw new Error('Enter a valid total debited amount.');
  const total = categories.reduce((sum, category) => sum + Number(category.amount || 0), 0);
  if (categories.some((category) => !Number.isFinite(Number(category.amount)) || Number(category.amount) < 0)) throw new Error('Budget category amounts must be valid non-negative numbers.');
  const unallocated = Math.max(totalDebited - total, 0);
  if (unallocated > 0) await ensureBalanceInitialized(userId, 'unallocated');

  const budgetRef = doc(db, 'users', userId, 'budgets', month);
  const openingRef = doc(db, 'users', userId, 'unallocated_ledger', `budget-opening-${month}`);
  const balanceRef = balanceRefFor(userId, 'unallocated');

  await runTransaction(db, async (transaction) => {
    const budgetSnapshot = await transaction.get(budgetRef);
    if (budgetSnapshot.exists()) throw new Error(budgetSnapshot.data().closed ? 'This budget is already closed.' : 'A budget already exists for this month.');
    const balanceSnapshot = unallocated > 0 ? await transaction.get(balanceRef) : null;
    const currentUnallocated = balanceSnapshot ? await getStartingBalance(balanceSnapshot) : 0;
    transaction.set(budgetRef, { categories, total, totalDebited, closed: false, transactionRevision: 0, createdAt: serverTimestamp() });
    if (unallocated > 0) {
      transaction.set(openingRef, { type: 'deposit', amount: unallocated, timestamp: Date.now(), budgetMonth: month, source: 'budget-creation', note: '', relatedTransactionId: '', operationId: `budget-opening-${month}` });
      transaction.set(balanceRef, { balance: currentUnallocated + unallocated, updatedAt: serverTimestamp() });
    }
  });
}
