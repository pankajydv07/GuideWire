"use client";

import { useEffect, useState } from "react";

import { adminApi } from "@/lib/api";
import { formatPercent } from "@/lib/format";
import type { PredictiveZoneForecast } from "@/lib/types";
import { PageContainer } from "@/components/PageContainer";

export default function PredictivePage() {
  const [zones, setZones] = useState<PredictiveZoneForecast[]>([]);
  const [thresholds, setThresholds] = useState<Array<{ zone_id: string; zone: string; thresholds: Record<string, number> }>>([]);
  const [hotspots, setHotspots] = useState<Array<{ zone: string; events: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const active = true;
    const load = async () => {
      try {
        await adminApi.autoLogin();
        const [predictive, thresholdData, graph] = await Promise.all([
          adminApi.analytics.predictive(7),
          adminApi.analytics.thresholds(),
          adminApi.analytics.knowledgeGraph(72),
        ]);
        if (!active) return;
        setZones(predictive.zones);
        setThresholds(thresholdData.zones);
        setHotspots(graph.hotspots.map((h) => ({ zone: h.zone, events: h.events })));
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load predictive analytics.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <PageContainer>
      <div className="space-y-8">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.25em] mb-2.5" style={{ color: "var(--text-muted)" }}>
            Predictive Intelligence
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-1" style={{ color: "var(--text-primary)" }}>
            Next-Week Risk + Adaptive Thresholds
          </h1>
        </div>

        {error && (
          <div className="rounded-2xl p-4 text-sm font-medium" style={{ background: "rgba(244,63,94,0.08)", color: "#fca5a5" }}>
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {hotspots.slice(0, 3).map((hotspot) => (
            <div key={hotspot.zone} className="card p-5" style={{ background: "var(--bg-surface)" }}>
              <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Propagation hotspot</div>
              <div className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{hotspot.zone}</div>
              <div className="text-sm" style={{ color: "#f59e0b" }}>{hotspot.events} recent events</div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-surface)" }}>
          <table className="min-w-full text-sm">
            <thead>
              <tr style={{ background: "var(--bg-elevated)" }}>
                {["Zone", "City", "Max Risk", "Recent Events", "Top Day"].map((col) => (
                  <th key={col} className="px-5 py-4 text-left text-[9px] font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-10">Loading...</td></tr>
              ) : (
                zones.map((zone) => {
                  const topDay = zone.forecast.reduce((best, day) => (
                    day.predicted_disruption_probability > best.predicted_disruption_probability ? day : best
                  ), zone.forecast[0]);
                  return (
                    <tr key={zone.zone_id} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                      <td className="px-5 py-4 font-bold">{zone.zone}</td>
                      <td className="px-5 py-4">{zone.city}</td>
                      <td className="px-5 py-4">{formatPercent(zone.max_predicted_risk)}</td>
                      <td className="px-5 py-4">{zone.recent_event_count}</td>
                      <td className="px-5 py-4">{topDay?.date || "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-surface)" }}>
          <table className="min-w-full text-sm">
            <thead>
              <tr style={{ background: "var(--bg-elevated)" }}>
                {["Zone", "Rain", "Heat", "AQI", "Congestion", "Queue Wait"].map((col) => (
                  <th key={col} className="px-5 py-4 text-left text-[9px] font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {thresholds.map((entry) => (
                <tr key={entry.zone_id} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  <td className="px-5 py-4 font-bold">{entry.zone}</td>
                  <td className="px-5 py-4">{entry.thresholds.rainfall_mm?.toFixed(1)}</td>
                  <td className="px-5 py-4">{entry.thresholds.heat_index?.toFixed(1)}</td>
                  <td className="px-5 py-4">{entry.thresholds.aqi?.toFixed(0)}</td>
                  <td className="px-5 py-4">{entry.thresholds.congestion_index?.toFixed(0)}</td>
                  <td className="px-5 py-4">{entry.thresholds.queue_wait_sec?.toFixed(0)}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageContainer>
  );
}
