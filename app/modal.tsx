import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
  Animated,
  Platform,
  Alert,
  ScrollView,
  Modal as RNModal,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import { useRouter, useLocalSearchParams } from "expo-router";
import { addExpense, updateExpense, getAllTags, saveTag } from "../database";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getCurrencyConfig, Currency, convertCurrency } from "../settings_db";

const { width } = Dimensions.get("window");
const ZOOM_LEVELS = [0.5, 1, 2, 3];
const ZOOM_1X = 0.035;

export default function CameraModal() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [permission, requestPermission] = useCameraPermissions();

  // --- LOGIC CONTEXT ---
  const isFromExplore = !!params.tag;

  const editId = params.editId ? String(params.editId) : null;
  const [photo, setPhoto] = useState<string | null>(
    params.oldImage ? String(params.oldImage) : null,
  );
  const [currency, setCurrency] = useState<Currency>({
    label: "",
    code: (params.oldCurrency as string) || "VNĐ",
    symbol: params.oldCurrency === "VNĐ" ? "đ" : "$",
    rate: 1,
  });

  const [amount, setAmount] = useState("");
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [zoom, setZoom] = useState(ZOOM_1X);
  const [focusPos, setFocusPos] = useState({ x: 0, y: 0 });
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  // --- STATE TAG/ALBUM ---
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>(
    params.tag
      ? String(params.tag)
      : params.oldTag
        ? String(params.oldTag)
        : "",
  );
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [isCreatingNewTag, setIsCreatingNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");

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
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, () =>
      setKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(hideEvent, () =>
      setKeyboardVisible(false),
    );

    const initConfig = async () => {
      const config = await getCurrencyConfig();
      setCurrency(config);
      setAvailableTags(getAllTags());

      if (editId && params.oldAmount && params.oldCurrency) {
        const isSameCurrency = params.oldCurrency === config.code;
        let displayValue = "";
        if (isSameCurrency) {
          displayValue = String(params.oldAmount).replace(".", ",");
        } else {
          const converted = convertCurrency(
            Number(params.oldAmount),
            String(params.oldCurrency),
            config.code,
          );
          displayValue =
            config.code === "VNĐ"
              ? Math.round(converted).toString()
              : converted.toFixed(2).replace(".", ",");
          if (displayValue.endsWith(",00"))
            displayValue = displayValue.split(",")[0];
        }
        setAmount(formatCurrency(displayValue, config.code));
      }
    };
    initConfig();

    return () => {
      showSub.remove();
      hideSub.remove();
      if (animationFrameId.current)
        cancelAnimationFrame(animationFrameId.current);
      if (focusTimeout.current) clearTimeout(focusTimeout.current);
    };
  }, [editId]);

  const formatCurrency = (val: string, forcedCode?: string) => {
    if (!val) return "";
    const activeCode = forcedCode || currency.code;
    let cleanNext = val.replace(/\./g, "");
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

  const handleSaveToGallery = async () => {
    if (!photo) return;
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === "granted") {
      try {
        await MediaLibrary.saveToLibraryAsync(photo);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Thành công", "Đã lưu ảnh!");
      } catch (e) {
        Alert.alert("Lỗi", "Không thể lưu ảnh!");
      }
    }
  };

  const smoothZoomTo = useCallback((target: number) => {
    if (animationFrameId.current)
      cancelAnimationFrame(animationFrameId.current);
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
      if (focusTimeout.current) {
        clearTimeout(focusTimeout.current);
        focusTimeout.current = null;
      }
      focusAlpha.setValue(0);
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

  const handleCreateQuickTag = () => {
    if (!newTagName.trim()) return;
    saveTag(newTagName.trim(), "cart", "#FFD700", "");
    setSelectedTag(newTagName.trim());
    setAvailableTags(getAllTags());
    setIsCreatingNewTag(false);
    setNewTagName("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleFinalSave = () => {
    if (!amount) return Alert.alert("Thiếu tiền!", "Ông chưa nhập số tiền.");
    const normalized = amount.replace(/\./g, "").replace(",", ".");
    const numAmount = parseFloat(normalized);
    if (isNaN(numAmount)) return Alert.alert("Lỗi", "Số tiền không hợp lệ");
    const baseAmount = numAmount * (currency.rate || 1);

    if (editId && editId !== "undefined") {
      updateExpense(
        Number(editId),
        normalized,
        currency.code,
        baseAmount,
        photo!,
        selectedTag,
      );
    } else {
      addExpense(normalized, currency.code, baseAmount, photo!, selectedTag);
    }
    router.back();
  };

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <TouchableOpacity
          style={styles.permissionBtn}
          onPress={requestPermission}
        >
          <Text style={styles.yellowText}>MỞ CAMERA</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={[styles.headerArea, isKeyboardVisible && { height: 35 }]}>
        <View style={styles.pill} />
        <TouchableOpacity
          style={styles.closeIcon}
          onPress={() => router.back()}
        >
          <Ionicons name="close-circle" size={32} color="#333" />
        </TouchableOpacity>
      </View>

      {!photo ? (
        <View
          style={styles.flexOne}
          onStartShouldSetResponder={() => true}
          onResponderGrant={onGrant}
          onResponderMove={onMove}
          onResponderRelease={() => {
            startDist.current = null;
            isPinching.current = false;
          }}
        >
          <CameraView
            style={StyleSheet.absoluteFill}
            ref={cameraRef}
            facing={facing}
            zoom={zoom}
            autofocus="on"
          />
          <Animated.View
            style={[
              styles.focusRing,
              {
                left: focusPos.x - 35,
                top: focusPos.y - 35,
                opacity: focusAlpha,
                transform: [
                  {
                    scale: focusAlpha.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1.4, 1],
                    }),
                  },
                ],
              },
            ]}
          />
          <View style={styles.uiOverlay} pointerEvents="box-none">
            <View style={styles.zoomBadge}>
              <Text style={styles.zoomText}>
                {zoom < 0.01 ? "0.5x" : (zoom / ZOOM_1X).toFixed(1) + "x"}
              </Text>
            </View>
            <View style={styles.bottomArea} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.mainZoomCircle}
                onPress={toggleNextZoom}
              >
                <Text style={styles.mainZoomText}>
                  {zoom < 0.01 ? ".5x" : (zoom / ZOOM_1X).toFixed(0) + "x"}
                </Text>
              </TouchableOpacity>
              <View style={styles.shutterRow} pointerEvents="box-none">
                <TouchableOpacity
                  style={styles.flipBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setFacing((f) => (f === "back" ? "front" : "back"));
                    zoomRef.current = ZOOM_1X;
                    setZoom(ZOOM_1X);
                  }}
                >
                  <Ionicons
                    name="camera-reverse-outline"
                    size={32}
                    color="#fff"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.shutter}
                  onPress={async () => {
                    Haptics.notificationAsync(
                      Haptics.NotificationFeedbackType.Success,
                    );
                    const res = await cameraRef.current.takePictureAsync({
                      quality: 0.8,
                    });
                    setPhoto(res.uri);
                  }}
                >
                  <View style={styles.shutterIn} />
                </TouchableOpacity>
                <View style={{ width: 50 }} />
              </View>
            </View>
          </View>
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flexOne}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.previewContainer}>
              <View
                style={[
                  styles.imageWrapper,
                  isKeyboardVisible && styles.imageWrapperKeyboard,
                ]}
              >
                <Image source={{ uri: photo }} style={styles.mainImg} />
                <View style={styles.imageFloatingToolbar}>
                  <TouchableOpacity
                    style={styles.floatingPill}
                    onPress={() => setPhoto(null)}
                  >
                    <Ionicons name="refresh" size={16} color="#000" />
                    <Text style={styles.floatingPillText}>CHỤP LẠI</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.floatingPill}
                    onPress={handleSaveToGallery}
                  >
                    <Ionicons name="download-outline" size={16} color="#000" />
                    <Text style={styles.floatingPillText}>LƯU ẢNH</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View
                style={[
                  styles.actionArea,
                  isKeyboardVisible && styles.actionAreaKeyboard,
                ]}
              >
                <View style={styles.amountContainer}>
                  <Text style={styles.currencySymbol}>{currency.code}</Text>
                  <TextInput
                    style={styles.moneyInput}
                    keyboardType="decimal-pad"
                    value={amount}
                    onChangeText={(text) => setAmount(formatCurrency(text))}
                    placeholder="0"
                    placeholderTextColor="#222"
                    autoFocus={true}
                  />
                </View>

                {!isFromExplore && (
                  <TouchableOpacity
                    style={[
                      styles.tagSelectBtn,
                      selectedTag !== "" && { borderColor: "#FFD700" },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowTagPicker(true);
                    }}
                  >
                    <Ionicons
                      name="pricetag"
                      size={16}
                      color={selectedTag ? "#FFD700" : "#555"}
                    />
                    <Text
                      style={[
                        styles.tagSelectText,
                        selectedTag !== "" && { color: "#FFD700" },
                      ]}
                    >
                      {selectedTag || "GẮN TAG"}
                    </Text>
                    {selectedTag !== "" && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          setSelectedTag("");
                        }}
                      >
                        <Ionicons
                          name="close-circle"
                          size={16}
                          color="#FFD700"
                        />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                )}

                {isFromExplore && selectedTag !== "" && (
                  <View style={styles.fixedTagLabel}>
                    <Ionicons name="pricetag" size={12} color="#FFD700" />
                    <Text style={styles.fixedTagText}>
                      TAG: {selectedTag.toUpperCase()}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    !amount ? styles.saveBtnDisabled : null,
                  ]}
                  onPress={handleFinalSave}
                >
                  <Text style={styles.saveBtnText}>
                    {editId ? "CẬP NHẬT" : "LƯU CHI TIÊU"}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#000" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>

          {/* --- MODAL CHỌN TAG --- */}
          <RNModal visible={showTagPicker} animationType="slide" transparent>
            <View style={styles.tagModalOverlay}>
              <View style={styles.tagModalContent}>
                <View style={styles.tagModalHeader}>
                  <Text style={styles.tagModalTitle}>CHỌN TAG</Text>
                  <TouchableOpacity onPress={() => setShowTagPicker(false)}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <TouchableOpacity
                    style={styles.quickAddBtn}
                    onPress={() => setIsCreatingNewTag(true)}
                  >
                    <Ionicons name="add-circle" size={20} color="#000" />
                    <Text style={styles.quickAddText}>TẠO TAG MỚI</Text>
                  </TouchableOpacity>
                  <Text style={styles.tagLabelHeader}>TAG HIỆN CÓ</Text>
                  <View style={styles.tagGrid}>
                    {availableTags.map((tag) => (
                      <TouchableOpacity
                        key={tag.name}
                        style={[
                          styles.tagItem,
                          selectedTag === tag.name && styles.tagItemActive,
                        ]}
                        onPress={() => {
                          setSelectedTag(tag.name);
                          setShowTagPicker(false);
                        }}
                      >
                        <Ionicons
                          name={tag.icon || "cart"}
                          size={18}
                          color={selectedTag === tag.name ? "#000" : tag.color}
                        />
                        <Text
                          style={[
                            styles.tagItemText,
                            selectedTag === tag.name && { color: "#000" },
                          ]}
                        >
                          {tag.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>
            <RNModal
              visible={isCreatingNewTag}
              animationType="fade"
              transparent
            >
              <View style={styles.quickModalOverlay}>
                <View style={styles.quickModalContent}>
                  <Text style={styles.quickModalTitle}>Tên Tag mới</Text>
                  <TextInput
                    style={styles.quickInput}
                    placeholder="Nhập tên..."
                    placeholderTextColor="#555"
                    value={newTagName}
                    onChangeText={setNewTagName}
                    autoFocus
                  />
                  <View style={styles.quickActionRow}>
                    <TouchableOpacity
                      style={styles.quickCancel}
                      onPress={() => setIsCreatingNewTag(false)}
                    >
                      <Text style={{ color: "#888" }}>Hủy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickConfirm}
                      onPress={handleCreateQuickTag}
                    >
                      <Text style={{ color: "#000", fontWeight: "bold" }}>
                        Tạo & Chọn
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </RNModal>
          </RNModal>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  flexOne: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerArea: {
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  pill: { width: 40, height: 4, backgroundColor: "#1a1a1a", borderRadius: 2 },
  closeIcon: { position: "absolute", right: 20 },
  focusRing: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1.2,
    borderColor: "#FFD700",
    zIndex: 99,
  },
  uiOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    paddingVertical: 20,
    alignItems: "center",
  },
  zoomBadge: {
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  zoomText: { color: "#FFD700", fontSize: 11, fontWeight: "bold" },
  bottomArea: { width: "100%", alignItems: "center", marginBottom: 20 },
  mainZoomCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 25,
  },
  mainZoomText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  shutterRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-evenly",
    alignItems: "center",
  },
  flipBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  shutter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  shutterIn: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#fff",
  },
  previewContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 25,
    paddingBottom: 15,
  },
  imageWrapper: {
    width: width * 0.88,
    aspectRatio: 1,
    marginTop: 20,
    borderRadius: 45,
    overflow: "hidden",
    backgroundColor: "#111",
  },
  imageWrapperKeyboard: { width: width * 0.65, marginTop: 5 },
  mainImg: { width: "100%", height: "100%", resizeMode: "cover" },
  imageFloatingToolbar: {
    position: "absolute",
    bottom: 15,
    alignSelf: "center",
    flexDirection: "row",
    gap: 10,
  },
  floatingPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 215, 0, 0.95)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  floatingPillText: { color: "#000", fontWeight: "bold", fontSize: 11 },
  actionArea: { width: "100%", gap: 15, marginBottom: 20 },
  actionAreaKeyboard: { gap: 8, marginBottom: 10 },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  currencySymbol: {
    color: "#FFD700",
    fontSize: 20,
    fontWeight: "bold",
    marginRight: 10,
  },
  moneyInput: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "800",
    textAlign: "center",
    minWidth: 100,
  },

  // TAG STYLES
  tagSelectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222",
    gap: 10,
    backgroundColor: "#0a0a0a",
  },
  tagSelectText: {
    color: "#555",
    fontSize: 13,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  fixedTagLabel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    opacity: 0.8,
  },
  fixedTagText: {
    color: "#FFD700",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },

  tagModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  tagModalContent: {
    backgroundColor: "#161618",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    maxHeight: "80%",
  },
  tagModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  tagModalTitle: { color: "#fff", fontSize: 16, fontWeight: "900" },
  quickAddBtn: {
    flexDirection: "row",
    backgroundColor: "#FFD700",
    padding: 15,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 25,
  },
  quickAddText: { color: "#000", fontWeight: "bold", fontSize: 14 },
  tagLabelHeader: {
    color: "#444",
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 15,
  },
  tagGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tagItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#222",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    gap: 8,
  },
  tagItemActive: { backgroundColor: "#FFD700" },
  tagItemText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  quickModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  quickModalContent: {
    backgroundColor: "#222",
    padding: 25,
    borderRadius: 25,
    width: "80%",
  },
  quickModalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  quickInput: {
    backgroundColor: "#111",
    color: "#fff",
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
  },
  quickActionRow: { flexDirection: "row", justifyContent: "flex-end", gap: 15 },
  quickCancel: { padding: 10 },
  quickConfirm: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  saveBtn: {
    backgroundColor: "#FFD700",
    height: 62,
    borderRadius: 31,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  saveBtnDisabled: { backgroundColor: "#1a1a1a", opacity: 0.5 },
  saveBtnText: { color: "#000", fontSize: 18, fontWeight: "900" },
  yellowText: { color: "#FFD700", fontWeight: "bold" },
  permissionBtn: {
    padding: 20,
    borderWidth: 1,
    borderColor: "#FFD700",
    borderRadius: 15,
  },
});
