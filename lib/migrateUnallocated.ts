import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function migrateUnallocatedForUser(userId: string) {
  const budgetsRef = collection(db, "users", userId, "budgets");
  const snapshot = await getDocs(budgetsRef);

  let count = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const totalDebited = Number(data.totalDebited || 0);
    const totalBudgeted = Number(data.total || 0);

    const unallocated = totalDebited - totalBudgeted;

    if (unallocated > 0) {
      await addDoc(collection(db, "users", userId, "unallocated_ledger"), {
        type: "deposit",
        amount: unallocated,
        timestamp: Date.now(),
        budgetMonth: docSnap.id,        // month key ("2025-01")
        source: "historical-migration",
        note: "",
        relatedTransactionId: "",
      });        
      count++;
    }
  }
  return count;
}
