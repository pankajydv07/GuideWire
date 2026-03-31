/**
 * Dev 4: Claims History Tab — STUB
 * 
 * TODO (Dev 4):
 * - Fetch api.claims.list() and api.payouts.list()
 * - Show auto + manual claims with status badges
 * - Show payout history with UPI reference
 * - Tap claim → detail view with income breakdown
 */

import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

export default function ClaimsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Claims & Payouts</Text>
      <Text style={styles.placeholder}>TODO (Dev 4): Claims list + payout history</Text>

      {/* Example claim card structure */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Text style={styles.claimType}>🤖 Auto Claim</Text>
          <View style={styles.statusBadge}><Text style={styles.statusText}>PAID</Text></View>
        </View>
        <Text style={styles.claimDetail}>Heavy Rain — Koramangala</Text>
        <Text style={styles.claimAmount}>₹540 credited</Text>
        <Text style={styles.claimDate}>March 30, 2026 • 3:12 PM</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#f8fafc', marginBottom: 16 },
  placeholder: { color: '#f59e0b', fontSize: 12, fontStyle: 'italic', marginBottom: 16 },
  card: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, gap: 6, borderWidth: 1, borderColor: '#334155' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  claimType: { color: '#f8fafc', fontWeight: '700', fontSize: 15 },
  statusBadge: { backgroundColor: '#22c55e', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  claimDetail: { color: '#94a3b8', fontSize: 13 },
  claimAmount: { color: '#38bdf8', fontSize: 18, fontWeight: 'bold' },
  claimDate: { color: '#64748b', fontSize: 11 },
});
