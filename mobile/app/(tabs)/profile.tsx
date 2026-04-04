import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, View, Text, Image, ActivityIndicator } from 'react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useAuth } from '../../contexts/AuthContext';
import { api, type RiskProfile } from '../../services/api';
import Colors from '../../constants/Colors';

export default function ProfileScreen() {
  const { rider, logout } = useAuth();
  const [riskProfile, setRiskProfile] = useState<RiskProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.riders.getRiskProfile()
      .then(setRiskProfile)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const menuItems = [
    { icon: 'shield-account', label: 'Security Protocol', sub: 'Biometric & Encrypted Keys' },
    { icon: 'map-marker-radius', label: 'Active Zones', sub: `${rider?.zone || 'Primary'} Perimeter` },
    { icon: 'bank-transfer', label: 'Payout Nodes', sub: `UPI: ${rider?.upi_id || 'Not Linked'}` },
    { icon: 'bell-ring', label: 'Signal Alerts', sub: 'Parametric Push Enabled' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
             <Image 
               source={{ uri: `https://api.dicebear.com/7.x/avataaars/svg?seed=${rider?.phone || 'default'}` }}
               style={styles.avatar}
             />
             <View style={styles.statusDot} />
          </View>
          <Text style={styles.name}>{rider?.name || 'Rider Node'}</Text>
          <Text style={styles.phone}>{rider?.phone || '+91 91234 56789'}</Text>
          
          <View style={styles.statsRow}>
             <View style={styles.statBox}>
                <Text style={styles.statVal}>{rider?.trust_score ?? 100}</Text>
                <Text style={styles.statLabel}>TRUST</Text>
             </View>
             <View style={styles.statDivider} />
             <View style={styles.statBox}>
                <Text style={styles.statVal}>{riskProfile?.composite_risk_score ?? '--'}</Text>
                <Text style={styles.statLabel}>RISK INDEX</Text>
             </View>
             <View style={styles.statDivider} />
             <View style={styles.statBox}>
                <Text style={styles.statVal}>₹{riskProfile?.four_week_earnings ? Object.values(riskProfile.four_week_earnings).reduce((a, b) => a + b, 0) : '0'}</Text>
                <Text style={styles.statLabel}>AVG YIELD</Text>
             </View>
          </View>
        </Animated.View>

        <View style={styles.riskGrid}>
           <Text style={styles.gridTitle}>ENVIRONMENTAL TELEMETRY</Text>
           <View style={styles.gridRow}>
              <View style={styles.gridItem}>
                 <Text style={styles.gridVal}>{riskProfile?.zone_flood_risk ?? '--'}%</Text>
                 <Text style={styles.gridLabel}>FLOOD RISK</Text>
              </View>
              <View style={styles.gridItem}>
                 <Text style={styles.gridVal}>{riskProfile?.zone_traffic_risk ?? '--'}%</Text>
                 <Text style={styles.gridLabel}>TRAFFIC INTENSITY</Text>
              </View>
           </View>
        </View>

        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <Animated.View 
              key={item.label} 
              entering={FadeInDown.delay(400 + index * 100).springify()}
            >
              <TouchableOpacity style={styles.menuItem}>
                <View style={styles.menuIconContainer}>
                   <MaterialCommunityIcons name={item.icon as any} size={22} color={Colors.dark.tint} />
                </View>
                <View style={styles.menuTextContainer}>
                   <Text style={styles.menuLabel}>{item.label}</Text>
                   <Text style={styles.menuSub}>{item.sub}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#334155" />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={FadeInDown.delay(900).springify()}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Terminate Session</Text>
          </TouchableOpacity>
          <Text style={styles.versionText}>System OS v2.4.0-STITCH</Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  scroll: { padding: 24, paddingBottom: 120 },
  profileHeader: { alignItems: 'center', marginBottom: 32, marginTop: 20 },
  avatarContainer: { width: 100, height: 100, borderRadius: 36, backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: 4, position: 'relative', marginBottom: 20 },
  avatar: { width: '100%', height: '100%', borderRadius: 32 },
  statusDot: { position: 'absolute', bottom: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: '#10b981', borderWidth: 4, borderColor: '#020617' },
  name: { fontSize: 24, fontWeight: '900', color: '#f8fafc', marginBottom: 4, letterSpacing: -0.5 },
  phone: { fontSize: 13, color: '#475569', fontWeight: '700', letterSpacing: 1 },
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, paddingVertical: 20, paddingHorizontal: 10, marginTop: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { color: '#f8fafc', fontSize: 18, fontWeight: '900' },
  statLabel: { color: '#475569', fontSize: 9, fontWeight: '800', marginTop: 4, letterSpacing: 1 },
  statDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.05)' },
  riskGrid: { backgroundColor: 'rgba(56, 189, 248, 0.02)', borderRadius: 24, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.05)' },
  gridTitle: { color: '#334155', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 16 },
  gridRow: { flexDirection: 'row', gap: 12 },
  gridItem: { flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  gridVal: { color: '#38bdf8', fontSize: 20, fontWeight: '900' },
  gridLabel: { color: '#475569', fontSize: 8, fontWeight: '800', marginTop: 4, letterSpacing: 0.5 },
  menuContainer: { gap: 12, marginBottom: 40 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  menuIconContainer: { width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(56, 189, 248, 0.05)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  menuTextContainer: { flex: 1 },
  menuLabel: { color: '#f8fafc', fontSize: 15, fontWeight: '800' },
  menuSub: { color: '#475569', fontSize: 11, fontWeight: '600', marginTop: 2 },
  logoutBtn: { backgroundColor: 'rgba(244, 63, 94, 0.05)', paddingVertical: 20, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.1)' },
  logoutText: { color: '#f43f5e', fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  versionText: { textAlign: 'center', color: '#1e293b', fontSize: 10, fontWeight: '800', marginTop: 24, letterSpacing: 1, textTransform: 'uppercase' },
});
