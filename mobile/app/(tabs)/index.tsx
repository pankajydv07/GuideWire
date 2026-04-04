import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

export default function DashboardScreen() {
  const { rider } = useAuth();
  const [policy, setPolicy] = useState<any>(null);
  const [triggers, setTriggers] = useState<any>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      const [policyData, triggerData, payoutData] = await Promise.all([
        api.policies.getActive().catch(() => null),
        api.triggers.getStatus().catch(() => null),
        api.payouts.list().catch(() => ({ payouts: [] })),
      ]);
      setPolicy(policyData);
      setTriggers(triggerData);
      setPayouts(payoutData?.payouts || []);
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    }
  };

  useEffect(() => {
    loadDashboardData().finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, []);

  const hasActivePolicy = policy && policy.status === 'active';
  
  // Try to find if an active trigger exists in the rider's zone or globally (depending on API structure)
  // For demo: showing alerts if `triggers` object indicates any disruptions.
  const activeAlerts = triggers?.disruptions || triggers?.active_triggers || []; 

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
      >
        {/* Header */}
        <Text style={styles.greeting}>Hey, {rider?.name || 'Rider'} 👋</Text>
        {hasActivePolicy ? (
           <Text style={styles.subtext}>Your coverage is active</Text>
        ) : (
           <Text style={[styles.subtext, { color: '#f59e0b' }]}>No active policy</Text>
        )}

        {/* Active Policy Card */}
        {hasActivePolicy ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>🛡️ Active Policy</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{policy.plan_tier?.toUpperCase() || 'BALANCED'}</Text>
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>₹{policy.coverage_limit || '0'}</Text>
                <Text style={styles.statLabel}>Coverage</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{policy.hours_remaining || 'All'} hrs</Text>
                <Text style={styles.statLabel}>Remaining</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>₹{policy.coverage_used || '0'}</Text>
                <Text style={styles.statLabel}>Used</Text>
              </View>
            </View>
            <Text style={styles.cardFooter}>Expires: {policy.expires_at || 'End of Week'}</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🚨 You are unprotected</Text>
            <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>Get a policy to shield your income against disruptions.</Text>
            <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/policy/select')}>
              <Text style={styles.ctaText}>Get Protected</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Disruption Alerts */}
        <View style={[styles.card, activeAlerts.length > 0 && styles.alertCard]}>
          <Text style={styles.cardTitle}>⚡ Disruption Alerts</Text>
          {activeAlerts.length > 0 ? (
            activeAlerts.map((alert: any, idx: number) => (
              <View key={idx} style={{ marginTop: 8 }}>
                <Text style={{ color: '#f8fafc', fontSize: 14 }}>
                  {alert.icon || '⚠️'} {alert.description || alert.message || alert.type}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noAlerts}>✅ No active disruptions in your zone</Text>
          )}
        </View>

        {/* Recent Payouts */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💰 Recent Payouts</Text>
          {payouts.length > 0 ? (
            payouts.slice(0, 5).map((payout: any) => (
              <View key={payout.payout_id} style={styles.payoutRow}>
                <View>
                  <Text style={styles.payoutLabel}>
                     {payout.type === 'weather' ? '🌧️' : '🚨'} {payout.type || 'Payout'}
                  </Text>
                  <Text style={styles.payoutDate}>{new Date(payout.created_at).toLocaleDateString()}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.payoutAmount}>₹{payout.amount}</Text>
                  {payout.reference_id && <Text style={styles.payoutUpi}>Ref: {payout.reference_id}</Text>}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noAlerts}>No payouts yet this week</Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {hasActivePolicy && (
             <TouchableOpacity style={[styles.ctaSecondary, { flex: 1, marginRight: 8 }]} onPress={() => router.push('/policy/select')}>
               <Text style={styles.ctaSecondaryText}>View / Renew</Text>
             </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.ctaDanger, { flex: 1 }]} onPress={() => router.push('/manual-claim')}>
            <Text style={styles.ctaDangerText}>Report Disruption</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, gap: 16 },
  greeting: { fontSize: 26, fontWeight: 'bold', color: '#f8fafc' },
  subtext: { fontSize: 14, color: '#22c55e', marginBottom: 8 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, gap: 12, borderWidth: 1, borderColor: '#334155' },
  alertCard: { borderColor: '#f59e0b' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#f8fafc' },
  badge: { backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 8 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#38bdf8' },
  statLabel: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  cardFooter: { fontSize: 12, color: '#64748b' },
  noAlerts: { color: '#64748b', fontSize: 13, marginTop: 4 },
  payoutRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 10 },
  payoutLabel: { fontSize: 14, color: '#f8fafc' },
  payoutDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  payoutAmount: { fontSize: 16, fontWeight: 'bold', color: '#38bdf8' },
  payoutUpi: { fontSize: 10, color: '#64748b', marginTop: 2 },
  actionButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  ctaButton: { backgroundColor: '#2563eb', borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 8 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  ctaSecondary: { backgroundColor: '#334155', borderRadius: 14, padding: 16, alignItems: 'center' },
  ctaSecondaryText: { color: '#f8fafc', fontSize: 15, fontWeight: '600' },
  ctaDanger: { backgroundColor: '#7f1d1d', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#ef4444' },
  ctaDangerText: { color: '#fca5a5', fontSize: 15, fontWeight: '600' },
});
