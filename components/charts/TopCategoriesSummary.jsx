"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { getTopCategoriesData } from "@/lib/charts/getTopCategoriesData";

export default function TopCategoriesSummary() {
  const { user } = useAuth();
  const [data, setData] = useState({ byAmount: [], byFrequency: [] });

  useEffect(() => {
    if (!user) return;

    async function load() {
      const result = await getTopCategoriesData(user.uid);
      setData(result);
    }

    load();
  }, [user]);

  return (
    <div className="border p-6 bg-black/80 backdrop-blur-md rounded-lg shadow">
      <h2 className="text-lg font-semibold text-blue-300 mb-4">
        Top Spending Categories
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By Amount */}
        <div>
          <h3 className="text-md text-purple-300 font-medium mb-2">
            By Amount Spent
          </h3>
          <ul className="space-y-2">
            {data.byAmount.map((cat, i) => (
              <li
                key={i}
                className="flex justify-between border border-gray-600 rounded-lg p-2"
              >
                <span className="text-gray-100">{cat.name}</span>
                <span className="text-green-300 font-semibold">
                  KES {cat.value.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* By Frequency */}
        <div>
          <h3 className="text-md text-purple-300 font-medium mb-2">
            By Frequency (Times Used)
          </h3>
          <ul className="space-y-2">
            {data.byFrequency.map((cat, i) => (
              <li
                key={i}
                className="flex justify-between border border-gray-600 rounded-lg p-2"
              >
                <span className="text-gray-100">{cat.name}</span>
                <span className="text-yellow-300 font-semibold">
                  {cat.value}×
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
