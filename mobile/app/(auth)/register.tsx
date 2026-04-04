import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Keyboard } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

import Colors from '../../constants/Colors';

const PLATFORMS = [
  { id: 'zepto', name: 'Zepto', icon: '⚡' },
  { id: 'blinkit', name: 'Blinkit', icon: '📦' },
  { id: 'swiggy', name: 'Swiggy', icon: '🛵' },
  { id: 'zomato', name: 'Zomato', icon: '🍕' }
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
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView 
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInUp.delay(200).springify()}>
            <Text style={styles.title}>Identity Setup</Text>
            <Text style={styles.subtitle}>Initialize your rider profile to enable parametric security.</Text>
          </Animated.View>

          <View style={styles.form}>
            <Animated.View entering={FadeInDown.delay(400).springify()}>
              <Text style={styles.label}>OPERATOR NAME</Text>
              <TextInput 
                style={styles.input} 
                value={name} 
                onChangeText={setName} 
                placeholder="Enter full name" 
                placeholderTextColor="#334155" 
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(600).springify()}>
              <Text style={styles.label}>FLEET PLATFORM</Text>
              <View style={styles.chips}>
                {PLATFORMS.map((p) => (
                  <TouchableOpacity 
                    key={p.id} 
                    style={[styles.chip, platform === p.id && styles.chipActive]} 
                    onPress={() => setPlatform(p.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.chipIcon}>{p.icon}</Text>
                    <Text style={[styles.chipText, platform === p.id && styles.chipTextActive]}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(800).springify()}>
              <Text style={styles.label}>REDISTRIBUTION UPI ID</Text>
              <TextInput 
                style={styles.input} 
                value={upiId} 
                onChangeText={setUpiId} 
                placeholder="rider@okaxis" 
                placeholderTextColor="#334155" 
                autoCapitalize="none"
              />
              {upiId.length > 0 && !isUpiValid && (
                 <Text style={styles.errorHint}>Invalid UPI format (e.g. name@bank)</Text>
              )}
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(1000).springify()} style={{ marginTop: 24 }}>
              <TouchableOpacity 
                style={[styles.button, !isValid && styles.buttonDisabled]} 
                onPress={handleNext} 
                disabled={!isValid}
              >
                <Text style={styles.buttonText}>ESTABLISH PERIMETERS →</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  scroll: { padding: 32, paddingBottom: 60 },
  title: { fontSize: 32, fontWeight: '900', color: '#f8fafc', letterSpacing: -1 },
  subtitle: { fontSize: 15, color: '#475569', lineHeight: 22, fontWeight: '600', marginTop: 8 },
  form: { marginTop: 40, gap: 24 },
  label: { color: Colors.dark.tint, fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 8 },
  input: { backgroundColor: 'rgba(255,255,255,0.02)', color: '#f8fafc', borderRadius: 20, padding: 18, fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', fontWeight: '700' },
  errorHint: { color: '#f43f5e', fontSize: 10, fontWeight: '800', marginTop: 8, letterSpacing: 0.5 },
  chips: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', alignItems: 'center', gap: 8 },
  chipActive: { backgroundColor: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.3)' },
  chipIcon: { fontSize: 16 },
  chipText: { color: '#475569', fontWeight: '800', fontSize: 13 },
  chipTextActive: { color: '#f8fafc' },
  button: { backgroundColor: Colors.dark.tint, borderRadius: 24, paddingVertical: 22, alignItems: 'center', shadowColor: Colors.dark.tint, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  buttonDisabled: { opacity: 0.2, shadowOpacity: 0 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
});
