import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";

interface BudgetCategory {
  amount: string;
  name: string;
  notes: string;
  totalSpent?: number;
}

interface BudgetDoc {
  categories: BudgetCategory[];
  closed: boolean;
  total: number;
  totalDebited: number;
}

interface Transaction {
  id: string;
  amount: number;
  category: string;
  date: string;
  dateOfTransaction: string;
  note?: string;
  paidThrough: string;
  budgetMonth?: string;
}


export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    // ========= 1) GET LATEST BUDGET DOCUMENT =========
    const budgetsRef = collection(db, "users", userId, "budgets");
    const budgetsSnap = await getDocs(budgetsRef);

    if (budgetsSnap.empty) {
      return NextResponse.json({
        budgets: {
          plannedTotal: 0,
          remaining: 0,
          overspentCategoriesCount: 0
        },
        transactions: {
          latest: null,
          mpesaPercentage: 0,
          totalCount: 0
        },
        analysis: {
          budgetSpendPercentage: 0,
          topCategory: null
        }
      });
    }

    // Budget IDs are formatted like "2025-11" so sorting works naturally
    const latestBudgetDoc = budgetsSnap.docs
      .sort((a, b) => (a.id < b.id ? 1 : -1))[0];

    const budgetData = latestBudgetDoc.data();
    const categories = budgetData.categories || [];

    const plannedTotal = categories.reduce((sum: number, c: { amount: any; }) => sum + Number(c.amount), 0);
    const remaining = plannedTotal - Number(budgetData.totalDebited || 0);

    // determine overspending: category.totalSpent > category.amount
    const overspentCategoriesCount = categories.filter(
      (c: { totalSpent: any; amount: any; }) => Number(c.totalSpent || 0) > Number(c.amount)
    ).length;

    // ========= 2) GET TRANSACTIONS =========
    const txRef = collection(db, "users", userId, "transactions");
    const txSnap = await getDocs(txRef);

    const tx = txSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Transaction);

    const totalTx = tx.length;

    const latest = tx
      .sort((a, b) => new Date(b.dateOfTransaction).getTime() - new Date(a.date).getTime())[0] || null;

    // MPESA usage %
    const mpesaCount = tx.filter((t) => t.paidThrough === "MPESA").length;
    const mpesaPercentage = totalTx ? Math.round((mpesaCount / totalTx) * 100) : 0;

    // ========= 3) CATEGORY SPEND ANALYSIS =========
    const categoryTotals: Record<string, number> = {};

    tx.forEach((t) => {
      const cat = t.category || "Uncategorized";
      const amt = Number(t.amount || 0);

      categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
    });

    const topCategory =
      Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const totalSpent = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
    const budgetSpendPercentage = plannedTotal
      ? Math.round((totalSpent / plannedTotal) * 100)
      : 0;

    // ========= FINAL RESPONSE =========
    return NextResponse.json({
      budgets: {
        plannedTotal,
        remaining,
        overspentCategoriesCount
      },
      transactions: {
        latest,
        mpesaPercentage,
        totalCount: totalTx
      },
      analysis: {
        budgetSpendPercentage,
        topCategory
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
