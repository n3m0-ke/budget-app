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

export default function CreateChama() {
    const { user } = useAuth();

    const [newChamaName, setNewChamaName] = useState("");
    const [newChamaNote, setNewChamaNote] = useState("");
    const [creatingChama, setCreatingChama] = useState(false);

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

    return (     
        <div className="p-4 bg-gray-900 rounded-lg space-y-3 border border-gray-800">
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
        </div>        
    )
}