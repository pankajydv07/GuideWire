"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, 
  DollarSign, 
  ShieldAlert, 
  Filter,
  ArrowUpRight,
  User,
  Activity
} from "lucide-react";

import { adminApi } from "@/lib/api";
import { formatCurrency, formatTriggerWithEmoji, shortId } from "@/lib/format";
import type { AutoClaim } from "@/lib/types";
import { STATUS_STYLES } from "@/lib/types";

const STATUS_FILTERS = ["all", "pending", "approved", "paid", "rejected"] as const;

export default function ClaimsPage() {
  const [claims, setClaims] = useState<AutoClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [triggerFilter, setTriggerFilter] = useState("all");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        await adminApi.autoLogin();
        const response = await adminApi.claims.listAll();
        if (!active) return;
        setClaims(response.claims);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to synchronize claim data.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    const interval = window.setInterval(() => void load(), 30000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const triggerOptions = useMemo(
    () => ["all", ...Array.from(new Set(claims.map((claim) => claim.disruption_type).filter(Boolean) as string[]))],
    [claims],
  );

  const filteredClaims = useMemo(
    () =>
      claims.filter((claim) => {
        const matchesStatus = statusFilter === "all" || claim.status === statusFilter;
        const matchesTrigger = triggerFilter === "all" || claim.disruption_type === triggerFilter;
        return matchesStatus && matchesTrigger;
      }),
    [claims, statusFilter, triggerFilter],
  );

  const summary = useMemo(() => {
    const totalPayouts = filteredClaims.reduce((sum, claim) => sum + claim.payout_amount, 0);
    const averageFraud = filteredClaims.length
      ? filteredClaims.reduce((sum, claim) => sum + claim.fraud_score, 0) / filteredClaims.length
      : 0;

    return {
      totalClaims: filteredClaims.length,
      totalPayouts,
      averageFraud,
    };
  }, [filteredClaims]);

  return (
    <div className="space-y-10">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Automated Payouts</h1>
        <p className="text-slate-400 font-medium">Verified claims sequence triggered by real-time network anomalies.</p>
      </motion.div>

      {error ? (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
           {error}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-3">
        {[
          { label: "Pipeline Count", value: summary.totalClaims, icon: FileText, color: "text-sky-400" },
          { label: "Aggregate Payout", value: formatCurrency(summary.totalPayouts), icon: DollarSign, color: "text-emerald-400" },
          { label: "Trust Index (Avg)", value: `${Math.round(summary.averageFraud)}%`, icon: ShieldAlert, color: "text-amber-400" },
        ].map((stat, idx) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="glass-card rounded-[2rem] p-8"
          >
            <div className="flex items-center gap-3 mb-4">
               <stat.icon className={`w-5 h-5 ${stat.color}`} />
               <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{stat.label}</div>
            </div>
            <div className={`text-3xl font-bold tracking-tight ${stat.color}`}>{stat.value}</div>
          </motion.div>
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="glass-card rounded-[2.5rem] p-8"
      >
        <div className="flex flex-col gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
               <Filter className="w-4 h-4 text-indigo-400" />
               <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Intelligence Filters</div>
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="text-xs font-semibold text-slate-600 mb-3">CLAIM STATE</div>
                <div className="flex flex-wrap gap-2">
                  {STATUS_FILTERS.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setStatusFilter(filter)}
                      className={`rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                        statusFilter === filter
                          ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                          : "bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-600 mb-3">TRIGGER SOURCE</div>
                <div className="flex flex-wrap gap-2">
                  {triggerOptions.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setTriggerFilter(filter)}
                      className={`rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                        triggerFilter === filter
                          ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                          : "bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                      }`}
                    >
                      {filter === "all" ? "All" : formatTriggerWithEmoji(filter)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="overflow-hidden rounded-[2.5rem] border border-slate-800/50 bg-slate-900/20 glass"
      >
        <div className="overflow-x-auto overflow-y-hidden">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800/50 bg-slate-950/30 text-left">
                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Sequence</th>
                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Identity</th>
                <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Anomaly</th>
                <th className="px-6 py-5 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Valuation</th>
                <th className="px-6 py-5 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Payout</th>
                <th className="px-6 py-5 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Trust</th>
                <th className="px-6 py-5 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    {Array.from({ length: 7 }).map((__, cell) => (
                      <td key={cell} className="px-6 py-5">
                        <div className="h-3 rounded bg-white/5" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-slate-600 font-bold uppercase tracking-widest text-xs">
                    No matching sequences found.
                  </td>
                </tr>
              ) : (
                <AnimatePresence>
                  {filteredClaims.map((claim, idx) => (
                    <motion.tr 
                      key={claim.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className="group border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 py-5 font-mono text-[11px] text-slate-400">
                         {shortId(claim.id).toUpperCase()}
                      </td>
                      <td className="px-6 py-5">
                         <div className="flex items-center gap-2">
                            <User className="w-3 h-3 text-slate-600" />
                            <span className="font-bold text-slate-200">{claim.rider_name || shortId(claim.rider_id)}</span>
                         </div>
                      </td>
                      <td className="px-6 py-5">
                         <div className="flex items-center gap-2">
                            <Activity className="w-3 h-3 text-slate-600" />
                            <span className="text-slate-300">{formatTriggerWithEmoji(claim.disruption_type)}</span>
                         </div>
                      </td>
                      <td className="px-6 py-5 text-right font-bold text-rose-400">
                         {formatCurrency(claim.income_loss)}
                      </td>
                      <td className="px-6 py-5 text-right">
                         <div className="flex items-center justify-end gap-2 text-emerald-400 font-bold">
                            {formatCurrency(claim.payout_amount)}
                            <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                         </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span
                          className={`inline-block w-8 py-1 rounded-md text-[10px] font-bold ${
                            claim.fraud_score < 30
                              ? "bg-emerald-500/10 text-emerald-400"
                              : claim.fraud_score < 70
                                ? "bg-amber-500/10 text-amber-400"
                                : "bg-rose-500/10 text-rose-400"
                          }`}
                        >
                          {claim.fraud_score}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`inline-block px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[claim.status] || STATUS_STYLES.pending}`}>
                          {claim.status.replace(/_/g, " ")}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
