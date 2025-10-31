'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { useRouter } from 'next/navigation';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Budget {
  totalDebited: number;
  categories: { name: string; amount: number }[];
  month: string;
}

interface Transaction {
  category: string;
  amount: number;
  budgetMonth: string;
}

export default function MonthlySummaryPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user === null) router.push('/login');
    else loadData();
  }, [user, router]);

  async function loadData() {
    if (!user) return;
    setLoading(true);

    // Fetch all budgets
    const budgetsCol = collection(db, 'users', user.uid, 'budgets');
    const budgetsSnap = await getDocs(budgetsCol);
    const budgetsData: Budget[] = budgetsSnap.docs.map((doc) => ({
      ...(doc.data() as any),
      month: doc.id,
    }));
    setBudgets(budgetsData);

    // Fetch all transactions
    const txCol = collection(db, 'users', user.uid, 'transactions');
    const txSnap = await getDocs(txCol);
    const txs: Transaction[] = txSnap.docs.map(
      (doc) => doc.data() as Transaction
    );
    setTransactions(txs);

    setLoading(false);
  }

  // Helper to calculate total spent for a month
  function getTotalSpent(month: string) {
    // total outflows (exclude 'Money Recovered' because it's an inflow)
    const totalOutflows = transactions
      .filter((tx) => tx.budgetMonth === month && tx.category !== 'Money Recovered')
      .reduce((s, tx) => s + Number(tx.amount || 0), 0);
  
    // total recovered (inflows)
    const totalRecovered = transactions
      .filter((tx) => tx.budgetMonth === month && tx.category === 'Money Recovered')
      .reduce((s, tx) => s + Number(tx.amount || 0), 0);
  
    return totalOutflows - totalRecovered;
  }

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6 text-gray-700">
        Monthly Summary
      </h1>

      {loading && <p className="text-gray-500">Loading data...</p>}

      {!loading && budgets.length > 0 && (
        <div className="overflow-x-auto bg-white rounded shadow p-4">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">Month</th>
                <th className="p-2">Total Debited (KES)</th>
                <th className="p-2">Total Budgeted (KES)</th>
                <th className="p-2">Total Spent (KES)</th>
                <th className="p-2">Balance (KES)</th>
              </tr>
            </thead>
            <tbody>
              {budgets
                .sort((a, b) => (a.month > b.month ? -1 : 1)) // latest first
                .map((b) => {
                  const totalBudgeted = (b.categories || []).reduce(
                    (sum, c) => sum + Number(c.amount || 0),
                    0
                  );
                  const totalSpent = getTotalSpent(b.month);
                  const balance = totalBudgeted - totalSpent;
                  return (
                    <tr key={b.month} className="border-b">
                      <td className="p-2">{b.month}</td>
                      <td className="p-2">
                        {Number(b.totalDebited || 0).toLocaleString()}
                      </td>
                      <td className="p-2">{totalBudgeted.toLocaleString()}</td>
                      <td className="p-2">{totalSpent.toLocaleString()}</td>
                      <td
                        className={`p-2 ${
                          balance < 0 ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {balance.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && budgets.length === 0 && (
        <p className="text-gray-500">No budgets found yet.</p>
      )}
    </div>
  );
}
