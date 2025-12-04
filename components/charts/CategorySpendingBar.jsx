"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, ResponsiveContainer, Tooltip, Legend, YAxis, XAxis, AreaChart, CartesianGrid, Area } from "recharts";
import { getTopCategoriesData } from "@/lib/charts/getTopCategoriesData";
import { useAuth } from "@/lib/useAuth";

export default function CategorySpendingBar({ small = false }) {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [treeMapData, setTreeMapData] = useState([]);

  useEffect(() => {
    if (!user) return;

    async function load() {
      const res = await getTopCategoriesData(user.uid);
      setData(res.byAmount.slice(0, 6));
      setTreeMapData([
        {
          name: 'Spending By Category',
          children: res.byAmount.slice(0,6)
        }
      ]);
    }

    load();
  }, [user]);

  useEffect(() => {
    console.log("Tree map Data: ", treeMapData);
  })
  

  return (
    <div className="border bg-black/80 p-4 rounded-lg shadow">
      {!small && (
        <h2 className="text-lg text-blue-300 font-semibold mb-3">
          Category Spending
        </h2>
      )}

      <div className={small ? "w-full h-52" : "w-full h-72"}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data}
            layout="horizontal">
            <XAxis dataKey="name" />
            <Tooltip />
            <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        {/* <ResponsiveContainer>
          <AreaChart
            data={treeMapData}
            margin={{
              top: 10,
              right: 30,
              left: 0,
              bottom: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="uv" stroke="#8884d8" fill="#8884d8" />
          </AreaChart>
        </ResponsiveContainer> */}
      </div>
    </div>
  );
}
