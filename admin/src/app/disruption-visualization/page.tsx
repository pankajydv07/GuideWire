"use client";

import { useEffect, useMemo, useState } from "react";

import { PageContainer } from "@/components/PageContainer";
import { adminApi } from "@/lib/api";
import {
  formatApiDate,
  formatCurrency,
  formatTriggerLabel,
  getTriggerEmoji,
  shortId,
} from "@/lib/format";
import type {
  DisruptionVisualizationDetail,
  DisruptionVisualizationSummary,
} from "@/lib/types";

const FLOW_STEPS = ["triggered", "detected", "riders_identified", "verification", "payout"];
const TERMINAL_STATUSES = new Set(["completed", "failed"]);

function prettyStep(step: string) {
  return step.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function prettyReason(reason?: string | null) {
  if (!reason) return "—";
  const mapped: Record<string, string> = {
    no_coverage_remaining: "Verified, but no remaining coverage",
    no_income_loss: "Verified, but no income loss detected",
    missing_snapshot: "Could not verify rider snapshot in the event window",
    duplicate_claim: "Duplicate claim prevented processing",
    fraud_threshold_exceeded: "Flagged by anti-spoofing and fraud checks",
    eligible_for_payout: "Verified and eligible for payout",
  };
  return mapped[reason] || prettyStep(reason);
}

function prettyStage(stage?: string | null) {
  if (!stage) return "Unknown";
  const mapped: Record<string, string> = {
    detected: "Detected",
    fetched: "Inputs Fetched",
    under_verification: "Under Verification",
    verified: "Verified",
    fraud_flagged: "Fraud Flagged",
    payout_blocked: "Payout Blocked",
    payout_queued: "Payout Queued",
    paid: "Paid",
    failed: "Failed",
  };
  return mapped[stage] || prettyStep(stage);
}

function prettyPayoutStatus(status?: string | null) {
  if (!status) return "—";
  const mapped: Record<string, string> = {
    not_eligible: "Not Eligible",
    blocked: "Blocked",
    pending: "Pending",
    completed: "Completed",
  };
  return mapped[status] || prettyStep(status);
}

function prettyVerification(result?: string | null) {
  if (!result) return "—";
  const mapped: Record<string, string> = {
    pass: "Passed",
    fail: "Failed",
    pending: "Pending",
  };
  return mapped[result] || prettyStep(result);
}

function statusTone(status?: string | null) {
  switch (status) {
    case "completed":
    case "paid":
    case "pass":
    case "verified":
      return { bg: "rgba(16,185,129,0.12)", fg: "#6ee7b7" };
    case "failed":
    case "blocked":
    case "reject":
    case "rejected":
    case "fraud_flagged":
      return { bg: "rgba(244,63,94,0.12)", fg: "#fda4af" };
    case "in_progress":
    case "under_verification":
    case "payout_queued":
    case "pending":
      return { bg: "rgba(59,130,246,0.12)", fg: "#93c5fd" };
    default:
      return { bg: "rgba(148,163,184,0.12)", fg: "#cbd5e1" };
  }
}

export default function DisruptionVisualizationPage() {
  const [events, setEvents] = useState<DisruptionVisualizationSummary[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [detail, setDetail] = useState<DisruptionVisualizationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        await adminApi.autoLogin();
        const response = await adminApi.disruptions.listVisualization(25);
        setEvents(response.events);
        setSelectedEventId((current) => {
          const hasCurrent = response.events.some((event) => event.event_id === current);
          if (!current || !hasCurrent) return response.events[0]?.event_id || "";
          return current;
        });
        setError(null);
        setInfoMessage(
          response.events.length === 0
            ? "No disruption traces are available yet. Inject or detect a disruption to populate this view."
            : null,
        );
      } catch (err) {
        setEvents([]);
        setSelectedEventId("");
        setDetail(null);
        setError(null);
        setInfoMessage(
          err instanceof Error
            ? "Disruption traceability is not available yet in this environment."
            : "Disruption traceability is not available yet in this environment.",
        );
      } finally {
        setLoading(false);
      }
    };
    void loadEvents();
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;

    let active = true;
    let intervalId: number | null = null;

    const loadDetail = async () => {
      try {
        const response = await adminApi.disruptions.getVisualization(selectedEventId);
        if (!active) return;
        setDetail(response);
        setError(null);
        setInfoMessage(null);

        const isTerminal = TERMINAL_STATUSES.has(response.summary.processing_status);
        if (intervalId !== null) {
          window.clearInterval(intervalId);
          intervalId = null;
        }
        if (!isTerminal) {
          intervalId = window.setInterval(() => {
            void loadDetail();
          }, 5000);
        }
      } catch (err) {
        if (active) {
          setDetail(null);
          setError(null);
          setInfoMessage(
            err instanceof Error
              ? err.message
              : "Disruption traceability detail is not available yet.",
          );
        }
      }
    };

    void loadDetail();

    return () => {
      active = false;
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [selectedEventId]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.event_id === selectedEventId) || null,
    [events, selectedEventId],
  );

  useEffect(() => {
    if (!selectedEventId) return;
    const refreshSummaries = async () => {
      try {
        const response = await adminApi.disruptions.listVisualization(25);
        setEvents(response.events);
        const newestId = response.events[0]?.event_id || "";
        const currentIsTerminal = detail ? TERMINAL_STATUSES.has(detail.summary.processing_status) : false;
        if (newestId && newestId !== selectedEventId && currentIsTerminal) {
          setSelectedEventId(newestId);
        }
      } catch {
        // Keep existing view if summary refresh fails.
      }
    };

    const intervalId = window.setInterval(() => {
      void refreshSummaries();
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [selectedEventId, detail]);

  return (
    <PageContainer>
      <div className="space-y-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.25em] mb-2.5" style={{ color: "var(--text-muted)" }}>
              Disruption Traceability
            </div>
            <h1 className="text-3xl font-black tracking-tight mb-1" style={{ color: "var(--text-primary)" }}>
              Disruption Visualization
            </h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Inspect trigger detection, rider verification, and payout decisions step by step.
            </p>
          </div>

          <div className="w-full lg:w-96">
            <label className="block text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
              Select disruption event
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full rounded-2xl px-4 py-3 text-sm font-semibold outline-none"
              style={{ background: "var(--bg-surface)", color: "var(--text-primary)" }}
            >
              {events.length === 0 ? (
                <option value="">No disruption events</option>
              ) : (
                events.map((event) => (
                  <option key={event.event_id} value={event.event_id}>
                    {`${formatTriggerLabel(event.trigger_type)} · ${event.zone} · ${formatApiDate(event.created_at)}`}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl p-4 text-sm font-medium" style={{ background: "rgba(244,63,94,0.08)", color: "#fca5a5" }}>
            {error}
          </div>
        )}

        {infoMessage && !error && (
          <div className="rounded-2xl p-4 text-sm font-medium" style={{ background: "rgba(59,130,246,0.08)", color: "#bfdbfe" }}>
            {infoMessage}
          </div>
        )}

        {loading && (
          <div className="rounded-2xl p-6 text-sm" style={{ background: "var(--bg-surface)", color: "var(--text-secondary)" }}>
            Loading disruption telemetry...
          </div>
        )}

        {!loading && events.length === 0 && (
          <div className="rounded-2xl p-10 text-center" style={{ background: "var(--bg-surface)" }}>
            <div className="text-lg font-black mb-2" style={{ color: "var(--text-primary)" }}>No disruptions available</div>
            <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {infoMessage || "Inject or detect a disruption first, then return here to inspect the processing lifecycle."}
            </div>
          </div>
        )}

        {detail && (
          <>
            <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
              <div className="rounded-3xl p-6" style={{ background: "var(--bg-surface)" }}>
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <div className="text-4xl mb-2">{getTriggerEmoji(detail.summary.trigger_type)}</div>
                    <div className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>
                      {formatTriggerLabel(detail.summary.trigger_type)}
                    </div>
                    <div className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                      {detail.summary.zone} · {detail.summary.source} · {formatApiDate(detail.summary.created_at)}
                    </div>
                  </div>
                  <span
                    className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest"
                    style={{ background: statusTone(detail.summary.processing_status).bg, color: statusTone(detail.summary.processing_status).fg }}
                  >
                    {detail.summary.processing_status}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    ["Detected Riders", detail.summary.total_riders_detected],
                    ["Verified Riders", detail.summary.verified_riders],
                    ["Rejected / Flagged", detail.summary.rejected_or_flagged_riders],
                    ["Paid Riders", detail.summary.paid_riders],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-2xl p-4" style={{ background: "var(--bg-elevated)" }}>
                      <div className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
                        {label}
                      </div>
                      <div className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl p-6" style={{ background: "var(--bg-surface)" }}>
                <div className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
                  Flow Visualization
                </div>
                <div className="space-y-3">
                  {FLOW_STEPS.map((step) => {
                    const timelineStep = detail.timeline.find((item) => item.step_key === step);
                    const tone = statusTone(timelineStep?.status);
                    return (
                      <div key={step} className="rounded-2xl p-4" style={{ background: "var(--bg-elevated)" }}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-black" style={{ color: "var(--text-primary)" }}>
                            {prettyStep(step)}
                          </div>
                          <span
                            className="rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest"
                            style={{ background: tone.bg, color: tone.fg }}
                          >
                            {timelineStep?.status || "pending"}
                          </span>
                        </div>
                        <div className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
                          {timelineStep?.completed_at
                            ? `Completed ${formatApiDate(timelineStep.completed_at)}`
                            : timelineStep?.started_at
                              ? `Started ${formatApiDate(timelineStep.started_at)}`
                              : "Waiting for execution"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-3xl p-6" style={{ background: "var(--bg-surface)" }}>
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
                    Lifecycle Timeline
                  </div>
                  <div className="text-lg font-black" style={{ color: "var(--text-primary)" }}>
                    Triggered → Detected → Riders Identified → Verification → Payout
                  </div>
                </div>
                <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Refreshed {formatApiDate(detail.refreshed_at)}
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-5">
                {detail.timeline.map((step) => {
                  const tone = statusTone(step.status);
                  const metaText = Object.entries(step.meta || {})
                    .slice(0, 2)
                    .map(([key, value]) => `${key}: ${String(value)}`)
                    .join(" · ");
                  return (
                    <div key={step.step_key} className="rounded-2xl p-4" style={{ background: "var(--bg-elevated)" }}>
                      <div className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
                        {prettyStep(step.step_key)}
                      </div>
                      <div className="mb-2">
                        <span
                          className="rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest"
                          style={{ background: tone.bg, color: tone.fg }}
                        >
                          {step.status}
                        </span>
                      </div>
                      <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        {step.started_at ? `Start: ${formatApiDate(step.started_at)}` : "Start: —"}
                      </div>
                      <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                        {step.completed_at ? `End: ${formatApiDate(step.completed_at)}` : "End: —"}
                      </div>
                      <div className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                        {metaText || "No counters"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl overflow-hidden" style={{ background: "var(--bg-surface)" }}>
              <div className="px-6 py-5 flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
                    Rider Processing Table
                  </div>
                  <div className="text-lg font-black" style={{ color: "var(--text-primary)" }}>
                    {selectedEvent ? `${formatTriggerLabel(selectedEvent.trigger_type)} in ${selectedEvent.zone}` : "Rider processing trace"}
                  </div>
                </div>
              </div>

              {detail.riders.length === 0 ? (
                <div className="px-6 pb-8 text-sm" style={{ color: "var(--text-secondary)" }}>
                  No candidate riders were identified for this disruption event.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr style={{ background: "var(--bg-elevated)" }}>
                        {["Rider", "Stage", "Verification", "Fraud", "Expected", "Actual", "Loss", "Payout", "Trace"].map((label) => (
                          <th
                            key={label}
                            className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detail.riders.map((row) => {
                        const stageTone = statusTone(row.processing_stage);
                        const verifyTone = statusTone(row.verification_result === "fail" ? "failed" : row.verification_result);
                        const payoutTone = statusTone(row.payout_status);
                        return (
                          <tr key={row.trace_id} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                            <td className="px-4 py-4">
                              <div className="font-bold" style={{ color: "var(--text-primary)" }}>
                                {row.rider_name || shortId(row.rider_id)}
                              </div>
                              <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                                {shortId(row.rider_id)} · {row.snapshot_time ? formatApiDate(row.snapshot_time) : "No snapshot"}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className="rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest" style={{ background: stageTone.bg, color: stageTone.fg }}>
                                {prettyStage(row.processing_stage)}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div>
                                <span className="rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest" style={{ background: verifyTone.bg, color: verifyTone.fg }}>
                                  {prettyVerification(row.verification_result)}
                                </span>
                              </div>
                              <div className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
                                {prettyReason(row.verification_reason)}
                              </div>
                            </td>
                            <td className="px-4 py-4">{row.fraud_score ?? "—"}</td>
                            <td className="px-4 py-4">{row.expected_earnings != null ? formatCurrency(row.expected_earnings) : "—"}</td>
                            <td className="px-4 py-4">{row.actual_earnings != null ? formatCurrency(row.actual_earnings) : "—"}</td>
                            <td className="px-4 py-4">{row.income_loss != null ? formatCurrency(row.income_loss) : "—"}</td>
                            <td className="px-4 py-4">
                              <div>
                                <span className="rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest" style={{ background: payoutTone.bg, color: payoutTone.fg }}>
                                  {prettyPayoutStatus(row.payout_status)}
                                </span>
                              </div>
                              <div className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
                                {row.eligible_payout_amount != null ? formatCurrency(row.eligible_payout_amount) : "—"}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                                Claim: {row.claim_id ? shortId(row.claim_id) : "—"}
                              </div>
                              <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                                Payout: {row.payout_id ? shortId(row.payout_id) : "—"}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}
