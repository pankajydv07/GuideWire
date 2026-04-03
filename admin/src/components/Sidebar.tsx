"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { adminApi } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: "📊" },
  { href: "/claims", label: "Auto Claims", icon: "📋" },
  { href: "/manual-claims", label: "Manual Claims", icon: "📸" },
  { href: "/triggers", label: "Triggers", icon: "⚡" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [systemHealthy, setSystemHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    const loadHealth = async () => {
      try {
        const health = await adminApi.health();
        if (active) setSystemHealthy(health.status === "healthy");
      } catch {
        if (active) setSystemHealthy(false);
      }
    };

    void loadHealth();
    const interval = window.setInterval(() => void loadHealth(), 30000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        className="fixed left-4 top-4 z-40 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-2 text-sm text-slate-200 shadow-lg backdrop-blur md:hidden"
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? "Close" : "Menu"}
      </button>

      <div
        className={`fixed inset-0 z-20 bg-slate-950/70 backdrop-blur-sm transition-opacity md:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setIsOpen(false)}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-slate-800 bg-slate-950/95 px-5 py-6 shadow-2xl transition-transform md:static md:w-72 md:translate-x-0 md:bg-slate-900 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/15 text-xl text-sky-300 ring-1 ring-sky-500/30">
            🛡️
          </div>
          <div>
            <div className="text-lg font-semibold text-slate-50">RiderShield</div>
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Admin Dashboard</div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>System Health</span>
            <span className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  systemHealthy === null
                    ? "bg-slate-500"
                    : systemHealthy
                      ? "bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.7)]"
                      : "bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.7)]"
                }`}
              />
              <span className="text-slate-200">
                {systemHealthy === null ? "Checking" : systemHealthy ? "Healthy" : "Degraded"}
              </span>
            </span>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1.5">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-r-xl border-l-2 px-4 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "border-sky-400 bg-sky-600/20 text-sky-300"
                    : "border-transparent text-slate-300 hover:bg-slate-800/70 hover:text-slate-100"
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-400">
          Live admin tools for claims review, disruptions, and demo trigger injection.
        </div>
      </aside>
    </>
  );
}
