import React, { useState, useRef, useEffect, useCallback } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Animated, Platform, Keyboard, Alert } from "react-native";
import { useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// SERVICES
import { addExpense, updateExpense, getAllTags, saveTag } from "../components/services/database";
import { getCurrencyConfig, convertCurrency } from "../components/services/settings_db";
import { Currency } from "../types";

// COMPONENTS TÁCH LẺ
import CameraViewfinder from "../components/features/camera/CameraViewfinder";
import CameraControls from "../components/features/camera/CameraControls";
import ExpenseForm from "../components/features/camera/ExpenseForm";
import TagPickerModal from "../components/features/camera/TagPickerModal";

const ZOOM_LEVELS = [0.5, 1, 2, 3];
const ZOOM_1X = 0.035;

export default function CameraModalScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [permission, requestPermission] = useCameraPermissions();

  // STATES
  const isFromExplore = !!params.tag;
  const editId = params.editId ? String(params.editId) : null;
  const [photo, setPhoto] = useState<string | null>(params.oldImage ? String(params.oldImage) : null);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>({ label: "", code: (params.oldCurrency as string) || "VNĐ", symbol: params.oldCurrency === "VNĐ" ? "đ" : "$", rate: 1 });
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [zoom, setZoom] = useState(ZOOM_1X);
  const [focusPos, setFocusPos] = useState({ x: 0, y: 0 });
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>(params.tag ? String(params.tag) : (params.oldTag ? String(params.oldTag) : ""));
  const [showTagPicker, setShowTagPicker] = useState(false);

  // REFS
  const cameraRef = useRef<any>(null);
  const zoomRef = useRef(ZOOM_1X);
  const zoomIdx = useRef(1);
  const animationFrameId = useRef<number | null>(null);
  const focusAlpha = useRef(new Animated.Value(0)).current;
  const focusTimeout = useRef<any>(null);
  const isPinching = useRef(false);
  const startDist = useRef<number | null>(null);
  const startZoom = useRef<number>(ZOOM_1X);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    const initConfig = async () => {
      const config = await getCurrencyConfig();
      setCurrency(config);
      setAvailableTags(getAllTags());

      if (editId && params.oldAmount && params.oldCurrency) {
        const isSameCurrency = params.oldCurrency === config.code;
        let displayValue = "";

        if (isSameCurrency) {
          // --- LOGIC CŨ ĐÃ ĐÚNG: Nếu cùng loại tiền, lấy thẳng giá trị gốc ---
          displayValue = String(params.oldAmount).replace('.', ',');
        } else {
          // --- LOGIC CŨ ĐÃ ĐÚNG: Chốt chặn sai số làm tròn khi đổi tiền tệ ---
          const converted = convertCurrency(
            Number(params.oldAmount),
            String(params.oldCurrency),
            config.code
          );

          if (config.code === 'VNĐ') {
            displayValue = Math.round(converted).toString();
          } else {
            // Dùng toFixed(2) để triệt tiêu số lẻ rác (ví dụ 121.121121121)
            displayValue = converted.toFixed(2).replace('.', ',');
            if (displayValue.endsWith(',00')) displayValue = displayValue.split(',')[0];
          }
        }
        // Đẩy vào hàm format để thêm dấu chấm hàng nghìn
        setAmount(formatCurrency(displayValue, config.code));
      }
    };
    initConfig();

    return () => { 
      showSub.remove(); 
      hideSub.remove(); 
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current); 
    };
  }, [editId]);

  // LOGIC FORMAT TIỀN TỆ (Giữ nguyên bản chuẩn nhất)
  const formatCurrency = (val: string, forcedCode?: string) => {
    if (!val) return "";
    const activeCode = forcedCode || currency.code;
    let cleanNext = val.replace(/\./g, ""); // Xóa phân cách hàng nghìn cũ
    if (activeCode === "VNĐ") cleanNext = cleanNext.replace(/,/g, "");
    cleanNext = cleanNext.replace(/[^0-9,]/g, "");
    
    const parts = cleanNext.split(",");
    let integerPart = parts[0];
    let decimalPart = parts[1] !== undefined ? parts[1].substring(0, 2) : null;

    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    if (decimalPart !== null) return `${formattedInteger},${decimalPart}`;
    if (cleanNext.includes(",")) return `${formattedInteger},`;
    return formattedInteger;
  };

  const smoothZoomTo = useCallback((target: number) => {
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    const animate = () => {
      const diff = target - zoomRef.current;
      if (Math.abs(diff) < 0.001) { zoomRef.current = target; setZoom(target); return; }
      const nextZoom = zoomRef.current + diff * 0.15;
      zoomRef.current = nextZoom;
      setZoom(nextZoom);
      animationFrameId.current = requestAnimationFrame(animate);
    };
    animationFrameId.current = requestAnimationFrame(animate);
  }, []);

  const toggleNextZoom = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    zoomIdx.current = (zoomIdx.current + 1) % ZOOM_LEVELS.length;
    const nextVal = ZOOM_LEVELS[zoomIdx.current];
    smoothZoomTo(Math.min(1, nextVal === 0.5 ? 0 : ZOOM_1X * nextVal));
  };

  const onGrant = (e: any) => {
    const touches = e.nativeEvent.touches;
    isPinching.current = touches.length > 1;

    if (!isPinching.current) {
      const { pageX, pageY } = e.nativeEvent;
      
      // Xóa timeout cũ nếu có
      if (focusTimeout.current) clearTimeout(focusTimeout.current);

      // Delay 150ms để phân biệt giữa Tap và Pinch/Swipe
      focusTimeout.current = setTimeout(() => {
        setFocusPos({ x: pageX, y: pageY - insets.top - 50 });
        focusAlpha.setValue(0);
        
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Animation vòng focus: Hiện lên -> Đợi -> Biến mất
        Animated.sequence([
          Animated.timing(focusAlpha, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(focusAlpha, {
            toValue: 0,
            duration: 200,
            delay: 500,
            useNativeDriver: true,
          }),
        ]).start();
      }, 150);
    }
  };

  const onMove = (e: any) => {
    const touches = e.nativeEvent.touches;
    
    if (touches.length === 2) {
      isPinching.current = true;
      
      // QUAN TRỌNG: Nếu đang pinch thì hủy ngay lập tức vòng focus
      if (focusTimeout.current) {
        clearTimeout(focusTimeout.current);
        focusTimeout.current = null;
      }
      focusAlpha.setValue(0); // Ẩn vòng focus ngay khi bắt đầu zoom

      const dist = Math.hypot(
        touches[0].pageX - touches[1].pageX,
        touches[0].pageY - touches[1].pageY,
      );

      if (startDist.current === null) {
        startDist.current = dist;
        startZoom.current = zoomRef.current;
      } else {
        const delta = (dist - startDist.current) / 400;
        const nextZoom = Math.max(0, Math.min(1, startZoom.current + delta));
        zoomRef.current = nextZoom;
        setZoom(nextZoom);
      }
    }
  };

  const handleCapture = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const res = await cameraRef.current.takePictureAsync({ quality: 0.8 });
    setPhoto(res.uri);
  };

  const handleSaveToGallery = async () => {
    if (!photo) return;
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === 'granted') {
      try {
        await MediaLibrary.saveToLibraryAsync(photo);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Thành công", "Đã lưu ảnh!");
      } catch (e) { Alert.alert("Lỗi", "Không thể lưu ảnh!"); }
    }
  };

  const handleFinalSave = () => {
    if (!amount) return Alert.alert("Thiếu tiền!", "Ông chưa nhập số tiền.");
    const normalized = amount.replace(/\./g, "").replace(",", ".");
    const numAmount = parseFloat(normalized);
    const baseAmount = numAmount * (currency.rate || 1);
    if (editId && editId !== "undefined") {
      updateExpense(Number(editId), normalized, currency.code, baseAmount, photo!, selectedTag);
    } else {
      addExpense(normalized, currency.code, baseAmount, photo!, selectedTag);
    }
    router.back();
  };

  if (!permission?.granted) {
    return (
      <View style={styles.center}><TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}><Text style={styles.yellowText}>MỞ CAMERA</Text></TouchableOpacity></View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={[styles.headerArea, isKeyboardVisible && { height: 35 }]}>
        <View style={styles.pill} />
        <TouchableOpacity style={styles.closeIcon} onPress={() => router.back()}><Ionicons name="close-circle" size={32} color="#333" /></TouchableOpacity>
      </View>

      {!photo ? (
  <View style={{ flex: 1 }}>
    <CameraViewfinder 
      ref={cameraRef} 
      facing={facing} 
      zoom={zoom} 
      focusPos={focusPos} 
      focusAlpha={focusAlpha} 
      onGrant={onGrant} 
      onMove={onMove} 
      onRelease={() => { startDist.current = null; isPinching.current = false; }} 
    />
    <View style={styles.uiOverlay} pointerEvents="box-none">
      {/* ZOOM BADGE: Đã trả lại logic cũ */}
      <View style={styles.zoomBadge}>
        <Text style={styles.zoomText}>
          {zoom < 0.01 ? "0.5x" : (zoom / ZOOM_1X).toFixed(1) + "x"}
        </Text>
      </View>

      <CameraControls 
          // ZOOM LABEL TRÊN NÚT BẤM: Trả lại logic hiển thị .5x hoặc số nguyên
          zoomLabel={zoom < 0.01 ? ".5x" : (zoom / ZOOM_1X).toFixed(0) + "x"} 
          onZoomToggle={toggleNextZoom} 
          onFlip={() => { 
            setFacing(f => f === "back" ? "front" : "back"); 
            zoomRef.current = ZOOM_1X; 
            setZoom(ZOOM_1X); 
          }} 
          onCapture={handleCapture} 
      />
    </View>
  </View>
      ) : (
        <ExpenseForm 
            photo={photo} 
            amount={amount} 
            currencyCode={currency.code} 
            selectedTag={selectedTag} 
            isFromExplore={isFromExplore} 
            isKeyboardVisible={isKeyboardVisible} 
            isEditMode={!!editId}
            onRetake={() => setPhoto(null)} 
            onSaveToGallery={handleSaveToGallery} 
            onAmountChange={(text) => setAmount(formatCurrency(text))} 
            onOpenTagPicker={() => setShowTagPicker(true)} 
            onRemoveTag={() => setSelectedTag("")} 
            onFinalSave={handleFinalSave} 
        />
      )}

      <TagPickerModal 
          visible={showTagPicker} 
          onClose={() => setShowTagPicker(false)} 
          tags={availableTags} 
          selectedTag={selectedTag} 
          onSelect={setSelectedTag} 
          onCreateQuickTag={(name) => { saveTag(name, "cart", "#FFD700", ""); setSelectedTag(name); setAvailableTags(getAllTags()); }} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerArea: { height: 50, alignItems: "center", justifyContent: "center", zIndex: 100 },
  pill: { width: 40, height: 4, backgroundColor: "#1a1a1a", borderRadius: 2 },
  closeIcon: { position: "absolute", right: 20 },
  uiOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "space-between", paddingVertical: 20, alignItems: "center" },
  zoomBadge: { backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 10 },
  zoomText: { color: "#FFD700", fontSize: 11, fontWeight: "bold" },
  yellowText: { color: "#FFD700", fontWeight: "bold" },
  permissionBtn: { padding: 20, borderWidth: 1, borderColor: "#FFD700", borderRadius: 15 }
});