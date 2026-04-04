import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';

import Colors from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';
import { useClientOnlyValue } from '../../components/useClientOnlyValue';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={22} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const { isAuthenticated, isReady } = useAuth();
  const headerShown = useClientOnlyValue(false, true);

  if (!isReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#020617' }}>
        <ActivityIndicator color={Colors.dark.tint} size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.dark.tint,
        tabBarInactiveTintColor: '#475569',
        headerShown: headerShown,
        headerStyle: { backgroundColor: Colors.dark.background },
        headerTitleStyle: { fontWeight: '900', color: Colors.dark.text, fontSize: 24, letterSpacing: -0.5 },
        headerShadowVisible: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          elevation: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          borderRadius: 24,
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: 'rgba(56, 189, 248, 0.1)',
        },
        tabBarBackground: () => (
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Guardian',
          tabBarIcon: ({ color }) => <TabBarIcon name="shield" color={color} />,
          headerTitle: 'RIDER🛡️SHIELD',
        }}
      />
      <Tabs.Screen
        name="claims"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <TabBarIcon name="history" color={color} />,
          headerTitle: 'Claim Archive',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Node',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
          headerTitle: 'Identity Node',
        }}
      />
      <Tabs.Screen
        name="manual-claim"
        options={{
          title: 'Report',
          tabBarIcon: ({ color }) => <TabBarIcon name="warning" color={color} />,
          headerTitle: 'Incident Telemetry',
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Assets',
          tabBarIcon: ({ color }) => <TabBarIcon name="cubes" color={color} />,
          headerTitle: 'Digital Assets',
        }}
      />
    </Tabs>
  );
}
