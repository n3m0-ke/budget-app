"use client";

import { useEffect, useState } from "react";
import { getPaymentMethodData } from "@/lib/charts/getPaymentMethodData";
import { useAuth } from "@/lib/useAuth";
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer
} from "recharts";

// const COLORS = ['#6366f1', '#34d399', '#f59e0b'];

const COLORS = {
    "MPESA": "#34d399",
    "Bank Transfer": "#6366f1",
    "Cash": "#f59e0b"
  };

export default function PaymentMethodBreakdownPie() {
    const { user } = useAuth();
    const [data, setData] = useState([]);

    useEffect(() => {
        if (!user) return;

        async function load() {
            const result = await getPaymentMethodData(user.uid);
            console.log(result);
            setData(result);
        }

        load();

    }, [user]);

    return (
        <div className="border border-grey-200 p-6 border bg-black/80 backdrop-blur-m rounded-lg shadow">
            <h2 className="text-lg font-semibold text-blue-300 mb-4">
                Payment Method Breakdown
            </h2>

            <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart width={350} height={300}>
                        <Pie 
                            data={data} 
                            dataKey="value" 
                            nameKey="name" 
                            outerRadius={100} label >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                        ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

}