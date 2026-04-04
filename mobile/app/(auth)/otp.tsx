import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [timer, setTimer] = useState(30);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleVerify = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const result = await api.riders.verifyOtp(phone!, otp);
      if (result.valid) {
        await AsyncStorage.setItem('temp_token', result.temp_token);
        api.setToken(result.temp_token);
        router.push({ pathname: '/(auth)/register', params: { phone } });
      } else {
        setErrorMsg('Invalid OTP. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg('Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    try {
      await api.riders.sendOtp(phone!);
      setTimer(30);
      setErrorMsg('');
    } catch (err) {
      setErrorMsg('Failed to resend OTP.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Verify OTP</Text>
      <Text style={styles.subtitle}>Enter the code sent to {phone}</Text>
      <Text style={styles.hint}>💡 Demo OTP: 123456</Text>

      <TextInput
        style={[styles.input, errorMsg ? styles.inputError : null]}
        value={otp}
        onChangeText={(val) => { setOtp(val); setErrorMsg(''); }}
        keyboardType="number-pad"
        placeholder="123456"
        placeholderTextColor="#64748b"
        maxLength={6}
        autoFocus
      />
      
      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      <TouchableOpacity 
        style={[styles.button, otp.length < 6 && styles.buttonDisabled]} 
        onPress={handleVerify} 
        disabled={loading || otp.length < 6}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify</Text>}
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.resendContainer} 
        onPress={handleResend}
        disabled={timer > 0}
      >
        <Text style={[styles.resendText, timer > 0 && styles.resendTextDisabled]}>
          {timer > 0 ? `Resend OTP in ${timer}s` : 'Resend OTP'}
        </Text>
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
  inputError: { borderColor: '#ef4444' },
  errorText: { color: '#ef4444', fontSize: 14, textAlign: 'center', marginTop: 8 },
  button: { backgroundColor: '#2563eb', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24, height: 56, justifyContent: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resendContainer: { marginTop: 20, alignItems: 'center' },
  resendText: { color: '#38bdf8', fontSize: 15, fontWeight: '600' },
  resendTextDisabled: { color: '#64748b' }
});
