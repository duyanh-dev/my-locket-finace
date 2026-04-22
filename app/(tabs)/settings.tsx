import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// IMPORT THÊM HÀM CẬP NHẬT TỶ GIÁ
import { CURRENCIES, saveCurrencyConfig, getCurrencyConfig, Currency, updateExchangeRates, getLatestCurrencies } from '../../settings_db';
import * as Haptics from 'expo-haptics';

export default function SettingsScreen() {
  const [selected, setSelected] = useState<Currency>(CURRENCIES[0]);
  const [displayList, setDisplayList] = useState<Currency[]>(CURRENCIES);
  const [isUpdating, setIsUpdating] = useState(false);

  // Load cấu hình và tỷ giá mới nhất từ máy
  const loadConfig = async () => {
    const list = await getLatestCurrencies();
    setDisplayList(list);
    
    const config = await getCurrencyConfig();
    setSelected(config);
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSelect = async (item: Currency) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelected(item);
    await saveCurrencyConfig(item.code);
  };

  // --- HÀM XỬ LÝ NÚT CẬP NHẬT ---
  const handleRefreshRates = async () => {
    setIsUpdating(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const result = await updateExchangeRates();
    
    if (result && result.success) {
      await loadConfig(); // Load lại list để hiện con số mới
      Alert.alert("Thành công", "Tỷ giá thị trường đã được cập nhật mới nhất!");
    } else {
      Alert.alert("Lỗi", "Không thể lấy tỷ giá. Kiểm tra kết nối mạng nhé ông Anh!");
    }
    setIsUpdating(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cài đặt</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ĐƠN VỊ TIỀN TỆ</Text>
          <TouchableOpacity 
            onPress={handleRefreshRates} 
            disabled={isUpdating}
            style={styles.refreshBtn}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color="#FFD700" />
            ) : (
              <Ionicons name="sync-outline" size={16} color="#FFD700" />
            )}
            <Text style={styles.refreshText}>{isUpdating ? " ĐANG TẢI..." : " CẬP NHẬT TỶ GIÁ"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listCard}>
          {displayList.map((item, index) => {
            const isSelected = selected.code === item.code;
            return (
              <TouchableOpacity 
                key={item.code} 
                style={[styles.listItem, index === displayList.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => handleSelect(item)}
              >
                <View>
                  <Text style={styles.itemLabel}>{item.label}</Text>
                  <Text style={styles.itemSub}>
                    {item.code} ({item.symbol}) 
                    {item.code !== 'VNĐ' && `  •  1 ${item.code} ≈ ${item.rate.toLocaleString('vi-VN')}VNĐ`}
                  </Text>
                </View>
                {isSelected && <Ionicons name="checkmark-circle" size={24} color="#FFD700" />}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 35 }]}>APP INFO</Text>
        <View style={styles.listCard}>
          <View style={styles.listItem}>
            <Text style={styles.itemLabel}>Phiên bản</Text>
            <Text style={styles.itemSub}>1.2.0 (Global Finance)</Text>
          </View>
          <View style={[styles.listItem, { borderBottomWidth: 0 }]}>
            <Text style={styles.itemLabel}>Tỷ giá</Text>
            <Text style={styles.itemSub}>Nguồn Open Exchange API</Text>
          </View>
        </View>
        
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#161618' },
  header: { marginTop: 60, paddingHorizontal: 25, marginBottom: 25 },
  title: { color: '#fff', fontSize: 34, fontWeight: '900' },
  content: { paddingHorizontal: 20 },
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 10,
    paddingHorizontal: 15 
  },
  sectionTitle: { color: '#666', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#222224', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  refreshText: { color: '#FFD700', fontSize: 10, fontWeight: '800' },
  listCard: { backgroundColor: '#222224', borderRadius: 28, overflow: 'hidden' },
  listItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 18, 
    paddingHorizontal: 22,
    borderBottomWidth: 0.5,
    borderBottomColor: '#333'
  },
  itemLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
  itemSub: { color: '#888', fontSize: 13, marginTop: 2 },
});