"use client";

import { useEffect, useState } from "react";
import { getDailySpendData } from "@/lib/charts/getDailySpendData";
import { useAuth } from "@/lib/useAuth";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";

export default function DailySpendLineChart() {
    const { user } = useAuth();
    const [data, setData] = useState([]);

    useEffect(() => {
        if (!user) return;

        async function load() {
            const result = await getDailySpendData(user.uid);
            setData(result);
        }

        load();
    }, [user]);

    return (
        <div className="border border-grey-200 w-full bg-black/80 backdrop-blur-md shadow-sm rounded-xl p-6">
            <h2 className="text-lg font-semibold text-blue-300 mb-4">
                Daily Spending Overview
            </h2>

            <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <defs>
                            <linearGradient id="lineColor" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#2986cc" stopOpacity={0.9} />
                                <stop offset="100%" stopColor="#2986cc" stopOpacity={0.5} />
                            </linearGradient>
                        </defs>

                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />

                        <XAxis
                            dataKey="date"
                            stroke="#aaa"
                            tick={{ fontSize: 12 }}
                            tickFormatter={(v) => v}
                            label={{
                                value: "Date",
                                position: "insideBottom",
                                offset: -5,
                                fill: "#ccc",
                                fontSize: 12,
                            }}
                        />

                        <YAxis
                            stroke="#aaa"
                            tick={{ fontSize: 12 }}
                            label={{
                                value: "Amount (KES)",
                                angle: -90,
                                position: "insideLeft",
                                fill: "#ccc",
                                fontSize: 12,
                                offset: 10,
                            }}
                        />

                        <Tooltip
                            formatter={(v) => `${v} KES`}
                            labelStyle={{ color: "#66CCFF" }}
                            contentStyle={{
                                backgroundColor: "rgba(0,0,0,0.8)",
                                border: "2px solid #333",
                            }}
                        />

                        <Line
                            type="monotone"
                            dataKey="amount"
                            stroke="url(#lineColor)"
                            strokeWidth={3}
                            dot={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
