import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api, type ClaimListItem, type PayoutListItem } from '../../services/api';

const disruptionEmoji = (type: string) => {
  switch (type) {
    case 'heavy_rain':
      return '🌧️';
    case 'traffic':
    case 'traffic_congestion':
      return '🚗';
    case 'store_closure':
      return '🏪';
    case 'platform_outage':
      return '📱';
    default:
      return '⚠️';
  }
};

const statusStyle = (status: string) => {
  const value = status.toLowerCase();
  if (value === 'paid' || value === 'approved' || value === 'completed') {
    return { backgroundColor: '#166534', color: '#dcfce7', label: value.toUpperCase() };
  }
  if (value === 'pending' || value === 'under_review') {
    return { backgroundColor: '#92400e', color: '#fef3c7', label: value.replace('_', ' ').toUpperCase() };
  }
  return { backgroundColor: '#991b1b', color: '#fee2e2', label: value.toUpperCase() };
};

export default function ClaimsScreen() {
  const [activeTab, setActiveTab] = useState<'claims' | 'payouts'>('claims');
  const [claims, setClaims] = useState<ClaimListItem[]>([]);
  const [payouts, setPayouts] = useState<PayoutListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const [claimData, payoutData] = await Promise.all([
      api.claims.list(),
      api.payouts.list(),
    ]);
    setClaims(claimData.claims || []);
    setPayouts(payoutData.payouts || []);
  };

  useEffect(() => {
    loadData()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, []);

  const sortedClaims = useMemo(
    () => [...claims].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [claims]
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
        <Text style={styles.title}>Claims & Payouts</Text>

        <View style={styles.toggleRow}>
          <TouchableOpacity style={[styles.toggleButton, activeTab === 'claims' && styles.toggleButtonActive]} onPress={() => setActiveTab('claims')}>
            <Text style={[styles.toggleText, activeTab === 'claims' && styles.toggleTextActive]}>Claims</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toggleButton, activeTab === 'payouts' && styles.toggleButtonActive]} onPress={() => setActiveTab('payouts')}>
            <Text style={[styles.toggleText, activeTab === 'payouts' && styles.toggleTextActive]}>Payouts</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'claims' ? (
          sortedClaims.length > 0 ? (
            sortedClaims.map((claim) => {
              const badge = statusStyle(claim.status);
              return (
                <View key={claim.claim_id} style={styles.card}>
                  <View style={styles.cardRow}>
                    <View style={[styles.typeBadge, { backgroundColor: claim.type === 'manual' ? '#92400e' : '#1d4ed8' }]}>
                      <Text style={styles.typeBadgeText}>{claim.type === 'manual' ? '📝 Manual' : '🤖 Auto'}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: badge.backgroundColor }]}>
                      <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.claimTrigger}>
                    {disruptionEmoji(claim.disruption_type)} {claim.disruption_type.replace(/_/g, ' ')}
                  </Text>
                  <Text style={styles.claimAmount}>₹{claim.payout_amount}</Text>
                  <Text style={styles.claimMeta}>Income loss ₹{claim.income_loss}</Text>
                  <Text style={styles.claimMeta}>{new Date(claim.created_at).toLocaleString()}</Text>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No claims yet. You’re covered — if a disruption happens, it’ll appear here.</Text>
            </View>
          )
        ) : payouts.length > 0 ? (
          payouts.map((payout) => (
            <View key={payout.payout_id} style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.payoutAmount}>₹{payout.amount}</Text>
                <View style={[styles.statusBadge, { backgroundColor: '#166534' }]}>
                  <Text style={[styles.statusText, { color: '#dcfce7' }]}>{payout.status === 'completed' ? 'CREDITED' : payout.status.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.claimMeta}>UPI Ref: {payout.reference_id}</Text>
              <Text style={styles.claimMeta}>{new Date(payout.created_at).toLocaleString()}</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No payouts yet this week.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, gap: 14 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#f8fafc' },
  toggleRow: { flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#334155' },
  toggleButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  toggleButtonActive: { backgroundColor: '#2563eb' },
  toggleText: { color: '#94a3b8', fontWeight: '600' },
  toggleTextActive: { color: '#fff' },
  card: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, gap: 6, borderWidth: 1, borderColor: '#334155' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  typeBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 10, fontWeight: '700' },
  claimTrigger: { color: '#f8fafc', fontWeight: '700', fontSize: 15, marginTop: 2 },
  claimAmount: { color: '#38bdf8', fontSize: 24, fontWeight: 'bold' },
  payoutAmount: { color: '#22c55e', fontSize: 24, fontWeight: 'bold' },
  claimMeta: { color: '#94a3b8', fontSize: 12 },
  emptyCard: { backgroundColor: '#1e293b', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: '#334155' },
  emptyText: { color: '#94a3b8', fontSize: 14, lineHeight: 20 },
});
