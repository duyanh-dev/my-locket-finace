import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Dimensions, Image, LayoutAnimation, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { deleteExpense, getAllTags, getExpenses, initDatabase } from '../components/services/database';
import { CURRENCIES, Currency, convertCurrency, getCurrencyConfig } from '../components/services/settings_db';

const { width } = Dimensions.get('window');

export interface Expense { id: number; amount: string; currency: string; amount_base: number; imageUri: string; tag: string; date: string; }
export interface TagInfo { name: string; icon: string; color: string; }

export default function CalendarScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<Expense[]>([]);
  const [userTags, setUserTags] = useState<TagInfo[]>([]);
  const [currency, setCurrency] = useState<Currency>(CURRENCIES[0]);

  const TODAY = useMemo(() => new Date(), []);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(TODAY.toDateString());

  // State để quản lý những ngăn xếp (Tag) nào đang được mở
  const [expandedTags, setExpandedTags] = useState<string[]>([]);

  const loadData = async () => {
    initDatabase();
    const config = await getCurrencyConfig();
    setCurrency(config);
    const data = (getExpenses() as Expense[]) || [];
    const tags = (getAllTags() as TagInfo[]) || [];
    setHistory(data);
    setUserTags(tags);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const toggleTagStack = (tagName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (expandedTags.includes(tagName)) {
      setExpandedTags(expandedTags.filter(t => t !== tagName));
    } else {
      setExpandedTags([...expandedTags, tagName]);
    }
  };

  const changeMonth = (offset: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    setCurrentDate(newDate);
    setSelectedDate(newDate.getMonth() === TODAY.getMonth() && newDate.getFullYear() === TODAY.getFullYear() ? TODAY.toDateString() : newDate.toDateString());
    setExpandedTags([]); // Reset khi đổi tháng
  };

  const goToday = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCurrentDate(new Date(TODAY));
    setSelectedDate(TODAY.toDateString());
    setExpandedTags([]);
  };

  const confirmDeleteItem = (id: number) => {
    Alert.alert("Xác nhận xóa", "Món chi tiêu này sẽ biến mất vĩnh viễn đó bạn nhé!", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa luôn", style: "destructive", onPress: () => { deleteExpense(id); loadData(); } }
    ]);
  };

  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startDayOfMonth = new Date(year, month, 1).getDay();
    const emptySlots = startDayOfMonth === 0 ? 6 : startDayOfMonth - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < emptySlots; i++) { days.push({ day: null, dateStr: null }); }
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push({ day: i, dateStr: d.toDateString() });
    }
    return days;
  }, [currentDate]);

  // Nhóm chi tiêu của ngày được chọn theo TAG
  const groupedExpenses = useMemo(() => {
    const dayExpenses = history.filter(ex => new Date(ex.date).toDateString() === selectedDate);
    const groups: Record<string, Expense[]> = {};
    dayExpenses.forEach(item => {
      const tagKey = item.tag || "Chưa phân loại";
      if (!groups[tagKey]) groups[tagKey] = [];
      groups[tagKey].push(item);
    });
    return groups;
  }, [history, selectedDate]);

  const totalOfDayConverted = history
    .filter(ex => new Date(ex.date).toDateString() === selectedDate)
    .reduce((sum, item) => sum + convertCurrency(Number(item.amount), item.currency, currency.code), 0);

  const formatDisplay = (num: number) => num.toLocaleString('vi-VN', { maximumFractionDigits: currency.code === 'VNĐ' ? 0 : 2, minimumFractionDigits: 0 });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}><Ionicons name="chevron-back" size={20} color="#FFD700" /></TouchableOpacity>
        <TouchableOpacity onPress={goToday} style={styles.titleContainer} activeOpacity={0.7}>
          <Text style={styles.monthTitle}>THÁNG {currentDate.getMonth() + 1}</Text>
          <Text style={styles.yearTitle}>{currentDate.getFullYear()}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}><Ionicons name="chevron-forward" size={20} color="#FFD700" /></TouchableOpacity>
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
                <TouchableOpacity key={index} disabled={!item.day} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); if (item.dateStr) setSelectedDate(item.dateStr); }}
                  style={[styles.dayCell, isSelected && styles.selectedDayCell, isToday && styles.todayBorder]}>
                  {!item.day ? null : expenseOfDay ? (
                    <Image source={{ uri: expenseOfDay.imageUri }} style={styles.dayThumb} />
                  ) : (
                    <View style={[styles.dayCircle, isToday && styles.todayCircle]}>
                      <Text style={[styles.dayText, isSelected && styles.selectedDayText, isToday && styles.todayText]}>{item.day}</Text>
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
            <Text style={styles.detailsDateText}>{new Date(selectedDate).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })}</Text>
            <View style={styles.totalBadge}><Text style={styles.detailsTotal}>{formatDisplay(totalOfDayConverted)} {currency.symbol}</Text></View>
          </View>

          {Object.keys(groupedExpenses).length > 0 ? (
            Object.keys(groupedExpenses).map(tagName => {
              const items = groupedExpenses[tagName];
              const tagInfo = userTags.find(t => t.name === tagName);
              const isExpanded = expandedTags.includes(tagName);
              const stackTotal = items.reduce((sum, it) => sum + convertCurrency(Number(it.amount), it.currency, currency.code), 0);

              return (
                <View key={tagName} style={styles.stackGroup}>
                  {!isExpanded ? (
                    <TouchableOpacity style={styles.stackCard} onPress={() => toggleTagStack(tagName)} activeOpacity={0.8}>
                      <View style={styles.visualStack}>
                        {/* Các lớp ảnh giả lập ngăn xếp */}
                        {items.length > 2 && <View style={[styles.stackLayer, styles.layer3]} />}
                        {items.length > 1 && <View style={[styles.stackLayer, styles.layer2]} />}
                        <Image source={{ uri: items[0].imageUri }} style={styles.stackImageMain} />
                        {tagName !== "Chưa phân loại" && (
                          <View style={[styles.tagIconBadge, { backgroundColor: tagInfo?.color ?? '#FFD700' }]}>
                            <Ionicons name={(tagInfo?.icon as any) ?? "pricetag"} size={10} color="#000" />
                          </View>
                        )}
                      </View>
                      <View style={styles.stackInfo}>
                        <Text style={styles.stackTitle}>{tagName.toUpperCase()}</Text>
                        <Text style={styles.stackCount}>{items.length} món chi tiêu</Text>
                      </View>
                      <View style={styles.stackPriceBox}>
                        <Text style={styles.stackPrice}>{formatDisplay(stackTotal)} {currency.symbol}</Text>
                        <Ionicons name="chevron-down" size={16} color="#444" />
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.expandedContainer}>
                      <TouchableOpacity style={styles.expandedHeader} onPress={() => toggleTagStack(tagName)}>
                        <Text style={[styles.stackTitle, { color: tagInfo?.color ?? '#FFD700' }]}>{tagName.toUpperCase()}</Text>
                        <Ionicons name="chevron-up" size={16} color="#FFD700" />
                      </TouchableOpacity>

                      {items.map(item => {
                        const displayVal = convertCurrency(Number(item.amount), item.currency, currency.code);
                        return (
                          <View key={item.id} style={styles.detailCard}>
                            <Image source={{ uri: item.imageUri }} style={styles.detailThumb} />
                            <View style={styles.detailInfo}>
                              <Text style={styles.detailAmount}>{formatDisplay(displayVal)} {currency.symbol}</Text>
                              <Text style={styles.detailTime}>{new Date(item.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</Text>
                            </View>
                            <View style={styles.actionGroup}>
                              <TouchableOpacity onPress={() => router.push({ pathname: '/modal', params: { editId: item.id.toString(), oldAmount: item.amount, oldImage: item.imageUri, oldCurrency: item.currency, oldTag: item.tag } })} style={styles.miniActionBtn}>
                                <Ionicons name="pencil" size={14} color="#FFD700" />
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => confirmDeleteItem(item.id)} style={[styles.miniActionBtn, { marginLeft: 10 }]}><Ionicons name="trash-outline" size={14} color="#FF6B6B" /></TouchableOpacity>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <View style={styles.emptyBox}><Ionicons name="sunny-outline" size={40} color="#222" /><Text style={styles.emptyText}>Ngày này bạn chưa chi tiêu gì hết</Text></View>
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
  detailsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  detailsDateText: { color: '#555', fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  totalBadge: { backgroundColor: 'rgba(255, 215, 0, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  detailsTotal: { color: '#FFD700', fontSize: 16, fontWeight: '900' },

  // STACK STYLES
  stackGroup: { marginBottom: 15 },
  stackCard: { flexDirection: 'row', backgroundColor: '#222224', padding: 12, borderRadius: 28, alignItems: 'center', height: 85 },
  visualStack: { width: 60, height: 60, position: 'relative' },
  stackImageMain: { width: 60, height: 60, borderRadius: 20, zIndex: 10, borderWidth: 1, borderColor: '#333' },
  stackLayer: { position: 'absolute', width: 55, height: 55, borderRadius: 18, backgroundColor: '#333', borderWidth: 1, borderColor: '#444' },
  layer2: { top: -4, left: 4, zIndex: 5, opacity: 0.6 },
  layer3: { top: -8, left: 8, zIndex: 1, opacity: 0.3 },
  tagIconBadge: { position: 'absolute', bottom: -5, right: -5, width: 22, height: 22, borderRadius: 11, zIndex: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#222224' },

  stackInfo: { flex: 1, marginLeft: 20 },
  stackTitle: { color: '#fff', fontSize: 15, fontWeight: '900' },
  stackCount: { color: '#555', fontSize: 11, marginTop: 4, fontWeight: '700' },
  stackPriceBox: { alignItems: 'flex-end', gap: 5 },
  stackPrice: { color: '#FFD700', fontSize: 14, fontWeight: '800' },

  // EXPANDED STYLES
  expandedContainer: { backgroundColor: 'rgba(34, 34, 36, 0.5)', borderRadius: 30, padding: 10, borderWidth: 1, borderColor: '#2c2c2e' },
  expandedHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: '#333', marginBottom: 10 },

  detailCard: { flexDirection: 'row', backgroundColor: '#1c1c1e', padding: 12, borderRadius: 25, alignItems: 'center', marginBottom: 10 },
  detailThumb: { width: 50, height: 50, borderRadius: 18 },
  detailInfo: { flex: 1, marginLeft: 15 },
  detailAmount: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  detailTime: { color: '#444', fontSize: 11, marginTop: 2 },
  actionGroup: { flexDirection: 'row', alignItems: 'center' },
  miniActionBtn: { width: 34, height: 34, backgroundColor: '#222', borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },

  emptyBox: { alignItems: 'center', marginTop: 40, opacity: 0.4 },
  emptyText: { color: '#888', fontSize: 13, marginTop: 12 }
});