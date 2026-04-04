"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ClipboardList, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  Calendar,
  MapPin,
  Camera,
  Activity,
  ShieldAlert,
  ArrowRight
} from "lucide-react";

import { adminApi } from "@/lib/api";
import { formatTriggerWithEmoji, shortId, formatApiDate } from "@/lib/format";
import type { ManualClaimReview } from "@/lib/types";
import { STATUS_STYLES } from "@/lib/types";

export default function ManualClaimsPage() {
  const [claims, setClaims] = useState<ManualClaimReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<ManualClaimReview | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);

  const loadClaims = async () => {
    try {
      const response = await adminApi.claims.listManual();
      setClaims(response.claims);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to retrieve manual claim queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadClaims();
    const interval = window.setInterval(() => void loadClaims(), 30000);
    return () => window.clearInterval(interval);
  }, []);

  const handleReview = async (claimId: string, status: "approved" | "rejected") => {
    setReviewing(claimId);
    try {
      if (status === "approved") {
        await adminApi.claims.approve(claimId);
      } else {
        await adminApi.claims.reject(claimId, "Rejected by administrator review protocol.");
      }
      await loadClaims();
      if (selectedClaim?.id === claimId) {
        setSelectedClaim(null);
      }
    } catch (err) {
      alert("Failed to propagate review decision.");
    } finally {
      setReviewing(null);
    }
  };

  const pendingClaims = claims.filter((c) => c.review_status === "pending");
  const processedClaims = claims.filter((c) => c.review_status !== "pending");

  return (
    <div className="space-y-10">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Review Queue</h1>
        <p className="text-slate-400 font-medium">Human-in-the-loop verification for community-signaled disruptions.</p>
      </motion.div>

      {error ? (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200 uppercase font-bold tracking-widest ring-1 ring-rose-500/40">
           {error}
        </div>
      ) : null}

      <div className="grid gap-10 xl:grid-cols-[1fr_0.45fr]">
        <section className="space-y-8">
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center ring-1 ring-indigo-500/20">
                   <Clock className="w-5 h-5 text-indigo-400" />
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">Pending Verification</h2>
             </div>
             <span className="rounded-full bg-indigo-500/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400 ring-1 ring-indigo-500/20">
                {pendingClaims.length} awaiting
             </span>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {loading && claims.length === 0 ? (
                 Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-24 rounded-[2rem] bg-white/5 animate-pulse" />
                 ))
              ) : pendingClaims.length === 0 ? (
                <motion.div 
                  key="empty-queue"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-[2.5rem] border border-dashed border-slate-800 bg-slate-900/10 py-16 text-center"
                >
                   <CheckCircle className="w-10 h-10 text-emerald-500/20 mx-auto mb-4" />
                   <div className="text-slate-600 font-bold uppercase tracking-[0.2em] text-xs">Surveillance Clear</div>
                </motion.div>
              ) : (
                pendingClaims.map((claim, idx) => (
                  <motion.div
                    key={claim.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`glass-card rounded-[2rem] p-6 group cursor-pointer transition-all duration-300 ${selectedClaim?.id === claim.id ? "ring-2 ring-indigo-500/50 bg-indigo-500/[0.05]" : "hover:bg-white/[0.02]"}`}
                    onClick={() => setSelectedClaim(claim)}
                  >
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-5">
                          <div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-500 shadow-xl ring-1 ring-white/10">
                             {formatTriggerWithEmoji(claim.disruption_type)}
                          </div>
                          <div>
                             <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-1">Rider Node {shortId(claim.rider_id).toUpperCase()}</div>
                             <div className="text-base font-bold text-slate-100">{claim.rider_name || "Anonymous Sector"}</div>
                             <div className="text-xs text-indigo-400/60 font-medium mt-1 uppercase tracking-widest">{claim.disruption_type.replace(/_/g, " ")}</div>
                          </div>
                       </div>
                       <div className="text-right">
                          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">{formatApiDate(claim.created_at)}</div>
                          <div className="mt-3 flex items-center justify-end gap-2 text-[10px] font-bold text-indigo-400 group-hover:translate-x-1 transition-transform">
                             ANALYZE <ArrowRight className="w-3 h-3" />
                          </div>
                       </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          <div className="pt-12">
             <div className="flex items-center gap-3 mb-8 opacity-40">
                <ClipboardList className="w-6 h-6" />
                <h2 className="text-xl font-bold text-white tracking-tight">Decisional Archive</h2>
             </div>
             <div className="space-y-3">
                {processedClaims.slice(0, 5).map((claim) => (
                  <div key={claim.id} className="flex items-center justify-between p-6 rounded-[1.5rem] border border-slate-800/40 bg-slate-900/10 group hover:bg-slate-900/20 transition-colors">
                     <div className="flex items-center gap-4">
                        <span className="text-xl opacity-40 group-hover:opacity-100 transition-opacity">{formatTriggerWithEmoji(claim.disruption_type)}</span>
                        <span className="text-sm font-bold text-slate-400 group-hover:text-slate-200 transition-colors">{claim.rider_name || shortId(claim.rider_id)}</span>
                     </div>
                     <span className={`rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] ${STATUS_STYLES[claim.review_status] || STATUS_STYLES.pending}`}>
                        {claim.review_status}
                     </span>
                  </div>
                ))}
             </div>
          </div>
        </section>

        <aside className="sticky top-8 h-fit">
          <AnimatePresence mode="wait">
            {!selectedClaim ? (
              <motion.div 
                key="empty-side"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card rounded-[2.5rem] p-12 text-center py-32 border-dashed border-slate-800/60"
              >
                 <div className="relative mb-8 inline-block">
                    <Eye className="w-16 h-16 text-slate-800" />
                    <div className="absolute top-0 right-0 h-4 w-4 rounded-full bg-slate-800 animate-pulse" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-400 mb-3 tracking-tight">Security Chamber</h3>
                 <p className="text-sm text-slate-600 leading-relaxed max-w-[240px] mx-auto font-medium">Capture a signal flow to initiate verification and income redistribution.</p>
              </motion.div>
            ) : (
              <motion.div
                key={selectedClaim.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="glass-card rounded-[2.5rem] p-8 overflow-hidden relative shadow-2xl"
              >
                <div className="absolute top-0 right-0 p-8">
                   <div className="px-3 py-1 rounded-full bg-indigo-500/10 text-[9px] font-bold text-indigo-400 tracking-widest ring-1 ring-indigo-500/20">
                      SIGNAL #{shortId(selectedClaim.id).toUpperCase()}
                   </div>
                </div>

                <div className="mb-10 mt-4">
                   <div className="h-24 w-24 rounded-[2.5rem] bg-gradient-to-br from-indigo-500/10 to-purple-500/10 mx-auto flex items-center justify-center text-5xl mb-8 ring-1 ring-white/10 shadow-2xl">
                      {formatTriggerWithEmoji(selectedClaim.disruption_type)}
                   </div>
                   <div className="text-center">
                      <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.3em] mb-2">Subject Identity</div>
                      <h3 className="text-2xl font-bold text-white tracking-tight">{selectedClaim.rider_name || "Unknown Agent"}</h3>
                      <p className="text-[11px] text-slate-500 font-mono mt-2 tracking-wider">{selectedClaim.rider_id}</p>
                   </div>
                </div>

                <div className="space-y-6 mb-12">
                   <div className="rounded-[2rem] bg-slate-950/60 p-6 border border-white/5 relative group">
                      <div className="absolute -top-3 left-6 flex items-center gap-2 px-3 py-1 bg-slate-950 border border-white/10 rounded-full text-[9px] font-bold text-slate-500 tracking-widest">
                         <Activity className="w-2.5 h-2.5" /> TELEMETRY
                      </div>
                      <div className="space-y-5 pt-2">
                         <div className="flex items-center gap-4">
                            <MapPin className="w-5 h-5 text-slate-700 group-hover:text-indigo-400 transition-colors" />
                            <div>
                               <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-0.5">ZONE</div>
                               <span className="text-sm font-bold text-slate-300">{selectedClaim.zone_name || "GPS Mismatch Blocked"}</span>
                            </div>
                         </div>
                         <div className="flex items-center gap-4">
                            <Calendar className="w-5 h-5 text-slate-700 group-hover:text-indigo-400 transition-colors" />
                            <div>
                               <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-0.5">TIMESTAMP</div>
                               <span className="text-sm font-bold text-slate-300">{formatApiDate(selectedClaim.created_at)}</span>
                            </div>
                         </div>
                         <div className="flex items-center gap-4">
                            <ShieldAlert className="w-5 h-5 text-slate-700 group-hover:text-indigo-400 transition-colors" />
                            <div>
                               <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-0.5">SPAM DETECTION</div>
                               <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-24 rounded-full bg-slate-800 overflow-hidden">
                                     <div className="h-full bg-indigo-500" style={{ width: `${selectedClaim.spam_score}%` }} />
                                  </div>
                                  <span className="text-xs font-bold text-indigo-400">{selectedClaim.spam_score}%</span>
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="rounded-[2rem] bg-slate-950/60 p-6 border border-white/5 relative group">
                      <div className="absolute -top-3 left-6 flex items-center gap-2 px-3 py-1 bg-slate-950 border border-white/10 rounded-full text-[9px] font-bold text-slate-500 tracking-widest">
                         <Camera className="w-2.5 h-2.5" /> EVIDENCE
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed italic pt-2 line-clamp-4">
                        &ldquo;{selectedClaim.description || "No supplemental telemetry provided by the reporting node."}&rdquo;
                      </p>
                      {selectedClaim.photo_url && (
                        <div className="mt-4 rounded-2xl overflow-hidden ring-1 ring-white/10 opacity-60 hover:opacity-100 transition-opacity cursor-zoom-in">
                           <img src={selectedClaim.photo_url} alt="Signal Evidence" className="w-full h-32 object-cover" />
                        </div>
                      )}
                   </div>
                </div>

                <div className="flex gap-4 p-1 rounded-3xl bg-slate-950/80 border border-white/5 shadow-2xl backdrop-blur-xl">
                  <button
                    disabled={reviewing !== null}
                    onClick={() => handleReview(selectedClaim.id, "approved")}
                    className="flex-1 flex items-center justify-center gap-3 py-5 rounded-2xl bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-500/20 hover:bg-emerald-500 hover:shadow-emerald-500/20 active:scale-95 transition-all duration-300 disabled:opacity-50"
                  >
                    {reviewing === selectedClaim.id ? (
                       <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                       <>
                         <CheckCircle className="w-4 h-4" /> VERIFY
                       </>
                    )}
                  </button>
                  <button
                    disabled={reviewing !== null}
                    onClick={() => handleReview(selectedClaim.id, "rejected")}
                    className="flex-1 flex items-center justify-center gap-3 py-5 rounded-2xl bg-white/[0.03] text-slate-500 font-bold text-sm hover:bg-rose-500/10 hover:text-rose-400 active:scale-95 transition-all duration-300 border border-white/5 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" /> REJECT
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </div>
    </div>
  );
}
