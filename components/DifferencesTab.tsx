"use client";

import { useEffect, useState } from "react";
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    addDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";

interface unallocatedRecord {
    id: string;
    amount: number;
    budgetMonth: string;
    relatedTransactionId: string;
    source: string;
    timestamp: number;
    type: string;
    note: string;
}

function formatMonth(monthStr: string) {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

export default function DifferencesTab() {
    const { user } = useAuth();
    const [unallocatedLedger, setUnallocatedLedger] = useState<unallocatedRecord[]>([]);
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);
    const [loadingLedger, setLoadingLedger] = useState(false);

    // Load ledger
    useEffect(() => {
        if (!user) return;

        setLoadingLedger(true);

        const ref = collection(db, "users", user.uid, "unallocated_ledger");
        const q = query(ref, orderBy("timestamp", "desc"));

        const unsub = onSnapshot(
            q,
            (snapshot) => {
                const records: unallocatedRecord[] = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...(doc.data() as Omit<unallocatedRecord, "id">),
                }));
                setUnallocatedLedger(records);
                setLoadingLedger(false);
            },
            () => setLoadingLedger(false)
        );

        return () => unsub();
    }, [user]);

    // Summary calculations
    const totalDeposits = unallocatedLedger
        .filter((l) => l.type === "deposit")
        .reduce((s, e) => s + Number(e.amount), 0);

    const totalWithdrawals = unallocatedLedger
        .filter((l) => l.type === "withdrawal")
        .reduce((s, e) => s + Number(e.amount), 0);

    const available = totalDeposits - totalWithdrawals;

    // Handle withdrawal
    const handleWithdraw = async () => {
        if (!withdrawAmount || Number(withdrawAmount) <= 0) {
            alert("Enter a valid amount.");
            return;
        }
        if (Number(withdrawAmount) > available) {
            alert("You do not have enough unallocated funds.");
            return;
        }

        setLoading(true);
        try {
            if (!user) return;

            await addDoc(collection(db, "users", user.uid, "unallocated_ledger"), {
                type: "withdrawal",
                amount: Number(withdrawAmount),
                timestamp: Date.now(),
                budgetMonth: "",
                source: "manual-withdrawal",
                note: note || "",
                relatedTransactionId: "",
            });

            setWithdrawAmount("");
            setNote("");
            setLoading(false);
        } catch {
            alert("Failed to record withdrawal");
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Loading */}
            {loadingLedger && (
                <div className="flex justify-center py-6">
                    <svg
                        className="animate-spin h-6 w-6 text-gray-300 mr-2"
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
                    Loading Data...
                </div>
            )}

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-gray-800 rounded-lg">
                    <div className="text-gray-400 text-sm">Total Deposited</div>
                    <div className="text-xl font-bold">{totalDeposits.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-gray-800 rounded-lg">
                    <div className="text-gray-400 text-sm">Total Withdrawn</div>
                    <div className="text-xl font-bold">{totalWithdrawals.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-gray-800 rounded-lg">
                    <div className="text-gray-400 text-sm">Available Balance</div>
                    <div className="text-xl font-bold text-green-400">{available.toLocaleString()}</div>
                </div>
            </div>

            {/* Withdrawal Section */}
            <div className="p-4 bg-gray-900 rounded-lg space-y-3">
                <h3 className="font-semibold text-blue-300">Manual Withdrawal</h3>

                <input
                    type="number"
                    placeholder="Amount"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                />

                <input
                    type="text"
                    placeholder="Note (optional)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                />

                <button
                    disabled={loading}
                    onClick={handleWithdraw}
                    className="w-full bg-red-600 hover:bg-red-700 text-white p-2 rounded"
                >
                    {loading ? "Processing..." : "Withdraw"}
                </button>
            </div>

            {/* Ledger */}
            <div className="p-4 bg-gray-900 rounded-lg">
                <h3 className="font-semibold mb-3">Unallocated Ledger</h3>

                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {unallocatedLedger.map((entry) => (
                        <div
                            key={entry.id}
                            className="p-3 bg-gray-800 rounded border border-gray-700"
                        >
                            <div className="flex justify-between">
                                <span
                                    className={
                                        entry.type === "deposit"
                                            ? "text-green-400"
                                            : "text-red-400"
                                    }
                                >
                                    {entry.type.toUpperCase()}
                                </span>
                                <span className="text-sm text-gray-400">
                                    {new Date(entry.timestamp).toLocaleString()}
                                </span>
                            </div>

                            <div className="font-bold text-lg">
                                {Number(entry.amount).toLocaleString()}
                            </div>

                            {entry.budgetMonth && (
                                <div className="text-xs text-blue-300">
                                    From {formatMonth(entry.budgetMonth)} Budget
                                </div>
                            )}

                            {entry.note && (
                                <div className="text-gray-300 text-sm mt-1">
                                    Note: {entry.note}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
