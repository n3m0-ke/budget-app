import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

import CreateChama from './CreateChama';
import AllocateFunds from './AllocateChamaFunds';

import { useState } from "react";

export default function ActionsAccordion() {
    const [active, setActive] = useState<"allocate" | "withdraw" | "add">("add");

    return (
        <div className="w-full bg-black/60 backdrop-blur-xl">
            <Accordion 
                sx={{
                    backgroundColor: "transparent",
                    boxShadow: "none",
                }}
                className="w-full bg-black/60 backdrop-blur-xl">
                <AccordionSummary
                    expandIcon={<ArrowDropDownIcon />}
                    aria-controls="panel1-content"
                    id="panel1-header"
                    sx={{
                        backgroundColor: "transparent",
                    }}
                    className="bg-black/60 backdrop-blur-xl">
                    <h3 className="font-semibold text-green-300 ">
                        Actions
                    </h3>
                </AccordionSummary>
                <AccordionDetails
                sx={{
                    backgroundColor: "transparent",
                }}>
                    {/* Tabs */}
                    <div className="flex space-x-2 border-b border-gray-700 mb-6 bg-black/60 backdrop-blur-xl">
                        <button
                            onClick={() => setActive("add")}
                            className={`px-4 py-2 rounded-t-md border-b-2 transition text-gray-300 
                            ${active === "add"
                                    ? "border-blue-400 text-blue-300"
                                    : "border-transparent hover:text-blue-200"
                                }
                            `}
                        >
                            Add New Chama
                        </button>

                        <button
                            onClick={() => setActive("allocate")}
                            className={`px-4 py-2 rounded-t-md border-b-2 transition text-gray-300 
            ${active === "allocate"
                                    ? "border-blue-400 text-blue-300"
                                    : "border-transparent hover:text-blue-200"
                                }
          `}
                        >
                            Allocate Funds
                        </button>

                        <button
                            onClick={() => setActive("withdraw")}
                            className={`px-4 py-2 rounded-t-md border-b-2 transition text-gray-300 
            ${active === "withdraw"
                                    ? "border-blue-400 text-blue-300"
                                    : "border-transparent hover:text-blue-200"
                                }
          `}
                        >
                            Withdraw Funds
                        </button>
                    </div>

                    {/* Panels */}
                    <div className="bg-black/60 p-6 rounded-xl border border-gray-700 shadow-lg">
                        {active === "add" && <CreateChama/> }
                        {active === "allocate" && <AllocateFunds/> }
                        {active == "withdraw" && <div>Withdraw from Chama</div>}
                    </div>
                </AccordionDetails>
            </Accordion>
        </div>
    )
}