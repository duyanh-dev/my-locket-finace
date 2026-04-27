// src/components/features/camera/CameraViewfinder.tsx

import React, { forwardRef } from "react";
import { StyleSheet, View, Animated } from "react-native";
import { CameraView } from "expo-camera";

interface Props {
  facing: "back" | "front";
  zoom: number;
  focusPos: { x: number; y: number };
  focusAlpha: Animated.Value;
  onGrant: (e: any) => void;
  onMove: (e: any) => void;
  onRelease: () => void;
}

const CameraViewfinder = forwardRef<any, Props>((props, ref) => {
  const { facing, zoom, focusPos, focusAlpha, onGrant, onMove, onRelease } = props;

  return (
    <View
      style={{ flex: 1 }}
      onStartShouldSetResponder={() => true}
      onResponderGrant={onGrant}
      onResponderMove={onMove}
      onResponderRelease={onRelease}
    >
      <CameraView style={StyleSheet.absoluteFill} ref={ref} facing={facing} zoom={zoom} autofocus="on" />
      <Animated.View
        style={[
          styles.focusRing,
          {
            left: focusPos.x - 35,
            top: focusPos.y - 35,
            opacity: focusAlpha,
            transform: [{ scale: focusAlpha.interpolate({ inputRange: [0, 1], outputRange: [1.4, 1] }) }],
          },
        ]}
      />
    </View>
  );
});

// --- THÊM DÒNG NÀY ĐỂ FIX LỖI DISPLAY NAME ---
CameraViewfinder.displayName = 'CameraViewfinder';

const styles = StyleSheet.create({
  focusRing: { position: "absolute", width: 70, height: 70, borderRadius: 35, borderWidth: 1.2, borderColor: "#FFD700", zIndex: 99 }
});

export default CameraViewfinder;