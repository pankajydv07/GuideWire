/**
 * Dev 1: Profile Tab — STUB
 * 
 * TODO (Dev 1):
 * - Show rider profile from useAuth() context
 * - Show risk profile from api.riders.getRiskProfile()
 * - Show 4-week earnings chart
 * - Logout button
 */

import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileScreen() {
  const { rider, logout } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.card}>
        <Text style={styles.name}>{rider?.name || 'Arjun Kumar'}</Text>
        <Text style={styles.detail}>📱 {rider?.phone || '+919876543210'}</Text>
        <Text style={styles.detail}>🛵 {rider?.platform || 'Zepto'}</Text>
        <Text style={styles.detail}>📍 {rider?.zone || 'Koramangala'}</Text>
        <Text style={styles.detail}>⭐ Trust Score: {rider?.trust_score || 85}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Risk Profile</Text>
        <Text style={styles.placeholder}>TODO (Dev 1): Risk scores + 4-week earnings</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#f8fafc', marginBottom: 16 },
  card: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#334155', gap: 6 },
  name: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc' },
  detail: { fontSize: 14, color: '#94a3b8' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#f8fafc', marginBottom: 4 },
  placeholder: { color: '#f59e0b', fontSize: 12, fontStyle: 'italic' },
  logoutButton: { borderWidth: 1, borderColor: '#ef4444', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  logoutText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
});
