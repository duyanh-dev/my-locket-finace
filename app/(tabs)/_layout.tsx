import { Tabs } from 'expo-router';
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

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
      {/* LƯU Ý: Tên 'name' ở đây PHẢI khớp 100% với tên file .tsx trong thư mục (tabs) 
         Nếu file của ông là settings.tsx thì đổi 'explore' thành 'settings'
      */}
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="index" />
      <Tabs.Screen name="explore" /> 
    </Tabs>
  );
}

function CustomTabBar({ state, navigation }: any) {
  return (
    <View style={styles.container} pointerEvents="box-none">
      <BlurView intensity={80} tint="dark" style={styles.pill}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;

          const onPress = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // --- LOGIC GÁN ICON CHUẨN ---
          let iconName: any;
          
          if (route.name === 'index') {
            iconName = isFocused ? 'home-sharp' : 'home-outline';
          } else if (route.name === 'calendar') {
            iconName = isFocused ? 'calendar-sharp' : 'calendar-outline';
          } else if (route.name === 'explore' || route.name === 'settings') {
            // Dùng logic này để dù file tên là 'explore' hay 'settings' thì vẫn hiện bánh răng
            iconName = isFocused ? 'settings-sharp' : 'settings-outline';
          } else {
            // Nếu lòi ra file lạ, ta vẫn để icon mặc định để ông biết đường sửa
            iconName = isFocused ? 'ellipsis-horizontal-sharp' : 'ellipsis-horizontal-outline';
          }

          return (
            <TouchableOpacity key={route.key} onPress={onPress} style={styles.tabItem}>
              <View style={[styles.iconWrapper, isFocused && styles.activeCircle]}>
                <Ionicons
                  name={iconName}
                  size={isFocused ? 24 : 20}
                  color={isFocused ? "#FFD700" : "#888"}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 35,
    backgroundColor: 'rgba(25, 25, 27, 0.8)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  tabItem: {
    width: 65,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  activeCircle: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  }
});