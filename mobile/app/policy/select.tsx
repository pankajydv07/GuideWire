import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

export default function PolicySelectScreen() {
  const { rider } = useAuth();
  const [tiers, setTiers] = useState<Record<string, any> | null>(null);
  const [selectedTier, setSelectedTier] = useState<string>('balanced');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuote = async () => {
      // Read persisted slots from AsyncStorage; fall back to a sensible default
      let slots = '18:00-21:00,21:00-23:00';
      try {
        const stored = await AsyncStorage.getItem('rider_slots');
        if (stored) {
          const parsed: string[] = JSON.parse(stored);
          if (parsed.length > 0) slots = parsed.join(',');
        }
      } catch (_e) {}

      const city = rider?.city || 'bengaluru';

      try {
        const data = await api.policies.getQuote(slots, city);
        // Transform quotes array → map keyed by tier name
        const tierMap: Record<string, any> = {};
        (data.quotes || []).forEach((q: any) => {
          tierMap[q.tier] = {
            weekly: q.weekly_premium,
            coverage_pct: q.coverage_pct,
            max_payout: q.coverage_limit,
          };
        });
        setTiers(tierMap);
      } catch (err) {
        console.error('Error fetching quotes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
  }, [rider]);

  const handleContinue = () => {
    if (!tiers || !tiers[selectedTier]) return;
    
    router.push({
      pathname: '/policy/payment',
      params: { 
        tier: selectedTier,
        price: tiers[selectedTier].weekly.toString(),
        coverage_pct: tiers[selectedTier].coverage_pct.toString(),
        max_payout: tiers[selectedTier].max_payout.toString()
      }
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText}>Calculating personal risk profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>Coverage for your working slots this week</Text>

        {tiers && tiers.zone_risk_score != null && (
          <View style={styles.riskNote}>
            <Text style={styles.riskNoteText}>
              Your zone ({rider?.zone || 'Selected Zone'}) has a risk score of {tiers.zone_risk_score}/100. Premiums are personalized based on zone risk.
            </Text>
          </View>
        )}

        <View style={styles.tierContainer}>
          {/* Essential Card */}
          {tiers?.essential && (
            <TouchableOpacity
              style={[styles.tierCard, selectedTier === 'essential' && styles.selectedCard]}
              onPress={() => setSelectedTier('essential')}
            >
              <Text style={styles.tierEmoji}>🔵</Text>
              <Text style={styles.tierName}>Essential</Text>
              <Text style={styles.tierPrice}>₹{tiers.essential.weekly}/week</Text>
              <Text style={styles.tierCoverage}>{tiers.essential.coverage_pct}% of baseline</Text>
              <Text style={styles.tierMax}>Max ₹{tiers.essential.max_payout}</Text>
            </TouchableOpacity>
          )}

          {/* Balanced Card */}
          {tiers?.balanced && (
            <TouchableOpacity
              style={[styles.tierCard, selectedTier === 'balanced' && styles.selectedCard, styles.recommended]}
              onPress={() => setSelectedTier('balanced')}
            >
              <Text style={styles.recBadge}>✨ RECOMMENDED</Text>
              <Text style={styles.tierEmoji}>🟢</Text>
              <Text style={styles.tierName}>Balanced</Text>
              <Text style={styles.tierPrice}>₹{tiers.balanced.weekly}/week</Text>
              <Text style={styles.tierCoverage}>{tiers.balanced.coverage_pct}% of baseline</Text>
              <Text style={styles.tierMax}>Max ₹{tiers.balanced.max_payout}</Text>
            </TouchableOpacity>
          )}

          {/* Max Protect Card */}
          {tiers?.max_protect && (
            <TouchableOpacity
              style={[styles.tierCard, selectedTier === 'max_protect' && styles.selectedCard]}
              onPress={() => setSelectedTier('max_protect')}
            >
              <Text style={styles.tierEmoji}>🟡</Text>
              <Text style={styles.tierName}>Max Protect</Text>
              <Text style={styles.tierPrice}>₹{tiers.max_protect.weekly}/week</Text>
              <Text style={styles.tierCoverage}>{tiers.max_protect.coverage_pct}% of baseline</Text>
              <Text style={styles.tierMax}>Max ₹{tiers.max_protect.max_payout}</Text>
            </TouchableOpacity>
          )}
        </View>

        {tiers?.slot_breakdown && (
          <View style={styles.breakdownCard}>
             <Text style={styles.breakdownTitle}>Slot Breakdown</Text>
             {tiers.slot_breakdown.map((s: any, idx: number) => (
                <View key={idx} style={styles.breakdownRow}>
                  <Text style={styles.breakdownSlot}>{s.slot}</Text>
                  <Text style={styles.breakdownInfo}>Expected: ₹{s.expected_earnings} • Risk: {s.risk_score}/100</Text>
                </View>
             ))}
          </View>
        )}

        <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
          <Text style={styles.continueText}>Continue to Payment →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#94a3b8', marginTop: 12 },
  scroll: { padding: 20, gap: 14 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#f8fafc' },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 8 },
  riskNote: { backgroundColor: '#334155', padding: 12, borderRadius: 8 },
  riskNoteText: { color: '#fbbf24', fontSize: 13, fontStyle: 'italic' },
  tierContainer: { gap: 12, marginVertical: 8 },
  tierCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#334155' },
  selectedCard: { borderColor: '#38bdf8', backgroundColor: '#0f172a' },
  recommended: { borderColor: '#22c55e', borderWidth: 2 },
  recBadge: { color: '#22c55e', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  tierEmoji: { fontSize: 32 },
  tierName: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc' },
  tierPrice: { fontSize: 22, fontWeight: 'bold', color: '#38bdf8' },
  tierCoverage: { fontSize: 13, color: '#94a3b8' },
  tierMax: { fontSize: 12, color: '#64748b' },
  breakdownCard: { backgroundColor: '#1e293b', padding: 16, borderRadius: 12, marginTop: 8 },
  breakdownTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '600', marginBottom: 12 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  breakdownSlot: { color: '#e2e8f0', fontSize: 14 },
  breakdownInfo: { color: '#94a3b8', fontSize: 12 },
  continueBtn: { backgroundColor: '#2563eb', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  continueText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
