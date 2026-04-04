import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInUp, FadeInRight, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../contexts/AuthContext';
import { api, type PolicyResponse, type TriggerStatus, type PayoutListItem } from '../../services/api';
import { formatApiDateTime } from '../../utils/datetime';

const { width } = Dimensions.get('window');

const triggerEmoji = (type: string) => {
  switch (type) {
    case 'heavy_rain': return '🌧️';
    case 'traffic_congestion': return '🚗';
    case 'store_closure': return '🏪';
    case 'platform_outage': return '📱';
    case 'regulatory_curfew': return '🚫';
    case 'gps_shadowban': return '📍';
    case 'dark_store_queue': return '🛒';
    case 'algorithmic_shock': return '⚡';
    case 'community_signal': return '📣';
    default: return '⚠️';
  }
};

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

function AnimatedCard({ children, delay = 0, style }: { children: React.ReactNode, delay?: number, style?: any }) {
  return (
    <Animated.View 
      entering={FadeInUp.delay(delay).duration(600).springify()}
      style={[styles.card, style]}
    >
      {children}
    </Animated.View>
  );
}

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
        <View style={styles.header}>
          <View>
            <Animated.Text entering={FadeInRight.duration(600)} style={styles.greeting}>
              Hey, {rider?.name || 'Rider'} 👋
            </Animated.Text>
            <View style={styles.statusIndicator}>
              <View style={[styles.dot, { backgroundColor: hasActivePolicy ? '#22c55e' : '#f59e0b' }]} />
              <Text style={[styles.subtext, { color: hasActivePolicy ? '#22c55e' : '#f59e0b' }]}>
                {hasActivePolicy ? 'Coverage Shield Active' : 'Shield Offline'}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.profileIcon} onPress={() => router.push('/(tabs)/profile')}>
             <Ionicons name="person-circle-outline" size={32} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {hasActivePolicy && policy ? (
          <AnimatedCard delay={100} style={styles.activePolicyCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <ShieldCheckIcon size={20} color="#38bdf8" />
                <Text style={styles.cardTitle}>Live Policy</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{policy.plan_tier.replace('_', ' ').toUpperCase()}</Text>
              </View>
            </View>
            
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>LIMIT</Text>
                <Text style={styles.statValue}>₹{policy.coverage_limit}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>TIME LEFT</Text>
                <Text style={styles.statValue}>{policy.hours_remaining ?? 0}h</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>CLAIMED</Text>
                <Text style={styles.statValue}>₹{policy.coverage_used ?? 0}</Text>
              </View>
            </View>

            <View style={styles.policyFooter}>
               <Ionicons name="time-outline" size={14} color="#64748b" />
               <Text style={styles.cardFooter}>
                  Week {policy.coverage_week} • Exp. {policy.expires_at ? formatApiDateTime(policy.expires_at) : 'Soon'}
               </Text>
            </View>
          </AnimatedCard>
        ) : (
          <AnimatedCard delay={100} style={styles.unprotectedCard}>
             <Ionicons name="warning" size={32} color="#f59e0b" style={{ marginBottom: 8 }} />
             <Text style={styles.cardTitleLarge}>Protect your income</Text>
             <Text style={styles.cardBody}>Unforeseen disruptions can hurt your earnings. Get covered today.</Text>
             <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/policy/select')}>
                <Text style={styles.ctaText}>Get Protected Now</Text>
             </TouchableOpacity>
          </AnimatedCard>
        )}

        <AnimatedCard delay={200} style={[zoneAlerts.length > 0 && styles.alertCard]}>
           <View style={styles.cardHeader}>
             <View style={styles.cardTitleRow}>
                <Ionicons name="flash" size={18} color="#f59e0b" />
                <Text style={styles.cardTitle}>Zone Disruptions</Text>
             </View>
             {zoneAlerts.length > 0 && (
                <View style={[styles.badge, { backgroundColor: '#7f1d1d' }]}>
                   <Text style={[styles.badgeText, { color: '#fca5a5' }]}>LIVE</Text>
                </View>
             )}
           </View>
          
          {zoneAlerts.length > 0 ? (
            zoneAlerts.map((alert) => (
              <View key={alert.trigger_id} style={styles.alertRow}>
                <View style={styles.alertIconBg}>
                   <Text style={{ fontSize: 20 }}>{triggerEmoji(alert.type)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertText}>{alert.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</Text>
                  <Text style={styles.alertMeta}>{alert.zone} • {alert.severity} Intensity</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
               <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
               <Text style={styles.mutedText}>All systems normal in your zone.</Text>
            </View>
          )}
        </AnimatedCard>

        <AnimatedCard delay={300}>
          <View style={[styles.cardHeader, { marginBottom: 16 }]}>
             <View style={styles.cardTitleRow}>
                <Ionicons name="wallet" size={18} color="#10b981" />
                <Text style={styles.cardTitle}>Recent Payouts</Text>
             </View>
          </View>
          
          {payouts.length > 0 ? (
            payouts.slice(0, 3).map((payout) => (
              <View key={payout.payout_id} style={styles.payoutRow}>
                <View style={styles.payoutIcon}>
                   <Ionicons name="arrow-down-circle" size={20} color="#38bdf8" />
                </View>
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                  <Text style={styles.payoutLabel}>Income Supplement</Text>
                  <Text style={styles.payoutDate}>{formatApiDateTime(payout.created_at)}</Text>
                </View>
                <Text style={styles.payoutAmount}>₹{payout.amount}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.mutedText}>No payout activity this week.</Text>
          )}
        </AnimatedCard>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={[styles.ctaSecondary, styles.flexOne]} onPress={() => router.push('/policy/select')}>
            <Ionicons name="shield-outline" size={18} color="#f8fafc" style={{ marginRight: 8 }} />
            <Text style={styles.ctaSecondaryText}>{hasActivePolicy ? 'My Policy' : 'Buy Policy'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.ctaDanger, styles.flexOne]} onPress={() => router.push('/manual-claim')}>
            <Ionicons name="camera-outline" size={18} color="#fecaca" style={{ marginRight: 8 }} />
            <Text style={styles.ctaDangerText}>Report Issue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ShieldCheckIcon({ size, color }: { size: number, color: string }) {
   return <Ionicons name="shield-checkmark" size={size} color={color} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  center: { justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, paddingBottom: 40, gap: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  greeting: { fontSize: 28, fontWeight: '800', color: '#f8fafc', letterSpacing: -0.5 },
  statusIndicator: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  subtext: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  profileIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#0f172a', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#1e293b' },
  activePolicyCard: { backgroundColor: '#0f172a', borderColor: '#1e293b', borderTopWidth: 4, borderTopColor: '#38bdf8' },
  unprotectedCard: { backgroundColor: '#1e293b', alignItems: 'center', textAlign: 'center', paddingVertical: 32 },
  alertCard: { borderColor: '#b45309', borderLeftWidth: 4, borderLeftColor: '#f59e0b' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
  cardTitleLarge: { fontSize: 22, fontWeight: '800', color: '#f8fafc', marginBottom: 8 },
  cardBody: { color: '#94a3b8', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  badge: { backgroundColor: '#0ea5e920', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#0ea5e940' },
  badgeText: { color: '#38bdf8', fontSize: 11, fontWeight: '800' },
  statsContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 10 },
  statBox: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', marginBottom: 4, letterSpacing: 0.5 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#f8fafc' },
  divider: { width: 1, height: 30, backgroundColor: '#1e293b' },
  policyFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 6 },
  cardFooter: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  alertIconBg: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' },
  alertText: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
  alertMeta: { color: '#64748b', fontSize: 12, marginTop: 2 },
  emptyState: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  mutedText: { color: '#64748b', fontSize: 14, fontWeight: '500' },
  payoutRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  payoutIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#38bdf820', alignItems: 'center', justifyContent: 'center' },
  payoutLabel: { fontSize: 14, fontWeight: '700', color: '#f8fafc' },
  payoutDate: { fontSize: 12, color: '#64748b', marginTop: 2 },
  payoutAmount: { fontSize: 18, fontWeight: '800', color: '#38bdf8' },
  actionButtons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  flexOne: { flex: 1 },
  ctaButton: { backgroundColor: '#38bdf8', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 16, width: '100%' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  ctaSecondary: { backgroundColor: '#1e293b', borderRadius: 18, padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  ctaSecondaryText: { color: '#f8fafc', fontSize: 15, fontWeight: '700' },
  ctaDanger: { backgroundColor: '#450a0a', borderRadius: 18, padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', borderWidth: 1, borderColor: '#7f1d1d' },
  ctaDangerText: { color: '#fecaca', fontSize: 15, fontWeight: '700' },
});
