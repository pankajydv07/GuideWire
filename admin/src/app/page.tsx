/**
 * Dev 5: Admin Overview Page
 * 
 * TODO (Dev 5):
 * - Show total claims (auto + manual)
 * - Show loss ratio (payouts / premiums)
 * - Show active triggers count
 * - Show pending manual claims count
 */

export default function AdminOverview() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Dashboard Overview</h1>
      <p className="text-slate-400 mb-8">Real-time claims and trigger monitoring</p>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Claims', value: '24', icon: '📋', color: 'text-sky-400' },
          { label: 'Pending Review', value: '3', icon: '⏳', color: 'text-amber-400' },
          { label: 'Active Triggers', value: '1', icon: '⚡', color: 'text-red-400' },
          { label: 'Loss Ratio', value: '42%', icon: '📊', color: 'text-emerald-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <p className="text-amber-500 text-sm italic">
        TODO (Dev 5): Wire up real data from adminApi.claims.listAll() and adminApi.triggers.getStatus()
      </p>
    </div>
  );
}
