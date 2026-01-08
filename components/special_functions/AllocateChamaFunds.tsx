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

interface Chama {
    id: string;
    name: string;
    status: "active" | "paused" | "completed";
    createdAt: number;
    note?: string;
}

interface ChamaLedgerEntry {
    id: string;
    chamaId: string | null;
    type: "contribution" | "payout";
    amount: number;
    timestamp: number;
    budgetMonth?: string;
    source: "budget" | "manual" | "migration";
    note?: string;
}

export default function AllocateFunds() {
    const { user } = useAuth();

    const [chamas, setChamas] = useState<Chama[]>([]);
    const [ledger, setLedger] = useState<ChamaLedgerEntry[]>([]);
    const [selectedChamaId, setSelectedChamaId] = useState<string | null>(null);

    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);

    /* =======================
       Load Chamas
    ======================= */

    useEffect(() => {
        if (!user) return;

        const ref = collection(db, "users", user.uid, "chamas");
        const q = query(ref, orderBy("createdAt", "asc"));

        return onSnapshot(q, (snap) => {
            setChamas(
                snap.docs.map((d) => ({
                    id: d.id,
                    ...(d.data() as Omit<Chama, "id">),
                }))
            );
        });
    }, [user]);

    /* =======================
       Load Ledger
    ======================= */

    useEffect(() => {
        if (!user) return;

        const ref = collection(db, "users", user.uid, "chama_ledger");
        const q = query(ref, orderBy("timestamp", "desc"));

        return onSnapshot(q, (snap) => {
            setLedger(
                snap.docs.map((d) => ({
                    id: d.id,
                    ...(d.data() as Omit<ChamaLedgerEntry, "id">),
                }))
            );
        });
    }, [user]);

    const balanceFor = (chamaId: string | null) =>
        ledger
            .filter((l) => l.chamaId === chamaId)
            .reduce(
                (sum, l) =>
                    l.type === "contribution"
                        ? sum + l.amount
                        : sum - l.amount,
                0
            );

    const unallocatedBalance = balanceFor(null);


     /* =======================
       Allocation Handler
    ======================= */

    const handleAllocate = async () => {
        if (!user) return;
        if (!selectedChamaId) {
            alert("Select a chama.");
            return;
        }

        const value = Number(amount);
        if (!value || value <= 0) {
            alert("Invalid amount.");
            return;
        }

        if (value > unallocatedBalance) {
            alert("Insufficient unallocated funds.");
            return;
        }

        setLoading(true);

        try {
            const baseRef = collection(db, "users", user.uid, "chama_ledger");

            // Withdraw from unallocated
            await addDoc(baseRef, {
                chamaId: null,
                type: "payout",
                amount: value,
                timestamp: Date.now(),
                source: "manual",
                note: `Allocated to chama`,
            });

            // Deposit into selected chama
            await addDoc(baseRef, {
                chamaId: selectedChamaId,
                type: "contribution",
                amount: value,
                timestamp: Date.now(),
                source: "manual",
                note,
            });

            setAmount("");
            setNote("");
        } catch {
            alert("Allocation failed.");
        } finally {
            setLoading(false);
        }
    };

    

    return (     
        <div className="p-4 bg-gray-900 rounded-lg space-y-3">
                <h3 className="font-semibold text-blue-300">
                    Allocate from Unallocated
                </h3>

                <select
                    value={selectedChamaId ?? ""}
                    onChange={(e) =>
                        setSelectedChamaId(e.target.value || null)
                    }
                    className="w-full p-2 bg-gray-800 rounded border border-gray-700"
                >
                    <option value="">Select Chama</option>
                    {chamas.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>

                <input
                    type="number"
                    placeholder="Amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-2 bg-gray-800 rounded border border-gray-700"
                />

                <input
                    type="text"
                    placeholder="Note (optional)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full p-2 bg-gray-800 rounded border border-gray-700"
                />

                <button
                    onClick={handleAllocate}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded"
                >
                    {loading ? "Processing..." : "Allocate"}
                </button>
            </div>        
    )
}