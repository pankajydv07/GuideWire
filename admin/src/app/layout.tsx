import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Sidebar } from "@/components/Sidebar";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "RiderShield Admin",
  description: "Claims review & trigger management dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} min-h-screen bg-slate-950 text-slate-100 antialiased`}>
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_32%),linear-gradient(180deg,_rgba(15,23,42,1)_0%,_rgba(2,6,23,1)_100%)]">
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 px-4 pb-8 pt-20 md:px-8 md:pt-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
