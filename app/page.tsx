'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import {
  Dialog,
  DialogBody,
  DialogHeader,
  DialogFooter,
  Button,
} from '@material-tailwind/react';
import {
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
} from 'firebase/firestore';

function formatMonth(monthStr: string) {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const date = new Date(Number(year), Number(month) - 1); // month is 0-indexed
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [budgets, setBudgets] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [form, setForm] = useState({
    budgetMonth: '',
    category: '',
    amount: '',
    paidThrough: 'MPESA',
    note: '',
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user === null) router.push('/login');
  }, [user, router]);

  // Load available budget months and categories
  useEffect(() => {
    if (!user) return;

    const loadBudgets = async () => {
      const budgetsCol = collection(db, 'users', user.uid, 'budgets');
      const q = query(budgetsCol, orderBy('total', 'desc'));
      const snapshot = await getDocs(q);
      const months: string[] = [];
      snapshot.forEach((doc) => months.push(doc.id));
      setBudgets(months);
    };
    loadBudgets();
  }, [user]);

  // Load categories whenever budgetMonth changes
  useEffect(() => {
    if (!user || !form.budgetMonth) return;

    const loadCategories = async () => {
      const budgetRef = collection(db, 'users', user.uid, 'budgets');
      const budgetDoc = await getDocs(budgetRef);
      let cats: string[] = [];
      budgetDoc.forEach((doc) => {
        if (doc.id === form.budgetMonth && doc.data().categories)
          cats = (doc.data().categories as { name: string }[]).map(
            (c) => c.name
          );
      });
      setCategories(cats);
      setForm((prev) => ({ ...prev, category: '' })); // reset category
    };
    loadCategories();
  }, [form.budgetMonth, user]);

  const handleOpen = () => setOpen(!open);

  const addTransaction = async () => {
    if (!form.budgetMonth || !form.category || !form.amount)
      return alert('Please fill all required fields');

    if (!user) return;

    const tx = {
      ...form,
      amount: Number(form.amount),
      date: new Date().toISOString(),
    };

    await addDoc(collection(db, 'users', user.uid, 'transactions'), tx);

    setTransactions([tx, ...transactions]);
    setForm({
      budgetMonth: '',
      category: '',
      amount: '',
      paidThrough: 'MPESA',
      note: '',
    });
    setOpen(false);
    setMessage('Transaction added successfully 🎉');
    setTimeout(() => setMessage(null), 3000);
  };

  if (!user)
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        Redirecting to login...
      </div>
    );

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-blue-700 mb-2">
          Welcome back
        </h1>

        <Button
          color="blue"
          onClick={handleOpen}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Add Transaction
        </Button>
      </div>

      {message && (
        <div className="bg-green-100 text-green-700 px-4 py-2 rounded">
          {message}
        </div>
      )}

      {/* Existing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Budget Summary Card */}
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-2 text-gray-700">
            Planned Budget
          </h2>
          <p className="text-gray-600 mb-4">
            Set and review your monthly budgets per category.
          </p>
          <button
            onClick={() => router.push('/budgets')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Create Monthly Budget
          </button>
        </div>

        {/* Expenditure Card */}
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-2 text-gray-700">
            Expenditures
          </h2>
          <p className="text-gray-600 mb-4">
            Track your daily spending by category and payment method.
          </p>
          <button
            onClick={() => router.push('/transactions')}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Add/View Expenditures
          </button>
        </div>

        {/* Analysis Card */}
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-2 text-gray-700">
            Monthly Analysis
          </h2>
          <p className="text-gray-600 mb-4">
            Compare budgeted amounts with actual expenditures.
          </p>
          <button
            onClick={() => router.push('/analysis')}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            View Monthly Analysis
          </button>
        </div>
      </div>

      {/* Transaction Modal */}
      <Dialog
        open={open}
        handler={handleOpen}
        size="sm"
        className="md:w-1/2 sm:w-full z-[9999] rounded-lg shadow-lg"
        dismiss={{ outsidePress: true, enabled: true, escapeKey: true }}
      >
        <DialogHeader className="mx-auto">Add New Transaction</DialogHeader>
        <DialogBody divider>
          <div className="flex flex-col gap-3">
            <select
              className="border p-2 rounded w-full"
              value={form.budgetMonth}
              onChange={(e) =>
                setForm({ ...form, budgetMonth: e.target.value })
              }
            >
              <option value="">Select Budget Month</option>
              {budgets.map((m) => (
                <option key={m} value={m}>
                  {formatMonth(m)}
                </option>
              ))}
            </select>

            <select
              className="border p-2 rounded w-full"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <input
              type="number"
              className="border p-2 rounded w-full"
              placeholder="Amount"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />

            <select
              className="border p-2 rounded w-full"
              value={form.paidThrough}
              onChange={(e) =>
                setForm({ ...form, paidThrough: e.target.value })
              }
            >
              <option>MPESA</option>
              <option>Cash</option>
              <option>Bank Transfer</option>
            </select>

            <input
              type="text"
              className="border p-2 rounded w-full"
              placeholder="Note (optional)"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <div className="w-full flex justify-between items-center gap-3">
            <Button
              variant="text"
              color="gray"
              onClick={handleOpen}
              className="px-4"
            >
              Cancel
            </Button>
            <Button color="blue" onClick={addTransaction} className="px-4">
              Add Transaction
            </Button>
          </div>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
