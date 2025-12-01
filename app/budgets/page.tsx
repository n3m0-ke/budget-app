'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '../../lib/firebase';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

interface Category {
  name: string;
  amount: string;
  notes: string;
}

const defaultCategories: string[] = [
  'Fare/Transport',
  'Essentials + Grooming (recurring)',
  'Household',
  'Debt Repayment',
  'Parents Support',
  'Grooming (non-recurring)',
  'Miscellaneous',
  'Savings',
  'Investment',
  'Money Lost',
  'Money Recovered',
];

function formatMonth(monthStr: string) {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const date = new Date(Number(year), Number(month) - 1); // month is 0-indexed
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

export default function BudgetPage() {
  const [user, setUser] = useState<User | null>(null);
  const [month, setMonth] = useState<string>('');
  const [totalDebited, setTotalDebited] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>(
    defaultCategories.map((name) => ({ name, amount: '', notes: '' }))
  );
  const [monthExists, setMonthExists] = useState(false);
  const [loading, setLoading] = useState(false);

  const total = categories.reduce(
    (sum, cat) => sum + (Number(cat.amount) || 0),
    0
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  async function handleLoadMonth(selectedMonth: string) {
    setMonth(selectedMonth);
    setMonthExists(false);
    setTotalDebited('');

    if (!user) return;
    setLoading(true);

    const docRef = doc(db, 'users', user.uid, 'budgets', selectedMonth);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data?.categories) {
        setCategories(data.categories as Category[]);
      }
      if (data?.totalDebited) {
        setTotalDebited(String(data.totalDebited));
      }
      setMonthExists(true);
    } else {
      setCategories(
        defaultCategories.map((name) => ({ name, amount: '', notes: '' }))
      );
      setMonthExists(false);
    }

    setLoading(false);
  }

  async function handleSave() {
    if (!user) return;

    // Validation: all amount fields and totalDebited must be filled
    if (!month || !totalDebited || categories.some((c) => c.amount === '')) {
      alert('Please fill in all amount fields and total debited.');
      return;
    }

    const confirmSave = confirm(
      `Are you sure you want to save this budget for ${month}? It can no longer be edited.`
    );
    if (!confirmSave) return;

    const budgetRef = doc(db, 'users', user.uid, 'budgets', month);
    await setDoc(budgetRef, {
      categories,
      total: Number(total),
      totalDebited: Number(totalDebited),
      closed: false
    });

    alert('Budget saved!');
    setMonthExists(true);
  }

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-6 md:p-8">
      <div className="max-w-3xl mx-auto border bg-black/80 backdrop-blur-m rounded-xl shadow p-4 sm:p-6 md:p-8">
        <h1 className="text-2xl font-semibold mb-4 text-center text-blue-200">
          Add a Budget
        </h1>

        {/* Month Selector */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <div className="flex flex-col">
            <label className="font-medium text-gray-200 mb-1">
              Select Month:
            </label>
            <input
              type="month"
              value={month}
              onChange={(e) => handleLoadMonth(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1"
            />
          </div>

          {/* Total Debited */}
          <div className="flex flex-col">
            <label className="font-medium text-gray-200 mb-1">
              Total Debited:
            </label>
            <input
              type="number"
              value={totalDebited}
              disabled={monthExists}
              onChange={(e) => setTotalDebited(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1"
            />
          </div>
        </div>

        {loading && <p className="text-gray-500">Loading month data...</p>}

        {monthExists && !loading && (
          <p className="text-center text-red-600 font-medium mb-4">
            Budget for {formatMonth(month)} already exists and cannot be edited.
          </p>
        )}

        {/* Budget Table */}
        {!monthExists && month && !loading && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="bg-gray-100/20 backdrop-blur-sm">
                    <th className="text-left p-2 text-blue-300">Category</th>
                    <th className="text-left p-2 text-blue-300">Amount (KES)</th>
                    <th className="text-left p-2 text-blue-300">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2 text-cyan-200">{cat.name}</td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={cat.amount}
                          onChange={(e) => {
                            const newCats = [...categories];
                            newCats[index].amount = e.target.value;
                            setCategories(newCats);
                          }}
                          className="border border-gray-300 rounded w-full px-2 py-1"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={cat.notes}
                          onChange={(e) => {
                            const newCats = [...categories];
                            newCats[index].notes = e.target.value;
                            setCategories(newCats);
                          }}
                          className="border border-gray-300 rounded w-full px-2 py-1"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="text-right font-semibold mb-4">
              Total Budgeted: KES {total.toLocaleString()}
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full sm:w-auto"
            >
              Save Budget
            </button>
          </>
        )}
      </div>
    </div>
  );
}
