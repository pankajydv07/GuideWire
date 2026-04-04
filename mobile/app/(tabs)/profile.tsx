import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';

import { useAuth } from '../../contexts/AuthContext';
import { api, type RiskProfile } from '../../services/api';

const platformLabel = (platform?: string) => {
  switch (platform) {
    case 'zepto':
      return '🟢 Zepto';
    case 'blinkit':
      return '🟡 Blinkit';
    case 'swiggy':
      return '🟠 Swiggy';
    default:
      return platform || 'Platform';
  }
};

export default function ProfileScreen() {
  const { rider, logout } = useAuth();
  const [riskProfile, setRiskProfile] = useState<RiskProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.riders.getRiskProfile()
      .then(setRiskProfile)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const earningsRows = useMemo(() => {
    const source = riskProfile?.four_week_earnings || {};
    return Object.entries(source)
      .map(([week, amount]) => ({ week: week.replace('_', ' ').toUpperCase(), amount }))
      .sort((a, b) => b.week.localeCompare(a.week));
  }, [riskProfile?.four_week_earnings]);

  const maxEarnings = Math.max(...earningsRows.map((row) => row.amount), 1);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.card}>
          <Text style={styles.name}>{rider?.name || 'Rider'}</Text>
          <Text style={styles.platform}>{platformLabel(rider?.platform)}</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Phone</Text>
            <Text style={styles.detailValue}>{rider?.phone || '-'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Zone</Text>
            <Text style={styles.detailValue}>{rider?.zone || rider?.city || '-'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>UPI</Text>
            <Text style={styles.detailValue}>{rider?.upi_id || 'Not added'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Trust Score</Text>
            <Text style={styles.detailValue}>{rider?.trust_score ?? 0}/100</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Risk Profile</Text>
          {loading ? (
            <ActivityIndicator color="#38bdf8" />
          ) : riskProfile ? (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Flood Risk</Text>
                <Text style={styles.detailValue}>{riskProfile.zone_flood_risk}/100</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Traffic Risk</Text>
                <Text style={styles.detailValue}>{riskProfile.zone_traffic_risk}/100</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Composite Risk</Text>
                <Text style={styles.detailValue}>{riskProfile.composite_risk_score}/100</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Income Volatility</Text>
                <Text style={styles.detailValue}>{riskProfile.income_volatility}</Text>
              </View>

              <Text style={styles.chartTitle}>4-week earnings</Text>
              {earningsRows.length > 0 ? (
                earningsRows.map((row) => (
                  <View key={row.week} style={styles.chartRow}>
                    <Text style={styles.chartLabel}>{row.week}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${(row.amount / maxEarnings) * 100}%` }]} />
                    </View>
                    <Text style={styles.chartValue}>₹{row.amount}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.mutedText}>No earnings history available yet.</Text>
              )}
            </>
          ) : (
            <Text style={styles.mutedText}>Risk profile unavailable right now.</Text>
          )}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 20, gap: 16 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#f8fafc' },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#334155', gap: 12 },
  name: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc' },
  platform: { fontSize: 14, color: '#38bdf8', fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#f8fafc' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { color: '#94a3b8', fontSize: 14 },
  detailValue: { color: '#f8fafc', fontSize: 14, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  chartTitle: { color: '#e2e8f0', fontSize: 14, fontWeight: '600', marginTop: 8 },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chartLabel: { width: 60, color: '#94a3b8', fontSize: 12 },
  barTrack: { flex: 1, height: 8, backgroundColor: '#334155', borderRadius: 4 },
  barFill: { height: '100%', backgroundColor: '#38bdf8', borderRadius: 4 },
  chartValue: { width: 64, color: '#cbd5e1', fontSize: 12, textAlign: 'right', fontWeight: '700' },
  mutedText: { color: '#64748b', fontSize: 13 },
  logoutButton: { borderWidth: 1, borderColor: '#ef4444', borderRadius: 14, padding: 16, alignItems: 'center' },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '700' },
});
