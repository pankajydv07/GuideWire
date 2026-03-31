/**
 * Dev 1: Zone Selection Screen — STUB
 * 
 * TODO (Dev 1): 
 * - Fetch zones from api.zones.list()
 * - Display zones with risk scores (color-coded)
 * - On select → navigate to slot-select
 */

import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

export default function ZoneSelectScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Select Your Zone</Text>
      <Text style={styles.placeholder}>TODO (Dev 1): Zone list with risk color coding</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#f8fafc', marginBottom: 12 },
  placeholder: { color: '#64748b', fontSize: 14, fontStyle: 'italic' },
});
