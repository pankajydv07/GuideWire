/**
 * Dev 1: Registration Screen
 * 
 * After OTP → enter name, pick platform, select zone + slots.
 */

import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

const PLATFORMS = ['zepto', 'blinkit', 'swiggy'];

export default function RegisterScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('');
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    // TODO (Dev 1): Navigate to zone selection with collected data
    router.push({
      pathname: '/(auth)/zone-select',
      params: { phone, name, platform, upiId },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Create Account</Text>

        <Text style={styles.label}>Your Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Arjun Kumar" placeholderTextColor="#64748b" />

        <Text style={styles.label}>Platform</Text>
        <View style={styles.chips}>
          {PLATFORMS.map((p) => (
            <TouchableOpacity key={p} style={[styles.chip, platform === p && styles.chipActive]} onPress={() => setPlatform(p)}>
              <Text style={[styles.chipText, platform === p && styles.chipTextActive]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>UPI ID</Text>
        <TextInput style={styles.input} value={upiId} onChangeText={setUpiId} placeholder="name@oksbi" placeholderTextColor="#64748b" />

        <TouchableOpacity style={[styles.button, (!name || !platform) && styles.buttonDisabled]} onPress={handleNext} disabled={!name || !platform}>
          <Text style={styles.buttonText}>Select Zone →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#f8fafc', marginBottom: 12 },
  label: { color: '#e2e8f0', fontSize: 14, fontWeight: '600', marginTop: 8 },
  input: { backgroundColor: '#1e293b', color: '#f8fafc', borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#334155' },
  chips: { flexDirection: 'row', gap: 12 },
  chip: { backgroundColor: '#1e293b', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20, borderWidth: 1, borderColor: '#334155' },
  chipActive: { backgroundColor: '#1d4ed8', borderColor: '#3b82f6' },
  chipText: { color: '#94a3b8', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  button: { backgroundColor: '#2563eb', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
