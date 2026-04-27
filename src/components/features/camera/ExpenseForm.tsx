import React from "react";
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Platform, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

interface Props {
  photo: string;
  amount: string;
  currencyCode: string;
  selectedTag: string;
  isFromExplore: boolean;
  isKeyboardVisible: boolean;
  isEditMode: boolean; // THÊM FLAG NÀY
  onRetake: () => void;
  onSaveToGallery: () => void;
  onAmountChange: (text: string) => void;
  onOpenTagPicker: () => void;
  onRemoveTag: () => void;
  onFinalSave: () => void;
}

export default function ExpenseForm(props: Props) {
  const { 
    photo, amount, currencyCode, selectedTag, 
    isFromExplore, isKeyboardVisible, isEditMode, // Destructure thêm isEditMode
    onRetake, onSaveToGallery, onAmountChange, 
    onOpenTagPicker, onRemoveTag, onFinalSave 
  } = props;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.previewContainer}>
          <View style={[styles.imageWrapper, isKeyboardVisible && styles.imageWrapperKeyboard]}>
            <Image source={{ uri: photo }} style={styles.mainImg} />
            <View style={styles.imageFloatingToolbar}>
              <TouchableOpacity style={styles.floatingPill} onPress={onRetake}>
                <Ionicons name="refresh" size={16} color="#000" /><Text style={styles.floatingPillText}>CHỤP LẠI</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.floatingPill} onPress={onSaveToGallery}>
                <Ionicons name="download-outline" size={16} color="#000" /><Text style={styles.floatingPillText}>LƯU ẢNH</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.actionArea, isKeyboardVisible && styles.actionAreaKeyboard]}>
            <View style={styles.amountContainer}>
              <Text style={styles.currencySymbol}>{currencyCode}</Text>
              <TextInput style={styles.moneyInput} keyboardType="decimal-pad" value={amount} onChangeText={onAmountChange} placeholder="0" placeholderTextColor="#222" autoFocus={true} />
            </View>

            {!isFromExplore && (
              <TouchableOpacity style={[styles.tagSelectBtn, selectedTag !== "" && { borderColor: "#FFD700" }]} onPress={onOpenTagPicker}>
                <Ionicons name="pricetag" size={16} color={selectedTag ? "#FFD700" : "#555"} />
                <Text style={[styles.tagSelectText, selectedTag !== "" && { color: "#FFD700" }]}>{selectedTag || "GẮN TAG"}</Text>
                {selectedTag !== "" && (
                  <TouchableOpacity onPress={(e) => { e.stopPropagation(); onRemoveTag(); }}>
                    <Ionicons name="close-circle" size={16} color="#FFD700" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            )}

            {isFromExplore && selectedTag !== "" && (
              <View style={styles.fixedTagLabel}>
                <Ionicons name="pricetag" size={12} color="#FFD700" />
                <Text style={styles.fixedTagText}>TAG: {selectedTag.toUpperCase()}</Text>
              </View>
            )}

            <TouchableOpacity style={[styles.saveBtn, !amount ? styles.saveBtnDisabled : null]} onPress={onFinalSave}>
              {/* LOGIC ĐÃ FIX: CHỮ NÚT THAY ĐỔI THEO CHẾ ĐỘ SỬA/MỚI */}
              <Text style={styles.saveBtnText}>{isEditMode ? "CẬP NHẬT" : "LƯU CHI TIÊU"}</Text>
              <Ionicons name="chevron-forward" size={18} color="#000" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}


const styles = StyleSheet.create({
  previewContainer: { flex: 1, alignItems: "center", justifyContent: "space-between", paddingHorizontal: 25, paddingBottom: 15 },
  imageWrapper: { width: width * 0.88, aspectRatio: 1, marginTop: 20, borderRadius: 45, overflow: "hidden", backgroundColor: "#111" },
  imageWrapperKeyboard: { width: width * 0.65, marginTop: 5 },
  mainImg: { width: "100%", height: "100%", resizeMode: "cover" },
  imageFloatingToolbar: { position: "absolute", bottom: 15, alignSelf: "center", flexDirection: "row", gap: 10 },
  floatingPill: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255, 215, 0, 0.95)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 5 },
  floatingPillText: { color: "#000", fontWeight: "bold", fontSize: 11 },
  actionArea: { width: "100%", gap: 15, marginBottom: 20 },
  actionAreaKeyboard: { gap: 8, marginBottom: 10 },
  amountContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  currencySymbol: { color: "#FFD700", fontSize: 20, fontWeight: "bold", marginRight: 10 },
  moneyInput: { color: "#fff", fontSize: 40, fontWeight: "800", textAlign: "center", minWidth: 100 },
  tagSelectBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 12, borderRadius: 20, borderWidth: 1, borderColor: "#222", gap: 10, backgroundColor: "#0a0a0a" },
  tagSelectText: { color: "#555", fontSize: 13, fontWeight: "bold", letterSpacing: 0.5 },
  fixedTagLabel: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, opacity: 0.8 },
  fixedTagText: { color: "#FFD700", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  saveBtn: { backgroundColor: "#FFD700", height: 62, borderRadius: 31, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  saveBtnDisabled: { backgroundColor: "#1a1a1a", opacity: 0.5 },
  saveBtnText: { color: "#000", fontSize: 18, fontWeight: "900" }
});