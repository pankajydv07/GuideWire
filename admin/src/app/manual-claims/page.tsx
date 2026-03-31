/**
 * Dev 5: Manual Claims Review Queue
 * 
 * This is the KEY ADMIN PAGE for the demo.
 * Demo segment: [1:45–1:55]
 * 
 * TODO (Dev 5):
 * - Fetch adminApi.claims.listManual()
 * - Sort by spam score (ascending — low risk first)
 * - Show geo-validation result (✅/❌)
 * - Show weather + traffic corroboration
 * - Preview photo evidence
 * - Approve / Reject buttons
 */

export default function ManualClaimsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Manual Claims Review</h1>
      <p className="text-slate-400 mb-8">Sorted by spam score — low risk claims first</p>

      {/* Example claim row */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold">MCL-001 — Traffic Disruption</h3>
            <p className="text-slate-400 text-sm">Rider: Arjun Kumar • Koramangala • Mar 30, 7:30 PM</p>
          </div>
          <span className="bg-emerald-900 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full">
            Spam: 25/100
          </span>
        </div>

        <p className="text-slate-300 text-sm mb-4 italic">
          &quot;Road work causing gridlock on main road&quot;
        </p>

        {/* Validation results */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-slate-800 rounded-lg p-3">
            <div className="text-sm font-medium text-slate-400">Geo-Validation</div>
            <div className="text-emerald-400 font-bold">✅ 45m match</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-3">
            <div className="text-sm font-medium text-slate-400">Weather</div>
            <div className="text-emerald-400 font-bold">✅ Matches</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-3">
            <div className="text-sm font-medium text-slate-400">Traffic</div>
            <div className="text-emerald-400 font-bold">✅ High congestion</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
            ✅ Approve
          </button>
          <button className="bg-red-600 hover:bg-red-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
            ❌ Reject
          </button>
        </div>
      </div>

      <p className="text-amber-500 text-sm italic mt-4">
        TODO (Dev 5): Wire up adminApi.claims.listManual(), approve(), reject()
      </p>
    </div>
  );
}
