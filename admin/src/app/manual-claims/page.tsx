"use client";

import { useEffect, useState } from "react";

import { API_BASE, adminApi } from "@/lib/api";
import { formatDateTime, formatTriggerLabel, shortId } from "@/lib/format";
import type { ManualClaimReview } from "@/lib/types";

function spamTone(score: number) {
  if (score >= 70) return "bg-red-950/70 text-red-300 ring-1 ring-red-800/80";
  if (score >= 30) return "bg-amber-950/70 text-amber-300 ring-1 ring-amber-800/80";
  return "bg-emerald-950/70 text-emerald-300 ring-1 ring-emerald-800/80";
}

function validationTone(match: boolean | null | undefined) {
  return match ? "text-emerald-300" : "text-red-300";
}

function validationLabel(match: boolean | null | undefined, positive: string, negative: string) {
  return `${match ? "✅" : "❌"} ${match ? positive : negative}`;
}

export default function ManualClaimsPage() {
  const [claims, setClaims] = useState<ManualClaimReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        await adminApi.autoLogin();
        const response = await adminApi.claims.listManual("spam_score", "asc");
        if (!active) return;
        setClaims(response.claims);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load manual claims.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const removeClaim = (claimId: string) => {
    setClaims((current) => current.filter((claim) => claim.id !== claimId));
  };

  const isReviewLocked = (claim: ManualClaimReview) => claim.review_status !== "pending" || claim.spam_score >= 70;

  const handleApprove = async (claim: ManualClaimReview) => {
    if (!claim.claim_id) {
      setError("Manual claim is missing the linked claim id required for approval.");
      return;
    }

    setSubmittingId(claim.id);
    try {
      await adminApi.claims.approve(claim.claim_id);
      removeClaim(claim.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve claim.");
    } finally {
      setSubmittingId(null);
    }
  };

  const handleReject = async (claim: ManualClaimReview) => {
    const reason = rejectReason[claim.id]?.trim();
    if (!claim.claim_id) {
      setError("Manual claim is missing the linked claim id required for rejection.");
      return;
    }
    if (!reason) {
      setError("Reject reason is required.");
      return;
    }

    setSubmittingId(claim.id);
    try {
      await adminApi.claims.reject(claim.claim_id, reason);
      removeClaim(claim.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject claim.");
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Manual Claims Review</h1>
        <p className="mt-2 text-sm text-slate-400">Sorted by spam score to fast-track legitimate rider submissions.</p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-900/70 bg-red-950/40 p-4 text-sm text-red-200">{error}</div>
      ) : null}

      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
              <div className="mb-4 h-5 w-48 rounded bg-slate-800" />
              <div className="mb-6 h-4 w-64 rounded bg-slate-800" />
              <div className="h-40 rounded-2xl bg-slate-800" />
            </div>
          ))}
        </div>
      ) : claims.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/50 px-6 py-14 text-center text-slate-400">
          🎉 No pending manual claims — all caught up!
        </div>
      ) : (
        <div className="grid gap-5">
          {claims.map((claim) => {
            const photoSrc = claim.photo_url
              ? claim.photo_url.startsWith("http")
                ? claim.photo_url
                : `${API_BASE}${claim.photo_url}`
              : null;
            const isAutoRejected = claim.spam_score >= 70;
            const isLocked = isReviewLocked(claim);
            const isSubmitting = submittingId === claim.id;

            return (
              <article key={claim.id} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 transition-all">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      {shortId(claim.claim_id || claim.id)} · {formatTriggerLabel(claim.disruption_type)}
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">
                      {claim.rider_name || shortId(claim.rider_id)} · {claim.zone_name || "Zone unavailable"} · {formatDateTime(claim.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${spamTone(claim.spam_score)}`}>
                      Spam: {claim.spam_score}/100
                    </span>
                    {isAutoRejected ? (
                      <span className="rounded-full bg-red-950/70 px-3 py-1 text-xs font-semibold text-red-300 ring-1 ring-red-800/80">
                        Auto-Rejected
                      </span>
                    ) : claim.review_status === "rejected" ? (
                      <span className="rounded-full bg-red-950/70 px-3 py-1 text-xs font-semibold text-red-300 ring-1 ring-red-800/80">
                        Rejected
                      </span>
                    ) : null}
                  </div>
                </div>

                <blockquote className="mt-5 border-l-2 border-sky-500/40 pl-4 text-sm italic text-slate-300">
                  “{claim.description || "No description provided."}”
                </blockquote>

                <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/60">
                    {photoSrc && !imageErrors[claim.id] ? (
                      <img
                        src={photoSrc}
                        alt={`Evidence for claim ${claim.id}`}
                        className="h-72 w-full object-cover"
                        onError={() => setImageErrors((current) => ({ ...current, [claim.id]: true }))}
                      />
                    ) : (
                      <div className="flex h-72 items-center justify-center text-sm text-slate-500">
                        No photo available
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Geo</div>
                      <div className={`mt-3 text-sm font-medium ${validationTone(claim.geo_valid)}`}>
                        {validationLabel(claim.geo_valid, `${claim.gps_distance_m ?? 0}m match`, "Location mismatch")}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Weather</div>
                      <div className={`mt-3 text-sm font-medium ${validationTone(claim.weather_match)}`}>
                        {validationLabel(claim.weather_match, "Matches conditions", "No corroboration")}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Traffic</div>
                      <div className={`mt-3 text-sm font-medium ${validationTone(claim.traffic_match)}`}>
                        {validationLabel(claim.traffic_match, "Congestion confirmed", "No traffic match")}
                      </div>
                    </div>
                  </div>
                </div>

                {!isLocked ? (
                  <div className="mt-6 flex flex-col gap-3">
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => void handleApprove(claim)}
                        className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
                      >
                        {isSubmitting ? "Processing..." : "Approve"}
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => setRejectingId((current) => (current === claim.id ? null : claim.id))}
                        className="rounded-xl bg-red-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>

                    {rejectingId === claim.id ? (
                      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 md:flex-row">
                        <input
                          type="text"
                          value={rejectReason[claim.id] || ""}
                          onChange={(event) =>
                            setRejectReason((current) => ({ ...current, [claim.id]: event.target.value }))
                          }
                          placeholder="Add rejection reason"
                          className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none"
                        />
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => void handleReject(claim)}
                          className="rounded-xl bg-red-600 px-5 py-3 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-60"
                        >
                          Confirm Reject
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : claim.review_status === "rejected" ? (
                  <div className="mt-6 rounded-2xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-200">
                    {claim.reviewer_notes ||
                      (isAutoRejected
                        ? "This claim was auto-rejected by the trust checks."
                        : "This claim has already been rejected.")}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
