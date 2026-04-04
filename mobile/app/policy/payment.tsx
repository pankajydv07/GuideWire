import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

const currentCoverageWeek = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const diff = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return `${now.getUTCFullYear()}-W${String(Math.ceil((diff + start.getUTCDay() + 1) / 7)).padStart(2, '0')}`;
};

export default function PaymentScreen() {
  const params = useLocalSearchParams<{
    tier: string;
    price: string;
    coverage_pct: string;
    max_payout: string;
    slots_covered: string;
    coverage_week: string;
    zone_name: string;
  }>();
  const { rider, refreshProfile } = useAuth();

  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [displayUpi, setDisplayUpi] = useState('demo@oksbi');

  useEffect(() => {
    AsyncStorage.getItem('rider_upi_id')
      .then((value) => setDisplayUpi(value || rider?.upi_id || 'demo@oksbi'))
      .catch(() => setDisplayUpi(rider?.upi_id || 'demo@oksbi'));
  }, [rider?.upi_id]);

  const handlePay = async () => {
    setProcessing(true);
    try {
      let slots: string[] = ['18:00-21:00'];
      const storedSlots = await AsyncStorage.getItem('rider_slots');
      if (storedSlots) {
        const parsed = JSON.parse(storedSlots) as string[];
        if (parsed.length > 0) slots = parsed;
      }

      const result = await api.policies.create({
        plan_tier: params.tier || 'balanced',
        payment_method: 'upi',
        upi_id: displayUpi,
        slots,
      });

      setSuccess(true);
      await refreshProfile();
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 1500);
      return result;
    } catch (error) {
      Alert.alert('Payment failed', error instanceof Error ? error.message : 'Unable to activate policy.');
    } finally {
      setProcessing(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Text style={styles.successEmoji}>✅</Text>
        <Text style={styles.successTitle}>Payment Successful</Text>
        <Text style={styles.successText}>Your policy is now active.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Confirm Payment</Text>

      <View style={styles.card}>
        <Text style={styles.row}>Plan: <Text style={styles.bold}>{(params.tier || 'balanced').replace('_', ' ').toUpperCase()}</Text></Text>
        <Text style={styles.row}>Coverage Week: <Text style={styles.bold}>{currentCoverageWeek()}</Text></Text>
        <Text style={styles.row}>Zone: <Text style={styles.bold}>{params.zone_name || rider?.zone || rider?.city || 'Selected Zone'}</Text></Text>
        <Text style={styles.row}>Coverage: <Text style={styles.bold}>{params.coverage_pct || '80'}% of baseline</Text></Text>
        <Text style={styles.row}>Slots Covered: <Text style={styles.bold}>{params.slots_covered || '1'}</Text></Text>
        <View style={styles.divider} />
        <Text style={styles.total}>₹{params.price || '180'}</Text>
        <Text style={styles.totalLabel}>Weekly premium</Text>
      </View>

      <View style={styles.upiCard}>
        <Text style={styles.upiLabel}>Pay via demo UPI</Text>
        <Text style={styles.upiValue}>{displayUpi}</Text>
      </View>

      <TouchableOpacity style={[styles.payButton, processing && styles.payButtonDisabled]} onPress={handlePay} disabled={processing}>
        {processing ? <ActivityIndicator color="#fff" /> : <Text style={styles.payText}>💳 Pay via UPI</Text>}
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
  upiCard: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#334155' },
  upiLabel: { color: '#94a3b8', fontSize: 13, marginBottom: 4 },
  upiValue: { color: '#f8fafc', fontSize: 18, fontWeight: '700' },
  payButton: { backgroundColor: '#22c55e', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 24, justifyContent: 'center' },
  payButtonDisabled: { opacity: 0.7 },
  payText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  successEmoji: { fontSize: 64, marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: 'bold', color: '#22c55e', marginBottom: 8 },
  successText: { fontSize: 16, color: '#f8fafc' },
});
