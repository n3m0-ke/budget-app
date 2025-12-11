import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function migrateSavingsTransactionsToLedger(userId: string) {
  const txRef = collection(db, "users", userId, "transactions");
  const snapshot = await getDocs(txRef);

  const savingsTx = snapshot.docs.filter(doc => doc.data().category === "Savings");

  for (const docSnap of savingsTx) {
    const tx = docSnap.data();
    await addDoc(collection(db, "users", userId, "savings_ledger"), {
      type: "deposit",
      amount: Number(tx.amount),
      timestamp: Date.now(),
      source: "historical-migration",
      relatedTransactionId: docSnap.id,
    });
  }

  return savingsTx.length;
}
