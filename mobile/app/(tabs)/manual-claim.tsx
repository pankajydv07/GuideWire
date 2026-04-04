import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import { api, type ManualClaimSubmitResponse } from '../../services/api';

const DISRUPTION_TYPES = [
  { id: 'heavy_rain', label: 'Weather', emoji: 'Rain', desc: 'Rain, flooding, storms' },
  { id: 'traffic', label: 'Traffic', emoji: 'Traffic', desc: 'Congestion, road blocks' },
  { id: 'store_closure', label: 'Store Closed', emoji: 'Store', desc: 'Dark store shut down' },
  { id: 'platform_outage', label: 'Platform Down', emoji: 'App', desc: 'App not working' },
  { id: 'other', label: 'Other', emoji: 'Other', desc: 'Other disruption' },
];

type FormErrors = {
  disruptionType?: string;
  photo?: string;
  description?: string;
  location?: string;
};

export default function ManualClaimScreen() {
  const [disruptionType, setDisruptionType] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ManualClaimSubmitResponse | null>(null);

  const canSubmit = useMemo(
    () => Boolean(disruptionType && photo && description.trim().length >= 10 && location),
    [description, disruptionType, location, photo]
  );

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setErrors((prev) => ({ ...prev, photo: 'Camera permission is required.' }));
      return;
    }

    const locationPermission = await Location.requestForegroundPermissionsAsync();
    if (locationPermission.status !== 'granted') {
      setErrors((prev) => ({ ...prev, location: 'Location permission is required.' }));
      return;
    }

    const currentLocation = await Location.getCurrentPositionAsync({});
    setLocation(currentLocation.coords);

    const capture = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: false,
      exif: true,
    });

    if (!capture.canceled) {
      setPhoto(capture.assets[0]);
      setErrors((prev) => ({ ...prev, photo: undefined, location: undefined }));
    }
  };

  const choosePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setErrors((prev) => ({ ...prev, photo: 'Photo library permission is required.' }));
      return;
    }

    const selected = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      allowsEditing: false,
      exif: true,
    });

    if (!selected.canceled) {
      const locationPermission = await Location.requestForegroundPermissionsAsync();
      if (locationPermission.status === 'granted') {
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation.coords);
      }
      setPhoto(selected.assets[0]);
      setErrors((prev) => ({ ...prev, photo: undefined }));
    }
  };

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    if (!disruptionType) nextErrors.disruptionType = 'Choose a disruption type.';
    if (!photo) nextErrors.photo = 'Take or select a photo.';
    if (!location) nextErrors.location = 'Location is required for verification.';
    if (description.trim().length < 10) nextErrors.description = 'Description must be at least 10 characters.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !photo || !location) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      const filename = photo.uri.split('/').pop() || 'photo.jpg';
      const disruptionValue = disruptionType === 'other' ? 'platform_outage' : disruptionType;

      formData.append('disruption_type', disruptionValue);
      formData.append('description', description.trim());
      formData.append('incident_time', new Date().toISOString());
      formData.append('latitude', String(location.latitude));
      formData.append('longitude', String(location.longitude));
      formData.append('photo', {
        uri: photo.uri,
        name: filename,
        type: photo.mimeType || 'image/jpeg',
      } as never);

      const response = await api.manualClaims.submit(formData);
      setResult(response);
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        description: error instanceof Error ? error.message : 'Submission failed.',
      }));
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setDisruptionType('');
    setDescription('');
    setPhoto(null);
    setLocation(null);
    setErrors({});
    setResult(null);
  };

  if (result) {
    const isRejected = result.status === 'rejected';

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successCard}>
          <Text style={styles.successEmoji}>{isRejected ? 'Rejected' : 'Submitted'}</Text>
          <Text style={styles.successTitle}>
            {isRejected ? 'Claim Auto-Rejected' : 'Claim Submitted Successfully'}
          </Text>
          <Text style={styles.successText}>Claim ID: {result.claim_id || result.manual_claim_id}</Text>
          <Text style={styles.successText}>Status: {result.status.replace('_', ' ')}</Text>
          <Text style={styles.successHint}>{result.message}</Text>
          {result.rejection_reasons.length > 0 ? (
            <View style={styles.reasonList}>
              {result.rejection_reasons.map((reason) => (
                <Text key={reason} style={styles.reasonText}>- {reason}</Text>
              ))}
            </View>
          ) : (
            <Text style={styles.successHint}>Track your claim in the Claims tab.</Text>
          )}
          <TouchableOpacity style={styles.submitButton} onPress={resetForm}>
            <Text style={styles.submitText}>Submit Another</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Report Disruption</Text>
        <Text style={styles.subtitle}>Submit a manual claim with photo evidence and live location.</Text>

        <View style={styles.card}>
          <Text style={styles.label}>1. Disruption type</Text>
          <View style={styles.chips}>
            {DISRUPTION_TYPES.map((item) => {
              const selected = disruptionType === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.typeChip, selected && styles.typeChipSelected]}
                  onPress={() => {
                    setDisruptionType(item.id);
                    setErrors((prev) => ({ ...prev, disruptionType: undefined }));
                  }}
                >
                  <Text style={styles.typeEmoji}>{item.emoji}</Text>
                  <View style={styles.typeCopy}>
                    <Text style={[styles.typeTitle, selected && styles.typeTitleSelected]}>{item.label}</Text>
                    <Text style={styles.typeDesc}>{item.desc}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          {errors.disruptionType ? <Text style={styles.errorText}>{errors.disruptionType}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>2. Photo evidence</Text>
          {photo ? (
            <>
              <Image source={{ uri: photo.uri }} style={styles.preview} />
              <Text style={styles.photoStatus}>Photo captured</Text>
            </>
          ) : (
            <Text style={styles.hint}>Capture what is happening on the ground.</Text>
          )}
          <View style={styles.photoActions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={takePhoto}>
              <Text style={styles.secondaryButtonText}>{photo ? 'Retake Photo' : 'Take Photo'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={choosePhoto}>
              <Text style={styles.secondaryButtonText}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
          {errors.photo ? <Text style={styles.errorText}>{errors.photo}</Text> : null}
          <Text style={styles.locationText}>
            Location:{' '}
            {location
              ? `${location.latitude.toFixed(4)} N, ${location.longitude.toFixed(4)} E`
              : 'Not captured yet'}
          </Text>
          {errors.location ? <Text style={styles.errorText}>{errors.location}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>3. Description</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Describe what happened..."
            placeholderTextColor="#64748b"
            value={description}
            onChangeText={(value) => {
              setDescription(value);
              setErrors((prev) => ({ ...prev, description: undefined }));
            }}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          {errors.description ? <Text style={styles.errorText}>{errors.description}</Text> : null}
        </View>

        <TouchableOpacity style={[styles.submitButton, !canSubmit && styles.submitDisabled]} onPress={handleSubmit} disabled={!canSubmit || submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit Claim</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 20, gap: 14 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#f8fafc' },
  subtitle: { fontSize: 14, color: '#94a3b8' },
  card: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, gap: 10, borderWidth: 1, borderColor: '#334155' },
  label: { color: '#f8fafc', fontWeight: '600', fontSize: 15 },
  hint: { color: '#64748b', fontSize: 13 },
  chips: { gap: 10 },
  typeChip: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' },
  typeChipSelected: { borderColor: '#38bdf8', backgroundColor: '#11203a' },
  typeEmoji: { width: 52, color: '#e2e8f0', fontWeight: '700' },
  typeCopy: { flex: 1 },
  typeTitle: { color: '#f8fafc', fontWeight: '700' },
  typeTitleSelected: { color: '#38bdf8' },
  typeDesc: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  preview: { width: '100%', height: 200, borderRadius: 12 },
  photoStatus: { color: '#22c55e', fontWeight: '600' },
  photoActions: { gap: 10 },
  secondaryButton: { backgroundColor: '#334155', borderRadius: 12, padding: 14, alignItems: 'center' },
  secondaryButtonText: { color: '#e2e8f0', fontWeight: '600' },
  locationText: { color: '#cbd5e1', fontSize: 12 },
  textArea: { minHeight: 120, borderRadius: 12, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', padding: 14, color: '#f8fafc' },
  submitButton: { backgroundColor: '#dc2626', borderRadius: 14, padding: 18, alignItems: 'center' },
  submitDisabled: { opacity: 0.4 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  errorText: { color: '#fca5a5', fontSize: 12 },
  successCard: { margin: 20, marginTop: 80, backgroundColor: '#1e293b', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#334155', alignItems: 'center', gap: 10 },
  successEmoji: { fontSize: 32, fontWeight: '700', color: '#f8fafc' },
  successTitle: { color: '#f8fafc', fontSize: 22, fontWeight: '700' },
  successText: { color: '#cbd5e1', fontSize: 14 },
  successHint: { color: '#94a3b8', fontSize: 13, textAlign: 'center' },
  reasonList: { alignSelf: 'stretch', gap: 8, marginTop: 6, padding: 14, borderRadius: 12, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' },
  reasonText: { color: '#fca5a5', fontSize: 13, lineHeight: 18 },
});
