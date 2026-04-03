import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

export default function PaymentScreen() {
  const { tier, price, coverage_pct } = useLocalSearchParams<{ tier: string; price: string; coverage_pct: string }>();
  const { rider } = useAuth();
  
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const planName = tier ? tier.charAt(0).toUpperCase() + tier.slice(1).replace('_', ' ') : 'Balanced';
  const displayPrice = price || '180';
  const displayCoverage = coverage_pct || '80';

  const handlePay = async () => {
    setProcessing(true);
    try {
      const r = rider as any;
      await api.policies.create({
        plan_tier: tier || 'balanced',
        payment_method: 'upi',
        upi_id: r?.upi_id || 'demo@oksbi',
      });
      
      setSuccess(true);
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 1500);
    } catch (err: any) {
      alert('Payment failed: ' + err.message);
    } finally {
      if (!success) {
        setProcessing(false);
      }
    }
  };

  if (success) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.successEmoji}>✅</Text>
        <Text style={styles.successText}>Payment Successful!</Text>
        <Text style={styles.successSubtext}>Policy Activated</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Confirm Payment</Text>

      <View style={styles.card}>
        <Text style={styles.row}>Plan: <Text style={styles.bold}>{planName}</Text></Text>
        <Text style={styles.row}>Week: <Text style={styles.bold}>Current Week</Text></Text>
        <Text style={styles.row}>Coverage: <Text style={styles.bold}>{displayCoverage}% of baseline</Text></Text>
        <Text style={styles.row}>Slots: <Text style={styles.bold}>All Working Slots</Text></Text>
        <View style={styles.divider} />
        <Text style={styles.total}>₹{displayPrice}</Text>
        <Text style={styles.totalLabel}>Weekly Premium</Text>
      </View>

      <TouchableOpacity 
        style={[styles.payButton, processing && styles.payButtonDisabled]} 
        onPress={handlePay}
        disabled={processing}
      >
        {processing ? (
           <ActivityIndicator color="#fff" />
        ) : (
           <Text style={styles.payText}>💳 Pay via UPI ({ (rider as any)?.upi_id || 'demo' })</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  center: { justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#f8fafc', marginBottom: 20 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 20, gap: 8, borderWidth: 1, borderColor: '#334155' },
  row: { color: '#94a3b8', fontSize: 15 },
  bold: { color: '#f8fafc', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#334155', marginVertical: 8 },
  total: { fontSize: 36, fontWeight: 'bold', color: '#38bdf8', textAlign: 'center' },
  totalLabel: { fontSize: 13, color: '#64748b', textAlign: 'center' },
  payButton: { backgroundColor: '#22c55e', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 24, flexDirection: 'row', justifyContent: 'center' },
  payButtonDisabled: { opacity: 0.7 },
  payText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  successEmoji: { fontSize: 64, marginBottom: 16 },
  successText: { fontSize: 24, fontWeight: 'bold', color: '#22c55e', marginBottom: 8 },
  successSubtext: { fontSize: 16, color: '#f8fafc' }
});
