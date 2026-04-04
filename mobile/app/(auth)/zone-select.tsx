import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInUp, FadeInDown, Layout } from 'react-native-reanimated';

import { api, type Zone } from '../../services/api';
import Colors from '../../constants/Colors';

export default function ZoneSelectScreen() {
  const params = useLocalSearchParams();
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);

  useEffect(() => {
    api.zones.list()
      .then(data => {
         setZones(data.zones || []);
         if (data.zones && data.zones.length > 0) {
            const firstCity = data.zones[0].city;
            setSelectedCity(firstCity);
         }
      })
      .catch(err => {
        setError('Synchronizing regional data failed.');
      })
      .finally(() => setLoading(false));
  }, []);

  const cities = useMemo(() => {
    const unique = new Set(zones.map(z => z.city));
    return Array.from(unique);
  }, [zones]);

  const filteredZones = useMemo(() => {
    return zones.filter(z => z.city === selectedCity);
  }, [zones, selectedCity]);

  const handleNext = () => {
    router.push({
      pathname: '/(auth)/slot-select',
      params: {
        ...params,
        city: selectedZone?.city ?? selectedCity,
        zone: selectedZone?.name,
        zoneId: selectedZone?.id
      }
    });
  };

  const getRiskStatus = (score: number) => {
    if (score < 40) return { color: '#10b981', label: 'OPTIMAL', bg: 'rgba(16, 185, 129, 0.1)' };
    if (score <= 70) return { color: '#f59e0b', label: 'MODERATE', bg: 'rgba(245, 158, 11, 0.1)' };
    return { color: '#f43f5e', label: 'CRITICAL', bg: 'rgba(244, 63, 94, 0.1)' };
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.dark.tint} />
        <Text style={styles.loadingText}>Calibrating perimeters...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.header}>
           <Text style={styles.title}>Selection Zone</Text>
           <Text style={styles.subtitle}>Define your operational radius to initiate protection protocols.</Text>
        </Animated.View>

        <View style={styles.tabContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {cities.map(city => (
              <TouchableOpacity
                key={city}
                style={[styles.cityTab, selectedCity === city && styles.cityTabActive]}
                onPress={() => { setSelectedCity(city); setSelectedZone(null); }}
              >
                <Text style={[styles.cityTabText, selectedCity === city && styles.cityTabTextActive]}>{city.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {filteredZones.map((zone, index) => {
            const risk = getRiskStatus(zone.risk_score || 0);
            const isSelected = selectedZone?.id === zone.id;

            return (
              <Animated.View 
                key={zone.id} 
                entering={FadeInDown.delay(400 + index * 50).springify()}
                layout={Layout.springify()}
              >
                <TouchableOpacity
                  style={[styles.card, isSelected && styles.cardActive]}
                  onPress={() => setSelectedZone(zone)}
                  activeOpacity={0.8}
                >
                  <View style={styles.zoneInfo}>
                    <Text style={[styles.zoneName, isSelected && { color: Colors.dark.tint }]}>{zone.name}</Text>
                    <Text style={styles.zoneCity}>{zone.city.toUpperCase()}</Text>
                  </View>
                  <View style={[styles.riskBadge, { backgroundColor: risk.bg }]}>
                    <Text style={[styles.riskText, { color: risk.color }]}>{risk.label}</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
           <TouchableOpacity 
            style={[styles.button, !selectedZone && styles.buttonDisabled]} 
             onPress={handleNext}
             disabled={!selectedZone}
           >
             <Text style={styles.buttonText}>ESTABLISH NODE →</Text>
           </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { padding: 32, paddingBottom: 16 },
  title: { fontSize: 32, fontWeight: '900', color: '#f8fafc', letterSpacing: -1 },
  subtitle: { fontSize: 15, color: '#475569', lineHeight: 22, fontWeight: '600', marginTop: 8 },
  loadingText: { color: '#475569', fontSize: 12, fontWeight: '800', marginTop: 16, letterSpacing: 1 },
  tabContainer: { paddingHorizontal: 32, marginBottom: 24 },
  cityTab: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cityTabActive: { backgroundColor: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.3)' },
  cityTabText: { color: '#475569', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  cityTabTextActive: { color: '#f8fafc' },
  list: { paddingHorizontal: 32, gap: 12, paddingBottom: 120 },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cardActive: { borderColor: Colors.dark.tint, backgroundColor: 'rgba(56, 189, 248, 0.05)' },
  zoneInfo: { flex: 1 },
  zoneName: { fontSize: 18, fontWeight: '900', color: '#f8fafc', marginBottom: 4 },
  zoneCity: { fontSize: 10, color: '#475569', fontWeight: '800', letterSpacing: 1 },
  riskBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  riskText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 32, paddingBottom: 40, backgroundColor: 'rgba(2, 6, 23, 0.9)' },
  button: { backgroundColor: Colors.dark.tint, paddingVertical: 22, borderRadius: 24, alignItems: 'center', shadowColor: Colors.dark.tint, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  buttonDisabled: { opacity: 0.2, shadowOpacity: 0 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 1 }
});
