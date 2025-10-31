// app/layout.tsx  (server)
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import LayoutControllerClient from "@/components/LayoutControllerClient";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Budget App",
  description: "Personal budgeting app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // This is a server component — no 'use client' here.
  // We render a client-side controller that will decide how to present `children`.
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        {/* children is a server render node passed into the client controller */}
        <LayoutControllerClient>{children}</LayoutControllerClient>
      </body>
    </html>
  );
}
