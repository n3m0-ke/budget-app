"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, ResponsiveContainer, Tooltip } from "recharts";
import { getTopCategoriesData } from "@/lib/charts/getTopCategoriesData";
import { useAuth } from "@/lib/useAuth";

export default function CategorySpendingBar({ small = false }) {
  const { user } = useAuth();
  const [data, setData] = useState([]);

  useEffect(() => {
    if (!user) return;

    async function load() {
      const res = await getTopCategoriesData(user.uid);
      setData(res.byAmount.slice(0, 6));
    }

    load();
  }, [user]);

  return (
    <div className="border bg-black/80 p-4 rounded-lg shadow">
      {!small && (
        <h2 className="text-lg text-blue-300 font-semibold mb-3">
          Category Spending
        </h2>
      )}

      <div className={small ? "w-full h-52" : "w-full h-72"}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <Tooltip />
            <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
