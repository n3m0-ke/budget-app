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

interface savingsRecord {
  id: string;
  amount: number;
  relatedTransactionId: string;
  source: string;
  timestamp: number;
  type: string;
  note: string;
}

export default function SavingsTab() {
    const { user } = useAuth();
    const [ledger, setLedger] = useState<savingsRecord[]>([]);
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);
    const [loadingLedger, setLoadingLedger] = useState(false);

    const savingsRef = user
    ? collection(db, "users", user.uid, "savings_ledger")
    : null;

    // Load ledger
    useEffect(() => {
      if (!user) return;
    
      setLoadingLedger(true);
    
      const savingsRef = collection(db, "users", user.uid, "savings_ledger");
      const q = query(savingsRef, orderBy("timestamp", "desc"));
    
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const items: savingsRecord[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<savingsRecord, "id">),
          }));
    
          setLedger(items);
          setLoadingLedger(false); // ← correct place
        },
        (error) => {
          console.error("Error loading savings ledger:", error);
          setLoadingLedger(false);
        }
      );
    
      return () => unsub();
    }, [user]);
    

    // test if ledger records are returned
    useEffect(() => {
      console.log(ledger);
    });      
  
    // Compute summary
    const totalDeposits = ledger
      .filter((l) => l.type === "deposit")
      .reduce((sum, e) => sum + Number(e.amount), 0);
  
    const totalWithdrawals = ledger
      .filter((l) => l.type === "withdrawal")
      .reduce((sum, e) => sum + Number(e.amount), 0);
  
    const available = totalDeposits - totalWithdrawals;
  
    // Handle withdrawal
    const handleWithdraw = async () => {
      if (!withdrawAmount || Number(withdrawAmount) <= 0) {
        alert("Enter a valid amount.");
        return;
      }
      if (Number(withdrawAmount) > available) {
        alert("You do not have enough savings to withdraw this amount.");
        return;
      }
  
      setLoading(true);
      try {

        if (!user) return null;

        await addDoc(collection(db, "users", user.uid, "savings_ledger"), {
          type: "withdrawal",
          amount: Number(withdrawAmount),
          timestamp: Date.now(),
          source: "manual",
          note: note || "",
          relatedTransactionId: "",
        });
  
        setWithdrawAmount("");
        setNote("");
        setLoading(false);
      } catch (e) {
        console.error(e);
        alert("Failed to record withdrawal.");
        setLoading(false);
      }
    };
  
    return (
      <div className="space-y-6">
        {loadingLedger ? (
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
              Loading Data
            </div>
          ) : null}

  
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-gray-800 rounded-lg">
            <div className="text-gray-400 text-sm">Total Saved</div>
            <div className="text-xl font-bold">{totalDeposits.toLocaleString()}</div>
          </div>
  
          <div className="p-4 bg-gray-800 rounded-lg">
            <div className="text-gray-400 text-sm">Total Withdrawn</div>
            <div className="text-xl font-bold">{totalWithdrawals.toLocaleString()}</div>
          </div>
  
          <div className="p-4 bg-gray-800 rounded-lg">
            <div className="text-gray-400 text-sm">Available</div>
            <div className="text-xl font-bold text-green-400">{available.toLocaleString()}</div>
          </div>
        </div>
  
        {/* Withdrawal Form */}
        <div className="p-4 bg-gray-900 rounded-lg space-y-3">
          <h3 className="font-semibold">Withdraw from Savings</h3>
  
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
  
        {/* Ledger List */}
        <div className="p-4 bg-gray-900 rounded-lg">
          <h3 className="font-semibold mb-3">Savings Ledger</h3>
  
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {ledger.map((entry) => (
              <div
                key={entry.id}
                className="p-3 bg-gray-800 rounded border border-gray-700"
              >
                <div className="flex justify-between">
                  <span className={entry.type === "deposit" ? "text-green-400" : "text-red-400"}>
                    {entry.type.toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-400">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="font-bold text-lg">{Number(entry.amount).toLocaleString()}</div>
                {entry.note && (
                  <div className="text-gray-300 text-sm mt-1">Note: {entry.note}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }