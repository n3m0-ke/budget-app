"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, ResponsiveContainer, Treemap, Tooltip, Legend, YAxis, XAxis, AreaChart, CartesianGrid, Area } from "recharts";
import { getTopCategoriesData } from "@/lib/charts/getTopCategoriesData";
import { useAuth } from "@/lib/useAuth";

export default function CategorySpendingBar({ small = false }) {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [treeMapData, setTreeMapData] = useState([]);
  const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

  useEffect(() => {
    if (!user) return;

    async function load() {
      const res = await getTopCategoriesData(user.uid);

      const children = res.byAmount.slice(0, 6).map((item) =>({
        ...item,
        size:item.value,
      }));
      setData(res.byAmount.slice(0, 6));

      setTreeMapData([
        {
          name: "Spending By Category",
          children,
        },
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

      <div className="min-h-52 h-full w-full">
        {/* <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data}
            layout="horizontal">
            <XAxis dataKey="name" />
            <Tooltip />
            <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer> */}
        <ResponsiveContainer width="100%" height="100%">
          <Tooltip
            formatter={(v) => [`KES ${v.toLocaleString()}`, "Spent"]} 
            contentStyle={{
              backgroundColor: "rgba(0,0,0,0.8)",
              border: "1px solid #444",
              color: "#fff",
            }}
          />
          <Treemap
            data={treeMapData}
            dataKey="size"
            aspectRatio={4 / 3}
            stroke="#2d2d2d"
            content={({ name, size, value, x, y, width, height, index }) => {
              const fillColor = COLORS[index % COLORS.length];
            
              return (
                <g>
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={fillColor}
                    stroke="#111"
                    strokeWidth={2}
                    rx={8}
                  />
                  {width > 80 && height > 50 && (
                    <>
                      <text x={x + 10} y={y + 25} fill="#1919FF" fontSize={14} fontWeight="600">
                        {name}
                      </text>
                      <text x={x + 10} y={y + 45} fill="#fff" fontSize={13} opacity={0.9}>
                        KES {(size ?? value ?? 0).toLocaleString()}
                      </text>
                    </>
                  )}
                </g>
              );
            }}
          />
        </ResponsiveContainer>
      </div>
    </div>
  );
}
