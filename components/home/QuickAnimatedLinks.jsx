"use client";

import { useEffect, useState } from "react";
import { Tooltip } from "@mui/material";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";

import { FiPocket, FiCreditCard, FiTrendingUp, FiCheckCircle, FiAlertCircle, FiXCircle } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

export default function QuickAnimatedLinks() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // Individual message index per card (plain JS object)
  const [indices, setIndices] = useState({ 0: 0, 1: 0, 2: 0 });

  // ──────────────────────────────────────────────────────
  // FETCH DATA
  // ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    async function load() {
      try {
        // Budgets
        const budgetsRef = collection(db, "users", user.uid, "budgets");
        const budgetsDocs = await getDocs(budgetsRef);
        let categories = [];
        let tese_categories = [];
        let totalPlanned = 0;
        let totalDebited = 0;

        budgetsDocs.forEach((doc) => {
          const d = doc.data();
          categories.push(d);
          tese_categories.push(d.categories);
          
          totalPlanned += Number(d.total || 0);
          totalDebited += Number(d.totalDebited || 0);

          console.log("Categories", tese_categories);
        });

        // Transactions
        const txRef = collection(db, "users", user.uid, "transactions");
        const latestTxQuery = query(txRef, orderBy("dateOfTransaction", "desc"), limit(1));
        const latestTxSnap = await getDocs(latestTxQuery);
        const latest = latestTxSnap.empty ? null : latestTxSnap.docs[0].data();

        const allTxSnap = await getDocs(txRef);
        const txCount = allTxSnap.size;

        let spent = 0;
        let categoryTotals = {};
        let methodTotals = {};

        allTxSnap.forEach((doc) => {
          const t = doc.data();
          const amt = Number(t.amount || 0);
          spent += amt;
          categoryTotals[t.category] = (categoryTotals[t.category] || 0) + amt;
          methodTotals[t.paidThrough] = (methodTotals[t.paidThrough] || 0) + amt;
        });

        const topCategory = Object.keys(categoryTotals)
          .sort((a, b) => categoryTotals[b] - categoryTotals[a])[0] || "N/A";

        const topMethod = Object.keys(methodTotals)
          .sort((a, b) => methodTotals[b] - methodTotals[a])[0] || "N/A";

        const percentSpent = totalPlanned ? Math.round((spent / totalPlanned) * 100) : 0;

        setData({
          budgets: { categories, totalPlanned, totalDebited },
          transactions: { latest, count: txCount },
          analysis: { topCategory, topMethod, percentSpent, spent, totalPlanned },
        });
      } catch (err) {
        console.error("FIRESTORE LOAD ERROR:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  // ──────────────────────────────────────────────────────
  // INDEPENDENT MESSAGE ROTATION (3–6s per card)
  // ──────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || !data) return;

    const intervals = Object.keys(indices).map((key) => {
      const i = Number(key);
      return setInterval(() => {
        setIndices((prev) => ({
          ...prev,
          [i]: (prev[i] + 1) % items[i].messages.length,
        }));
      }, 3000 + Math.random() * 3000);
    });

    return () => intervals.forEach(clearInterval);
  }, [loading, data]);

  // ──────────────────────────────────────────────────────
  // LOADING SKELETON
  // ──────────────────────────────────────────────────────
  if (loading || !data) {
    return (
      <div className="grid grid-rows-1 md:grid-rows-3 gap-6 p-4 w-full">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-28 bg-gray-800/50 border border-gray-700 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────
  // CARD DATA
  // ──────────────────────────────────────────────────────
  const items = [
    {
      title: "Budgets",
      icon: FiPocket,
      route: "/budgets",
      messages: [
        `Planned KES ${data.budgets.totalPlanned.toLocaleString()}`,
        `Spent KES ${data.budgets.totalDebited.toLocaleString()}`,
        `${data.budgets.categories.filter((c) => Number(c.amount) === 0).length} categories at KES 0`,
      ],
      gradient: "from-emerald-500 to-teal-600",
      status: data.budgets.totalDebited <= data.budgets.totalPlanned ? "good" : "warning",
    },
    {
      title: "Transactions",
      icon: FiCreditCard,
      route: "/transactions",
      messages: [
        data.transactions.latest
          ? `Latest: ${data.transactions.latest.category} – KES ${data.transactions.latest.amount}`
          : "No recent transactions",
        data.transactions.latest
          ? `${data.transactions.latest.paidThrough} • ${data.transactions.latest.note || "No note"}`
          : "No recent activity",
        `${data.transactions.count} total transactions`,
      ],
      gradient: "from-blue-500 to-indigo-600",
      status: "neutral",
    },
    {
      title: "Analysis",
      icon: FiTrendingUp,
      route: "/analysis",
      messages: [
        `You spent ${data.analysis.percentSpent}% of budget`,
        `${data.analysis.topCategory} was top category`,
        `${data.analysis.topMethod} used most`,
      ],
      gradient:
        data.analysis.percentSpent > 100
          ? "from-red-500 to-rose-600"
          : data.analysis.percentSpent > 80
          ? "from-amber-500 to-orange-600"
          : "from-purple-500 to-pink-600",
      status:
        data.analysis.percentSpent > 100
          ? "bad"
          : data.analysis.percentSpent > 80
          ? "warning"
          : "good",
    },
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case "good":   return <FiCheckCircle className="w-6 h-6 text-green-400" />;
      case "warning":return <FiAlertCircle className="w-6 h-6 text-amber-400" />;
      case "bad":    return <FiXCircle className="w-6 h-6 text-red-400" />;
      default:       return null;
    }
  };

  // ──────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────
  return (
    <div className="grid grid-rows-1 md:grid-rows-3 gap-4 p-4 w-full mx-auto">
      {items.map((item, i) => (
        <motion.div
          key={item.title}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: i * 0.2, ease: "easeOut" }}
          whileHover={{ y: -10, transition: { duration: 0.25 } }}
          onClick={() => router.push(item.route)}
          className="relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900/70 backdrop-blur-xl shadow-xl cursor-pointer group"
        >
          {/* Gradient overlay */}
          <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-10 group-hover:opacity-30 transition-opacity duration-500`} />

          <div className="relative p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="p-1 bg-black/50 rounded-lg backdrop-blur border border-gray-700">
                <item.icon className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-md font-semibold text-white mb-2">{item.title}</h3>
            </div>

            {/* <Tooltip title={item.title} arrow>
              <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
            </Tooltip> */}

            {/* Rotating message */}
            <div className="h-auto flex items-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={indices[i]}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.35 }}
                  className="text-sm text-gray-100 leading-relaxed"
                >
                  {item.messages[indices[i] % item.messages.length]}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
        </motion.div>
      ))}
    </div>

  );
}