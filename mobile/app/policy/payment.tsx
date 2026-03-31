/**
 * Dev 2: Payment Screen — STUB
 * 
 * TODO (Dev 2):
 * - Show premium summary
 * - Mock UPI payment flow
 * - Call api.policies.create()
 * - On success → navigate to dashboard with active policy
 */

import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function PaymentScreen() {
  const handlePay = () => {
    // TODO (Dev 2): api.policies.create({ plan_tier: 'balanced', payment_method: 'upi', upi_id: '...' })
    alert('✅ Payment successful! Policy activated.');
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Confirm Payment</Text>

      <View style={styles.card}>
        <Text style={styles.row}>Plan: <Text style={styles.bold}>Balanced</Text></Text>
        <Text style={styles.row}>Week: <Text style={styles.bold}>2026-W13</Text></Text>
        <Text style={styles.row}>Coverage: <Text style={styles.bold}>80% of baseline</Text></Text>
        <Text style={styles.row}>Slots: <Text style={styles.bold}>2 slots covered</Text></Text>
        <View style={styles.divider} />
        <Text style={styles.total}>₹180</Text>
        <Text style={styles.totalLabel}>Weekly Premium</Text>
      </View>

      <TouchableOpacity style={styles.payButton} onPress={handlePay}>
        <Text style={styles.payText}>💳 Pay via UPI</Text>
      </TouchableOpacity>

      <Text style={styles.placeholder}>TODO (Dev 2): Real premium from ML model</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#f8fafc', marginBottom: 20 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, gap: 8, borderWidth: 1, borderColor: '#334155' },
  row: { color: '#94a3b8', fontSize: 15 },
  bold: { color: '#f8fafc', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#334155', marginVertical: 8 },
  total: { fontSize: 36, fontWeight: 'bold', color: '#38bdf8', textAlign: 'center' },
  totalLabel: { fontSize: 13, color: '#64748b', textAlign: 'center' },
  payButton: { backgroundColor: '#22c55e', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 24 },
  payText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  placeholder: { color: '#f59e0b', fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginTop: 16 },
});
