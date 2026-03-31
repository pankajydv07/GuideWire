/**
 * Dev 3 + Dev 5: Triggers Dashboard
 * 
 * TODO (Dev 3/Dev 5):
 * - Show active triggers from adminApi.triggers.getStatus()
 * - Demo trigger injection button (adminApi.triggers.inject())
 * - Show disruption event history
 */

export default function TriggersPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Trigger Management</h1>
      <p className="text-slate-400 mb-8">Monitor active triggers and inject demo disruptions</p>

      {/* Demo Injection Panel */}
      <div className="bg-slate-900 border-2 border-amber-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-bold text-amber-400 mb-4">🎬 Demo: Inject Disruption</h2>
        <p className="text-slate-400 text-sm mb-4">Fire a simulated trigger for the demo presentation</p>
        
        <div className="grid grid-cols-3 gap-3">
          <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-lg font-medium transition-colors text-sm">
            🌧️ Heavy Rain
          </button>
          <button className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-3 rounded-lg font-medium transition-colors text-sm">
            🚗 Traffic Jam
          </button>
          <button className="bg-red-600 hover:bg-red-500 text-white px-4 py-3 rounded-lg font-medium transition-colors text-sm">
            🏪 Store Closed
          </button>
        </div>
      </div>

      {/* Active Triggers */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-bold mb-4">Active Triggers</h2>
        <p className="text-slate-500">No active triggers</p>
        <p className="text-amber-500 text-sm italic mt-4">
          TODO: Wire up adminApi.triggers.getStatus() and adminApi.triggers.inject()
        </p>
      </div>
    </div>
  );
}
