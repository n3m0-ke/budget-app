
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function getPaymentMethodData(userId: string) {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const txtRef = collection(db, "users", userId, "transactions");
    const q = query(
      txtRef,
      orderBy("dateOfTransaction", "asc")
    );
    const snap = await getDocs(q);

    let paymentMethodData = [
      { name: "MPESA", value: 0 },
      { name: "Cash", value: 0 },
      { name: "Bank Transfer", value: 0 },
    ];

    snap.forEach((doc) => {
      const data = doc.data();
      if (!data.paidThrough) return;

      const method = paymentMethodData.find((m) => m.name === data.paidThrough);
      if (method) {
        method.value++;
      }
    });

    return paymentMethodData;
  } catch (err) {
    console.error("Error loading daily spend data:", err);
    return [];
  }
}
