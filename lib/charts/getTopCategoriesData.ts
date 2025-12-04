import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function getTopCategoriesData(userId: string) {
  try {
    const ref = collection(db, "users", userId, "transactions");
    const q = query(ref, orderBy("dateOfTransaction", "desc"));
    const snap = await getDocs(q);

    const totals: Record<string, number> = {};
    const counts: Record<string, number> = {};

    snap.forEach((doc) => {
      const d = doc.data();
      if (!d.category || !d.amount) return;

      const category = d.category.trim();
      const amount = Number(d.amount);

      // totals
      totals[category] = (totals[category] || 0) + amount;

      // frequency
      counts[category] = (counts[category] || 0) + 1;
    });

    const byAmount = Object.entries(totals)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6); // top 6

    const byFrequency = Object.entries(counts)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    
    console.log("byAmount: ", byAmount, "\nbyFrequency", byFrequency);

    return { byAmount, byFrequency };

  } catch (err) {
    console.error("Error loading top categories:", err);
    return { byAmount: [], byFrequency: [] };
  }
}
