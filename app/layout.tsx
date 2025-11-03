// app/layout.tsx  (server)
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import LayoutControllerClient from "@/components/LayoutControllerClient";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Budget App",
  description: "Personal budgeting app",
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // This is a server component — no 'use client' here.
  // We render a client-side controller that will decide how to present `children`.
  return (
    <html lang="en">
      <body 
        className="min-h-screen bg-transparent text-gray-900"
        style={{
          backgroundImage: 'url(/bgImage.png)', // Or a separate background image file
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}>
        {/* children is a server render node passed into the client controller */}
        <LayoutControllerClient>{children}</LayoutControllerClient>
      </body>
    </html>
  );
}
