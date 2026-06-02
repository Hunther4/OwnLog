import React, { useCallback } from 'react';
import { View } from 'react-native';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useBoundStore } from '../../src/store/useBoundStore';
import { getPalette } from '../../src/theme/theme';
import FloatingDock from '../../src/components/FloatingDock';

export default function TabsLayout() {
  const { themeMode } = useBoundStore();
  const palette = getPalette(themeMode || 'light');
  const router = useRouter();
  const segments = useSegments();

  // Current route para highlight
  const currentRoute = segments.includes('transactions')
    ? '/transactions'
    : segments.includes('budgets')
      ? '/budgets'
      : segments.includes('categories')
        ? '/categories'
        : segments.includes('reports')
          ? '/reports'
          : segments.includes('settings')
            ? '/settings'
            : segments.includes('calc')
              ? '/calc'
              : '/';

  const handleNavigate = useCallback((route: string) => router.push(route), [router]);

  // Hide FloatingDock on calc screen to give more space
  const showDock = !segments.includes('calc');

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: 'none' },
            tabBarActiveTintColor: palette.primary,
            tabBarInactiveTintColor: palette.textSecondary,
          }}
        >
          <Tabs.Screen name="index" />
          <Tabs.Screen name="transactions" />
          <Tabs.Screen name="budgets" />
          <Tabs.Screen name="categories" />
          <Tabs.Screen name="reports" />
          <Tabs.Screen name="settings" />
          <Tabs.Screen name="calc" />
        </Tabs>
        {showDock && <FloatingDock onNavigate={handleNavigate} currentRoute={currentRoute} />}
      </View>
    </GestureHandlerRootView>
  );
}
