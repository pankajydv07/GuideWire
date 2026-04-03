import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { api } from '../services/api';

export default function WelcomeScreen() {
  const [phone, setPhone] = useState('+91');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (phone.length < 13) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit number with +91 country code.');
      return;
    }

    setLoading(true);
    try {
      await api.riders.sendOtp(phone);
      router.push({ pathname: '/(auth)/otp', params: { phone } });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.logo}>🛡️ RiderShield</Text>
        <Text style={styles.tagline}>Income protection for delivery riders</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Enter your phone number</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="+919876543210"
          maxLength={13}
        />
        <TouchableOpacity style={styles.button} onPress={handleSendOtp} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Get OTP</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', padding: 24 },
  hero: { alignItems: 'center', marginBottom: 48 },
  logo: { fontSize: 36, fontWeight: 'bold', color: '#38bdf8' },
  tagline: { fontSize: 16, color: '#94a3b8', marginTop: 8, textAlign: 'center' },
  form: { gap: 16 },
  label: { color: '#e2e8f0', fontSize: 14, fontWeight: '600' },
  input: { backgroundColor: '#1e293b', color: '#f8fafc', borderRadius: 12, padding: 16, fontSize: 18, borderWidth: 1, borderColor: '#334155' },
  button: { backgroundColor: '#2563eb', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, height: 56, justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
