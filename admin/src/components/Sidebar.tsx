"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, FileText, Camera, Zap, ShieldCheck, Activity } from "lucide-react";

import { adminApi } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/claims", label: "Auto Claims", icon: FileText },
  { href: "/manual-claims", label: "Manual Claims", icon: Camera },
  { href: "/triggers", label: "Triggers", icon: Zap },
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
      {/* Mobile Toggle */}
      <button
        type="button"
        className="fixed left-4 top-4 z-50 rounded-xl border border-slate-700/50 bg-slate-900/40 px-3 py-2 text-sm text-slate-200 shadow-xl backdrop-blur-md md:hidden"
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? "Close" : "Menu"}
      </button>

      {/* Overlay */}
      <div
        className={`fixed inset-0 z-30 bg-slate-950/60 transition-opacity duration-300 md:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setIsOpen(false)}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-800/50 bg-slate-950/40 backdrop-blur-xl transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full px-6 py-10">
          <div className="mb-12 flex items-center gap-3 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20 group-hover:scale-110 transition-transform duration-300">
               <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-sky-400 bg-clip-text text-transparent">RiderShield</div>
              <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">Admin Command</div>
            </div>
          </div>

          <div className="mb-8 overflow-hidden rounded-2xl bg-slate-900/40 ring-1 ring-slate-800/50 p-4 relative group">
             <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
             <div className="relative flex items-center justify-between">
                <div>
                   <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Status</div>
                   <div className="text-sm font-medium text-slate-200">
                      {systemHealthy === null ? "Diagnosing..." : systemHealthy ? "System Ready" : "Critical Issue"}
                   </div>
                </div>
                <div className={`h-3 w-3 rounded-full ${
                    systemHealthy === null ? "bg-slate-500" : systemHealthy ? "bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.5)]" : "bg-rose-400 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.5)]"
                }`} />
             </div>
          </div>

          <nav className="flex-1 space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex items-center gap-3.5 rounded-xl px-4 py-3.5 text-sm font-medium transition-all duration-300 ${
                    active
                      ? "bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20"
                      : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-100"
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-transform duration-300 ${active ? "scale-110" : "group-hover:scale-110"}`} />
                  {item.label}
                  {active && (
                     <div className="absolute left-[-24px] top-1/2 -translate-y-1/2 h-8 w-1 bg-indigo-500 rounded-full blur-[2px]" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-800/50">
             <div className="rounded-xl bg-slate-900/40 p-3 ring-1 ring-slate-800/50">
                <div className="flex items-center gap-2 mb-2">
                   <Activity className="w-4 h-4 text-sky-400" />
                   <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Live Traffic</span>
                </div>
                <div className="text-[11px] text-slate-500 leading-relaxed">
                   Monitoring real-time claim streams & zone disruptions.
                </div>
             </div>
          </div>
        </div>
      </aside>
    </>
  );
}
