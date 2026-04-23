import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Linking, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CURRENCIES, saveCurrencyConfig, getCurrencyConfig, Currency, updateExchangeRates, getLatestCurrencies } from '../../settings_db';
import * as Haptics from 'expo-haptics';

export default function SettingsScreen() {
  const [selected, setSelected] = useState<Currency>(CURRENCIES[0]);
  const [displayList, setDisplayList] = useState<Currency[]>(CURRENCIES);
  const [isUpdating, setIsUpdating] = useState(false);

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

  const handleRefreshRates = async () => {
    setIsUpdating(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const result = await updateExchangeRates();
    if (result && result.success) {
      await loadConfig();
      Alert.alert("Thành công", "Tỷ giá thị trường đã được cập nhật!");
    } else {
      Alert.alert("Lỗi", "Không thể lấy tỷ giá. Kiểm tra mạng nhé!");
    }
    setIsUpdating(false);
  };

  const openLink = (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cài đặt</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>DEVELOPER</Text>
        </View>
        <TouchableOpacity 
          activeOpacity={0.9} 
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)}
          style={styles.devCard}
        >
          <View style={styles.devMainRow}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={24} color="#FFD700" />
            </View>
            <View style={styles.devInfo}>
              <Text style={styles.devName}>Anh Bui</Text>
              <Text style={styles.devRole}>Front End Developer</Text>
            </View>
          </View>
          
          <View style={styles.devDivider} />
          
          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialBtn} onPress={() => openLink('https://github.com/duyanh-dev')}>
              <Ionicons name="logo-github" size={18} color="#fff" />
              <Text style={styles.socialText}>GitHub</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn} onPress={() => openLink('https://duyanh-dev.github.io/#experience')}>
              <Ionicons name="globe-outline" size={18} color="#fff" />
              <Text style={styles.socialText}>Portfolio</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        <View style={[styles.sectionHeader, { marginTop: 35 }]}>
          <Text style={styles.sectionTitle}>ĐƠN VỊ TIỀN TỆ</Text>
          <TouchableOpacity onPress={handleRefreshRates} disabled={isUpdating} style={styles.refreshBtn}>
            {isUpdating ? <ActivityIndicator size="small" color="#FFD700" /> : <Ionicons name="sync-outline" size={16} color="#FFD700" />}
            <Text style={styles.refreshText}>{isUpdating ? " ĐANG TẢI..." : " CẬP NHẬT"}</Text>
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

        <Text style={[styles.sectionTitle, { marginTop: 35, paddingHorizontal: 15 }]}>APP INFO</Text>
        <View style={styles.listCard}>
          <View style={styles.listItem}>
            <Text style={styles.itemLabel}>Phiên bản</Text>
            <Text style={styles.itemSub}>1.2.0 (Locket Style)</Text>
          </View>
          <View style={[styles.listItem, { borderBottomWidth: 0 }]}>
            <Text style={styles.itemLabel}>Sản phẩm bởi</Text>
            <Text style={styles.itemSub}>MyLocketFinance Lab</Text>
          </View>
        </View>
        
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#161618' },
  header: { marginTop: 60, paddingHorizontal: 25, marginBottom: 25 },
  title: { color: '#fff', fontSize: 34, fontWeight: '900' },
  content: { paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 10 },
  sectionTitle: { color: '#444', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  
  // STYLE CHO DEVELOPER CARD
  devCard: { backgroundColor: '#222224', borderRadius: 30, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  devMainRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  avatarCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255, 215, 0, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.2)' },
  devInfo: { marginLeft: 15 },
  devName: { color: '#fff', fontSize: 20, fontWeight: '900' },
  devRole: { color: '#666', fontSize: 11, fontWeight: 'bold', marginTop: 2, textTransform: 'uppercase' },
  devDivider: { height: 1, backgroundColor: '#2c2c2e', marginVertical: 5 },
  socialRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  socialBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#161618', paddingVertical: 10, borderRadius: 15, gap: 8, borderWidth: 0.5, borderColor: '#333' },
  socialText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  refreshBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#222224', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  refreshText: { color: '#FFD700', fontSize: 10, fontWeight: '800' },
  listCard: { backgroundColor: '#222224', borderRadius: 28, overflow: 'hidden' },
  listItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18, paddingHorizontal: 22, borderBottomWidth: 0.5, borderBottomColor: '#333' },
  itemLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
  itemSub: { color: '#888', fontSize: 13, marginTop: 2 },
});