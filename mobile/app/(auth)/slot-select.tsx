import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const TIME_SLOTS = [
  { id: '06:00-09:00', label: 'Early Morning', time: '6:00 AM - 9:00 AM', icon: '🌅' },
  { id: '09:00-12:00', label: 'Morning', time: '9:00 AM - 12:00 PM', icon: '☀️' },
  { id: '12:00-15:00', label: 'Afternoon', time: '12:00 PM - 3:00 PM', icon: '🌤️' },
  { id: '15:00-18:00', label: 'Evening', time: '3:00 PM - 6:00 PM', icon: '🌇' },
  { id: '18:00-21:00', label: 'Night Peak', time: '6:00 PM - 9:00 PM', icon: '🌙' },
  { id: '21:00-23:00', label: 'Late Night', time: '9:00 PM - 11:00 PM', icon: '🌃' }
];

export default function SlotSelectScreen() {
  const params = useLocalSearchParams();
  const { login } = useAuth();
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const toggleSlot = (id: string) => {
    setSelectedSlots(prev => {
      if (prev.includes(id)) return prev.filter(s => s !== id);
      if (prev.length >= 4) return prev; // max 4 slots
      return [...prev, id];
    });
  };

  const handleComplete = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const tempToken = await AsyncStorage.getItem('temp_token');
      if (!tempToken) {
        throw new Error('Your verification session expired. Please verify OTP again.');
      }

      // 1. Register rider payload
      const payload = {
         name: params.name as string,
         platform: params.platform as string,
         city: (params.city as string) || 'bengaluru',
         zone_id: params.zoneId as string,
         slots: selectedSlots,
         upi_id: params.upiId as string
      };

      const regResult = await api.riders.register(payload, tempToken);
      
      // 2. Persist slots and upi_id for later use in policy flows
      await AsyncStorage.setItem('rider_slots', JSON.stringify(selectedSlots));
      if (params.upiId) {
        await AsyncStorage.setItem('rider_upi_id', params.upiId as string);
      }
      await AsyncStorage.removeItem('temp_token');

      // 3. Perform contextual login returning real tokens resolving app
      const token = regResult.jwt_token; 
      if (token) {
        await login(token);
      } else {
        throw new Error("No token returned by API!");
      }

      // 4. Push to final policy flow wrapper
      router.replace('/policy/select');
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during onboarding.');
      Alert.alert('Registration Failed', err.message || 'An error occurred during onboarding.');
    } finally {
      setLoading(false);
    }
  };

  const isCompleteReady = selectedSlots.length > 0 && selectedSlots.length <= 4;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Pick Working Slots</Text>
      <Text style={styles.subtitle}>Select up to 4 slots (Current: {selectedSlots.length})</Text>
      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      <ScrollView contentContainerStyle={styles.grid}>
        {TIME_SLOTS.map((slot) => {
          const isSelected = selectedSlots.includes(slot.id);
          const isDisabled = !isSelected && selectedSlots.length >= 4;

          return (
            <TouchableOpacity
              key={slot.id}
              style={[
                styles.card, 
                isSelected && styles.cardActive,
                isDisabled && styles.cardDisabled
              ]}
              onPress={() => toggleSlot(slot.id)}
              disabled={isDisabled}
            >
              <Text style={styles.icon}>{slot.icon}</Text>
              <Text style={[styles.label, isSelected && styles.textActive]}>{slot.label}</Text>
              <Text style={[styles.time, isSelected && styles.textActive]}>{slot.time}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.button, !isCompleteReady && styles.buttonDisabled]} 
          disabled={!isCompleteReady || loading}
          onPress={handleComplete}
        >
          {loading ? (
             <ActivityIndicator color="#fff" />
          ) : (
             <Text style={styles.buttonText}>Complete Registration</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#f8fafc', paddingHorizontal: 24, paddingTop: 20 },
  subtitle: { fontSize: 14, color: '#94a3b8', paddingHorizontal: 24, marginBottom: 20 },
  errorText: { color: '#fca5a5', paddingHorizontal: 24, marginBottom: 12 },
  grid: { paddingHorizontal: 24, paddingBottom: 100, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  card: { width: '48%', backgroundColor: '#1e293b', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#334155', alignItems: 'center', marginBottom: 8 },
  cardActive: { backgroundColor: '#1e3a8a', borderColor: '#3b82f6' },
  cardDisabled: { opacity: 0.4 },
  icon: { fontSize: 28, marginBottom: 8 },
  label: { fontSize: 15, fontWeight: 'bold', color: '#f8fafc', textAlign: 'center', marginBottom: 4 },
  time: { fontSize: 11, color: '#94a3b8', textAlign: 'center' },
  textActive: { color: '#fff' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#0f172a', borderTopWidth: 1, borderTopColor: '#1e293b' },
  button: { backgroundColor: '#2563eb', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
