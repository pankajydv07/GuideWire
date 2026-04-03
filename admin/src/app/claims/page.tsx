"use client";

import { useEffect, useMemo, useState } from "react";

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
        setError(err instanceof Error ? err.message : "Failed to load claims.");
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Auto Claims</h1>
        <p className="mt-2 text-sm text-slate-400">Automatic payouts generated from disruption events across active zones.</p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-900/70 bg-red-950/40 p-4 text-sm text-red-200">{error}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="text-sm text-slate-400">Total Claims</div>
          <div className="mt-3 text-3xl font-semibold text-sky-300">{summary.totalClaims}</div>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="text-sm text-slate-400">Total Payouts</div>
          <div className="mt-3 text-3xl font-semibold text-emerald-300">{formatCurrency(summary.totalPayouts)}</div>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="text-sm text-slate-400">Average Fraud Score</div>
          <div className="mt-3 text-3xl font-semibold text-amber-300">{Math.round(summary.averageFraud)}</div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-col gap-5">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Status</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setStatusFilter(filter)}
                  className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition ${
                    statusFilter === filter
                      ? "bg-sky-500 text-slate-950"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {filter === "all" ? "All" : filter.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Trigger Type</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {triggerOptions.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setTriggerFilter(filter)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    triggerFilter === filter
                      ? "bg-emerald-400 text-slate-950"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {filter === "all" ? "All" : formatTriggerWithEmoji(filter)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-left text-slate-400">
                <th className="px-4 py-4 font-medium">Claim ID</th>
                <th className="px-4 py-4 font-medium">Rider</th>
                <th className="px-4 py-4 font-medium">Trigger</th>
                <th className="px-4 py-4 text-right font-medium">Income Loss</th>
                <th className="px-4 py-4 text-right font-medium">Payout</th>
                <th className="px-4 py-4 text-center font-medium">Fraud</th>
                <th className="px-4 py-4 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="animate-pulse border-b border-slate-800/60">
                    {Array.from({ length: 7 }).map((__, cell) => (
                      <td key={cell} className="px-4 py-4">
                        <div className="h-4 rounded bg-slate-800" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    No claims found.
                  </td>
                </tr>
              ) : (
                filteredClaims.map((claim) => (
                  <tr key={claim.id} className="border-b border-slate-800/60 hover:bg-slate-800/20">
                    <td className="px-4 py-4 font-mono text-slate-300">{shortId(claim.id)}</td>
                    <td className="px-4 py-4 text-slate-200">{claim.rider_name || shortId(claim.rider_id)}</td>
                    <td className="px-4 py-4 text-slate-300">{formatTriggerWithEmoji(claim.disruption_type)}</td>
                    <td className="px-4 py-4 text-right text-red-300">{formatCurrency(claim.income_loss)}</td>
                    <td className="px-4 py-4 text-right text-emerald-300">{formatCurrency(claim.payout_amount)}</td>
                    <td
                      className={`px-4 py-4 text-center font-medium ${
                        claim.fraud_score < 30
                          ? "text-emerald-300"
                          : claim.fraud_score < 70
                            ? "text-amber-300"
                            : "text-red-300"
                      }`}
                    >
                      {claim.fraud_score}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${STATUS_STYLES[claim.status] || STATUS_STYLES.pending}`}>
                        {claim.status.replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
