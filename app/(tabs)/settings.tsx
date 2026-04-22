import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CURRENCIES, saveCurrencyConfig, getCurrencyConfig, Currency } from '../../settings_db';
import * as Haptics from 'expo-haptics';

export default function SettingsScreen() {
  const [selected, setSelected] = useState<Currency>(CURRENCIES[0]);

  useEffect(() => {
    const load = async () => {
      const config = await getCurrencyConfig();
      setSelected(config);
    };
    load();
  }, []);

  const handleSelect = async (item: Currency) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelected(item);
    await saveCurrencyConfig(item.code);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cài đặt</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>ĐƠN VỊ TIỀN TỆ</Text>
        <View style={styles.listCard}>
          {CURRENCIES.map((item, index) => {
            const isSelected = selected.code === item.code;
            return (
              <TouchableOpacity 
                key={item.code} 
                style={[styles.listItem, index === CURRENCIES.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => handleSelect(item)}
              >
                <View>
                  <Text style={styles.itemLabel}>{item.label}</Text>
                  <Text style={styles.itemSub}>{item.code} ({item.symbol})</Text>
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
            <Text style={styles.itemSub}>1.1.0 (Locket Style)</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#161618' },
  header: { marginTop: 60, paddingHorizontal: 25, marginBottom: 25 },
  title: { color: '#fff', fontSize: 34, fontWeight: '900' },
  content: { paddingHorizontal: 20 },
  sectionTitle: { color: '#666', fontSize: 11, fontWeight: 'bold', marginLeft: 15, marginBottom: 10, letterSpacing: 1 },
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