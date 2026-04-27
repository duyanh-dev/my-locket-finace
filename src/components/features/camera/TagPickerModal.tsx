import React, { useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, Modal as RNModal } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  visible: boolean;
  onClose: () => void;
  tags: any[];
  selectedTag: string;
  onSelect: (name: string) => void;
  onCreateQuickTag: (name: string) => void;
}

export default function TagPickerModal({ visible, onClose, tags, selectedTag, onSelect, onCreateQuickTag }: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  const handleCreate = () => {
    onCreateQuickTag(newTagName);
    setIsCreating(false);
    setNewTagName("");
  };

  return (
    <RNModal visible={visible} animationType="slide" transparent>
      <View style={styles.tagModalOverlay}>
        <View style={styles.tagModalContent}>
          <View style={styles.tagModalHeader}>
            <Text style={styles.tagModalTitle}>CHỌN TAG</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <TouchableOpacity style={styles.quickAddBtn} onPress={() => setIsCreating(true)}>
              <Ionicons name="add-circle" size={20} color="#000" />
              <Text style={styles.quickAddText}>TẠO TAG MỚI</Text>
            </TouchableOpacity>
            <Text style={styles.tagLabelHeader}>TAG HIỆN CÓ</Text>
            <View style={styles.tagGrid}>
              {tags.map((tag) => (
                <TouchableOpacity
                  key={tag.name}
                  style={[styles.tagItem, selectedTag === tag.name && styles.tagItemActive]}
                  onPress={() => { onSelect(tag.name); onClose(); }}
                >
                  <Ionicons name={tag.icon || "cart"} size={18} color={selectedTag === tag.name ? "#000" : tag.color} />
                  <Text style={[styles.tagItemText, selectedTag === tag.name && { color: "#000" }]}>{tag.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>

      <RNModal visible={isCreating} animationType="fade" transparent>
        <View style={styles.quickModalOverlay}>
          <View style={styles.quickModalContent}>
            <Text style={styles.quickModalTitle}>Tên Tag mới</Text>
            <TextInput style={styles.quickInput} placeholder="Nhập tên..." placeholderTextColor="#555" value={newTagName} onChangeText={setNewTagName} autoFocus />
            <View style={styles.quickActionRow}>
              <TouchableOpacity style={styles.quickCancel} onPress={() => setIsCreating(false)}><Text style={{ color: "#888" }}>Hủy</Text></TouchableOpacity>
              <TouchableOpacity style={styles.quickConfirm} onPress={handleCreate}><Text style={{ color: "#000", fontWeight: "bold" }}>Tạo & Chọn</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </RNModal>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  tagModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" },
  tagModalContent: { backgroundColor: "#161618", borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: "80%" },
  tagModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  tagModalTitle: { color: "#fff", fontSize: 16, fontWeight: "900" },
  quickAddBtn: { flexDirection: "row", backgroundColor: "#FFD700", padding: 15, borderRadius: 18, alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 25 },
  quickAddText: { color: "#000", fontWeight: "bold", fontSize: 14 },
  tagLabelHeader: { color: "#444", fontSize: 10, fontWeight: "900", marginBottom: 15 },
  tagGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tagItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#222", paddingHorizontal: 15, paddingVertical: 10, borderRadius: 15, gap: 8 },
  tagItemActive: { backgroundColor: "#FFD700" },
  tagItemText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  quickModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  quickModalContent: { backgroundColor: "#222", padding: 25, borderRadius: 25, width: "80%" },
  quickModalTitle: { color: "#fff", fontSize: 18, fontWeight: "bold", marginBottom: 15 },
  quickInput: { backgroundColor: "#111", color: "#fff", padding: 15, borderRadius: 15, marginBottom: 20 },
  quickActionRow: { flexDirection: "row", justifyContent: "flex-end", gap: 15 },
  quickCancel: { padding: 10 },
  quickConfirm: { backgroundColor: "#FFD700", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }
});