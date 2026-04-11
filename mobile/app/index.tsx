import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { normalizeIndianMobile } from '../utils/phone';

export default function WelcomeScreen() {
  const { isAuthenticated, isReady } = useAuth();
  const [phone, setPhone] = useState('+91');
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const normalized = normalizeIndianMobile(phone);
  const isValid = normalized.valid;

  useEffect(() => {
    if (isReady && isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isReady]);

  const handleSendOtp = async () => {
    if (!normalized.valid) {
      setErrorMsg(normalized.error);
      return;
    }

    setErrorMsg('');
    setLoading(true);
    try {
      const response = await api.riders.sendOtp(normalized.normalized);
      router.push({
        pathname: '/(auth)/otp',
        params: {
          phone: normalized.normalized,
          devOtp: response.dev_otp || '',
        },
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isReady) return null;

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent />
      <ImageBackground
        source={require('../assets/images/welcome_rider.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['transparent', 'rgba(2, 6, 23, 0.4)', '#020617']}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <Animated.View entering={FadeInUp.delay(300).duration(1000).springify()} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Image 
                source={require('../assets/images/Zylo.png')} 
                style={{ width: 44, height: 44 }} 
                resizeMode="contain"
              />
              <View>
                <Text style={styles.brand}>ZYLO</Text>
                <View style={{ width: 40, height: 4, backgroundColor: '#38bdf8', marginTop: 4, borderRadius: 2 }} />
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(500).duration(1000).springify()}>
              <Text style={styles.title}>Your Earnings, Guaranteed.</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(700).duration(1000).springify()} style={styles.formContainer}>
              {!showLogin ? (
                <>
                  <Text style={styles.subtitle}>
                    Automatic payout protection for delivery partners against weather, traffic, and platform disruptions.
                  </Text>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    activeOpacity={0.8}
                    onPress={() => setShowLogin(true)}
                  >
                    <Text style={styles.primaryButtonText}>Get Protected</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.loginForm}>
                  <Text style={styles.loginLabel}>Enter Phone Number</Text>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={(value) => {
                      setPhone(value);
                      setErrorMsg(normalizeIndianMobile(value).error);
                    }}
                    keyboardType="phone-pad"
                    placeholder="+919876543210"
                    placeholderTextColor="#475569"
                    maxLength={16}
                  />
                  {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
                  <TouchableOpacity
                    style={[styles.primaryButton, (!isValid || loading) && styles.buttonDisabled]}
                    onPress={handleSendOtp}
                    disabled={loading || !isValid}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Send Sec-OTP</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowLogin(false)} style={{ marginTop: 10 }}>
                    <Text style={styles.backText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push('/(auth)/register')}
              >
                <Text style={styles.secondaryButtonText}>Create New Account</Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.Text entering={FadeInDown.delay(900)} style={styles.footerText}>
              Trusted by 50,000+ delivery partners
            </Animated.Text>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  backgroundImage: { width: '100%', height: '100%' },
  gradient: { flex: 1, justifyContent: 'flex-end', paddingBottom: 60, paddingHorizontal: 30 },
  content: { gap: 32 },
  brand: { fontSize: 28, fontWeight: '900', color: '#f8fafc', letterSpacing: 2 },
  title: { fontSize: 44, fontWeight: '800', color: '#f8fafc', lineHeight: 54, letterSpacing: -1 },
  subtitle: { fontSize: 16, color: '#94a3b8', lineHeight: 24, fontWeight: '500', opacity: 0.9, marginBottom: 10 },
  formContainer: { gap: 20 },
  loginForm: { gap: 12, backgroundColor: 'rgba(15, 23, 42, 0.8)', padding: 24, borderRadius: 32, borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.2)' },
  loginLabel: { color: '#f8fafc', fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  input: { backgroundColor: '#1e293b', color: '#f8fafc', borderRadius: 18, padding: 18, fontSize: 18, borderWidth: 1, borderColor: '#334155', fontWeight: '700' },
  errorText: { color: '#fca5a5', fontSize: 13, marginTop: -4 },
  primaryButton: { backgroundColor: '#38bdf8', paddingVertical: 20, borderRadius: 20, shadowColor: '#38bdf8', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  buttonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: '#ffffff', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  secondaryButton: { paddingVertical: 14 },
  secondaryButtonText: { color: '#f8fafc', fontSize: 16, fontWeight: '700', textAlign: 'center', opacity: 0.8 },
  backText: { color: '#94a3b8', textAlign: 'center', fontSize: 14, fontWeight: '600' },
  footerText: { textAlign: 'center', color: '#475569', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginTop: 10 },
});
