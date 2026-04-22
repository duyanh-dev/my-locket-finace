import { Stack } from 'expo-router';
import { View } from 'react-native';

export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#000' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        <Stack.Screen 
          name="modal" 
          options={{ 
            // CHUYỂN THÀNH FULL SCREEN MODAL
            presentation: 'fullScreenModal', 
            headerShown: false,
            gestureEnabled: false, // Tắt hoàn toàn vuốt của hệ thống
          }} 
        />
      </Stack>
    </View>
  );
}