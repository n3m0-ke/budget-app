"use client";

import { useEffect, useState, useRef } from "react";
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    addDoc,
    doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import ActionsAccordion from "./special_functions/ActionsAccordion";
import { allocateChamaFunds } from "@/lib/financeOperations";
import { repairLegacyChamaLedger } from "@/lib/repairLegacyChamaLedger";

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

    const [newChamaName, setNewChamaName] = useState("");
    const [newChamaNote, setNewChamaNote] = useState("");
    const [creatingChama, setCreatingChama] = useState(false);
    const [repairingLegacy, setRepairingLegacy] = useState(false);


    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);
    const pendingAllocationId = useRef<string | null>(null);

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
       Allocation Handler
    ======================= */

    const handleAllocate = async () => {
        if (!user) return;
        if (!selectedChamaId) {
            alert('Select a Chama.');
            return;
        }
        const value = Number(amount);
        if (!Number.isFinite(value) || value <= 0) {
            alert('Enter an amount greater than zero.');
            return;
        }
        setLoading(true);
        try {
            if (!pendingAllocationId.current) {
                pendingAllocationId.current = doc(collection(db, 'users', user.uid, 'operations')).id;
            }
            await allocateChamaFunds(user.uid, pendingAllocationId.current, selectedChamaId, value, note);
            pendingAllocationId.current = null;
            setAmount('');
            setNote('');
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Allocation failed. Retry to safely resume the same operation.');
        } finally {
            setLoading(false);
        }
    };

    /* =======================
       Create Chama
    ======================= */

    const handleCreateChama = async () => {
        if (!user) return;
        if (!newChamaName.trim()) {
            alert("Chama name is required.");
            return;
        }

        setCreatingChama(true);

        try {
            await addDoc(
                collection(db, "users", user.uid, "chamas"),
                {
                    name: newChamaName.trim(),
                    status: "active",
                    createdAt: Date.now(),
                    note: newChamaNote.trim() || "",
                }
            );

            setNewChamaName("");
            setNewChamaNote("");
        } catch {
            alert("Failed to create chama.");
        } finally {
            setCreatingChama(false);
        }
    };


    /* =======================
       Render
    ======================= */

    return (
        <div className="space-y-6">


            <ActionsAccordion />
            <div className="flex justify-end">
                <button
                    type="button"
                    disabled={repairingLegacy || !user}
                    onClick={async () => {
                        if (!user || repairingLegacy) return;
                        const confirmed = confirm('This will remove only historical Chama ledger entries linked to existing transactions whose category is not “Chama Contribution”, then recalculate the unallocated Chama balance. Entries without a matching transaction will be left untouched. Continue?');
                        if (!confirmed) return;
                        setRepairingLegacy(true);
                        try {
                            const count = await repairLegacyChamaLedger(user.uid);
                            alert(count ? `Repaired ${count} incorrect historical Chama ledger entr${count === 1 ? 'y' : 'ies'}.` : 'No incorrectly categorized historical Chama ledger entries were found.');
                        } catch (error) {
                            alert(error instanceof Error ? error.message : 'Unable to repair historical Chama ledger entries.');
                        } finally {
                            setRepairingLegacy(false);
                        }
                    }}
                    className="text-sm border border-amber-600 text-amber-200 hover:bg-amber-900/30 rounded px-3 py-2 disabled:opacity-50"
                >
                    {repairingLegacy ? 'Checking ledger…' : 'Repair legacy Chama entries'}
                </button>
            </div>
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

            {/* ===== Create Chama ==== */}
            {/* <div className="p-4 bg-gray-900 rounded-lg space-y-3 border border-gray-800">
                <h3 className="font-semibold text-green-300">
                    Add New Chama
                </h3>

                <input
                    type="text"
                    placeholder="Chama name (e.g. Office Chama)"
                    value={newChamaName}
                    onChange={(e) => setNewChamaName(e.target.value)}
                    className="w-full p-2 bg-gray-800 rounded border border-gray-700"
                />

                <input
                    type="text"
                    placeholder="Note (optional)"
                    value={newChamaNote}
                    onChange={(e) => setNewChamaNote(e.target.value)}
                    className="w-full p-2 bg-gray-800 rounded border border-gray-700"
                />

                <button
                    onClick={handleCreateChama}
                    disabled={creatingChama}
                    className="w-full bg-green-600 hover:bg-green-700 text-white p-2 rounded"
                >
                    {creatingChama ? "Creating..." : "Create Chama"}
                </button>
            </div> */}


            {/* ===== Allocation Form ===== */}
            {/* <div className="p-4 bg-gray-900 rounded-lg space-y-3">
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
            </div> */}

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
