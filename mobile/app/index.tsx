import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity, TextInput, ActivityIndicator, Alert, StatusBar as RNStatusBar } from 'react-native';
import { router } from 'expo-router';
import Animated, { 
  FadeInDown, 
  FadeInUp, 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming, 
  withDelay 
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

export default function WelcomeScreen() {
  const { isAuthenticated, isRestoring } = useAuth();
  const [phone, setPhone] = useState('+91');
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isRestoring && isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isRestoring]);

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

  if (isRestoring) return null;

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
            <Animated.View entering={FadeInUp.delay(300).duration(1000).springify()}>
              <Text style={styles.brand}>RIDER<Text style={{ color: '#38bdf8' }}>SHIELD</Text></Text>
              <View style={styles.taglineBorder} />
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
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      placeholder="+919876543210"
                      placeholderTextColor="#475569"
                      maxLength={13}
                    />
                    <TouchableOpacity 
                      style={styles.primaryButton} 
                      onPress={handleSendOtp} 
                      disabled={loading}
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
  taglineBorder: { width: 40, height: 4, backgroundColor: '#38bdf8', marginTop: 8, borderRadius: 2 },
  title: { fontSize: 44, fontWeight: '800', color: '#f8fafc', lineHeight: 54, letterSpacing: -1 },
  subtitle: { fontSize: 16, color: '#94a3b8', lineHeight: 24, fontWeight: '500', opacity: 0.9, marginBottom: 10 },
  formContainer: { gap: 20 },
  loginForm: { gap: 12, backgroundColor: 'rgba(15, 23, 42, 0.8)', padding: 24, borderRadius: 32, borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.2)' },
  loginLabel: { color: '#f8fafc', fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  input: { backgroundColor: '#1e293b', color: '#f8fafc', borderRadius: 18, padding: 18, fontSize: 18, borderWidth: 1, borderColor: '#334155', fontWeight: '700' },
  primaryButton: { backgroundColor: '#38bdf8', paddingVertical: 20, borderRadius: 20, shadowColor: '#38bdf8', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  primaryButtonText: { color: '#ffffff', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  secondaryButton: { paddingVertical: 14 },
  secondaryButtonText: { color: '#f8fafc', fontSize: 16, fontWeight: '700', textAlign: 'center', opacity: 0.8 },
  backText: { color: '#94a3b8', textAlign: 'center', fontSize: 14, fontWeight: '600' },
  footerText: { textAlign: 'center', color: '#475569', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginTop: 10 },
});
