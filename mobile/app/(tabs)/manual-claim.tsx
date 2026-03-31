/**
 * Dev 5: Manual Claim Tab — STUB
 * 
 * TODO (Dev 5):
 * - Disruption type picker (weather, traffic, store, platform, other)
 * - Description text input
 * - Photo capture with camera (geo-tagged)
 * - Incident time picker
 * - Submit via api.manualClaims.submit(formData)
 * - Show claim status after submission
 */

import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';

export default function ManualClaimScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Report Disruption</Text>
      <Text style={styles.subtitle}>Submit a manual claim with photo evidence</Text>
      <Text style={styles.placeholder}>TODO (Dev 5): Manual claim form + photo capture</Text>

      {/* Placeholder form */}
      <View style={styles.card}>
        <Text style={styles.label}>1. Select disruption type</Text>
        <Text style={styles.hint}>Weather / Traffic / Store Closure / Platform / Other</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>2. Take a geo-tagged photo</Text>
        <TouchableOpacity style={styles.photoButton}>
          <Text style={styles.photoIcon}>📸</Text>
          <Text style={styles.photoText}>Open Camera</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>3. Describe what happened</Text>
        <Text style={styles.hint}>Text input area</Text>
      </View>

      <TouchableOpacity style={styles.submitButton}>
        <Text style={styles.submitText}>Submit Claim</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#f8fafc' },
  subtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 16 },
  placeholder: { color: '#f59e0b', fontSize: 12, fontStyle: 'italic', marginBottom: 16 },
  card: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  label: { color: '#f8fafc', fontWeight: '600', fontSize: 15, marginBottom: 6 },
  hint: { color: '#64748b', fontSize: 13 },
  photoButton: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  photoIcon: { fontSize: 28 },
  photoText: { color: '#38bdf8', fontWeight: '600' },
  submitButton: { backgroundColor: '#dc2626', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
