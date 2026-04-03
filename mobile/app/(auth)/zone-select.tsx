import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '../../services/api';

export default function ZoneSelectScreen() {
  const params = useLocalSearchParams();
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<any>(null);

  useEffect(() => {
    api.zones.list()
      .then(data => {
         setZones(data.zones || []);
         if (data.zones && data.zones.length > 0) {
            const firstCity = data.zones[0].city;
            setSelectedCity(firstCity);
         }
      })
      .catch(err => console.error("Failed to load zones", err))
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
      params: { ...params, zone: selectedZone?.name, zoneId: selectedZone?.zone_id }
    });
  };

  const getRiskColor = (score: number) => {
    if (score < 40) return { color: '#22c55e', label: '🟢 Low Risk', bg: '#14532d' };
    if (score <= 70) return { color: '#eab308', label: '🟡 Medium Risk', bg: '#713f12' };
    return { color: '#ef4444', label: '🔴 High Risk', bg: '#7f1d1d' };
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={{color: '#94a3b8', marginTop: 12}}>Loading delivery zones...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Select Your Zone</Text>

      {/* City Filters */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
           {cities.map(city => (
             <TouchableOpacity 
               key={city} 
               style={[styles.cityTab, selectedCity === city && styles.cityTabActive]}
               onPress={() => { setSelectedCity(city); setSelectedZone(null); }}
             >
               <Text style={[styles.cityTabText, selectedCity === city && styles.cityTabTextActive]}>{city}</Text>
             </TouchableOpacity>
           ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
         {filteredZones.map((zone) => {
           const risk = getRiskColor(zone.risk_score || 0);
           const isSelected = selectedZone?.zone_id === zone.zone_id;
           
           return (
             <TouchableOpacity 
               key={zone.zone_id} 
               style={[styles.card, isSelected && styles.cardActive]}
               onPress={() => setSelectedZone(zone)}
             >
               <View>
                 <Text style={[styles.zoneName, isSelected && { color: '#38bdf8' }]}>{zone.name}</Text>
                 <Text style={styles.zoneCity}>{zone.city}</Text>
               </View>
               <View style={[styles.riskBadge, { backgroundColor: risk.bg }]}>
                 <Text style={[styles.riskText, { color: risk.color }]}>{risk.label} ({zone.risk_score})</Text>
               </View>
             </TouchableOpacity>
           )
         })}
      </ScrollView>

      <View style={styles.footer}>
         <TouchableOpacity 
           style={[styles.button, !selectedZone && styles.buttonDisabled]} 
           onPress={handleNext}
           disabled={!selectedZone}
         >
           <Text style={styles.buttonText}>Continue →</Text>
         </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#f8fafc', margin: 20, marginBottom: 12 },
  tabContainer: { paddingHorizontal: 20, marginBottom: 16 },
  cityTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  cityTabActive: { backgroundColor: '#1e3a8a', borderColor: '#3b82f6' },
  cityTabText: { color: '#94a3b8', fontWeight: '600' },
  cityTabTextActive: { color: '#fff' },
  list: { paddingHorizontal: 20, gap: 12, paddingBottom: 100 },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#334155' },
  cardActive: { borderColor: '#38bdf8', backgroundColor: '#0f172a' },
  zoneName: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc', marginBottom: 4 },
  zoneCity: { fontSize: 13, color: '#94a3b8' },
  riskBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  riskText: { fontSize: 11, fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#0f172a', borderTopWidth: 1, borderTopColor: '#1e293b' },
  button: { backgroundColor: '#2563eb', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
