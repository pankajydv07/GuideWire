"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Zap, 
  MapPin, 
  Users, 
  Clock, 
  BarChart, 
  AlertTriangle,
  PlayCircle,
  Activity,
  History,
  Info
} from "lucide-react";

import { adminApi } from "@/lib/api";
import { 
  formatDurationSince, 
  getTriggerEmoji, 
  formatTriggerLabel, 
  formatApiDate 
} from "@/lib/format";
import type { TriggerStatusResponse, ActiveTrigger, DisruptionEvent, Zone } from "@/lib/types";

const PROTOCOL_THEME: Record<string, { color: string, bg: string, ring: string, text: string }> = {
  heavy_rain: { color: "blue", bg: "bg-blue-500/10", ring: "ring-blue-500/20", text: "text-blue-400" },
  traffic_congestion: { color: "amber", bg: "bg-amber-500/10", ring: "ring-amber-500/20", text: "text-amber-400" },
  store_closure: { color: "rose", bg: "bg-rose-500/10", ring: "ring-rose-500/20", text: "text-rose-400" },
  platform_outage: { color: "purple", bg: "bg-purple-500/10", ring: "ring-purple-500/20", text: "text-purple-400" },
  extreme_heat: { color: "orange", bg: "bg-orange-500/10", ring: "ring-orange-500/20", text: "text-orange-400" },
  regulatory_curfew: { color: "red", bg: "bg-red-500/10", ring: "ring-red-500/20", text: "text-red-400" },
  community_signal: { color: "indigo", bg: "bg-indigo-500/10", ring: "ring-indigo-500/20", text: "text-indigo-400" },
  default: { color: "slate", bg: "bg-slate-500/10", ring: "ring-slate-500/20", text: "text-slate-400" },
};

export default function TriggersPage() {
  const [status, setStatus] = useState<TriggerStatusResponse | null>(null);
  const [events, setEvents] = useState<DisruptionEvent[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [triggerTypes, setTriggerTypes] = useState<{ type: string; label: string; icon: string; desc?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState("");

  const getTheme = (type: string) => PROTOCOL_THEME[type] || PROTOCOL_THEME.default;

  // Group zones by city for the dropdown
  const zonesByCity = useMemo(() => {
    const groups: Record<string, Zone[]> = {};
    for (const zone of zones) {
      const city = zone.city ?? "Other";
      if (!groups[city]) groups[city] = [];
      groups[city].push(zone);
    }
    return groups;
  }, [zones]);

  const loadData = async () => {
    try {
      const [statusRes, eventsRes] = await Promise.all([
        adminApi.triggers.getStatus(),
        adminApi.triggers.getDisruptionEvents(),
      ]);
      setStatus(statusRes);
      setEvents(eventsRes.events);
    } catch (err) {
      console.error("Failed to sync network triggers:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load zones & trigger types from DB (same source as mobile app)
  useEffect(() => {
    adminApi.zones.list()
      .then((res) => {
        setZones(res.zones);
        if (res.zones.length > 0) {
          setSelectedZone(res.zones[0].name);
        }
      })
      .catch(() => console.error("Failed to load zones"));

    adminApi.config.get()
      .then((cfg) => setTriggerTypes(cfg.trigger_types))
      .catch(() => console.error("Failed to load trigger types"));
  }, []);

  useEffect(() => {
    void loadData();
    const interval = window.setInterval(() => void loadData(), 30000);
    return () => window.clearInterval(interval);
  }, []);

  const simulateTrigger = async (type: string) => {
    setTriggering(type);
    try {
      await adminApi.triggers.inject({
        trigger_type: type,
        zone: selectedZone,
      });
      await loadData();
    } catch (err) {
      alert("Simulation sequence failed to initiate.");
    } finally {
      setTriggering(null);
    }
  };

  // Trigger descriptions — display-only, not business logic
  const TRIGGER_DESC: Record<string, string> = {
    heavy_rain: "Flood detection in urban zones",
    traffic_congestion: "Major arterial route blockage",
    platform_outage: "Digital infrastructure failure",
    regulatory: "Emergency movement restrictions",
    store_closed: "Dark store closure detected",
    community_signal: "Community anomaly threshold breached",
  };

  return (
    <div className="space-y-12">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
      >
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Network Surveillance</h1>
          <p className="text-slate-400 font-medium">Monitoring parametric anomalies and disruption sequences.</p>
        </div>
        
        <div className="flex items-center gap-3 glass px-5 py-2.5 rounded-2xl ring-1 ring-white/5">
           <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
           <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">Scanning Zones</span>
        </div>
      </motion.div>

      <section>
        <div className="flex items-center gap-2 mb-8">
           <Zap className="w-5 h-5 text-indigo-400" />
           <h2 className="text-xl font-bold text-white tracking-tight">Active Anomalies</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {!status || status.active_triggers.length === 0 ? (
              <motion.div 
                key="empty-active"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full rounded-[2.5rem] border border-dashed border-slate-800 bg-slate-900/10 py-20 text-center"
              >
                 <div className="text-slate-600 font-bold uppercase tracking-[0.2em] text-xs">No active disruptions detected.</div>
              </motion.div>
            ) : (
                status.active_triggers.map((trigger: ActiveTrigger, idx: number) => {
                  const theme = getTheme(trigger.type);
                  return (
                    <motion.div
                      key={trigger.trigger_id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="glass-card rounded-[2.5rem] p-8 relative overflow-hidden group shadow-2xl"
                    >
                      <div className="absolute top-0 right-0 p-8">
                         <span className={`flex items-center gap-1.5 rounded-full ${theme.bg} px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${theme.text} ${theme.ring} ring-1 backdrop-blur-sm`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${theme.text.replace("text-", "bg-")} animate-pulse shadow-[0_0_8px]`} /> Live
                         </span>
                      </div>

                      <div className="mb-8 flex items-center gap-5">
                        <div className={`h-16 w-16 rounded-3xl ${theme.bg} flex items-center justify-center text-4xl group-hover:scale-110 transition-transform duration-500 shadow-2xl ${theme.ring} ring-1 backdrop-blur-md`}>
                            {getTriggerEmoji(trigger.type)}
                        </div>
                        <div>
                          <div className={`text-xl font-bold text-white mb-0.5 group-hover:text-white transition-colors`}>
                             {formatTriggerLabel(trigger.type)}
                          </div>
                          <div className={`flex items-center gap-2 text-[10px] ${theme.text} font-black uppercase tracking-[0.2em] italic opacity-80`}>
                             {trigger.severity} INTENSITY PROTOCOL
                          </div>
                        </div>
                      </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                       <MapPin className="w-4 h-4 text-slate-600" />
                       <span className="text-sm font-bold text-slate-300">{trigger.zone}</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <Users className="w-4 h-4 text-slate-600" />
                       <span className="text-sm font-bold text-slate-300">{trigger.affected_riders} impacted</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <Clock className="w-4 h-4 text-slate-600" />
                       <span className="text-sm font-bold text-indigo-400">{formatDurationSince(trigger.active_since)} active</span>
                    </div>
                  </div>
                    </motion.div>
                  );
                })
            )}
          </AnimatePresence>
        </div>
      </section>

      <div className="grid gap-10 xl:grid-cols-[1fr_0.4fr]">
        <section className="glass-card rounded-[3rem] p-10">
          <div className="flex items-center justify-between mb-10">
             <div className="flex items-center gap-3">
                <History className="w-6 h-6 text-slate-400" />
                <h2 className="text-2xl font-bold text-white tracking-tight">Disruption History</h2>
             </div>
             <BarChart className="w-5 h-5 text-slate-700" />
          </div>

          <div className="space-y-4">
            {loading ? (
               Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-[1.5rem] bg-white/5 animate-pulse" />
               ))
            ) : events.length === 0 ? (
               <div className="text-center py-10 text-slate-600 uppercase tracking-widest text-xs font-bold">Archive Empty</div>
            ) : (
               events.slice(0, 10).map((event: DisruptionEvent, idx: number) => {
                  const theme = getTheme(event.trigger_type);
                  return (
                    <motion.div 
                      key={event.event_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center justify-between p-6 rounded-[1.5rem] border border-slate-800/40 bg-slate-900/20 hover:bg-slate-900/40 group transition-all duration-300"
                    >
                      <div className="flex items-center gap-6">
                         <div className={`h-12 w-12 rounded-2xl ${theme.bg} flex items-center justify-center text-2xl ${theme.ring} ring-1 group-hover:scale-105 transition-transform shadow-xl`}>
                            {getTriggerEmoji(event.trigger_type)}
                         </div>
                         <div>
                            <div className={`text-sm font-bold text-slate-100 group-hover:text-white transition-colors`}>{formatTriggerLabel(event.trigger_type)}</div>
                            <div className="text-[10px] text-slate-600 font-black uppercase tracking-widest mt-1 group-hover:text-slate-500 transition-colors">{event.zone} • {event.severity} SEVERITY</div>
                         </div>
                      </div>
                      <div className="text-right">
                         <div className="text-[9px] font-black text-slate-600 mb-1 tracking-widest">LOGGED AT</div>
                         <div className="text-[11px] font-bold text-slate-400 group-hover:text-slate-300 transition-colors uppercase font-mono">{formatApiDate(event.created_at)}</div>
                      </div>
                    </motion.div>
                  );
                })
            )}
          </div>
        </section>

        <section className="glass-card rounded-[3rem] p-10 h-fit sticky top-8">
          <div className="flex items-center gap-3 mb-10">
             <PlayCircle className="w-6 h-6 text-emerald-400" />
             <h2 className="text-2xl font-bold text-white tracking-tight">Simulator</h2>
          </div>
          
          <div className="space-y-6">
            <div>
               <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block px-2">Target Zone</label>
               <select 
                 value={selectedZone}
                 onChange={(e) => setSelectedZone(e.target.value)}
                 className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-bold appearance-none"
               >
                  {zones.length === 0 ? (
                    <option disabled>Loading zones...</option>
                  ) : (
                    Object.entries(zonesByCity).map(([city, cityZones]) => (
                      <optgroup key={city} label={city.charAt(0).toUpperCase() + city.slice(1)}>
                        {cityZones.map((z) => (
                          <option key={z.id} value={z.name}>
                            {z.name.replace(/_/g, " ")}
                          </option>
                        ))}
                      </optgroup>
                    ))
                  )}
               </select>
            </div>

            <div className="p-6 rounded-[2rem] bg-amber-500/5 border border-amber-500/10">
               <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-amber-200">Simulation Alert</span>
               </div>
               <p className="text-[10px] text-amber-200/60 leading-relaxed font-medium">Injected triggers generate real automated payout sequences for active riders in the target zone.</p>
            </div>

            <div className="space-y-3">
              {triggerTypes.map((opt) => (
                <button
                  key={opt.type}
                  disabled={triggering !== null}
                  onClick={() => simulateTrigger(opt.type)}
                  className={`w-full flex items-center justify-between p-5 rounded-3xl border border-slate-800/60 bg-slate-900/60 transition-all hover:scale-[1.02] active:scale-[0.98] group ${triggering === opt.type ? "opacity-50" : "hover:border-emerald-500/30 hover:bg-emerald-500/[0.02]"}`}
                >
                  <div className="flex items-center gap-4">
                     <span className="text-2xl group-hover:scale-110 transition-transform">{opt.icon}</span>
                     <div className="text-left">
                        <div className="text-sm font-bold text-slate-200">{opt.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{TRIGGER_DESC[opt.type] || "Network anomaly simulation"}</div>
                     </div>
                  </div>
                  {triggering === opt.type ? (
                     <div className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  ) : (
                     <PlayCircle className="w-4 h-4 text-slate-700 group-hover:text-emerald-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
