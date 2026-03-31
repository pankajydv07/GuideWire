/**
 * Dev 2 + Dev 3: Dashboard Tab
 * 
 * Shows:
 * - Active policy status (Dev 2)
 * - Coverage remaining (Dev 2)
 * - Active disruption alerts (Dev 3)
 * - Recent payouts (Dev 4)
 * 
 * TODO: Replace placeholders with real API calls once backend is stable.
 */

import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <Text style={styles.greeting}>Hey, Arjun 👋</Text>
        <Text style={styles.subtext}>Your coverage is active</Text>

        {/* Dev 2: Active Policy Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>🛡️ Active Policy</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>BALANCED</Text></View>
          </View>
          <View style={styles.row}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>₹2,880</Text>
              <Text style={styles.statLabel}>Coverage</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>8 hrs</Text>
              <Text style={styles.statLabel}>Remaining</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>₹0</Text>
              <Text style={styles.statLabel}>Used</Text>
            </View>
          </View>
          <Text style={styles.cardFooter}>Expires: Sun, April 6</Text>
        </View>

        {/* Dev 3: Disruption Alerts */}
        <View style={[styles.card, styles.alertCard]}>
          <Text style={styles.cardTitle}>⚡ Disruption Alerts</Text>
          <Text style={styles.placeholder}>TODO (Dev 3): Fetch api.triggers.getStatus()</Text>
          <Text style={styles.noAlerts}>No active disruptions in your zone</Text>
        </View>

        {/* Dev 4: Recent Payouts */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💰 Recent Payouts</Text>
          <Text style={styles.placeholder}>TODO (Dev 4): Fetch api.payouts.list()</Text>
          <Text style={styles.noAlerts}>No payouts yet this week</Text>
        </View>

        {/* Buy/Renew Policy Button (Dev 2) */}
        <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/policy/select')}>
          <Text style={styles.ctaText}>View / Renew Policy</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 20, gap: 16 },
  greeting: { fontSize: 26, fontWeight: 'bold', color: '#f8fafc' },
  subtext: { fontSize: 14, color: '#22c55e', marginBottom: 8 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, gap: 12, borderWidth: 1, borderColor: '#334155' },
  alertCard: { borderColor: '#f59e0b' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#f8fafc' },
  badge: { backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#38bdf8' },
  statLabel: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  cardFooter: { fontSize: 12, color: '#64748b' },
  noAlerts: { color: '#64748b', fontSize: 13 },
  placeholder: { color: '#f59e0b', fontSize: 11, fontStyle: 'italic' },
  ctaButton: { backgroundColor: '#2563eb', borderRadius: 14, padding: 18, alignItems: 'center' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
