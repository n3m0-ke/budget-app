"use client";

import { useState } from "react";

import SavingsTab  from "@/components/SavingsTab";

export default function SpecialFunctionsPage() {
  const [active, setActive] = useState<"savings" | "diffs">("savings");

  return (
    <div className="min-h-screen p-6 text-gray-200">
      <h1 className="text-2xl font-bold mb-6 text-blue-300">
        Special Functions
      </h1>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-700 mb-6">
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
      </div>

      {/* Panels */}
      <div className="bg-black/60 p-6 rounded-xl border border-gray-700 shadow-lg">
        {active === "savings" && <SavingsTab />}
        {active === "diffs" && <DifferencesTab />}
      </div>
    </div>
  );
}

// function SavingsTab() {
//   return (
//     <div>
//       <h2 className="text-xl font-semibold text-blue-300 mb-4">
//         Manage Savings
//       </h2>

//       <p className="text-gray-300 leading-relaxed">
//         Here you will be able to manipulate your accumulated savings:
//         <br />• Record usage of savings  
//         <br />• Move savings into goals  
//         <br />• Track total saved vs. spent  
//         <br />• Reassign savings to future categories  
//         <br />• Reverse transactions made from savings
//       </p>

//       {/* Replace this placeholder with real components later */}
//       <div className="mt-6 p-4 bg-blue-950/30 border border-blue-900 rounded-lg">
//         Savings controls will go here.
//       </div>
//     </div>
//   );
// }

function DifferencesTab() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-blue-300 mb-4">
        Manage Budget Differences
      </h2>

      <p className="text-gray-300 leading-relaxed">
        This section helps you determine how to treat monthly differences between:
        <br />• Credited amount  
        <br />• Budgeted amount  
        <br />• Actual spending  
        <br />
        You can allocate surplus, move deficits, and understand month-to-month carryover.
      </p>

      {/* Replace this placeholder with your real controls*/}
      <div className="mt-6 p-4 bg-blue-950/30 border border-blue-900 rounded-lg">
        Budget difference controls will go here.
      </div>
    </div>
  );
}
