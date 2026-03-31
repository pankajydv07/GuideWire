/**
 * Dev 1: OTP Verification Screen
 * 
 * Enter 6-digit OTP (mock: 123456) → verify → navigate to register.
 */

import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    // TODO (Dev 1): Call api.riders.verifyOtp → store temp_token → navigate
    setLoading(true);
    try {
      const result = await api.riders.verifyOtp(phone!, otp);
      if (result.valid) {
        api.setToken(result.temp_token);
        router.push({ pathname: '/(auth)/register', params: { phone } });
      }
    } catch (err) {
      alert('Invalid OTP. Try 123456');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Verify OTP</Text>
      <Text style={styles.subtitle}>Enter the code sent to {phone}</Text>
      <Text style={styles.hint}>💡 Demo OTP: 123456</Text>

      <TextInput
        style={styles.input}
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
        placeholder="123456"
        placeholderTextColor="#64748b"
        maxLength={6}
        autoFocus
      />

      <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading || otp.length < 6}>
        <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Verify'}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#f8fafc', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#94a3b8', marginBottom: 4 },
  hint: { fontSize: 13, color: '#fbbf24', marginBottom: 24 },
  input: { backgroundColor: '#1e293b', color: '#f8fafc', borderRadius: 12, padding: 16, fontSize: 24, textAlign: 'center', letterSpacing: 8, borderWidth: 1, borderColor: '#334155' },
  button: { backgroundColor: '#2563eb', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
