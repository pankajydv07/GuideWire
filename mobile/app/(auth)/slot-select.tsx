/**
 * Dev 1: Slot Selection Screen — STUB
 * 
 * TODO (Dev 1):
 * - Show time slots for selected zone
 * - Color-code by risk level
 * - On confirm → call api.riders.register() + api.riders.onboard()
 * - Navigate to policy/select
 */

import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

export default function SlotSelectScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Pick Working Slots</Text>
      <Text style={styles.placeholder}>TODO (Dev 1): Slot picker with risk color bars</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#f8fafc', marginBottom: 12 },
  placeholder: { color: '#64748b', fontSize: 14, fontStyle: 'italic' },
});
