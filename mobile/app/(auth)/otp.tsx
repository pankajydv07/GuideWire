import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Colors from '../../constants/Colors';

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { login, setTempToken } = useAuth();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert('Incomplete Signal', 'Please enter the 6-digit verification sequence.');
      return;
    }

    setLoading(true);
    try {
      const result = await api.riders.verifyOtp(phone!, otp);
      if (result.valid) {
        if (result.is_registered && result.jwt_token) {
          await AsyncStorage.removeItem('temp_token');
          await login(result.jwt_token);
          router.replace('/(tabs)');
          return;
        }

        if (result.temp_token) {
          await setTempToken(result.temp_token);
          router.push({ pathname: '/(auth)/register', params: { phone } });
          return;
        }

        Alert.alert('System Mismatch', 'Unable to continue. Please retry transmission.');
      } else {
        Alert.alert('Verification Failed', 'Invalid sequence detected.');
      }
    } catch (err: any) {
      Alert.alert('System Error', err.message || 'Signal disruption detected during verification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View entering={FadeInUp.delay(200).springify()}>
           <Text style={styles.title}>Secure Node Verification</Text>
           <Text style={styles.subtitle}>Sequence sent to {phone}. Enter the 6-digit decryption key below.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.inputContainer}>
           <TextInput
             style={styles.input}
             value={otp}
             onChangeText={setOtp}
             keyboardType="number-pad"
             maxLength={6}
             placeholder="000 000"
             placeholderTextColor="#334155"
             autoFocus
           />
           <TouchableOpacity 
             style={styles.btn} 
             onPress={handleVerify} 
             disabled={loading}
           >
             {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>VALIDATE SIGNAL</Text>}
           </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
           <Text style={styles.backText}>Cancel Protocol</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  content: { flex: 1, padding: 32, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '900', color: '#f8fafc', marginBottom: 12, letterSpacing: -1 },
  subtitle: { fontSize: 15, color: '#475569', lineHeight: 22, fontWeight: '600' },
  inputContainer: { marginTop: 40, gap: 20 },
  input: { backgroundColor: 'rgba(255,255,255,0.03)', color: '#f8fafc', borderRadius: 24, padding: 24, fontSize: 32, textAlign: 'center', fontWeight: '900', letterSpacing: 8, borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.2)' },
  btn: { backgroundColor: Colors.dark.tint, paddingVertical: 20, borderRadius: 20, shadowColor: '#38bdf8', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '900', textAlign: 'center', letterSpacing: 1 },
  backBtn: { marginTop: 24 },
  backText: { color: '#475569', textAlign: 'center', fontWeight: '800', textTransform: 'uppercase', fontSize: 12, letterSpacing: 1 },
});
