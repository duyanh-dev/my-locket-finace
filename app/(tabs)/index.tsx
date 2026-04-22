import React, { useState, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, Image, Dimensions, RefreshControl, TouchableOpacity, Modal, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { useFocusEffect, useRouter } from 'expo-router';
import { getExpenses, initDatabase, deleteExpense } from '../../database';
import { getCurrencyConfig, Currency, CURRENCIES, convertCurrency } from '../../settings_db'; 
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';

const { width } = Dimensions.get('window');

// Thêm field currency vào interface
interface Expense { id: number; amount: string; currency: string; imageUri: string; date: string; }
type Period = 'day' | 'week' | 'month' | 'year';
type LayoutType = 1 | 2 | 3;

export default function HomeScreen() {
  const router = useRouter();
  const [filteredData, setFilteredData] = useState<Expense[]>([]);
  const [period, setPeriod] = useState<Period>('day');
  const [layoutType, setLayoutType] = useState<LayoutType>(2);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Expense | null>(null);
  const [currency, setCurrency] = useState<Currency>(CURRENCIES[0]);

  const scrollY = useRef(new Animated.Value(0)).current;

  // --- LOGIC LOAD DATA ---
  const loadData = async () => {
    initDatabase();
    const config = await getCurrencyConfig();
    setCurrency(config);

    const data = getExpenses() as Expense[];
    filterData(data, period);
  };

  useFocusEffect(useCallback(() => { loadData(); }, [period]));

  // --- ANIMATION HEADER ---
  const headerHeight = scrollY.interpolate({ inputRange: [0, 120], outputRange: [150, 45], extrapolate: 'clamp' });
  const totalScale = scrollY.interpolate({ inputRange: [0, 120], outputRange: [1, 0.55], extrapolate: 'clamp' });
  const totalTranslateY = scrollY.interpolate({ inputRange: [0, 120], outputRange: [0, -5], extrapolate: 'clamp' });
  const headerOpacity = scrollY.interpolate({ inputRange: [0, 60], outputRange: [1, 0], extrapolate: 'clamp' });

  const filterData = (data: Expense[], currentPeriod: Period) => {
    const now = new Date();
    const filtered = data.filter(item => {
      const itemDate = new Date(item.date);
      if (currentPeriod === 'day') return itemDate.toDateString() === now.toDateString();
      if (currentPeriod === 'week') return itemDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (currentPeriod === 'month') return itemDate.getMonth() === now.getMonth();
      return itemDate.getFullYear() === now.getFullYear();
    });
    setFilteredData(filtered);
  };

  const getColumnWidth = () => {
    const spacing = 12;
    const totalPadding = 40;
    if (layoutType === 1) return width - totalPadding;
    if (layoutType === 2) return (width - totalPadding - spacing) / 2;
    return (width - totalPadding - (spacing * 2)) / 3;
  };

  const groupDataByDate = (data: Expense[]) => {
    const groups: { [key: string]: Expense[] } = {};
    data.forEach(item => {
      const dateKey = new Date(item.date).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(item);
    });
    return groups;
  };

  const handleEdit = (item: Expense) => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  setSelectedItem(null);
  router.push({
    pathname: '/modal',
    params: { 
      editId: item.id.toString(), 
      oldAmount: item.amount, 
      oldImage: item.imageUri,
      oldCurrency: item.currency // <-- THÊM DÒNG NÀY
    }
  });
};

  const confirmDelete = (item: Expense) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Xóa món này?", "Kỷ niệm này sẽ biến mất khỏi danh sách đó nha.", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa luôn", style: "destructive", onPress: () => { deleteExpense(item.id); loadData(); setSelectedItem(null); } }
    ]);
  };

  const handleSaveImage = async (uri: string) => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === 'granted') {
      try {
        await MediaLibrary.saveToLibraryAsync(uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Thành công", "Đã lưu ảnh!");
      } catch (e) {
        Alert.alert("Lỗi", "Không thể lưu ảnh.");
      }
    }
  };

  const columnWidth = getColumnWidth();
  const groupedData = groupDataByDate(filteredData);

  // TÍNH TỔNG TIỀN: Quy đổi từng item về đơn vị Setting hiện tại rồi mới cộng
  const totalAmountConverted = filteredData.reduce((sum, item) => {
    const converted = convertCurrency(Number(item.amount), item.currency, currency.code);
    return sum + converted;
  }, 0);

  // Hàm format hiển thị số (VNĐ ko có decimal, ngoại tệ có 2 số sau dấu phẩy)
  const formatDisplay = (num: number) => {
  return num.toLocaleString('vi-VN', { 
    // Nếu là VNĐ thì ko hiện số lẻ, nếu ngoại tệ thì hiện tối đa 2 số lẻ
    maximumFractionDigits: currency.code === 'VNĐ' ? 0 : 2,
    // Không ép buộc hiện 2 số lẻ (để 1,5 thì hiện 1,5 chứ ko phải 1,50 nếu ông ko thích)
    minimumFractionDigits: 0 
  });
};

  return (
    <View style={styles.container}>
      <View style={styles.fixedHeaderContainer}>
        <SafeAreaView style={{ flex: 0, backgroundColor: '#161618' }} edges={['top']} />
        <Animated.View style={[styles.header, { height: headerHeight }]}>
          <Animated.View style={{ transform: [{ scale: totalScale }, { translateY: totalTranslateY }] }}>
            <Text style={styles.totalAmount}>
              {formatDisplay(totalAmountConverted)}
              <Text style={styles.currencySymbol}> {currency.symbol}</Text>
            </Text>
          </Animated.View>
          <Animated.View style={[styles.periodBadge, { opacity: headerOpacity }]}>
             <Text style={styles.headerLabel}>Chi tiêu {period === 'day' ? 'Hôm nay' : period === 'week' ? 'Tuần' : period === 'month' ? 'Tháng' : 'Năm'}</Text>
          </Animated.View>
        </Animated.View>

        <View style={styles.tabContainer}>
          {['day', 'week', 'month', 'year'].map((p) => (
            <TouchableOpacity key={p} style={[styles.tabButton, period === p && styles.activeTab]} 
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPeriod(p as Period); }}>
              <Text style={[styles.tabText, period === p && styles.activeTabText]}>{p.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Animated.ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingTop: 270, paddingBottom: 150 }]} 
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={1}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor="#FFD700" />}
      >
        <View style={styles.layoutPicker}>
          {[1, 2, 3].map(n => (
            <TouchableOpacity key={n} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLayoutType(n as LayoutType); }} 
              style={[styles.layoutCircle, layoutType === n && styles.activeCircle]}>
              <Ionicons name={n === 1 ? "square" : n === 2 ? "grid" : "apps"} size={12} color={layoutType === n ? '#000' : '#888'} />
            </TouchableOpacity>
          ))}
        </View>

        {Object.keys(groupedData).map((date) => (
          <View key={date} style={styles.dateSection}>
            <View style={styles.dateHeader}>
               <Text style={styles.dateTitle}>{date}</Text>
               <View style={styles.dateLine} />
            </View>
            <View style={styles.grid}>
              {groupedData[date].map((item) => {
                // QUY ĐỔI GIÁ TRỊ TỪNG ITEM ĐỂ HIỂN THỊ ĐỒNG NHẤT VỚI SETTING
                const displayVal = convertCurrency(Number(item.amount), item.currency, currency.code);
                
                return (
                  <View key={item.id} style={{ width: columnWidth, marginBottom: 20 }}>
                    <TouchableOpacity 
                      style={[styles.card, { height: columnWidth }]} 
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedItem(item); }} 
                      activeOpacity={0.9}
                    >
                      <Image source={{ uri: item.imageUri }} style={styles.image} />
                      <View style={styles.cardOverlay}>
                        <Text style={[styles.cardAmount, { fontSize: layoutType === 3 ? 9 : 11 }]}>
                          {formatDisplay(displayVal)}{currency.symbol}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.actionRow}>
                      <TouchableOpacity style={styles.btnEdit} onPress={() => handleEdit(item)}>
                        <Ionicons name="pencil" size={12} color="#000" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.btnDelete} onPress={() => confirmDelete(item)}>
                        <Ionicons name="trash-outline" size={12} color="#FF6B6B" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </Animated.ScrollView>

      {/* MODAL CHI TIẾT */}
      <Modal visible={!!selectedItem} animationType="fade" transparent={true} statusBarTranslucent>
        <View style={styles.fullViewContainer}>
          <TouchableOpacity style={styles.closeFullView} onPress={() => setSelectedItem(null)}>
            <Ionicons name="close-circle" size={44} color="#fff" />
          </TouchableOpacity>
          
          {selectedItem && (
            <View style={styles.fullContent}>
              <View style={styles.fullImageWrapper}>
                <Image source={{ uri: selectedItem.imageUri }} style={styles.fullImage} />
                <TouchableOpacity style={styles.saveFloatingBtn} onPress={() => handleSaveImage(selectedItem.imageUri)}>
                  <Ionicons name="download-outline" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* TRONG CHI TIẾT: HIỂN THỊ THEO ĐƠN VỊ SETTING ĐÃ CHỌN */}
              <Text style={styles.fullAmount}>
                {formatDisplay(convertCurrency(Number(selectedItem.amount), selectedItem.currency, currency.code))} {currency.code}
              </Text>
              <Text style={styles.fullDate}>{new Date(selectedItem.date).toLocaleString('vi-VN')}</Text>
              
              <View style={styles.fullActions}>
                <TouchableOpacity style={styles.fullBtnEdit} onPress={() => handleEdit(selectedItem)}>
                  <Ionicons name="pencil" size={20} color="black" />
                  <Text style={styles.fullBtnText}>Chỉnh sửa</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.fullBtnDelete} onPress={() => confirmDelete(selectedItem)}>
                  <Ionicons name="trash" size={20} color="white" />
                  <Text style={[styles.fullBtnText, {color: 'white'}]}>Xóa món này</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>

      <TouchableOpacity style={styles.fab} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/modal'); }}>
        <Ionicons name="camera" size={28} color="black" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#161618' },
    fixedHeaderContainer: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, backgroundColor: '#161618' },
    header: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#161618' },
    totalAmount: { color: '#FFFFFF', fontSize: 48, fontWeight: '900', letterSpacing: -1 },
    currencySymbol: { color: '#FFD700', fontSize: 18 },
    periodBadge: { backgroundColor: 'rgba(255, 215, 0, 0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 5 },
    headerLabel: { color: '#FFD700', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
    tabContainer: { flexDirection: 'row', backgroundColor: '#222224', marginHorizontal: 30, borderRadius: 25, padding: 5, marginBottom: 15 },
    tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 20 },
    activeTab: { backgroundColor: '#323235' },
    tabText: { color: '#555', fontWeight: 'bold', fontSize: 10 },
    activeTabText: { color: '#FFF' },
    layoutPicker: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 25 },
    layoutCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#222224', justifyContent: 'center', alignItems: 'center' },
    activeCircle: { backgroundColor: '#FFD700' },
    scrollContent: { paddingHorizontal: 20 },
    dateSection: { marginBottom: 25 },
    dateHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10 },
    dateTitle: { color: '#888', fontSize: 13, fontWeight: 'bold' },
    dateLine: { flex: 1, height: 1, backgroundColor: '#222224' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    card: { borderRadius: 30, overflow: 'hidden', backgroundColor: '#222224' },
    image: { width: '100%', height: '100%' },
    cardOverlay: { position: 'absolute', bottom: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
    cardAmount: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 12, paddingRight: 5 },
    btnEdit: { backgroundColor: '#FFD700', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    btnDelete: { backgroundColor: 'rgba(255, 107, 107, 0.1)', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    fab: { position: 'absolute', right: 30, bottom: 110, backgroundColor: '#FFD700', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', zIndex: 999 },
    fullViewContainer: { flex: 1, backgroundColor: 'rgba(10, 10, 12, 0.98)', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
    closeFullView: { position: 'absolute', top: 60, right: 25, zIndex: 10 },
    fullContent: { width: '90%', alignItems: 'center' },
    fullImageWrapper: { position: 'relative', marginBottom: 25 },
    fullImage: { width: width * 0.88, height: width * 0.88, borderRadius: 45 },
    saveFloatingBtn: { position: 'absolute', bottom: 20, right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(0, 0, 0, 0.6)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 5, elevation: 6 },
    fullAmount: { color: '#FFD700', fontSize: 36, fontWeight: '900', marginBottom: 5 },
    fullDate: { color: '#666', fontSize: 14, marginBottom: 40 },
    fullActions: { flexDirection: 'row', gap: 15, width: '100%' },
    fullBtnEdit: { flexDirection: 'row', backgroundColor: '#FFD700', padding: 18, borderRadius: 22, alignItems: 'center', gap: 10, flex: 1, justifyContent: 'center' },
    fullBtnDelete: { flexDirection: 'row', backgroundColor: '#222', padding: 18, borderRadius: 22, alignItems: 'center', gap: 10, flex: 1, justifyContent: 'center' },
    fullBtnText: { fontWeight: 'bold', fontSize: 15, color: '#000' }
});