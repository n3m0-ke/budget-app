import { collection, doc, getDocs, query, runTransaction, serverTimestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ensureBalanceInitialized } from '@/lib/financeOperations';

/**
 * One-time, explicitly invoked repair for the historical bug that wrote a
 * chama_ledger contribution for every transaction category. Only entries with
 * a linked, existing transaction whose category is not "Chama Contribution"
 * are removed. Unlinked entries and missing source transactions are left alone.
 */
export async function repairLegacyChamaLedger(userId: string): Promise<number> {
  const ledgerRef = collection(db, 'users', userId, 'chama_ledger');
  const transactionsRef = collection(db, 'users', userId, 'transactions');
  const balanceRef = doc(db, 'users', userId, 'account_balances', 'chama-unallocated');

  await ensureBalanceInitialized(userId, 'chama-unallocated');
  const [ledgerSnapshot, transactionSnapshot] = await Promise.all([
    getDocs(query(ledgerRef, where('chamaId', '==', null))),
    getDocs(query(transactionsRef)),
  ]);
  const transactionsById = new Map<string, Record<string, any>>(
    transactionSnapshot.docs.map((item) => [item.id, item.data() as Record<string, any>]),
  );
  const candidates = ledgerSnapshot.docs.filter((entry) => {
    const data = entry.data();
    if (data.source !== 'transaction' || data.type !== 'contribution' || !data.relatedTransactionId) return false;
    const sourceTransaction = transactionsById.get(String(data.relatedTransactionId));
    return Boolean(sourceTransaction) && sourceTransaction?.category !== 'Chama Contribution';
  });

  if (candidates.length > 499) {
    throw new Error(`Found ${candidates.length} entries to repair. This exceeds the safe one-transaction limit; split the repair into reviewed smaller batches.`);
  }
  if (candidates.length === 0) return 0;

  return runTransaction(db, async (transaction) => {
    const balanceSnapshot = await transaction.get(balanceRef);
    const candidateSnapshots = [];
    for (const candidate of candidates) candidateSnapshots.push(await transaction.get(candidate.ref));
    const currentBalance = Number(balanceSnapshot.data()?.balance || 0);
    let adjustment = 0;
    candidateSnapshots.forEach((snapshot) => {
      if (!snapshot.exists()) return;
      const row = snapshot.data();
      if (row.type === 'contribution') adjustment -= Number(row.amount || 0);
      if (row.type === 'payout') adjustment += Number(row.amount || 0);
    });
    candidateSnapshots.forEach((snapshot) => {
      if (snapshot.exists()) transaction.delete(snapshot.ref);
    });
    transaction.set(balanceRef, { balance: currentBalance + adjustment, updatedAt: serverTimestamp() });
    return candidateSnapshots.filter((snapshot) => snapshot.exists()).length;
  });
}
