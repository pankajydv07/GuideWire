import { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Image, Dimensions, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';

import { api, type ManualClaimSubmitResponse } from '../../services/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const TYPE_UI_META: Record<string, { icon: any, color: string, desc: string }> = {
  heavy_rain: { icon: 'rainy', color: '#10b981', desc: 'Flood detection in urban zones' },
  traffic_congestion: { icon: 'car', color: '#ef4444', desc: 'Major arterial route blockage' },
  store_closure: { icon: 'storefront', color: '#6366f1', desc: 'Dark store closure detected' },
  platform_outage: { icon: 'phone-portrait', color: '#a855f7', desc: 'Digital infrastructure failure' },
  regulatory_curfew: { icon: 'ban', color: '#f43f5e', desc: 'Emergency movement restrictions' },
  community_signal: { icon: 'megaphone', color: '#f59e0b', desc: 'Community anomaly threshold breached' },
  default: { icon: 'ellipsis-horizontal-circle', color: '#94a3b8', desc: 'Context-specific telemetry' },
};

type FormErrors = {
  disruptionType?: string;
  photo?: string;
  description?: string;
};

export default function ManualClaimScreen() {
  const [disruptionType, setDisruptionType] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [availableTypes, setAvailableTypes] = useState<any[]>([]);
  const [result, setResult] = useState<ManualClaimSubmitResponse | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    api.config.get()
      .then(cfg => setAvailableTypes(cfg.trigger_types))
      .catch(e => console.error("Config fetch failed:", e))
      .finally(() => setLoadingConfig(false));

    Location.requestForegroundPermissionsAsync().then(p => {
       if (p.status === 'granted') {
         Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then(l => setLocation(l.coords));
       }
    });
  }, []);

  const canSubmit = useMemo(
    () => Boolean(disruptionType && photo && description.trim().length >= 10),
    [description, disruptionType, photo]
  );

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return setErrors((p) => ({ ...p, photo: 'Camera access denied' }));
    const capture = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false });
    if (!capture.canceled) {
      setPhoto(capture.assets[0]);
      setErrors((prev) => ({ ...prev, photo: undefined }));
    }
  };

  const choosePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return setErrors((p) => ({ ...p, photo: 'Library access denied' }));
    const selected = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: false });
    if (!selected.canceled) {
      setPhoto(selected.assets[0]);
      setErrors((prev) => ({ ...prev, photo: undefined }));
    }
  };

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    if (!disruptionType) nextErrors.disruptionType = 'Protocol required';
    if (!photo) nextErrors.photo = 'Telemetry image missing';
    if (description.trim().length < 10) nextErrors.description = 'Log requires more data';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !photo) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const formData = new FormData();
      formData.append('disruption_type', disruptionType);
      formData.append('description', description.trim());
      formData.append('incident_time', new Date().toISOString());
      if (location) {
        formData.append('latitude', String(location.latitude));
        formData.append('longitude', String(location.longitude));
      }
      if (Platform.OS === 'web') {
        const blob = await fetch(photo.uri).then((res) => res.blob());
        formData.append('photo', blob, 'telemetry.jpg');
      } else {
        formData.append('photo', { uri: photo.uri, name: 'telemetry.jpg', type: photo.mimeType || 'image/jpeg' } as any);
      }
      const response = await api.manualClaims.submit(formData);
      setResult(response);
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : 'Sync failure';
      setErrors((prev) => ({ ...prev, description: msg }));
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    const isRejected = result.status === 'rejected';
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0f172a', '#020617']} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
          <Animated.View entering={FadeInUp.springify()} style={styles.successCard}>
            <Ionicons name={isRejected ? 'alert-circle' : 'checkmark-circle'} size={64} color={isRejected ? '#f43f5e' : '#10b981'} />
            <Text style={styles.successTitle}>{isRejected ? 'Declined' : 'Synchronized'}</Text>
            <View style={styles.badgeContainer}><Text style={styles.statusBadge}>{result.status.toUpperCase()}</Text></View>
            <Text style={styles.successHint}>{result.message}</Text>
            <TouchableOpacity style={styles.resetButton} onPress={() => setResult(null)}><Text style={styles.resetButtonText}>NEW REPORT</Text></TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#020617', '#0f172a', '#020617']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        {/* Main Content Scrollable Area */}
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll} 
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Incident Report</Text>
            <Text style={styles.subtitle}>Relay ground-truth telemetry for parametric verification.</Text>
          </View>

          <View style={styles.layers}>
            {/* 01 PROTOCOL SELECTION */}
            <View style={styles.layer}>
              <View style={styles.layerLabelRow}>
                <Text style={styles.layerLabel}>01 PROTOCOL SELECTION</Text>
                {errors.disruptionType && <Text style={styles.errorLabel}>{errors.disruptionType}</Text>}
              </View>
              <View style={styles.disruptionList}>
                {loadingConfig ? <ActivityIndicator color="#38bdf8" /> : (
                  availableTypes.map((type) => (
                    <DisruptionRow
                      key={type.type}
                      type={{ ...type, ...TYPE_UI_META[type.type] || TYPE_UI_META.default }}
                      selected={disruptionType === type.type}
                      onPress={() => setDisruptionType(type.type)}
                    />
                  ))
                )}
              </View>
            </View>

            {/* 02 VISUAL TELEMETRY */}
            <View style={styles.layer}>
              <View style={styles.layerLabelRow}>
                <Text style={styles.layerLabel}>02 VISUAL TELEMETRY</Text>
                {errors.photo && <Text style={styles.errorLabel}>{errors.photo}</Text>}
              </View>
              <View style={styles.photoUploadRow}>
                {photo ? (
                  <View style={styles.photoPreviewWrapper}>
                    <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                    <TouchableOpacity style={styles.photoReset} onPress={() => setPhoto(null)}>
                      <Ionicons name="close-circle" size={32} color="#f43f5e" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <TouchableOpacity style={styles.uploadBtn} onPress={takePhoto}>
                      <Ionicons name="camera" size={28} color="#38bdf8" />
                      <Text style={styles.uploadBtnText}>CAMERA</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.uploadBtn, styles.uploadBtnSecondary]} onPress={choosePhoto}>
                      <Ionicons name="images" size={28} color="#94a3b8" />
                      <Text style={styles.uploadBtnText}>GALLERY</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>

            {/* 03 INCIDENT LOG */}
            <View style={styles.layer}>
              <View style={styles.layerLabelRow}>
                <Text style={styles.layerLabel}>03 INCIDENT LOG</Text>
                {errors.description && <Text style={styles.errorLabel}>{errors.description}</Text>}
              </View>
              <TextInput
                style={styles.input}
                placeholder="Describe hazard in detail..."
                placeholderTextColor="#475569"
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </View>

            {submitError ? (
              <View style={styles.submitErrorBox}>
                <Ionicons name="alert-circle" size={18} color="#f43f5e" />
                <Text style={styles.submitErrorText}>{submitError}</Text>
              </View>
            ) : null}

            {/* SPACER FOR THE STICKY BUTTON OVERLAY */}
            <View style={{ height: 120 }} />
          </View>
        </ScrollView>

        {/* STICKY SUBMIT BUTTON - Guaranteed to be visible above tab bar */}
        <View style={styles.stickyActionContainer}>
          <TouchableOpacity 
            style={[styles.submitButton, !canSubmit && styles.submitDisabled]} 
            onPress={handleSubmit} 
            disabled={!canSubmit || submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.submitRow}>
                <Text style={styles.submitText}>SUBMIT TELEMETRY REPORT</Text>
                <Ionicons name="shield-checkmark" size={20} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          {/* EXTRA SPACE FOR THE TAB BAR WHICH IS AT BOTTOM 20 + HEIGHT 70 */}
          <View style={{ height: 100 }} />
        </View>
      </SafeAreaView>
    </View>
  );
}

function DisruptionRow({ type, selected, onPress }: any) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value) }],
    borderColor: selected ? type.color : 'rgba(255,255,255,0.05)',
    backgroundColor: selected ? `${type.color}15` : 'rgba(15, 23, 42, 0.4)',
  }));

  return (
    <Animated.View style={[styles.rowCard, animatedStyle]}>
      <Pressable onPress={onPress} style={styles.rowPressable} onPressIn={() => scale.value = 0.98} onPressOut={() => scale.value = 1}>
        <View style={[styles.rowIconWrapper, { backgroundColor: `${type.color}20` }]}>
          <Ionicons name={type.icon} size={28} color={type.color} />
        </View>
        <View style={styles.rowContent}>
          <Text style={[styles.rowTitle, selected && { color: type.color }]}>{type.label}</Text>
          <Text style={styles.rowDesc}>{type.desc}</Text>
        </View>
        <View style={[styles.rowStatus, { borderColor: selected ? type.color : 'rgba(71, 85, 105, 0.3)' }]}>
          {selected ? <View style={[styles.rowStatusDot, { backgroundColor: type.color }]} /> : <Ionicons name="play-circle" size={18} color="#475569" />}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  scroll: { padding: 24, paddingBottom: 40 },
  header: { marginBottom: 32 },
  title: { fontSize: 32, fontWeight: '900', color: '#f8fafc', letterSpacing: -1 },
  subtitle: { fontSize: 13, color: '#64748b', fontWeight: '600', marginTop: 8 },
  layers: { gap: 32 },
  layer: { gap: 16 },
  layerLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  layerLabel: { fontSize: 10, fontWeight: '900', color: '#38bdf8', letterSpacing: 2 },
  errorLabel: { fontSize: 10, color: '#f43f5e', fontWeight: '800' },
  disruptionList: { gap: 12 },
  rowCard: { borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
  rowPressable: { padding: 18, flexDirection: 'row', alignItems: 'center', gap: 16 },
  rowIconWrapper: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  rowContent: { flex: 1, gap: 4 },
  rowTitle: { fontSize: 17, fontWeight: '800', color: '#f1f5f9' },
  rowDesc: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  rowStatus: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rowStatusDot: { width: 12, height: 12, borderRadius: 6 },
  photoUploadRow: { flexDirection: 'row', gap: 12 },
  uploadBtn: { flex: 1, height: 100, backgroundColor: 'rgba(56, 189, 248, 0.05)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.1)', alignItems: 'center', justifyContent: 'center', gap: 8 },
  uploadBtnSecondary: { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' },
  uploadBtnText: { fontSize: 10, fontWeight: '900', color: '#f8fafc', letterSpacing: 1 },
  photoPreviewWrapper: { flex: 1, borderRadius: 28, overflow: 'hidden', height: 220, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  photoPreview: { width: '100%', height: '100%' },
  photoReset: { position: 'absolute', top: 12, right: 12 },
  input: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: 20, color: '#f8fafc', fontSize: 15, fontWeight: '600', minHeight: 120 },
  submitErrorBox: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 14, borderRadius: 18, backgroundColor: 'rgba(244, 63, 94, 0.08)', borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.2)' },
  submitErrorText: { flex: 1, color: '#fecdd3', fontSize: 12, lineHeight: 18, fontWeight: '600' },
  stickyActionContainer: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    padding: 24, 
    backgroundColor: 'transparent',
    zIndex: 999 
  },
  submitButton: { 
    backgroundColor: '#38bdf8', 
    borderRadius: 28, 
    paddingVertical: 22, 
    alignItems: 'center', 
    shadowColor: '#38bdf8', 
    shadowOpacity: 0.4, 
    shadowRadius: 25,
    elevation: 20
  },
  submitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  submitDisabled: { opacity: 0.6, backgroundColor: '#1e293b' },
  successCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 40, padding: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', gap: 24 },
  successTitle: { fontSize: 28, fontWeight: '900', color: '#f8fafc' },
  badgeContainer: { paddingBottom: 8 },
  statusBadge: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 14, backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', fontSize: 12, fontWeight: '900' },
  successHint: { color: '#94a3b8', fontSize: 15, textAlign: 'center', lineHeight: 24 },
  resetButton: { width: '100%', backgroundColor: '#f8fafc', borderRadius: 24, paddingVertical: 18, alignItems: 'center' },
  resetButtonText: { color: '#020617', fontSize: 13, fontWeight: '900' },
});
