// // /app/api/dashboard/summary/route.ts

// import { db } from "@/lib/firebase";
// import { collection, getDocs, query, where, orderBy } from "firebase/firestore";

// export async function GET(req) {
//   const userId = req.headers.get("userId"); // or however you pass auth

//   const now = new Date();
//   const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

//   // --- Fetch Budgets ---
//   const budgetSnap = await getDocs(collection(db, "users", userId, "budgets"));
//   const budgets = budgetSnap.docs.map((d) => d.data());

//   const totalBudget = budgets.reduce((a, b) => a + (b.amount || 0), 0);

//   // --- Fetch Transactions for This Month ---
//   const txRef = collection(db, "users", userId, "transactions");
//   const txQ = query(txRef, where("date", ">=", monthStart), orderBy("date", "desc"));
//   const txSnap = await getDocs(txQ);

//   const transactions = txSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

//   const totalSpent = transactions.reduce((a, t) => a + (t.amount || 0), 0);

//   // Remaining
//   const remainingBudget = totalBudget - totalSpent;

//   // Latest transaction
//   const latestTx = transactions[0];

//   // Category spend analysis
//   const categoryTotals = {};
//   const methodTotals = {};

//   transactions.forEach((t) => {
//     categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
//     methodTotals[t.method] = (methodTotals[t.method] || 0) + t.amount;
//   });

//   const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0];

//   const totalPayments = Object.values(methodTotals).reduce((a, b) => a + b, 0);
//   const mpesaPercent = ((methodTotals["mpesa"] || 0) / totalPayments) * 100;

//   return Response.json({
//     budgets: {
//       totalBudget,
//       totalSpent,
//       remainingBudget,
//       overspendingCategories: Object.keys(categoryTotals).filter(
//         (cat) => categoryTotals[cat] > (budgets.find((b) => b.category === cat)?.amount || Infinity)
//       ),
//     },
//     transactions: {
//       latest: latestTx || null,
//       count: transactions.length,
//     },
//     analysis: {
//       spendingPercentage: totalBudget ? (totalSpent / totalBudget) * 100 : 0,
//       topCategory,
//       mpesaPercent: Math.round(mpesaPercent),
//     },
//   });
// }
