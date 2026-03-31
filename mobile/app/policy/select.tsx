/**
 * Dev 2: Policy Selection Screen — STUB
 * 
 * TODO (Dev 2):
 * - Fetch api.policies.getQuote(slots, city)
 * - Display 3 tier cards (Essential, Balanced, Max Protect)
 * - Show price difference between zones (demo differentiator)
 * - Show risk breakdown per slot
 * - On select → navigate to payment screen
 */

import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';

const TIERS = [
  { name: 'Essential', emoji: '🔵', price: '₹120/week', coverage: '70%', color: '#3b82f6' },
  { name: 'Balanced', emoji: '🟢', price: '₹180/week', coverage: '80%', color: '#22c55e', recommended: true },
  { name: 'Max Protect', emoji: '🟡', price: '₹250/week', coverage: '90%', color: '#f59e0b' },
];

export default function PolicySelectScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>Coverage for your working slots this week</Text>

        {TIERS.map((tier) => (
          <TouchableOpacity
            key={tier.name}
            style={[styles.tierCard, tier.recommended && styles.recommended]}
            onPress={() => router.push('/policy/payment')}
          >
            {tier.recommended && <Text style={styles.recBadge}>✨ RECOMMENDED</Text>}
            <Text style={styles.tierEmoji}>{tier.emoji}</Text>
            <Text style={styles.tierName}>{tier.name}</Text>
            <Text style={styles.tierPrice}>{tier.price}</Text>
            <Text style={styles.tierCoverage}>{tier.coverage} of baseline covered</Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.placeholder}>TODO (Dev 2): Real prices from api.policies.getQuote()</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 20, gap: 14 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#f8fafc' },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 8 },
  tierCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#334155' },
  recommended: { borderColor: '#22c55e', borderWidth: 2 },
  recBadge: { color: '#22c55e', fontSize: 11, fontWeight: '700' },
  tierEmoji: { fontSize: 36 },
  tierName: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc' },
  tierPrice: { fontSize: 24, fontWeight: 'bold', color: '#38bdf8' },
  tierCoverage: { fontSize: 13, color: '#94a3b8' },
  placeholder: { color: '#f59e0b', fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginTop: 8 },
});
