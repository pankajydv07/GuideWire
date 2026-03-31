import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RiderShield Admin",
  description: "Claims review & trigger management dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <aside className="w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-2">
            <h1 className="text-xl font-bold text-sky-400 mb-6">🛡️ RiderShield</h1>
            <p className="text-xs text-slate-500 mb-4">Admin Dashboard</p>

            <nav className="flex flex-col gap-1">
              <a href="/" className="px-4 py-2.5 rounded-lg hover:bg-slate-800 text-sm font-medium transition-colors">
                📊 Overview
              </a>
              <a href="/claims" className="px-4 py-2.5 rounded-lg hover:bg-slate-800 text-sm font-medium transition-colors">
                📋 Auto Claims
              </a>
              <a href="/manual-claims" className="px-4 py-2.5 rounded-lg hover:bg-slate-800 text-sm font-medium transition-colors">
                📸 Manual Claims
              </a>
              <a href="/triggers" className="px-4 py-2.5 rounded-lg hover:bg-slate-800 text-sm font-medium transition-colors">
                ⚡ Triggers
              </a>
            </nav>

            <div className="mt-auto text-xs text-slate-600">
              Dev 5 owns this dashboard
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
