import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  zoomLabel: string;
  onZoomToggle: () => void;
  onFlip: () => void;
  onCapture: () => void;
}

export default function CameraControls({ zoomLabel, onZoomToggle, onFlip, onCapture }: Props) {
  return (
    <View style={styles.bottomArea} pointerEvents="box-none">
      <TouchableOpacity style={styles.mainZoomCircle} onPress={onZoomToggle}>
        <Text style={styles.mainZoomText}>{zoomLabel.replace('x', '') === '0.5' ? '.5x' : zoomLabel.replace('.0', '')}</Text>
      </TouchableOpacity>
      <View style={styles.shutterRow} pointerEvents="box-none">
        <TouchableOpacity style={styles.flipBtn} onPress={onFlip}>
          <Ionicons name="camera-reverse-outline" size={32} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.shutter} onPress={onCapture}>
          <View style={styles.shutterIn} />
        </TouchableOpacity>
        <View style={{ width: 50 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomArea: { width: "100%", alignItems: "center", marginBottom: 20 },
  mainZoomCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", marginBottom: 25 },
  mainZoomText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  shutterRow: { flexDirection: "row", width: "100%", justifyContent: "space-evenly", alignItems: "center" },
  flipBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: "rgba(255,255,255,0.1)", justifyContent: "center", alignItems: "center" },
  shutter: { width: 80, height: 80, borderRadius: 40, borderWidth: 5, borderColor: "#fff", justifyContent: "center", alignItems: "center" },
  shutterIn: { width: 62, height: 62, borderRadius: 31, backgroundColor: "#fff" }
});