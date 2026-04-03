"use client";

import { useEffect, useMemo, useState } from "react";

import { adminApi } from "@/lib/api";
import {
  formatCurrency,
  formatDurationSince,
  formatPercent,
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

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="animate-pulse rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-4 h-4 w-24 rounded bg-slate-800" />
          <div className="mb-3 h-9 w-20 rounded bg-slate-800" />
          <div className="h-3 w-32 rounded bg-slate-800" />
        </div>
      ))}
    </div>
  );
}

export default function AdminOverview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const overview = await adminApi.stats.overview();
        if (!active) return;
        setData(overview);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load dashboard overview.");
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
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
      .slice(0, 5);
  }, [data]);

  const statsCards = data
    ? [
        { label: "Total Claims", value: data.stats.total_claims.toString(), accent: "text-sky-300", icon: "📋" },
        { label: "Pending Review", value: data.stats.pending_review.toString(), accent: "text-amber-300", icon: "⏳" },
        { label: "Active Triggers", value: data.stats.active_triggers.toString(), accent: "text-red-300", icon: "⚡" },
        { label: "Loss Ratio", value: formatPercent(data.stats.loss_ratio), accent: "text-emerald-300", icon: "📊" },
      ]
    : [];

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const overview = await adminApi.stats.overview();
      setData(overview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard overview.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Dashboard Overview</h1>
          <p className="mt-2 text-sm text-slate-400">Live claims activity, trigger health, and review queue status.</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-400">
          Auto-refreshing every 30 seconds
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-900/70 bg-red-950/40 p-4 text-sm text-red-200">
          <div className="font-medium">Dashboard load failed</div>
          <div className="mt-1 text-red-200/80">{error}</div>
          <button
            type="button"
            className="mt-3 rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-400"
            onClick={() => void reload()}
          >
            Retry
          </button>
        </div>
      ) : null}

      {loading && !data ? (
        <StatsSkeleton />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statsCards.map((stat) => (
            <div key={stat.label} className="rounded-3xl border border-slate-800 bg-slate-900/75 p-6 shadow-xl shadow-slate-950/30">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-slate-400">{stat.label}</span>
                <span className="text-xl">{stat.icon}</span>
              </div>
              <div className={`text-4xl font-semibold tracking-tight ${stat.accent}`}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Last 5 items</span>
          </div>

          {recentActivity.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 px-4 py-8 text-center text-sm text-slate-500">
              No recent claims activity yet.
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/50 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-100">{item.rider}</div>
                    <div className="mt-1 text-sm text-slate-400">{item.trigger}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-100">{item.amountLabel}</div>
                      <div className="text-xs text-slate-500">{formatRelativeTime(item.created_at)}</div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${STATUS_STYLES[item.status] || STATUS_STYLES.pending}`}>
                      {item.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Active Disruptions</h2>
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
              {data?.triggerStatus.active_triggers.length || 0} live
            </span>
          </div>

          {!data || data.triggerStatus.active_triggers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 px-4 py-8 text-center text-sm text-slate-500">
              No active disruptions right now.
            </div>
          ) : (
            <div className="space-y-3">
              {data.triggerStatus.active_triggers.map((trigger) => (
                <div key={trigger.trigger_id} className="rounded-2xl border border-slate-800/80 bg-slate-950/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-100">{formatTriggerWithEmoji(trigger.type)}</div>
                      <div className="mt-1 text-sm text-slate-400">{trigger.zone}</div>
                    </div>
                    <span className="rounded-full bg-red-950/70 px-3 py-1 text-xs font-medium uppercase tracking-wide text-red-300 ring-1 ring-red-800/80">
                      {trigger.severity}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
                    <span>{trigger.affected_riders} riders affected</span>
                    <span>Active for {formatDurationSince(trigger.active_since)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
