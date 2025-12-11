'use client';
import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
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

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString();
}

export default function TransactionsPage() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [form, setForm] = useState({
    budgetMonth: '',
    dateOfTransaction: new Date().toISOString().split('T')[0],
    category: '',
    amount: '',
    paidThrough: 'MPESA',
    note: '',
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [loading, setLoading] = useState(false);

  // Load budget months
  useEffect(() => {
    if (!user) return;
    const loadBudgets = async () => {
      const budgetsCol = collection(db, 'users', user.uid, 'budgets');
      const snapshot = await getDocs(budgetsCol);

      //Filter our closed budgets
      const months: string[] = snapshot.docs
      .filter(d => !d.data().closed)
      .map(d => d.id)
      .sort();
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
    setLoading(true);
  
    if (!form.budgetMonth || !form.category || !form.amount || !form.dateOfTransaction ) {
      alert('Please fill all required fields.');
      setLoading(false);
      return;
    }
  
    if (!budgets.includes(form.budgetMonth)) {
      alert("You cannot assign a transaction to a closed budget.");
      setLoading(false);
      return;
    }
  
    if (!user) return;
  
    const tx = {
      ...form,
      amount: Number(form.amount),
      date: new Date().toISOString(),
    };
  
    try {
      // 1. Create the transaction
      const txRef = await addDoc(
        collection(db, 'users', user.uid, 'transactions'),
        tx
      );
  
      // ---------------------------------------------------------
      // 2. If category = "Savings", also create a savings ledger deposit
      // ---------------------------------------------------------
      if (tx.category === "Savings") {
        await addDoc(collection(db, "users", user.uid, "savings_ledger"), {
          type: "deposit",
          amount: Number(tx.amount),
          timestamp: Date.now(),
          source: "transaction",
          relatedTransactionId: txRef.id,
          note: tx.note,
        });
      }
      // ---------------------------------------------------------
  
      // Reset UI as before
      setForm({
        budgetMonth: '',
        dateOfTransaction: new Date().toISOString().split('T')[0],
        category: '',
        amount: '',
        paidThrough: 'MPESA',
        note: '',
      });
      setCategories([]);
      setMessage('Transaction added successfully 🎉');
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
  
    } catch (err) {
      console.error(err);
      alert('Failed to add transaction');
      setLoading(false);
    }
  };
  

  /** --- TanStack Table Setup --- */
  const columnHelper = createColumnHelper<any>();

  const columns = useMemo(
    () => [
      columnHelper.accessor('dateOfTransaction', {
        header: 'Transaction Date',
        cell: (info) => {
          const value = info.getValue();
          if (!value) return '';
          const d = new Date(value);
          return d.toLocaleString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          });
        },
        filterFn: (row, columnId, filterValue) => {
          if (!filterValue) return true;
          const rowDate = new Date(row.getValue(columnId)).toISOString().split('T')[0];
          return rowDate === filterValue;
        },
      }),

      columnHelper.accessor('budgetMonth', {
        header: 'Budget Month',
        cell: (info) => formatMonth(info.getValue()),
      }),

      columnHelper.accessor('category', {
        header: 'Category',
        cell: (info) => info.getValue(),
        filterFn: (row, columnId, filterValue) => {
          if (!filterValue || filterValue.length === 0) return true;
          return filterValue.includes(row.getValue(columnId));
        },
      }),

      columnHelper.accessor('amount', {
        header: 'Amount',
        cell: (info) => Number(info.getValue()).toLocaleString(),
      }),

      columnHelper.accessor('paidThrough', {
        header: 'Paid Through',
        cell: (info) => info.getValue(),
        filterFn: (row, columnId, filterValue) => {
          if (!filterValue || filterValue.length === 0) return true;
          return filterValue.includes(row.getValue(columnId));
        },
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
    initialState: { pagination: { pageSize: 10 } },
  });

  if (!user)
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        Redirecting to login...
      </div>
    );

  return (
    <div className="flex flex-col space-y-6">
      <h2 className="text-2xl font-semibold text-blue-300">Add Expenditure</h2>

      {message && (
        <div className="bg-green-100 text-green-700 px-4 py-2 rounded">
          {message}
        </div>
      )}

      <div className="overflow-x-auto max-w-full bg-white/20 backdrop-blur p-4 rounded shadow mb-6 flex flex-col md:flex-row gap-3">
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

        <input
          type="date"
          className="border p-2 rounded flex-1"
          value={form.dateOfTransaction}
          onChange={(e) => setForm({ ...form, dateOfTransaction: e.target.value })}
          required
        />



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

        <br />

        <button
          className={`flex items-center justify-center gap-2 bg-blue-500 text-white px-2 rounded transition-colors duration-200 ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-600'
            }`}
          onClick={addTransaction}
        >
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
          {loading ? 'Adding...' : 'Add'}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-w-full bg-black/40 backdrop-blur-sm rounded shadow p-4">
        <table className="table-auto w-full">
          <thead className="bg-gray/30 backdrop-blur-sm text-blue-300">
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
                    {/* Column Filter */}
                    {header.column.getCanFilter() && (
                      <>
                        {header.column.id === 'category' && (
                          <select
                            multiple
                            onChange={(e) => {
                              const values = Array.from(e.target.selectedOptions, (opt) => opt.value);
                              header.column.setFilterValue(values);
                            }}
                            className="mt-1 border border-gray-300 rounded px-2 py-1 text-sm w-full text-gray-700"
                          >
                            <option value="Fare/Transport">Fare/Transport</option>
                            <option value="Essentials + Grooming (recurring)">Essentials + Grooming (recurring)</option>
                            <option value="Household">Household</option>
                            <option value="Debt Repayment">Debt Repayment</option>
                            <option value="Parents Support">Parents Support</option>
                            <option value="Grooming (non-recurring)">Grooming (non-recurring)</option>
                            <option value="Miscellaneous">Miscellaneous</option>
                            <option value="Savings">Savings</option>
                            <option value="Investment">Investment</option>
                            <option value="Money Lost">Money Lost</option>
                            <option value="Money Recovered">Money Recovered</option>
                          </select>
                        )}

                        {header.column.id === 'paidThrough' && (
                          <select
                            multiple
                            onChange={(e) => {
                              const values = Array.from(e.target.selectedOptions, (opt) => opt.value);
                              header.column.setFilterValue(values);
                            }}
                            className="mt-1 border border-gray-300 rounded px-2 py-1 text-sm w-full text-gray-700"
                          >
                            <option>MPESA</option>
                            <option>Cash</option>
                            <option>Bank Transfer</option>
                          </select>
                        )}

                        {header.column.id === 'dateOfTransaction' && (
                          <input
                            type="date"
                            onChange={(e) => header.column.setFilterValue(e.target.value)}
                            className="mt-1 border border-gray-300 rounded px-2 py-1 text-sm w-full text-gray-700"
                          />
                        )}

                        {/* Default text input for others */}
                        {['note', 'budgetMonth', 'amount'].includes(header.column.id) && (
                          <input
                            value={(header.column.getFilterValue() ?? '') as string}
                            onChange={(e) => header.column.setFilterValue(e.target.value)}
                            placeholder="Filter..."
                            className="mt-1 border border-gray-300 rounded px-2 py-1 text-sm w-full text-gray-700"
                          />
                        )}
                      </>
                    )}

                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b bg-black/80 backdrop-blur text-blue-100">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="p-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between mt-3 text-blue-200 text-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-3 py-1 bg-gray-800 rounded disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-3 py-1 bg-gray-800 rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>

          <div>
            Page <strong>{table.getState().pagination.pageIndex + 1}</strong> of{' '}
            {table.getPageCount()}
          </div>
        </div>
      </div>
    </div>
  );
}
