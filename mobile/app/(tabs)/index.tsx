import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [zoneRisk, setZoneRisk] = useState<{ weather: number; traffic: number; store: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    let slots = '18:00-21:00,21:00-23:00';
    try {
      const stored = await AsyncStorage.getItem('rider_slots');
      if (stored) {
        const parsed: string[] = JSON.parse(stored);
        if (parsed.length > 0) slots = parsed.join(',');
      }
    } catch {}

    const [policyData, triggerData, payoutData, quoteData] = await Promise.all([
      api.policies.getActive().catch(() => null),
      api.triggers.getStatus().catch(() => null),
      api.payouts.list().catch(() => ({ payouts: [] })),
      api.policies.getQuote(slots, rider?.city ?? '').catch(() => null),
    ]);

    setPolicy(policyData);
    setTriggers(triggerData);
    setPayouts(payoutData.payouts || []);
    setZoneRisk(quoteData?.quotes?.[0]?.risk_breakdown ?? null);
    setLastUpdated(new Date());
    setRefreshError(null);
  };

  useEffect(() => {
    loadDashboardData()
      .catch((error) => setRefreshError(error instanceof Error ? error.message : 'Unable to load dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadDashboardData();
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : 'Unable to refresh dashboard right now.');
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
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Animated.Text entering={FadeInRight.duration(600)} style={styles.greeting}>
              Hey, {rider?.name || 'Rider'} 👋
            </Animated.Text>
            <View style={styles.statusIndicator}>
              <View style={[styles.dot, { backgroundColor: hasActivePolicy ? '#22c55e' : '#f59e0b' }]} />
              <Text style={[styles.subtext, { color: hasActivePolicy ? '#22c55e' : '#f59e0b' }]}>
                {hasActivePolicy ? 'Coverage Shield Active' : 'Shield Offline'}
              </Text>
            </View>
            <Text style={styles.refreshMeta}>
              {lastUpdated ? `Sync: ${formatApiDateTime(lastUpdated.toISOString())}` : 'Synchronizing...'}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.profileIcon} 
            onPress={() => router.push('/(tabs)/profile')}
          >
             <Ionicons name="person-circle-outline" size={32} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {rider?.zone && zoneRisk && (
          <Animated.View entering={FadeInUp.delay(50).springify()} style={styles.zoneHealthBar}>
            <View style={styles.zoneHealthItem}>
               <Text style={styles.zoneHealthIcon}>🌧️</Text>
               <Text style={styles.zoneHealthValue}>{zoneRisk.weather}%</Text>
            </View>
            <View style={styles.zoneHealthDivider} />
            <View style={styles.zoneHealthItem}>
               <Text style={styles.zoneHealthIcon}>🚗</Text>
               <Text style={styles.zoneHealthValue}>{zoneRisk.traffic}%</Text>
            </View>
            <View style={styles.zoneHealthDivider} />
            <View style={styles.zoneHealthItem}>
               <Text style={styles.zoneHealthIcon}>🏪</Text>
               <Text style={styles.zoneHealthValue}>{zoneRisk.store}%</Text>
            </View>
          </Animated.View>
        )}

        {refreshError ? (
          <View style={styles.errorAlert}>
            <Text style={styles.errorText}>{refreshError}</Text>
          </View>
        ) : null}

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
                <Text style={styles.statValue}>{policy.hours_remaining ?? 0}H</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>CLAIMED</Text>
                <Text style={styles.statValue}>₹{policy.coverage_used ?? 0}</Text>
              </View>
            </View>

            <View style={styles.policyFooter}>
               <Ionicons name="time-outline" size={14} color="#64748b" />
               <Text style={styles.cardFooterText}>
                  Week {policy.coverage_week} • Exp. {policy.expires_at ? formatApiDateTime(policy.expires_at) : 'End of period'}
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
        <View style={{ height: 100 }} />
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
  scroll: { padding: 20, gap: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  greeting: { fontSize: 28, fontWeight: '800', color: '#f8fafc', letterSpacing: -0.5 },
  statusIndicator: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  subtext: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  refreshMeta: { fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: '600' },
  profileIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' },
  zoneHealthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0f172a', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 20, borderWidth: 1, borderColor: '#1e293b' },
  zoneHealthItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  zoneHealthIcon: { fontSize: 16 },
  zoneHealthValue: { color: '#f8fafc', fontSize: 13, fontWeight: '800' },
  zoneHealthDivider: { width: 1, height: 16, backgroundColor: '#1e293b' },
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
  cardFooterText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
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
  errorAlert: { backgroundColor: '#450a0a20', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#ef444440' },
  errorText: { color: '#fca5a5', fontSize: 12, textAlign: 'center', fontWeight: '600' },
});
