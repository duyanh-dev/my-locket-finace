import { Tabs } from 'expo-router';
import React from 'react';
import CustomTabBar from '@/src/components/navigation/CustomTabBar';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          height: 0,
          borderTopWidth: 0,
          elevation: 0,
        },
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="index" />
      <Tabs.Screen name="explore" /> 
    </Tabs>
  );
}

