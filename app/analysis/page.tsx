'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { useRouter } from 'next/navigation';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Cookies from 'js-cookie';

interface CategoryBudget {
  name: string;
  amount: number;
  notes: string;
}

interface Transaction {
  category: string;
  amount: number;
  budgetMonth: string;
  date?: string;
  note?: string;
  paidThrough?: string;
}

export default function AnalysisPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [month, setMonth] = useState<string>('');
  const [plannedCategories, setPlannedCategories] = useState<CategoryBudget[]>(
    []
  );
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalBudgeted, setTotalBudgeted] = useState<number>(0);
  const [amountDebited, setAmountDebited] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (user === null) router.push('/login');
  }, [user, router]);

  // Load previously selected month from cookie
  useEffect(() => {
    if (!user) return;
    const savedMonth = Cookies.get(`selectedMonth_${user.uid}`);
    if (savedMonth) {
      setMonth(savedMonth);
      loadData(savedMonth);
    }
  }, [user]);

  async function loadData(selectedMonth: string) {
    if (!user) return;
    setLoading(true);

    // Save cookie
    Cookies.set(`selectedMonth_${user.uid}`, selectedMonth, { expires: 30 });

    // Fetch budget
    const budgetRef = doc(db, 'users', user.uid, 'budgets', selectedMonth);
    const budgetSnap = await getDoc(budgetRef);

    if (budgetSnap.exists()) {
      const data: any = budgetSnap.data();
      // Normalize categories: ensure amounts are numbers
      const cats: CategoryBudget[] = (data.categories || []).map((c: any) => ({
        name: c.name,
        amount: Number(c.amount || 0),
        notes: c.notes || '',
      }));
      setPlannedCategories(cats);
      setTotalBudgeted(Number(data.total || 0));
      setAmountDebited(Number(data.totalDebited || 0));
    } else {
      setPlannedCategories([]);
      setTotalBudgeted(0);
      setAmountDebited(0);
    }

    // Fetch transactions for selectedMonth
    const txCol = collection(db, 'users', user.uid, 'transactions');
    const txQuery = query(txCol, where('budgetMonth', '==', selectedMonth));
    const txSnap = await getDocs(txQuery);
    const txs: Transaction[] = txSnap.docs.map((d) => d.data() as Transaction);
    setTransactions(txs);

    setLoading(false);
  }

  // Calculations
  const totalBudget = totalBudgeted; // alias
  console.log('Total budget:', totalBudget, '\n');
  const totalOutflows = transactions
    .filter((tx) => tx.category !== 'Money Recovered')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  const totalRecovered = transactions
    .filter((tx) => tx.category === 'Money Recovered')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  const amountSpent = totalOutflows - totalRecovered;

  const balanceFromTotalDebited = amountDebited - amountSpent;

  console.log('Amount spent:', amountSpent, '\n');

  const amountRecovered = transactions
    .filter((tx) => tx.category === 'Money Recovered')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  const amountLost = transactions
    .filter((tx) => tx.category === 'Money Lost')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  const savedSoFar = transactions
    .filter((tx) => tx.category === 'Savings')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  const plannedSavings =
    Number(plannedCategories.find((c) => c.name === 'Savings')?.amount || 0) ||
    0;

  const toBeSaved = Math.max(plannedSavings - savedSoFar, 0);

  // Remaining budget uses net outflows: outflows minus recovered inflows.
  const remainingBudget = Math.max(totalBudget - amountSpent, 0);

  // For progress bar, show spent _excluding_ savings to avoid double-counting,
  // saved portion, and remaining.
  const spentExcludingSavings = Math.max(amountSpent - savedSoFar, 0);

  // avoid division by zero
  const denom = totalBudget > 0 ? totalBudget : 1;

  const spentPct = Math.min(100, (spentExcludingSavings / denom) * 100);
  const savedPct = Math.min(100, (savedSoFar / denom) * 100);
  const remainingPct = Math.max(
    0,
    Math.min(100, (remainingBudget / denom) * 100)
  );

  if (!user) return null;

  let balanceColor = 'text-yellow-500'; // default

  if (remainingBudget > 10000) {
    balanceColor = 'text-green-600';
  } else if (remainingBudget < 1000) {
    balanceColor = 'text-red-600';
  } else {
    balanceColor = 'text-orange-500';
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6 text-blue-300">
        Monthly Analysis
      </h1>

      {/* Month Selector + Balance */}
      <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3 bg-white/40 backdrop-blur-md p-4 rounded-lg shadow-sm">
        <div className="flex items-center space-x-3">
          <label className="font-medium text-gray-700">Select Month:</label>
          <input
            type="month"
            value={month}
            onChange={(e) => {
              const selected = e.target.value;
              setMonth(selected);
              loadData(selected);
            }}
            className="border border-gray-300 rounded px-3 py-1 bg-white/60 backdrop-blur-sm"
          />
        </div>
        <div className="text-gray-800 font-medium">
          Balance:{' '}
          {month
            ? `${remainingBudget.toLocaleString()} / ${totalBudget.toLocaleString()} KES`
            : '--- / ---'}
        </div>
      </div>


      {loading && <p className="text-gray-500">Loading data...</p>}

      {!loading && month && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
            <div className="p-4 bg-white/70 backdrop-blur border rounded shadow flex flex-col">
              <span className="text-gray-800">Amount Debited</span>
              <span className="text-xl font-semibold text-green-800">
                {amountDebited.toLocaleString()} KES
              </span>
            </div>

            <div className="p-4 bg-white/70 backdrop-blur border rounded shadow flex flex-col">
              <span className="text-gray-800">Amount Budgeted</span>
              <span className="text-xl font-semibold text-blue-600">
                {totalBudget.toLocaleString()} KES
              </span>
            </div>

            <div className="p-4 bg-white/70 backdrop-blur border rounded shadow flex flex-col">
              <span className="text-gray-800">Amount Spent (outflows)</span>
              <span className="text-xl font-semibold text-red-600">
                {amountSpent.toLocaleString()} KES
              </span>
            </div>

            <div className="p-4 bg-white/70 backdrop-blur border rounded shadow flex flex-col">
              <span className="text-gray-800">Amount Saved (so far)</span>
              <span className="text-xl font-semibold text-green-600">
                {savedSoFar.toLocaleString()} KES
              </span>
            </div>

            <div className="p-4 bg-white/70 backdrop-blur border rounded shadow flex flex-col">
              <span className="text-gray-800">Balance (From Debited)</span>
              <span className={`text-xl font-semibold ${balanceColor}`}>
                {balanceFromTotalDebited.toLocaleString()} KES
              </span>
            </div>

            <div className="p-4 bg-white/70 backdrop-blur border rounded shadow flex flex-col">
              <span className="text-gray-800">Balance (Usable)</span>
              <span className={`text-xl font-semibold ${balanceColor}`}>
                {remainingBudget.toLocaleString()} KES
              </span>
            </div>

            <div className="p-4 bg-white/70 backdrop-blur border rounded shadow flex flex-col">
              <span className="text-gray-800">Amount Lost</span>
              <span className="text-xl font-semibold text-red-800">
                {amountLost.toLocaleString()} KES
              </span>
            </div>

            <div className="p-4 bg-white/70 backdrop-blur border rounded shadow flex flex-col">
              <span className="text-gray-800">Amount Recovered</span>
              <span className="text-xl font-semibold text-green-800">
                {amountRecovered.toLocaleString()} KES
              </span>
            </div>
          </div>

          {/* Budget Progress Bar */}
          <div className="mb-8 p-4 bg-white/90 backdrop-blur rounded shadow">
            <h2 className="font-semibold text-gray-800 mb-2">
              Budget Overview
            </h2>

            <div className="flex h-2 w-full bg-gray-200 rounded overflow-hidden">
              <div
                className="bg-red-600 h-full"
                style={{ width: `${spentPct}%` }}
                title={`Spent (excl. savings): ${spentExcludingSavings.toLocaleString()} KES`}
              />
              <div
                className="bg-green-300 h-full"
                style={{ width: `${savedPct}%` }}
                title={`Saved: ${savedSoFar.toLocaleString()} KES`}
              />
              <div
                className="bg-green-600 h-full"
                style={{ width: `${remainingPct}%` }}
                title={`Remaining: ${remainingBudget.toLocaleString()} KES`}
              />
            </div>

            <div className="flex w-full text-sm text-gray-600 mt-1">
              <span style={{ width: `${spentPct}%` }}>Spent: {spentExcludingSavings.toLocaleString()}</span>
              <span style={{ width: `${savedPct}%` }}>Saved: {savedSoFar.toLocaleString()}</span>
              <span style={{ width: `${remainingPct}%` }}>Remaining: {remainingBudget.toLocaleString()}</span>
            </div>
          </div>

          {/* Category Breakdown Table */}
          {plannedCategories.length > 0 && (
            <div className="overflow-x-auto bg-black/40 backdrop-blur-sm rounded shadow p-4">
              <h2 className="font-semibold text-blue-300 mb-2">
                Category Breakdown
              </h2>
              <table className="w-full text-left text-sm">
                <thead className="bg-gray/30 backdrop-blur-sm text-blue-300">
                  <tr>
                    <th className="p-2">Category</th>
                    <th className="p-2">Budgeted (KES)</th>
                    <th className="p-2">Actual (KES)</th>
                    <th className="p-2">Balance (KES)</th>
                  </tr>
                </thead>
                <tbody>
                  {plannedCategories.map((c) => {
                    const actual = transactions
                      .filter((tx) => tx.category === c.name)
                      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

                    const isLost = c.name.toLowerCase().includes('lost');
                    const isRecovered = c.name
                      .toLowerCase()
                      .includes('recovered');
                    const isSavings = c.name.toLowerCase().includes('saving');

                    // Reverse logic for recovered money (since it's an inflow)
                    const balance = isRecovered
                      ? Number(c.amount || 0) + actual
                      : Number(c.amount || 0) - actual;

                    // Determine colors
                    const actualColor = isLost
                      ? 'text-red-700'
                      : isRecovered
                        ? 'text-green-700'
                        : isSavings
                          ? 'text-green-600'
                          : actual > Number(c.amount)
                            ? 'text-red-600'
                            : 'text-gray-700';

                    const balanceColor = isLost
                      ? 'text-red-700'
                      : isRecovered
                        ? 'text-green-700'
                        : balance < 0
                          ? 'text-red-600'
                          : 'text-green-600';

                    return (
                      <tr
                        key={c.name}
                        className="border-b bg-white/80 backdrop-blur hover:bg-gray-50 transition-colors"
                      >
                        <td
                          className="p-2 font-medium text-gray-800"
                          title={c.notes}
                        >
                          {c.name}
                        </td>
                        <td className="p-2 text-gray-700">
                          {Number(c.amount).toLocaleString()}
                        </td>
                        <td className={`p-2 ${actualColor}`}>
                          {actual.toLocaleString()}
                        </td>
                        <td className={`p-2 ${balanceColor}`}>
                          {balance.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
