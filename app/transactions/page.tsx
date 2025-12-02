import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

function formatDay(date: Date) {
  return date.toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
  });
}

export async function getDailySpendData(userId: string) {
  try {
    const txRef = collection(db, "users", userId, "transactions");
    const q = query(txRef, orderBy("dateOfTransaction", "asc"));
    const snap = await getDocs(q);

    // Build a map of totals for days WITH transactions
    const dailyTotals: Record<string, number> = {};

    snap.forEach((doc) => {
      const data = doc.data();
      if (!data.amount || !data.dateOfTransaction) return;

      // Convert Firestore timestamp or string into Date
      const txDate = new Date(data.dateOfTransaction);

      const key = txDate.toISOString().split("T")[0]; // YYYY-MM-DD
      dailyTotals[key] = (dailyTotals[key] || 0) + Number(data.amount);
    });

    // Build last 30 days list (including missing days)
    const results: { date: string; amount: number }[] = [];

    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 29); // 30 days inclusive

    for (
      let d = new Date(start);
      d <= today;
      d.setDate(d.getDate() + 1)
    ) {
      const key = d.toISOString().split("T")[0]; // YYYY-MM-DD format
      results.push({
        date: formatDay(d), // e.g., "03 Nov"
        amount: dailyTotals[key] || 0,
      });
    }

    return results;
  } catch (err) {
    console.error("Error loading daily spend data:", err);
    return [];
  }
}
