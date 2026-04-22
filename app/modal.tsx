import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  Image, KeyboardAvoidingView, TouchableWithoutFeedback,
  Keyboard, Dimensions, Animated, Platform, Alert
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { addExpense, updateExpense } from '../database';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCurrencyConfig, Currency } from '../settings_db';

const { width } = Dimensions.get('window');
const ZOOM_LEVELS = [0.5, 1, 2, 3];
const ZOOM_1X = 0.035;

export default function CameraModal() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [permission, requestPermission] = useCameraPermissions();
  const [currency, setCurrency] = useState<Currency>({ label: '', code: 'VNĐ', symbol: 'đ' });

  // --- STATE ---
  const editId = params.editId ? String(params.editId) : null;
  const [photo, setPhoto] = useState<string | null>(params.oldImage ? String(params.oldImage) : null);

  // Format ban đầu nếu edit
  const initialAmount = params.oldAmount ? String(params.oldAmount).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
  const [amount, setAmount] = useState(initialAmount);

  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [zoom, setZoom] = useState(ZOOM_1X);
  const [focusPos, setFocusPos] = useState({ x: 0, y: 0 });
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  // --- REFS ---
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
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    const load = async () => {
      const config = await getCurrencyConfig();
      setCurrency(config);
    };
    load();
    return () => {
      showSub.remove();
      hideSub.remove();
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (focusTimeout.current) clearTimeout(focusTimeout.current);
    };
  }, []);

  const formatCurrency = (val: string) => {
    const cleanNumber = val.replace(/\D/g, '');
    return cleanNumber.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleSaveToGallery = async () => {
    if (!photo) return;
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === 'granted') {
      try {
        await MediaLibrary.saveToLibraryAsync(photo);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Thành công", "Đã lưu ảnh vào thư viện!");
      } catch (e) {
        Alert.alert("Lỗi", "Không thể lưu ảnh!");
      }
    }
  };

  const smoothZoomTo = useCallback((target: number) => {
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    const animate = () => {
      const diff = target - zoomRef.current;
      if (Math.abs(diff) < 0.001) {
        zoomRef.current = target;
        setZoom(target);
        return;
      }
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
    const target = nextVal === 0.5 ? 0 : ZOOM_1X * nextVal;
    smoothZoomTo(Math.min(1, target));
  };

  const onGrant = (e: any) => {
    const touches = e.nativeEvent.touches;
    isPinching.current = touches.length > 1;
    if (!isPinching.current) {
      const { pageX, pageY } = e.nativeEvent;
      if (focusTimeout.current) clearTimeout(focusTimeout.current);
      focusTimeout.current = setTimeout(() => {
        setFocusPos({ x: pageX, y: pageY - insets.top - 50 });
        focusAlpha.setValue(0);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.sequence([
          Animated.timing(focusAlpha, { toValue: 1, duration: 150, useNativeDriver: true }),
          Animated.timing(focusAlpha, { toValue: 0, duration: 200, delay: 500, useNativeDriver: true })
        ]).start();
      }, 150);
    }
  };

  const onMove = (e: any) => {
    const touches = e.nativeEvent.touches;
    if (touches.length === 2) {
      isPinching.current = true;
      if (focusTimeout.current) { clearTimeout(focusTimeout.current); focusTimeout.current = null; }
      focusAlpha.setValue(0);
      const dist = Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
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

  const handleFinalSave = () => {
    if (!amount) return Alert.alert("Thiếu tiền!", "Ông chưa nhập số tiền chi tiêu.");
    const rawAmount = amount.replace(/\./g, '');
    if (editId && editId !== "undefined") {
      updateExpense(Number(editId), rawAmount, photo!);
    } else {
      addExpense(rawAmount, photo!);
    }
    router.back();
  };

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.yellowText}>MỞ CAMERA</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* HEADER */}
      <View style={[styles.headerArea, isKeyboardVisible && { height: 35 }]}>
        <View style={styles.pill} />
        <TouchableOpacity style={styles.closeIcon} onPress={() => router.back()}>
          <Ionicons name="close-circle" size={32} color="#333" />
        </TouchableOpacity>
      </View>

      {!photo ? (
        <View
          style={styles.flexOne}
          onStartShouldSetResponder={() => true}
          onResponderGrant={onGrant}
          onResponderMove={onMove}
          onResponderRelease={() => { startDist.current = null; isPinching.current = false; }}
        >
          <CameraView style={StyleSheet.absoluteFill} ref={cameraRef} facing={facing} zoom={zoom} autofocus="on" />
          <Animated.View style={[styles.focusRing, { left: focusPos.x - 35, top: focusPos.y - 35, opacity: focusAlpha, transform: [{ scale: focusAlpha.interpolate({ inputRange: [0, 1], outputRange: [1.4, 1] }) }] }]} />
          <View style={styles.uiOverlay} pointerEvents="box-none">
            <View style={styles.zoomBadge}><Text style={styles.zoomText}>{zoom < 0.01 ? '0.5x' : (zoom / ZOOM_1X).toFixed(1) + 'x'}</Text></View>
            <View style={styles.bottomArea} pointerEvents="box-none">
              <TouchableOpacity style={styles.mainZoomCircle} onPress={toggleNextZoom}>
                <Text style={styles.mainZoomText}>{zoom < 0.01 ? '.5x' : (zoom / ZOOM_1X).toFixed(0) + 'x'}</Text>
              </TouchableOpacity>
              <View style={styles.shutterRow} pointerEvents="box-none">
                <TouchableOpacity style={styles.flipBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setFacing(f => f === 'back' ? 'front' : 'back'); zoomRef.current = ZOOM_1X; setZoom(ZOOM_1X); }}><Ionicons name="camera-reverse-outline" size={32} color="#fff" /></TouchableOpacity>
                <TouchableOpacity style={styles.shutter} onPress={async () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); const res = await cameraRef.current.takePictureAsync({ quality: 0.8 }); setPhoto(res.uri); }}><View style={styles.shutterIn} /></TouchableOpacity>
                <View style={{ width: 50 }} />
              </View>
            </View>
          </View>
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flexOne}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.previewContainer}>
              <View style={[styles.imageWrapper, isKeyboardVisible && styles.imageWrapperKeyboard]}>
                <Image source={{ uri: photo }} style={styles.mainImg} />
                <View style={styles.imageFloatingToolbar}>
                  <TouchableOpacity style={styles.floatingPill} onPress={() => setPhoto(null)}>
                    <Ionicons name="refresh" size={16} color="#000" />
                    <Text style={styles.floatingPillText}>CHỤP LẠI</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.floatingPill} onPress={handleSaveToGallery}>
                    <Ionicons name="download-outline" size={16} color="#000" />
                    <Text style={styles.floatingPillText}>LƯU ẢNH</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.actionArea, isKeyboardVisible && styles.actionAreaKeyboard]}>
                <View style={styles.amountContainer}>
                  <Text style={styles.currencySymbol}>{currency.code}</Text>
                  <TextInput
                    style={styles.moneyInput} // ĐỒNG NHẤT STYLE
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={(text) => setAmount(formatCurrency(text))}
                    placeholder="0"
                    placeholderTextColor="#222"
                    autoFocus={true}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.saveBtn, !amount ? styles.saveBtnDisabled : null]}
                  onPress={handleFinalSave}
                >
                  <Text style={styles.saveBtnText}>{editId ? "CẬP NHẬT CHI TIÊU" : "LƯU CHI TIÊU"}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#000" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  flexOne: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerArea: { height: 50, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  pill: { width: 40, height: 4, backgroundColor: '#1a1a1a', borderRadius: 2 },
  closeIcon: { position: 'absolute', right: 20 },
  focusRing: { position: 'absolute', width: 70, height: 70, borderRadius: 35, borderWidth: 1.2, borderColor: '#FFD700', zIndex: 99 },

  // CAMERA UI
  uiOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', paddingVertical: 20, alignItems: 'center' },
  zoomBadge: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 10 },
  zoomText: { color: '#FFD700', fontSize: 11, fontWeight: 'bold' },
  bottomArea: { width: '100%', alignItems: 'center', marginBottom: 20 },
  mainZoomCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  mainZoomText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  shutterRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-evenly', alignItems: 'center' },
  flipBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  shutter: { width: 80, height: 80, borderRadius: 40, borderWidth: 5, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  shutterIn: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#fff' },

  // PREVIEW UI
  previewContainer: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 25, paddingBottom: 15 },
  imageWrapper: { width: width * 0.88, aspectRatio: 1, marginTop: 20, borderRadius: 45, overflow: 'hidden', backgroundColor: '#111' },
  imageWrapperKeyboard: { width: width * 0.65, marginTop: 5 },
  mainImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageFloatingToolbar: { position: 'absolute', bottom: 15, alignSelf: 'center', flexDirection: 'row', gap: 10 },
  floatingPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 215, 0, 0.95)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 5 },
  floatingPillText: { color: '#000', fontWeight: 'bold', fontSize: 11 },

  // ACTION AREA ĐỒNG NHẤT
  actionArea: { width: '100%', gap: 20, marginBottom: 20 },
  actionAreaKeyboard: { gap: 10, marginBottom: 10 },
  amountContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  currencySymbol: { color: '#FFD700', fontSize: 20, fontWeight: 'bold', marginRight: 10 },
  moneyInput: {
    color: '#fff',
    fontSize: 40, // CỠ CHỮ ĐỒNG NHẤT 40
    fontWeight: '800',
    textAlign: 'center',
    minWidth: 100,
  },
  saveBtn: { backgroundColor: '#FFD700', height: 62, borderRadius: 31, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  saveBtnDisabled: { backgroundColor: '#1a1a1a', opacity: 0.5 },
  saveBtnText: { color: '#000', fontSize: 18, fontWeight: '900' },
  yellowText: { color: '#FFD700', fontWeight: 'bold' },
  permissionBtn: { padding: 20, borderWidth: 1, borderColor: '#FFD700', borderRadius: 15 }
});