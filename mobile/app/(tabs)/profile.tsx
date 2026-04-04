import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

export default function ProfileScreen() {
  const { rider, logout } = useAuth();
  const [riskProfile, setRiskProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.riders.getRiskProfile()
      .then(data => setRiskProfile(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getRiskLabel = (score: number) => {
    if (score < 40) return { label: 'Low', color: '#22c55e' };
    if (score <= 70) return { label: 'Moderate', color: '#fbbf24' };
    return { label: 'High', color: '#ef4444' };
  };

  // Mocked explicitly here so it always renders, usually provided by backend arrays
  const mock4WeekHistory = [
    { week: 'W12', val: 4250 },
    { week: 'W11', val: 4100 },
    { week: 'W10', val: 3800 },
    { week: 'W9', val: 4450 }
  ];
  
  const earningsData = riskProfile?.weekly_earnings_history || mock4WeekHistory;
  const maxEarnt = Math.max(...earningsData.map((e: any) => e.val || e.amount || 0));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Profile</Text>

        {/* Core Detail Card */}
        <View style={styles.card}>
          <Text style={styles.name}>{rider?.name || 'Rider Name'}</Text>
          <View style={styles.badgeContainer}>
            <View style={styles.platformBadge}>
              <Text style={styles.badgeText}>{rider?.platform?.toUpperCase() || 'PLATFORM'}</Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📱</Text>
            <Text style={styles.detailText}>{rider?.phone || '+91'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📍</Text>
            <Text style={styles.detailText}>{rider?.zone || 'Zone'} - {rider?.city || 'City'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>⭐</Text>
            <Text style={styles.detailText}>Trust Score: {rider?.trust_score || 85}/100</Text>
          </View>
        </View>

        {/* Risk Profile Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Risk Profile Analytics</Text>
          
          {loading ? (
             <ActivityIndicator color="#38bdf8" />
          ) : (
            <>
              {riskProfile?.zone_flood_risk !== undefined && (
                <View style={styles.riskRow}>
                  <Text style={styles.riskLabel}>Flood Risk</Text>
                  <Text style={[styles.riskVal, { color: getRiskLabel(riskProfile.zone_flood_risk).color }]}>
                    {riskProfile.zone_flood_risk}/100
                  </Text>
                </View>
              )}
              {riskProfile?.zone_traffic_risk !== undefined && (
                <View style={styles.riskRow}>
                  <Text style={styles.riskLabel}>Traffic Risk</Text>
                  <Text style={[styles.riskVal, { color: getRiskLabel(riskProfile.zone_traffic_risk).color }]}>
                     {riskProfile.zone_traffic_risk}/100
                  </Text>
                </View>
              )}
              
              <View style={styles.divider} />
              
              <Text style={styles.chartTitle}>4-Week Earnings Timeline</Text>
              {earningsData.map((week: any, idx: number) => {
                const val = week.val || week.amount || 0;
                const label = week.week || `Week ${idx+1}`;
                const widthPct = maxEarnt > 0 ? (val / maxEarnt) * 100 : 0;
                
                return (
                  <View key={idx} style={styles.chartRow}>
                    <Text style={styles.chartLabel}>{label}</Text>
                    <View style={styles.barTrack}>
                       <View style={[styles.barFill, { width: `${widthPct}%` }]} />
                    </View>
                    <Text style={styles.chartVal}>₹{val}</Text>
                  </View>
                )
              })}
            </>
          )}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Log Out Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#f8fafc', marginBottom: 16 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc', marginBottom: 12 },
  badgeContainer: { flexDirection: 'row', marginBottom: 16 },
  platformBadge: { backgroundColor: '#1e3a8a', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  badgeText: { color: '#60a5fa', fontSize: 12, fontWeight: '700' },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  detailIcon: { fontSize: 16, marginRight: 10, width: 20, textAlign: 'center' },
  detailText: { fontSize: 15, color: '#cbd5e1' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#f8fafc', marginBottom: 16 },
  riskRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  riskLabel: { color: '#94a3b8', fontSize: 15 },
  riskVal: { fontWeight: 'bold', fontSize: 15 },
  divider: { height: 1, backgroundColor: '#334155', marginVertical: 16 },
  chartTitle: { color: '#e2e8f0', fontSize: 14, fontWeight: '600', marginBottom: 12 },
  chartRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  chartLabel: { color: '#94a3b8', fontSize: 12, width: 40 },
  barTrack: { flex: 1, height: 8, backgroundColor: '#334155', borderRadius: 4, marginHorizontal: 10 },
  barFill: { height: '100%', backgroundColor: '#38bdf8', borderRadius: 4 },
  chartVal: { color: '#cbd5e1', fontSize: 12, width: 50, textAlign: 'right', fontWeight: 'bold' },
  logoutButton: { borderWidth: 1, borderColor: '#ef4444', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '700' },
});
