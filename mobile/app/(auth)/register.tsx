import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Keyboard } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

const PLATFORMS = [
  { id: 'zepto', name: 'Zepto', emoji: '🟢' },
  { id: 'blinkit', name: 'Blinkit', emoji: '🟡' },
  { id: 'swiggy', name: 'Swiggy', emoji: '🟠' }
];

export default function RegisterScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('');
  const [upiId, setUpiId] = useState('');
  
  const isUpiValid = upiId.length > 3 && /^[\w.-]+@[\w.-]+$/.test(upiId);
  const isValid = name.trim().length > 0 && platform !== '' && isUpiValid;

  const handleNext = () => {
    router.push({
      pathname: '/(auth)/zone-select',
      params: { phone, name, platform, upiId },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
      >
        <Text style={styles.title}>Create Account</Text>

        <Text style={styles.label}>Your Name</Text>
        <TextInput 
          style={styles.input} 
          value={name} 
          onChangeText={setName} 
          placeholder="Enter your name" 
          placeholderTextColor="#64748b" 
        />

        <Text style={styles.label}>Platform</Text>
        <View style={styles.chips}>
          {PLATFORMS.map((p) => (
            <TouchableOpacity 
              key={p.id} 
              style={[styles.chip, platform === p.id && styles.chipActive]} 
              onPress={() => setPlatform(p.id)}
            >
              <Text style={styles.chipEmoji}>{p.emoji}</Text>
              <Text style={[styles.chipText, platform === p.id && styles.chipTextActive]}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>UPI ID</Text>
        <TextInput 
          style={styles.input} 
          value={upiId} 
          onChangeText={setUpiId} 
          placeholder="name@oksbi" 
          placeholderTextColor="#64748b" 
          autoCapitalize="none"
        />
        {upiId.length > 0 && !isUpiValid && (
           <Text style={styles.errorHint}>Please enter a valid UPI ID (e.g., name@bank)</Text>
        )}

        <TouchableOpacity 
          style={[styles.button, !isValid && styles.buttonDisabled]} 
          onPress={handleNext} 
          disabled={!isValid}
        >
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
  errorHint: { color: '#fbbf24', fontSize: 12, marginTop: -8 },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: '#334155', alignItems: 'center', gap: 6 },
  chipActive: { backgroundColor: '#1e3a8a', borderColor: '#3b82f6' },
  chipEmoji: { fontSize: 16 },
  chipText: { color: '#94a3b8', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  button: { backgroundColor: '#2563eb', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
