/**
 * Dev 4 + Dev 5: Auto Claims List
 * 
 * TODO (Dev 5):
 * - Fetch adminApi.claims.listAll()
 * - Show claim table: rider, type, income_loss, payout, fraud_score, status
 * - Filter by status
 * - Click row for details
 */

export default function ClaimsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Auto Claims</h1>
      <p className="text-slate-400 mb-8">All automatic claims triggered by disruption events</p>

      {/* Claims table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left p-4 text-sm font-medium text-slate-400">Claim ID</th>
              <th className="text-left p-4 text-sm font-medium text-slate-400">Rider</th>
              <th className="text-left p-4 text-sm font-medium text-slate-400">Trigger</th>
              <th className="text-right p-4 text-sm font-medium text-slate-400">Income Loss</th>
              <th className="text-right p-4 text-sm font-medium text-slate-400">Payout</th>
              <th className="text-center p-4 text-sm font-medium text-slate-400">Fraud</th>
              <th className="text-center p-4 text-sm font-medium text-slate-400">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-800/50 hover:bg-slate-800/30">
              <td className="p-4 text-sm font-mono">CLM-001</td>
              <td className="p-4 text-sm">Arjun Kumar</td>
              <td className="p-4 text-sm">🌧️ Heavy Rain</td>
              <td className="p-4 text-sm text-right text-red-400">₹540</td>
              <td className="p-4 text-sm text-right text-emerald-400">₹540</td>
              <td className="p-4 text-sm text-center">15</td>
              <td className="p-4 text-center">
                <span className="bg-emerald-900 text-emerald-300 text-xs px-2 py-1 rounded-full">PAID</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-amber-500 text-sm italic mt-4">
        TODO (Dev 5): Wire up adminApi.claims.listAll()
      </p>
    </div>
  );
}
