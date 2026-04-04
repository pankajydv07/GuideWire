import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';

import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';
import { useClientOnlyValue } from '../../components/useClientOnlyValue';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={22} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.dark.tint,
        tabBarInactiveTintColor: '#475569',
        headerShown: useClientOnlyValue(false, true),
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
        name="two"
        options={{
          title: 'Node',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
          headerTitle: 'Identity Node',
        }}
      />
    </Tabs>
  );
}
