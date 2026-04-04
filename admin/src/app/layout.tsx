import type { Metadata } from "next";

import { Sidebar } from "@/components/Sidebar";

import "./globals.css";

export const metadata: Metadata = {
  title: "RiderShield Admin",
  description: "Claims review & trigger management dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#020617] text-slate-100 antialiased selection:bg-sky-500/30">
        {/* Animated Background Layers */}
        <div className="fixed inset-0 -z-10 bg-[#020617]" />
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.08),_transparent_40%),radial-gradient(circle_at_bottom_left,_rgba(129,140,248,0.08),_transparent_40%)]" />
        <div className="fixed inset-0 -z-10 opacity-20 [mask-image:radial-gradient(ellipse_20%_50%_at_50%_0%,#000_70%,transparent_100%)]">
           <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>

        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 transition-all duration-300">
            <div className="mx-auto max-w-7xl px-4 pb-12 pt-20 md:px-8 md:pt-12">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
