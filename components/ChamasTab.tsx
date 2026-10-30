"use client";

import { useEffect, useState } from "react";
import {
    collection,
    onSnapshot,
    query,
    orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import ActionsAccordion from "./special_functions/ActionsAccordion";

/* =======================
   Types
======================= */

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

/* =======================
   Helpers
======================= */

function formatCurrency(amount: number) {
    return amount.toLocaleString("en-KE", {
        style: "currency",
        currency: "KES",
        maximumFractionDigits: 0,
    });
}

function formatDate(ts: number) {
    return new Date(ts).toLocaleString();
}

/* =======================
   Component
======================= */

export default function ChamaTab() {
    const { user } = useAuth();

    const [chamas, setChamas] = useState<Chama[]>([]);
    const [ledger, setLedger] = useState<ChamaLedgerEntry[]>([]);
    const [selectedChamaId, setSelectedChamaId] = useState<string | null>(null);


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

    /* =======================
       Derived State
    ======================= */

    const ledgerForView = ledger.filter(
        (l) => l.chamaId === selectedChamaId
    );

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
       Render
    ======================= */

    return (
        <div className="space-y-6">


            <ActionsAccordion />
            {/* ===== Summary Cards ===== */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                    onClick={() => setSelectedChamaId(null)}
                    className={`p-4 rounded-lg cursor-pointer border ${selectedChamaId === null
                            ? "border-blue-500 bg-gray-800"
                            : "border-gray-700 bg-gray-900"
                        }`}
                >
                    <div className="text-gray-400 text-sm">Unallocated</div>
                    <div className="text-xl font-bold">
                        {formatCurrency(unallocatedBalance)}
                    </div>
                </div>

                {chamas.map((c) => (
                    <div
                        key={c.id}
                        onClick={() => setSelectedChamaId(c.id)}
                        className={`p-4 rounded-lg cursor-pointer border ${selectedChamaId === c.id
                                ? "border-blue-500 bg-gray-800"
                                : "border-gray-700 bg-gray-900"
                            }`}
                    >
                        <div className="text-gray-400 text-sm">{c.name}</div>
                        <div className="text-xl font-bold">
                            {formatCurrency(balanceFor(c.id))}
                        </div>
                    </div>
                ))}
            </div>

            {/* ===== Ledger ===== */}
            <div className="p-4 bg-gray-900 rounded-lg">
                <h3 className="font-semibold mb-3">
                    Ledger —{" "}
                    {selectedChamaId
                        ? chamas.find((c) => c.id === selectedChamaId)?.name
                        : "Unallocated"}
                </h3>

                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {ledgerForView.map((l) => (
                        <div
                            key={l.id}
                            className="p-3 bg-gray-800 rounded border border-gray-700"
                        >
                            <div className="flex justify-between text-sm">
                                <span
                                    className={
                                        l.type === "contribution"
                                            ? "text-green-400"
                                            : "text-red-400"
                                    }
                                >
                                    {l.type === "contribution" ? "Deposit" : "Payout"}
                                </span>
                                <span className="text-gray-400">
                                    {formatDate(l.timestamp)}
                                </span>
                            </div>

                            <div className="font-bold text-lg">
                                {formatCurrency(l.amount)}
                            </div>

                            {l.note && (
                                <div className="text-gray-300 text-sm mt-1">
                                    Note: {l.note}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
