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
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const handleCreateChama = async () => {
        if (!user) return;
        if (!newChamaName.trim()) {
            setFeedback({ type: "error", message: "Chama name is required." });
            return;
        }

        setCreatingChama(true);
        setFeedback(null);

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
            setFeedback({ type: "success", message: "Chama created successfully." });
        } catch (error) {
            setFeedback({ type: "error", message: error instanceof Error ? error.message : "Failed to create Chama. Please try again." });
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
                className="w-full p-2 bg-gray-800 text-white placeholder-gray-400 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <input
                type="text"
                placeholder="Note (optional)"
                value={newChamaNote}
                onChange={(e) => setNewChamaNote(e.target.value)}
                className="w-full p-2 bg-gray-800 text-white placeholder-gray-400 rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {feedback && (
                <p role="status" aria-live="polite" className={`text-sm ${feedback.type === "success" ? "text-green-400" : "text-red-400"}`}>
                    {feedback.message}
                </p>
            )}

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