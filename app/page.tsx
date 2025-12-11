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

import DailySpendLineChart from '@/components/charts/DailySpendLineChart';
import PaymentMethodBreakdownPie from '@/components/charts/PaymentMethodBreakdownPie';
import CategorySpendingBar from '@/components/charts/CategorySpendingBar';
import QuickAnimatedLinks from '@/components/home/QuickAnimatedLinks';
import TopCategoriesSummary from '@/components/charts/TopCategoriesSummary';

import { migrateSavingsTransactionsToLedger } from '@/lib/migrateSavings';


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
    dateOfTransaction: '',
    category: '',
    amount: '',
    paidThrough: 'MPESA',
    note: '',
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Redirect to login if not authenticated

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

  const runMigration = async () => {

    if (user){
      const count = await migrateSavingsTransactionsToLedger(user.uid);
      alert(`Migration complete. Added ${count} savings ledger entries.`);
    }else{
      alert(`User not set!`);
    }
    
  };

  const addTransaction = async () => {
    if (!form.budgetMonth || !form.category || !form.amount)
      return alert('Please fill all required fields');

    if (!user) return;

    const tx = {
      ...form,
      amount: Number(form.amount),
      date: new Date().toISOString(),
    };

    setLoading(true);

    try {
      await addDoc(collection(db, 'users', user.uid, 'transactions'), tx);

      setTransactions([tx, ...transactions]);
      setForm({
        budgetMonth: '',
        dateOfTransaction: '',
        category: '',
        amount: '',
        paidThrough: 'MPESA',
        note: '',
      });
      setOpen(false);
      setMessage('Transaction added successfully 🎉');
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);

    } catch (error) {
      console.error(error);
      alert('Failed to add transaction');
      setLoading(false);
    }
  };

  if (!user)
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500 bg-transparent">
        <svg
          className="animate-spin h-5 w-5 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          ></path>
        </svg>
        Redirecting to login...
      </div>
    );
  

  return (
    <div className="flex flex-col space-y-6 bg-transparent">
      <div className="flex justify-between items-center ">
        {/* <h1 className="text-3xl font-semibold text-blue-300 mb-2">
          Welcome back
        </h1> */}

        {/* <Button
          color="blue"
          onClick={runMigration}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          placeholder={undefined} 
          onPointerEnterCapture={undefined} 
          onPointerLeaveCapture={undefined}       >
          Run migration
        </Button> */}
      </div>

      {message && (
        <div className="bg-green-100 text-green-700 px-4 py-2 rounded">
          {message}
        </div>
      )}

      {/* Existing Cards */}
      {/* <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
   
        <div className="p-6 border bg-black/80 backdrop-blur-m rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-2 text-gray-200">
            Planned Budget
          </h2>
          <p className="text-gray-100 mb-4">
            Set and review your monthly budgets per category.
          </p>
          <button
            onClick={() => router.push('/budgets')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Create Monthly Budget
          </button>
        </div>

        <div className="p-6 border bg-black/80 backdrop-blur-m rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-2 text-gray-200">
            Expenditures
          </h2>
          <p className="text-gray-100 mb-4">
            Track your daily spending by category and payment method.
          </p>
          <button
            onClick={() => router.push('/transactions')}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Add/View Expenditures
          </button>
        </div>

     
        <div className="p-6 border bg-black/80 backdrop-blur-m rounded-lg shadow">
          <h2 className="font-semibold text-lg mb-2 text-gray-200">
            Monthly Analysis
          </h2>
          <p className="text-gray-100 mb-4">
            Compare budgeted amounts with actual expenditures.
          </p>
          <button
            onClick={() => router.push('/analysis')}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            View Monthly Analysis
          </button>
        </div>
      </div> */}

      <DailySpendLineChart />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <QuickAnimatedLinks />
        <PaymentMethodBreakdownPie minimal />
        <CategorySpendingBar small />
      </div>

      {/* <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <PaymentMethodBreakdownPie />
      </div> */}

      <div className="mt-10">
        <TopCategoriesSummary />
      </div>

      {/* Transaction Modal */}
      {/* <Dialog
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

            <input
              type="date"
              className="border p-2 rounded w-full"
              value={form.dateOfTransaction || new Date().toISOString().split('T')[0]}
              onChange={(e) => setForm({ ...form, dateOfTransaction: e.target.value })}
              required
            />

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
              {loading && (
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
              )}
              {loading ? 'Adding Transaction Details' : 'Add Transaction'}
            </Button>
          </div>
        </DialogFooter>
      </Dialog> */}
    </div>
  );
}
