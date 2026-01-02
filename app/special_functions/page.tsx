"use client";

import { useState } from "react";

import SavingsTab  from "@/components/SavingsTab";
import DifferencesTab from "@/components/DifferencesTab";
import ChamasTab from "@/components/ChamasTab";

export default function SpecialFunctionsPage() {
  const [active, setActive] = useState<"savings" | "diffs" | "chamas">("savings");

  return (
    <div className="min-h-screen p-6 text-gray-200 ">
      <h1 className="text-2xl font-bold mb-6 text-blue-300">
        Special Functions
      </h1>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-700 mb-6 bg-black/60 backdrop-blur-xl">
        <button
          onClick={() => setActive("savings")}
          className={`px-4 py-2 rounded-t-md border-b-2 transition 
            ${
              active === "savings"
                ? "border-blue-400 text-blue-300"
                : "border-transparent hover:text-blue-200"
            }
          `}
        >
          Savings
        </button>

        <button
          onClick={() => setActive("diffs")}
          className={`px-4 py-2 rounded-t-md border-b-2 transition 
            ${
              active === "diffs"
                ? "border-blue-400 text-blue-300"
                : "border-transparent hover:text-blue-200"
            }
          `}
        >
          Budget Differences
        </button>

        <button
          onClick={() => setActive("chamas")}
          className={`px-4 py-2 rounded-t-md border-b-2 transition 
            ${
              active === "chamas"
                ? "border-blue-400 text-blue-300"
                : "border-transparent hover:text-blue-200"
            }
          `}
        >
          Chamas
        </button>
      </div>

      {/* Panels */}
      <div className="bg-black/60 p-6 rounded-xl border border-gray-700 shadow-lg">
        {active === "savings" && <SavingsTab />}
        {active === "diffs" && <DifferencesTab />}
        {active == "chamas" && <ChamasTab />}
      </div>
    </div>
  );
}