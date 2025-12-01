import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function getDailySpendData(userId: string){
    try{
        const txtRef = collection(db, "users", userId, "transactions");
        const q = query(txtRef, orderBy("dateOfTransaction", "asc"));
        const snap = await getDocs(q);

        const daily: Record<string, number> = {};

        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate()-30);

        snap.forEach((doc) => {
            const data = doc.data();
            if (!data.amount || !data.dateOfTransaction) return;

            const txDate = new Date(data.dateOfTransaction);
            if (txDate < thirtyDaysAgo) return;

            const day = data.dateOfTransaction;

            daily[day] = (daily[day] || 0)+ Number(data.amount);
        });

        return Object.keys(daily)
            .sort()
            .map((day) => ({
                dateOfTransaction: day,
                amount: daily[day],
            }));
    }catch (err) {
        console.error("Error loading daily spend data:", err);
        return [];
    }
}