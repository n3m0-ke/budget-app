'use client';
import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  addDoc,
} from 'firebase/firestore';
import { useAuth } from '@/lib/useAuth';
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  flexRender,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';

function formatMonth(monthStr: string) {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

export default function TransactionsPage() {
  const { user } = useAuth();
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
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Load budget months
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

  // Load categories
  useEffect(() => {
    if (!user || !form.budgetMonth) return;
    const loadCategories = async () => {
      const budgetsCol = collection(db, 'users', user.uid, 'budgets');
      const snapshot = await getDocs(budgetsCol);
      let cats: string[] = [];
      snapshot.forEach((doc) => {
        if (doc.id === form.budgetMonth && doc.data().categories)
          cats = (doc.data().categories as { name: string }[]).map(
            (c) => c.name
          );
      });
      setCategories(cats);
      setForm((prev) => ({ ...prev, category: '' }));
    };
    loadCategories();
  }, [form.budgetMonth, user]);

  // Real-time transactions listener
  useEffect(() => {
    if (!user) return;
    const txCol = collection(db, 'users', user.uid, 'transactions');
    const q = query(txCol, orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs: any[] = [];
      snapshot.forEach((doc) => txs.push({ id: doc.id, ...doc.data() }));
      setTransactions(txs);
    });
    return () => unsubscribe();
  }, [user]);

  const addTransaction = async () => {
    if (!form.budgetMonth || !form.category || !form.amount) {
      alert('Please fill all required fields');
      return;
    }
    if (!user) return;

    const tx = {
      ...form,
      amount: Number(form.amount),
      date: new Date().toISOString(),
    };
    try {
      await addDoc(collection(db, 'users', user.uid, 'transactions'), tx);
      setForm({
        budgetMonth: '',
        category: '',
        amount: '',
        paidThrough: 'MPESA',
        note: '',
      });
      setCategories([]);
      setMessage('Transaction added successfully 🎉');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to add transaction');
    }
  };

  /** --- TanStack Table Setup --- */
  const columnHelper = createColumnHelper<any>();

  const columns = useMemo(
    () => [
      columnHelper.accessor('date', {
        header: 'Date',
        cell: (info) => {
          const value = info.getValue();
          if (!value) return '';
          const d = new Date(value);
          return d.toLocaleString('default', {
            month: 'long',
            year: 'numeric',
          });
        },
      }),
      columnHelper.accessor('budgetMonth', {
        header: 'Budget Month',
        cell: (info) => formatMonth(info.getValue()),
      }),
      columnHelper.accessor('category', {
        header: 'Category',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('amount', {
        header: 'Amount',
        cell: (info) => Number(info.getValue()).toLocaleString(),
      }),
      columnHelper.accessor('paidThrough', {
        header: 'Paid Through',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('note', {
        header: 'Note',
        cell: (info) => info.getValue(),
      }),
    ],
    [columnHelper]
  );

  const filteredTransactions = useMemo(() => {
    if (!form.budgetMonth) return transactions;
    return transactions.filter((tx) => tx.budgetMonth === form.budgetMonth);
  }, [transactions, form.budgetMonth]);

  const table = useReactTable({
    data: filteredTransactions,
    columns,
    state: { sorting, columnFilters },
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!user)
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        Redirecting to login...
      </div>
    );

  return (
    <div className="flex flex-col space-y-6">
      <h2 className="text-2xl font-semibold">Add Expenditure</h2>

      {message && (
        <div className="bg-green-100 text-green-700 px-4 py-2 rounded">
          {message}
        </div>
      )}

      <div className="bg-white p-4 rounded shadow mb-6 flex flex-col md:flex-row gap-3">
        {/* Budget Month */}
        <select
          className="border p-2 rounded flex-1"
          value={form.budgetMonth}
          onChange={(e) => setForm({ ...form, budgetMonth: e.target.value })}
        >
          <option value="">Select Budget Month</option>
          {budgets.map((m) => (
            <option key={m} value={m}>
              {formatMonth(m)}
            </option>
          ))}
        </select>

        {/* Category */}
        <select
          className="border p-2 rounded flex-1"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          disabled={!categories.length}
        >
          <option value="">Select Category</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Amount */}
        <input
          type="number"
          className="border p-2 rounded w-32"
          placeholder="Amount"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />

        {/* Paid Through */}
        <select
          className="border p-2 rounded w-32"
          value={form.paidThrough}
          onChange={(e) => setForm({ ...form, paidThrough: e.target.value })}
        >
          <option>MPESA</option>
          <option>Cash</option>
          <option>Bank Transfer</option>
        </select>

        {/* Note */}
        <input
          type="text"
          className="border p-2 rounded flex-1"
          placeholder="Note (optional)"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />

        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={addTransaction}
        >
          Add
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded shadow p-4">
        <table className="min-w-full">
          <thead className="bg-gray-100 text-gray-700">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="p-3 text-left">
                    <div
                      onClick={header.column.getToggleSortingHandler()}
                      className="cursor-pointer select-none flex items-center gap-1"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {{
                        asc: '↑',
                        desc: '↓',
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>

                    {/* Column Filter */}
                    {header.column.getCanFilter() && (
                      <input
                        value={(header.column.getFilterValue() ?? '') as string}
                        onChange={(e) =>
                          header.column.setFilterValue(e.target.value)
                        }
                        placeholder="Filter..."
                        className="mt-1 border border-gray-300 rounded px-2 py-1 text-sm w-full"
                      />
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="p-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
