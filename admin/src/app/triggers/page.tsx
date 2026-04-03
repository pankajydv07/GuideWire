"use client";

import { useEffect, useState } from "react";

import { adminApi } from "@/lib/api";
import { formatDateTime, formatDurationSince, formatTriggerWithEmoji } from "@/lib/format";
import type { DisruptionEvent, TriggerStatusResponse, Zone } from "@/lib/types";

const INJECT_ACTIONS = [
  { key: "heavy_rain", label: "Heavy Rain", emoji: "🌧️", className: "bg-sky-600 hover:bg-sky-500", payload: { trigger_type: "heavy_rain", rainfall_mm: 60 } },
  { key: "traffic_congestion", label: "Traffic Jam", emoji: "🚗", className: "bg-orange-600 hover:bg-orange-500", payload: { trigger_type: "traffic_congestion", congestion_index: 90 } },
  { key: "store_closure", label: "Store Closed", emoji: "🏪", className: "bg-rose-600 hover:bg-rose-500", payload: { trigger_type: "store_closure" } },
  { key: "platform_outage", label: "Platform Down", emoji: "📱", className: "bg-fuchsia-600 hover:bg-fuchsia-500", payload: { trigger_type: "platform_outage" } },
  { key: "regulatory_curfew", label: "Regulatory", emoji: "🚫", className: "bg-red-700 hover:bg-red-600", payload: { trigger_type: "regulatory_curfew" } },
] as const;

export default function TriggersPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState("");
  const [status, setStatus] = useState<TriggerStatusResponse | null>(null);
  const [events, setEvents] = useState<DisruptionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        await adminApi.autoLogin();
        const [zonesResponse, statusResponse, eventsResponse] = await Promise.all([
          adminApi.zones.list(),
          adminApi.triggers.getStatus(),
          adminApi.triggers.getDisruptionEvents(),
        ]);

        if (!active) return;
        setZones(zonesResponse.zones);
        setSelectedZone((current) => current || zonesResponse.zones[0]?.name || "");
        setStatus(statusResponse);
        setEvents(eventsResponse.events);
        setMessage(null);
      } catch (err) {
        if (!active) return;
        setMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Failed to load trigger dashboard.",
        });
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    const interval = window.setInterval(() => void load(), 10000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const handleInject = async (action: (typeof INJECT_ACTIONS)[number]) => {
    if (!selectedZone) return;

    setActiveAction(action.key);
    setMessage(null);

    try {
      await adminApi.triggers.inject({
        ...action.payload,
        zone: selectedZone,
        duration_seconds: 1800,
      });

      const [statusResponse, eventsResponse] = await Promise.all([
        adminApi.triggers.getStatus(),
        adminApi.triggers.getDisruptionEvents(),
      ]);

      setStatus(statusResponse);
      setEvents(eventsResponse.events);
      setMessage({
        type: "success",
        text: `${action.label} injected into ${selectedZone}.`,
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to inject trigger.",
      });
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Trigger Management</h1>
        <p className="mt-2 text-sm text-slate-400">Inject demo disruptions, inspect live triggers, and review the event log.</p>
      </div>

      {message ? (
        <div
          className={`rounded-2xl border p-4 text-sm ${
            message.type === "success"
              ? "border-emerald-900/70 bg-emerald-950/40 text-emerald-200"
              : "border-red-900/70 bg-red-950/40 text-red-200"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <section className="rounded-3xl border border-amber-800/70 bg-gradient-to-r from-amber-950/60 via-slate-900/90 to-slate-900/90 p-6 shadow-xl shadow-amber-950/10">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-amber-300">Demo Injection Panel</h2>
            <p className="mt-1 text-sm text-slate-400">Fire live disruptions against the current backend trigger service.</p>
          </div>
          <label className="flex min-w-52 flex-col gap-2 text-sm text-slate-400">
            Zone
            <select
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
              value={selectedZone}
              onChange={(event) => setSelectedZone(event.target.value)}
              disabled={loading || zones.length === 0}
            >
              {zones.map((zone) => (
                <option key={zone.id} value={zone.name}>
                  {zone.name} · {zone.city}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {INJECT_ACTIONS.map((action) => {
            const loadingAction = activeAction === action.key;
            return (
              <button
                key={action.key}
                type="button"
                disabled={!selectedZone || loadingAction}
                onClick={() => void handleInject(action)}
                className={`rounded-2xl px-4 py-4 text-left text-sm font-medium text-white transition ${action.className} ${
                  loadingAction ? "scale-[0.98] animate-pulse shadow-[0_0_30px_rgba(251,191,36,0.25)]" : ""
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <div className="text-xl">{action.emoji}</div>
                <div className="mt-3">{loadingAction ? "Injecting..." : action.label}</div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Active Triggers</h2>
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Refresh 10s</span>
          </div>

          {!status || status.active_triggers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 px-4 py-8 text-center text-sm text-slate-500">
              No active disruptions.
            </div>
          ) : (
            <div className="space-y-3">
              {status.active_triggers.map((trigger) => (
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
                  <div className="mt-4 grid gap-2 text-sm text-slate-400 md:grid-cols-3">
                    <span>{trigger.affected_riders} riders affected</span>
                    <span>{formatDurationSince(trigger.active_since)} active</span>
                    <span className="truncate">{trigger.threshold}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Disruption History</h2>
            <span className="text-xs uppercase tracking-[0.18em] text-slate-500">{events.length} events</span>
          </div>

          {events.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 px-4 py-8 text-center text-sm text-slate-500">
              No disruption events recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-slate-400">
                    <th className="pb-3 pr-4 font-medium">Time</th>
                    <th className="pb-3 pr-4 font-medium">Zone</th>
                    <th className="pb-3 pr-4 font-medium">Type</th>
                    <th className="pb-3 pr-4 font-medium">Severity</th>
                    <th className="pb-3 pr-4 font-medium">Affected</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.event_id} className="border-b border-slate-800/60 text-slate-200">
                      <td className="py-3 pr-4 text-slate-400">{formatDateTime(event.created_at)}</td>
                      <td className="py-3 pr-4">{event.zone}</td>
                      <td className="py-3 pr-4">{formatTriggerWithEmoji(event.trigger_type)}</td>
                      <td className="py-3 pr-4 capitalize text-red-300">{event.severity}</td>
                      <td className="py-3 pr-4">{event.affected_riders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
