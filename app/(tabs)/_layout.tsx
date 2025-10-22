// con comentarios
import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].primary,
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
        tabBarStyle: {
          backgroundColor: Colors[colorScheme ?? 'light'].background,
          borderTopColor: Colors[colorScheme ?? 'light'].primary,
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="qrcode" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Comentarios',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="bubble.left.and.bubble.right" color={color} />,
        }}
      />
    </Tabs>
  );
}

// sin comentarios 
// import { Slot } from 'expo-router';
// import React from 'react';

// // ...existing code...
// export default function TabLayout() {
//   return <Slot />;
// }
// // ...existing code...
