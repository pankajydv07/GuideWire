import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '../../contexts/AuthContext';
import { api, type PolicyQuoteResponse } from '../../services/api';

const tierLabel = (tier: string) => tier.replace('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
const tierEmoji = (tier: string) => {
  if (tier === 'essential') return '🔵';
  if (tier === 'balanced') return '🟢';
  return '🟡';
};

export default function PolicySelectScreen() {
  const { rider } = useAuth();
  const [quote, setQuote] = useState<PolicyQuoteResponse | null>(null);
  const [selectedTier, setSelectedTier] = useState('balanced');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuote = async () => {
      let slots = '18:00-21:00,21:00-23:00';
      try {
        const stored = await AsyncStorage.getItem('rider_slots');
        if (stored) {
          const parsed: string[] = JSON.parse(stored);
          if (parsed.length > 0) slots = parsed.join(',');
        }
      } catch (_error) {}

      try {
        const data = await api.policies.getQuote(slots, rider?.city || 'bengaluru');
        setQuote(data);
      } catch (error) {
        console.error('Error fetching quotes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuote().catch(console.error);
  }, [rider?.city]);

  const selectedQuote = quote?.quotes.find((entry) => entry.tier === selectedTier) ?? quote?.quotes[0];

  const handleContinue = () => {
    if (!selectedQuote || !quote) return;

    router.push({
      pathname: '/policy/payment',
      params: {
        tier: selectedQuote.tier,
        price: String(selectedQuote.weekly_premium),
        coverage_pct: String(selectedQuote.coverage_pct),
        max_payout: String(selectedQuote.coverage_limit),
        slots_covered: String(selectedQuote.slots_covered),
        coverage_week: new Date().toISOString().slice(0, 10),
        zone_name: quote.zone_name,
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText}>Calculating your personalized weekly premium...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>Weekly cover personalized for your zone and working slots.</Text>

        {quote ? (
          <>
            <View style={styles.riskCard}>
              <Text style={styles.riskText}>
                Your zone ({quote.zone_name || rider?.zone || 'Selected Zone'}) has a risk score of {quote.zone_risk_score}/100.
              </Text>
              {quote.explanation ? <Text style={styles.riskSubtext}>{quote.explanation}</Text> : null}
            </View>

            <View style={styles.tierContainer}>
              {quote.quotes.map((tier) => (
                <TouchableOpacity
                  key={tier.tier}
                  style={[
                    styles.tierCard,
                    selectedTier === tier.tier && styles.selectedCard,
                    tier.tier === 'balanced' && styles.recommended,
                  ]}
                  onPress={() => setSelectedTier(tier.tier)}
                >
                  {tier.tier === 'balanced' ? <Text style={styles.recBadge}>RECOMMENDED</Text> : null}
                  <Text style={styles.tierEmoji}>{tierEmoji(tier.tier)}</Text>
                  <Text style={styles.tierName}>{tierLabel(tier.tier)}</Text>
                  <Text style={styles.tierPrice}>₹{tier.weekly_premium}/week</Text>
                  <Text style={styles.tierCoverage}>{tier.coverage_pct}% coverage of your baseline</Text>
                  <Text style={styles.tierMax}>Max payout ₹{tier.coverage_limit}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {quote.slot_breakdown.length > 0 ? (
              <View style={styles.breakdownCard}>
                <Text style={styles.breakdownTitle}>Slot Breakdown</Text>
                {quote.slot_breakdown.map((slot) => (
                  <View key={slot.slot} style={styles.breakdownRow}>
                    <Text style={styles.breakdownSlot}>{slot.slot}</Text>
                    <Text style={styles.breakdownInfo}>
                      Expected ₹{slot.expected_earnings} • Risk {slot.risk_score}/100
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <TouchableOpacity style={styles.continueBtn} onPress={handleContinue} disabled={!selectedQuote}>
              <Text style={styles.continueText}>Continue to Payment →</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>Premium quote unavailable right now.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { color: '#94a3b8', marginTop: 12, textAlign: 'center' },
  scroll: { padding: 20, gap: 14 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#f8fafc' },
  subtitle: { fontSize: 14, color: '#94a3b8' },
  riskCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#334155', gap: 6 },
  riskText: { color: '#fbbf24', fontSize: 13, fontWeight: '600' },
  riskSubtext: { color: '#cbd5e1', fontSize: 13, lineHeight: 18 },
  tierContainer: { gap: 12 },
  tierCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#334155' },
  selectedCard: { borderColor: '#38bdf8', backgroundColor: '#111c35' },
  recommended: { borderColor: '#22c55e', borderWidth: 2 },
  recBadge: { color: '#22c55e', fontSize: 11, fontWeight: '700' },
  tierEmoji: { fontSize: 32 },
  tierName: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc' },
  tierPrice: { fontSize: 22, fontWeight: 'bold', color: '#38bdf8' },
  tierCoverage: { fontSize: 13, color: '#94a3b8' },
  tierMax: { fontSize: 12, color: '#64748b' },
  breakdownCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#334155' },
  breakdownTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '600', marginBottom: 10 },
  breakdownRow: { marginBottom: 10 },
  breakdownSlot: { color: '#e2e8f0', fontSize: 14, fontWeight: '600' },
  breakdownInfo: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  continueBtn: { backgroundColor: '#2563eb', padding: 16, borderRadius: 12, alignItems: 'center' },
  continueText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  errorCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#7f1d1d' },
  errorText: { color: '#fca5a5', fontSize: 14 },
});
