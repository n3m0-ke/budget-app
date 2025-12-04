"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, ResponsiveContainer, Treemap, Tooltip, Legend, YAxis, XAxis, AreaChart, CartesianGrid, Area } from "recharts";
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

      <div className={small ? "w-full h-52" : "w-full h-full"}>
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
          <Treemap
            data={treeMapData}
            dataKey="size"
            aspectRatio={4 / 3}
            stroke="#2d2d2d"
            fill="#6366f1"
            content={({ name, value, size, x, y, width, height }) => (
              <g>
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill="#6366f1"
                  stroke="#1f1f1f"
                  strokeWidth={2}
                  rx={8}
                />
                {/* Only show text if the box is big enough */}
                {width > 80 && height > 50 && (
                  <>
                    <text x={x + 10} y={y + 25} fill="white" fontSize={14} fontWeight="600">
                      {name}
                    </text>
                    <text x={x + 10} y={y + 45} fill="#c7d2fe" fontSize={13}>
                      KES {(size ?? value ?? 0).toLocaleString()}
                    </text>
                  </>
                )}
              </g>
            )}
          />
        </ResponsiveContainer>
      </div>
    </div>
  );
}
