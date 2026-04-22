import React, { useState, useCallback, useRef, useMemo } from 'react';
import { StyleSheet, View, Text, Image, Dimensions, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { getExpenses, initDatabase } from '../../database';
// IMPORT THÊM LOGIC TIỀN TỆ & QUY ĐỔI
import { getCurrencyConfig, Currency, CURRENCIES, convertCurrency } from '../../settings_db';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

// Cập nhật interface thêm field currency
interface Expense { id: number; amount: string; currency: string; imageUri: string; date: string; }

export default function CalendarScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<Expense[]>([]);
  const [currency, setCurrency] = useState<Currency>(CURRENCIES[0]);

  const TODAY = useMemo(() => new Date(), []);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(TODAY.toDateString());

  // --- CẬP NHẬT LOAD DATA (CẢ DB VÀ SETTINGS) ---
  const loadData = async () => {
    initDatabase();

    // Đọc cấu hình tiền tệ hiện tại từ Setting
    const config = await getCurrencyConfig();
    setCurrency(config);

    // Đọc dữ liệu chi tiêu
    const data = getExpenses() as Expense[];
    setHistory(data);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const changeMonth = (offset: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    setCurrentDate(newDate);

    if (newDate.getMonth() === TODAY.getMonth() && newDate.getFullYear() === TODAY.getFullYear()) {
      setSelectedDate(TODAY.toDateString());
    } else {
      setSelectedDate(newDate.toDateString());
    }
  };

  const goToday = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCurrentDate(new Date(TODAY));
    setSelectedDate(TODAY.toDateString());
  };

  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startDayOfMonth = new Date(year, month, 1).getDay();
    const emptySlots = startDayOfMonth === 0 ? 6 : startDayOfMonth - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < emptySlots; i++) {
      days.push({ day: null, dateStr: null });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push({ day: i, dateStr: d.toDateString() });
    }
    return days;
  }, [currentDate]);

  // Lấy các khoản chi tiêu của ngày đang chọn
  const expensesOfSelectedDate = history.filter(ex => new Date(ex.date).toDateString() === selectedDate);

  // TÍNH TỔNG NGÀY: Quy đổi từng món về đơn vị Setting hiện tại
  const totalOfDayConverted = expensesOfSelectedDate.reduce((sum, item) => {
    const converted = convertCurrency(Number(item.amount), item.currency, currency.code);
    return sum + converted;
  }, 0);

  // Helper format hiển thị (VNĐ nguyên số, ngoại tệ 2 số lẻ)
  const formatDisplay = (num: number) => {
    return num.toLocaleString('vi-VN', {
      maximumFractionDigits: currency.code === 'VNĐ' ? 0 : 2,
      minimumFractionDigits: currency.code === 'VNĐ' ? 0 : 0
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color="#FFD700" />
        </TouchableOpacity>

        <TouchableOpacity onPress={goToday} style={styles.titleContainer} activeOpacity={0.7}>
          <Text style={styles.monthTitle}>THÁNG {currentDate.getMonth() + 1}</Text>
          <Text style={styles.yearTitle}>{currentDate.getFullYear()}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color="#FFD700" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.calendarCard}>
          <View style={styles.weekHeader}>
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
              <View key={d} style={styles.weekDayWrapper}><Text style={styles.weekText}>{d}</Text></View>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {calendarData.map((item, index) => {
              const expenseOfDay = history.find(ex => new Date(ex.date).toDateString() === item.dateStr);
              const isSelected = item.dateStr === selectedDate;
              const isToday = item.dateStr === TODAY.toDateString();

              return (
                <TouchableOpacity
                  key={index}
                  disabled={!item.day}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (item.dateStr) setSelectedDate(item.dateStr);
                  }}
                  style={[
                    styles.dayCell,
                    isSelected && styles.selectedDayCell,
                    isToday && styles.todayBorder
                  ]}
                >
                  {!item.day ? null : expenseOfDay ? (
                    <Image source={{ uri: expenseOfDay.imageUri }} style={styles.dayThumb} />
                  ) : (
                    <View style={[styles.dayCircle, isToday && styles.todayCircle]}>
                      <Text style={[
                        styles.dayText,
                        isSelected && styles.selectedDayText,
                        isToday && styles.todayText
                      ]}>
                        {item.day}
                      </Text>
                    </View>
                  )}
                  {isSelected && item.day && <View style={styles.selectIndicator} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.detailsSection}>
          <View style={styles.detailsHeader}>
            <Text style={styles.detailsDateText}>
              {new Date(selectedDate).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })}
            </Text>
            <View style={styles.totalBadge}>
              {/* HIỂN THỊ TỔNG NGÀY ĐÃ QUY ĐỔI THEO SETTING */}
              <Text style={styles.detailsTotal}>{formatDisplay(totalOfDayConverted)} {currency.symbol}</Text>
            </View>
          </View>

          {expensesOfSelectedDate.length > 0 ? (
            expensesOfSelectedDate.map(item => {
              // QUY ĐỔI GIÁ TRỊ TỪNG ITEM ĐỂ HIỂN THỊ ĐỒNG NHẤT
              const displayVal = convertCurrency(Number(item.amount), item.currency, currency.code);

              return (
                <View key={item.id} style={styles.detailCard}>
                  <Image source={{ uri: item.imageUri }} style={styles.detailThumb} />
                  <View style={styles.detailInfo}>
                    <Text style={styles.detailAmount}>{formatDisplay(displayVal)} {currency.symbol}</Text>
                    <Text style={styles.detailTime}>{new Date(item.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => router.push({
                      pathname: '/modal',
                      params: {
                        editId: item.id.toString(),
                        oldAmount: item.amount,
                        oldImage: item.imageUri,
                        oldCurrency: item.currency // <-- THÊM DÒNG NÀY
                      }
                    })}
                    style={styles.actionBtn}
                  >
                    <Ionicons name="pencil" size={16} color="#FFD700" />
                  </TouchableOpacity>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyBox}>
              <Ionicons name="sunny-outline" size={40} color="#222" />
              <Text style={styles.emptyText}>Ngày này ông Anh chưa chi tiêu gì hết</Text>
            </View>
          )}
        </View>
        <View style={{ height: 200 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#161618' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 30, paddingVertical: 20 },
  titleContainer: { alignItems: 'center' },
  monthTitle: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  yearTitle: { color: '#FFD700', fontSize: 13, fontWeight: 'bold' },
  navBtn: { width: 40, height: 40, backgroundColor: '#222', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  calendarCard: { backgroundColor: '#1c1c1e', marginHorizontal: 15, borderRadius: 35, padding: 15, borderWidth: 1, borderColor: '#2c2c2e' },
  weekHeader: { flexDirection: 'row', marginBottom: 15 },
  weekDayWrapper: { flex: 1, alignItems: 'center' },
  weekText: { color: '#444', fontSize: 11, fontWeight: 'bold' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 0.85, justifyContent: 'center', alignItems: 'center', marginVertical: 2 },
  selectedDayCell: { backgroundColor: 'rgba(255, 215, 0, 0.08)', borderRadius: 15 },
  todayBorder: { borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.3)', borderRadius: 15 },
  todayCircle: { backgroundColor: '#FFD700' },
  todayText: { color: '#000', fontWeight: '900' },
  dayCircle: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', borderRadius: 16 },
  dayText: { color: '#666', fontSize: 14, fontWeight: '600' },
  selectedDayText: { color: '#FFD700' },
  dayThumb: { width: '85%', height: '85%', borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  selectIndicator: { position: 'absolute', bottom: 2, width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFD700' },
  detailsSection: { marginTop: 35, paddingHorizontal: 25 },
  detailsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  detailsDateText: { color: '#888', fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase' },
  totalBadge: { backgroundColor: 'rgba(255, 215, 0, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  detailsTotal: { color: '#FFD700', fontSize: 16, fontWeight: '900' },
  detailCard: { flexDirection: 'row', backgroundColor: '#222224', padding: 15, borderRadius: 28, alignItems: 'center', marginBottom: 12 },
  detailThumb: { width: 55, height: 55, borderRadius: 18 },
  detailInfo: { flex: 1, marginLeft: 15 },
  detailAmount: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  detailTime: { color: '#444', fontSize: 12, marginTop: 4 },
  actionBtn: { width: 40, height: 40, backgroundColor: '#1c1c1e', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { alignItems: 'center', marginTop: 40, opacity: 0.4 },
  emptyText: { color: '#888', fontSize: 13, marginTop: 12 }
});