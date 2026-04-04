"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, 
  Clock, 
  Zap, 
  BarChart3, 
  ArrowRight, 
  RefreshCw,
  AlertCircle
} from "lucide-react";

import { adminApi } from "@/lib/api";
import {
  formatCurrency,
  formatDurationSince,
  formatPercent,
  parseApiDate,
  formatRelativeTime,
  formatTriggerWithEmoji,
} from "@/lib/format";
import type { OverviewData } from "@/lib/types";
import { STATUS_STYLES } from "@/lib/types";

type ActivityItem = {
  id: string;
  rider: string;
  trigger: string;
  amountLabel: string;
  created_at: string;
  status: string;
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

function StatsSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="glass-card rounded-[2rem] p-8 animate-pulse">
          <div className="mb-4 h-4 w-24 rounded bg-white/5" />
          <div className="mb-3 h-10 w-20 rounded bg-white/5" />
          <div className="h-3 w-32 rounded bg-white/5" />
        </div>
      ))}
    </div>
  );
}

export default function AdminOverview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async (showLoading = true) => {
      if (showLoading) setLoading(true);
      else setIsRefreshing(true);
      
      try {
        const overview = await adminApi.stats.overview();
        if (!active) return;
        setData(overview);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "The command center lost connection.");
      } finally {
        if (active) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    void load();
    const interval = window.setInterval(() => void load(false), 30000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const recentActivity = useMemo<ActivityItem[]>(() => {
    if (!data) return [];

    const autoItems = data.autoClaims.map((claim) => ({
      id: claim.id,
      rider: claim.rider_name || claim.rider_id.slice(0, 8),
      trigger: formatTriggerWithEmoji(claim.disruption_type),
      amountLabel: formatCurrency(claim.payout_amount),
      created_at: claim.created_at,
      status: claim.status,
    }));

    const manualItems = data.manualClaims.map((claim) => ({
      id: claim.id,
      rider: claim.rider_name || claim.rider_id.slice(0, 8),
      trigger: formatTriggerWithEmoji(claim.disruption_type),
      amountLabel: "Awaiting review",
      created_at: claim.created_at,
      status: claim.review_status,
    }));

    return [...autoItems, ...manualItems]
      .sort(
        (left, right) =>
          (parseApiDate(right.created_at)?.getTime() || 0) - (parseApiDate(left.created_at)?.getTime() || 0)
      )
      .slice(0, 5);
  }, [data]);

  const statsCards = data
    ? [
        { label: "Total Claims", value: data.stats.total_claims.toString(), color: "from-sky-500 to-indigo-500", icon: TrendingUp },
        { label: "Pending Review", value: data.stats.pending_review.toString(), color: "from-amber-500 to-orange-500", icon: Clock },
        { label: "Active Triggers", value: data.stats.active_triggers.toString(), color: "from-rose-500 to-red-500", icon: Zap },
        { label: "Loss Ratio", value: formatPercent(data.stats.loss_ratio), color: "from-emerald-500 to-teal-500", icon: BarChart3 },
      ]
    : [];

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Command Center</h1>
          <p className="text-slate-400 font-medium">Real-time surveillance of network disruptions and automated claim flows.</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 glass px-4 py-2 rounded-2xl ring-1 ring-white/5"
        >
          <RefreshCw className={`w-4 h-4 text-indigo-400 ${isRefreshing ? "animate-spin" : ""}`} />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Live Sync Active</span>
        </motion.div>
      </div>

      {error ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-[2rem] border border-rose-500/20 bg-rose-500/10 p-6 flex items-start gap-4"
        >
          <div className="h-10 w-10 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
             <AlertCircle className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <div className="text-lg font-bold text-rose-100">Operation Interrupted</div>
            <div className="mt-1 text-sm text-rose-300/80">{error}</div>
            <button
              type="button"
              className="mt-4 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-rose-500 hover:bg-rose-400 rounded-full transition-colors"
              onClick={() => window.location.reload()}
            >
              Re-establish Connection
            </button>
          </div>
        </motion.div>
      ) : null}

      {loading && !data ? (
        <StatsSkeleton />
      ) : (
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-6 md:grid-cols-2 xl:grid-cols-4"
        >
          {statsCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <motion.div 
                key={stat.label} 
                variants={item}
                className="glass-card rounded-[2rem] p-8 group overflow-hidden relative"
              >
                <div className={`absolute -right-4 -top-4 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-5 blur-3xl group-hover:opacity-15 transition-opacity duration-500`} />
                <div className="mb-6 flex items-center justify-between">
                  <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${stat.color} p-3 shadow-lg shadow-black/20 ring-1 ring-white/10 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-full h-full text-white" />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{stat.label}</div>
                  <div className="text-4xl font-bold tracking-tight text-white">{stat.value}</div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="glass-card rounded-[2.5rem] p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8">
             <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" /> Stream
             </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">Recent Activity</h2>
            <p className="text-sm text-slate-500 mt-1">Audit log of system-generated and reviewed events.</p>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {recentActivity.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 px-4 py-12 text-center text-sm text-slate-500"
                >
                  Silence on the network. No recent activity detected.
                </motion.div>
              ) : (
                recentActivity.map((item, idx) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group flex flex-col gap-4 rounded-3xl border border-slate-800/40 bg-slate-900/30 p-5 md:flex-row md:items-center md:justify-between hover:bg-slate-900/50 hover:border-slate-700/60 transition-all duration-300"
                  >
                    <div className="flex items-center gap-4">
                       <div className="h-10 w-10 rounded-full bg-slate-800/50 flex flex-col items-center justify-center text-[10px] font-bold text-slate-500 group-hover:scale-110 transition-transform">
                          ID
                       </div>
                       <div>
                          <div className="text-sm font-bold text-slate-100">{item.rider}</div>
                          <div className="mt-1 text-xs text-slate-400 flex items-center gap-2">
                             {item.trigger}
                          </div>
                       </div>
                    </div>
                    
                    <div className="flex items-center justify-between md:justify-end gap-6">
                      <div className="text-right">
                        <div className="text-sm font-bold text-white">{item.amountLabel}</div>
                        <div className="text-[10px] font-medium text-slate-500 mt-0.5">{formatRelativeTime(item.created_at)}</div>
                      </div>
                      <span className={`rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[item.status] || STATUS_STYLES.pending}`}>
                        {item.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
          
          <button className="mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors group">
             View Full Archive <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </button>
        </section>

        <section className="glass-card rounded-[2.5rem] p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Live Disruptions</h2>
              <p className="text-sm text-slate-500 mt-1">Anomalies currently affecting network zones.</p>
            </div>
            <div className="h-10 w-10 rounded-2xl bg-rose-500/10 flex items-center justify-center ring-1 ring-rose-500/20">
               <Zap className="w-5 h-5 text-rose-500" />
            </div>
          </div>

          <div className="space-y-4">
            {!data || data.triggerStatus.active_triggers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 px-4 py-12 text-center text-sm text-slate-500">
                Network status clear. No active disruptions.
              </div>
            ) : (
              data.triggerStatus.active_triggers.map((trigger, idx) => (
                <motion.div 
                  key={trigger.trigger_id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="rounded-3xl border border-slate-800/40 bg-slate-950/40 p-6 relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 p-6">
                     <span className="rounded-full bg-rose-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-rose-400 ring-1 ring-rose-500/20">
                        {trigger.severity}
                     </span>
                  </div>
                  
                  <div className="mb-6">
                    <div className="text-lg font-bold text-white flex items-center gap-2">
                       {formatTriggerWithEmoji(trigger.type)}
                    </div>
                    <div className="mt-1 text-xs font-medium text-slate-500">{trigger.zone}</div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <TrendingUp className="w-4 h-4 text-slate-600" />
                       <span className="text-xs font-bold text-slate-300">{trigger.affected_riders}</span>
                       <span className="text-xs text-slate-500 font-medium">riders affected</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
                       <Clock className="w-3 h-3" />
                       {formatDurationSince(trigger.active_since)}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
