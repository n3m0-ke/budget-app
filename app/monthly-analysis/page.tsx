'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { useRouter } from 'next/navigation';
import { collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Budget {
  totalDebited: number;
  categories: { name: string; amount: number }[];
  month: string;
  closed: boolean;
}

interface Transaction {
  category: string;
  amount: number;
  budgetMonth: string;
}

function formatMonth(monthStr: string) {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
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

  async function closeBudget(month: string) {
    if (!user) return;

    const confirmSave = confirm(
      `Are you sure you want to close the budget for ${month}? This action cannot be undone.`
    );
    if (!confirmSave) return;
  
    const ref = doc(db, "users", user.uid, "budgets", month);
    await updateDoc(ref, { closed: true });
  
    alert("Budget closed successfully.");
  }

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
                <th className="p-2">Action</th>
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
                      <td className="p-2">{formatMonth(b.month)}</td>
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
                      <td className="p-2">
                        {/* Action Menu */}
                        <div className="relative inline-block text-left">
                          <details className="group">
                            <summary className="list-none cursor-pointer px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-xs rounded-md flex items-center gap-1">
                              Actions
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                className="h-4 w-4" 
                                viewBox="0 0 20 20" 
                                fill="currentColor"
                              >
                                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                              </svg>
                            </summary>

                            <div className="absolute right-0 mt-2 w-44 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-10">
                              
                              {/* Close Budget */}
                              {!b.closed ? (
                                <button
                                  onClick={() => closeBudget(b.month)}
                                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  Close Budget
                                </button>
                              ) : (
                                <span className="w-full block px-3 py-2 text-sm text-gray-400 cursor-not-allowed">
                                  Closed
                                </span>
                              )}

                              {/* Divider */}
                              <div className="border-t border-gray-200 my-1" />

                              {/* Download PDF */}
                              <button
                                onClick={() => alert('PDF download coming soon!')}
                                className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50"
                              >
                                Download Analysis
                              </button>
                            </div>
                          </details>
                        </div>
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
