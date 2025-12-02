"use client";

import { useEffect, useState } from "react";
import { Tooltip } from "@mui/material";
import { useRouter } from "next/navigation";

export default function QuickAnimatedLinks() {
  const router = useRouter();

  const [index, setIndex] = useState(0);

  // Each item has:
  // title = static text
  // messages = rotating preview texts (dynamic later)
  const items = [
    {
      title: "Budgets",
      tooltip: "Set and review your monthly budgets per category.",
      route: "/budgets",
      messages: [
        "You planned KES 45,000 this month",
        "Remaining: KES 18,200",
        "3 categories overspending"
      ]
    },
    {
      title: "Transactions",
      tooltip: "Track your daily spending by category and payment method.",
      route: "/transactions",
      messages: [
        "Latest: Lunch – KES 350",
        "MPESA • Coffee – KES 180",
        "You logged 124 transactions"
      ]
    },
    {
      title: "Analysis",
      tooltip: "Compare budgeted amounts with actual expenditures.",
      route: "/analysis",
      messages: [
        "You spent 61% of your budget",
        "Food was your top category",
        "MPESA was used 72% of the time"
      ]
    }
  ];

  // cycle every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % 3);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <Tooltip key={i} title={item.tooltip} arrow>
          <div
            onClick={() => router.push(item.route)}
            className="cursor-pointer p-4 bg-black/70 rounded-lg border border-gray-700 shadow hover:bg-black/50 transition"
          >
            <p className="text-blue-300 font-semibold">{item.title}</p>

            <p
              className="text-gray-300 text-sm mt-1 transition-opacity duration-500 truncate"
              key={index}
            >
              {item.messages[index % item.messages.length]}
            </p>
          </div>
        </Tooltip>
      ))}
    </div>
  );
}
