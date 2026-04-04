import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useAuth } from '../../contexts/AuthContext';
import { api, type PolicyResponse, type TriggerStatus, type PayoutListItem } from '../../services/api';

const triggerEmoji = (type: string) => {
  switch (type) {
    case 'heavy_rain':
      return '🌧️';
    case 'traffic_congestion':
      return '🚗';
    case 'store_closure':
      return '🏪';
    case 'platform_outage':
      return '📱';
    case 'regulatory_curfew':
      return '🚫';
    default:
      return '⚠️';
  }
};

export default function DashboardScreen() {
  const { rider } = useAuth();
  const [policy, setPolicy] = useState<PolicyResponse | null>(null);
  const [triggers, setTriggers] = useState<TriggerStatus | null>(null);
  const [payouts, setPayouts] = useState<PayoutListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    const [policyData, triggerData, payoutData] = await Promise.all([
      api.policies.getActive().catch(() => null),
      api.triggers.getStatus().catch(() => null),
      api.payouts.list().catch(() => ({ payouts: [] })),
    ]);
    setPolicy(policyData);
    setTriggers(triggerData);
    setPayouts(payoutData.payouts || []);
  };

  useEffect(() => {
    loadDashboardData()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadDashboardData();
    } finally {
      setRefreshing(false);
    }
  }, []);

  const hasActivePolicy = policy?.status === 'active';
  const zoneAlerts = useMemo(
    () => (triggers?.active_triggers || []).filter((trigger) => !rider?.zone || trigger.zone === rider.zone),
    [rider?.zone, triggers?.active_triggers]
  );

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
        <Text style={styles.greeting}>Hey, {rider?.name || 'Rider'} 👋</Text>
        <Text style={[styles.subtext, { color: hasActivePolicy ? '#22c55e' : '#f59e0b' }]}>
          {hasActivePolicy ? 'Your coverage is active.' : 'No active policy right now.'}
        </Text>

        {hasActivePolicy && policy ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>🛡️ Active Policy</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{policy.plan_tier.replace('_', ' ').toUpperCase()}</Text>
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>₹{policy.coverage_limit}</Text>
                <Text style={styles.statLabel}>Coverage Limit</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{policy.hours_remaining ?? 0}h</Text>
                <Text style={styles.statLabel}>Hours Remaining</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>₹{policy.coverage_used ?? 0}</Text>
                <Text style={styles.statLabel}>Coverage Used</Text>
              </View>
            </View>
            <Text style={styles.cardFooter}>Week {policy.coverage_week} • Expires {policy.expires_at || 'end of week'}</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🚨 You are unprotected</Text>
            <Text style={styles.cardBody}>Buy a weekly policy to keep your payout protection active.</Text>
            <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/policy/select')}>
              <Text style={styles.ctaText}>Get Protected</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.card, zoneAlerts.length > 0 && styles.alertCard]}>
          <Text style={styles.cardTitle}>⚡ Disruption Alerts</Text>
          {zoneAlerts.length > 0 ? (
            zoneAlerts.map((alert) => (
              <View key={alert.trigger_id} style={styles.alertRow}>
                <Text style={styles.alertText}>
                  {triggerEmoji(alert.type)} {alert.type.replace(/_/g, ' ')} in {alert.zone}
                </Text>
                <Text style={styles.alertMeta}>{alert.affected_riders} riders affected • {alert.severity}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.mutedText}>No active disruptions in your zone.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>💰 Recent Payouts</Text>
          {payouts.length > 0 ? (
            payouts.slice(0, 5).map((payout) => (
              <View key={payout.payout_id} style={styles.payoutRow}>
                <View>
                  <Text style={styles.payoutLabel}>Payout credited</Text>
                  <Text style={styles.payoutDate}>{new Date(payout.created_at).toLocaleString()}</Text>
                  <Text style={styles.payoutRef}>Ref: {payout.reference_id}</Text>
                </View>
                <Text style={styles.payoutAmount}>₹{payout.amount}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.mutedText}>No payouts yet this week.</Text>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={[styles.ctaSecondary, styles.flexOne]} onPress={() => router.push('/policy/select')}>
            <Text style={styles.ctaSecondaryText}>{hasActivePolicy ? 'View / Renew Policy' : 'Buy Policy'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.ctaDanger, styles.flexOne]} onPress={() => router.push('/manual-claim')}>
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
  subtext: { fontSize: 14, marginBottom: 8 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, gap: 12, borderWidth: 1, borderColor: '#334155' },
  alertCard: { borderColor: '#f59e0b' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#f8fafc' },
  cardBody: { color: '#94a3b8', fontSize: 13 },
  badge: { backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 8 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#38bdf8' },
  statLabel: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  cardFooter: { fontSize: 12, color: '#64748b' },
  alertRow: { gap: 4, borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 10 },
  alertText: { color: '#f8fafc', fontSize: 14 },
  alertMeta: { color: '#94a3b8', fontSize: 12 },
  mutedText: { color: '#64748b', fontSize: 13 },
  payoutRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 10 },
  payoutLabel: { fontSize: 14, color: '#f8fafc' },
  payoutDate: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  payoutRef: { fontSize: 10, color: '#64748b', marginTop: 2 },
  payoutAmount: { fontSize: 18, fontWeight: 'bold', color: '#38bdf8' },
  actionButtons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  flexOne: { flex: 1 },
  ctaButton: { backgroundColor: '#2563eb', borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 8 },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  ctaSecondary: { backgroundColor: '#334155', borderRadius: 14, padding: 16, alignItems: 'center' },
  ctaSecondaryText: { color: '#f8fafc', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  ctaDanger: { backgroundColor: '#7f1d1d', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#ef4444' },
  ctaDangerText: { color: '#fecaca', fontSize: 15, fontWeight: '600' },
});
