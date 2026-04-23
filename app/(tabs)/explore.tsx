import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, View, Text, TouchableOpacity, FlatList, 
  Image, Dimensions, Modal, TextInput, ScrollView, Alert,
  KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, LayoutAnimation
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { 
  getExpenses, getAllTags, saveTag, initDatabase, 
  deleteTag, updateTagFull, deleteExpense 
} from '../../database';
import { getCurrencyConfig, Currency, CURRENCIES } from '../../settings_db';

const { width, height } = Dimensions.get('window');
const ITEM_WIDTH = (width - 60) / 2; // Tính toán để grid cân đối

interface Expense { id: number; amount: string; currency: string; amount_base: number; imageUri: string; tag: string; date: string; }
interface TagInfo { name: string; icon: string; color: string; bgImage: string; totalBase: number; count: number; }

const ICON_LIST = ['cart', 'restaurant', 'airplane', 'car', 'gift', 'cafe', 'game-controller', 'fitness', 'briefcase', 'home', 'heart', 'shirt'];
const COLOR_LIST = ['#FFD700', '#FF6B6B', '#4D96FF', '#6BCB77', '#AC70FF', '#F94C10', '#00DFA2', '#FFFFFF'];

export default function ExploreScreen() {
  const router = useRouter();
  const [currency, setCurrency] = useState<Currency>(CURRENCIES[0]);
  const [albums, setAlbums] = useState<TagInfo[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [itemsInTag, setItemsInTag] = useState<Expense[]>([]);

  const [isModalOpen, setModalOpen] = useState(false);
  const [isEditAlbum, setIsEditAlbum] = useState(false);
  const [oldTagName, setOldTagName] = useState('');
  const [newName, setNewName] = useState('');
  const [selIcon, setSelIcon] = useState('cart');
  const [selColor, setSelColor] = useState('#FFD700');
  const [selBg, setSelBg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      initDatabase();
      const config = await getCurrencyConfig();
      setCurrency(config);
      const allExp = (getExpenses() as any[]) || [];
      const allTags = (getAllTags() as any[]) || [];
      
      const tagData = allTags.map(t => {
        const related = allExp.filter(e => e.tag === t.name);
        const totalBase = related.reduce((sum, item) => sum + (Number(item.amount_base) || 0), 0);
        return { name: t.name, icon: t.icon, color: t.color, bgImage: t.bgImage, totalBase, count: related.length };
      });
      setAlbums(tagData);

      if (selectedTag) {
        setItemsInTag(allExp.filter(i => i.tag === selectedTag));
      }
    } catch (err: any) {
      console.error("Load error:", err.message);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, [selectedTag]));

  const toggleModal = (show: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setModalOpen(show);
  };

  const handleSaveAlbum = () => {
    if (!newName.trim()) return;
    if (isEditAlbum) updateTagFull(oldTagName, newName.trim(), selIcon, selColor, selBg || '');
    else saveTag(newName.trim(), selIcon, selColor, selBg || '');
    toggleModal(false);
    resetForm();
    loadData();
  };

  const resetForm = () => {
    setNewName(''); setSelIcon('cart'); setSelColor('#FFD700'); setSelBg(null); setIsEditAlbum(false);
  };

  const openEditAlbum = (album: TagInfo) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsEditAlbum(true);
    setOldTagName(album.name);
    setNewName(album.name);
    setSelIcon(album.icon);
    setSelColor(album.color);
    setSelBg(album.bgImage);
    toggleModal(true);
  };

  const confirmDeleteAlbum = (name: string) => {
    Alert.alert("Xóa Album?", `Mục "${name}" sẽ bị xóa, ảnh vẫn còn ở màn hình chính.`, [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa", style: "destructive", onPress: () => { deleteTag(name); loadData(); } }
    ]);
  };

  const confirmDeleteItem = (id: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Xác nhận xóa", "Món chi tiêu này sẽ biến mất vĩnh viễn đó ông Anh!", [
      { text: "Hủy", style: "cancel" },
      { text: "Xóa luôn", style: "destructive", onPress: () => { deleteExpense(id); loadData(); } }
    ]);
  };

  const formatDisplay = (num: number) => {
    return num.toLocaleString('vi-VN', { 
        maximumFractionDigits: currency.code === 'VNĐ' ? 0 : 2,
        minimumFractionDigits: 0 
    });
  };

  const renderRightActions = (album: TagInfo) => (
    <View style={styles.swipeActions}>
      <TouchableOpacity style={[styles.swipeBtn, { backgroundColor: '#222' }]} onPress={() => openEditAlbum(album)}>
        <Ionicons name="pencil" size={20} color={album.color} />
      </TouchableOpacity>
      <TouchableOpacity style={[styles.swipeBtn, { backgroundColor: '#FF6B6B' }]} onPress={() => confirmDeleteAlbum(album.name)}>
        <Ionicons name="trash" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  if (selectedTag) {
    const info = albums.find(a => a.name === selectedTag);
    return (
      <View style={styles.container}>
        <View style={styles.fixedBg}>
          <Image source={info?.bgImage ? { uri: info.bgImage } : undefined} style={StyleSheet.absoluteFill} blurRadius={30} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
        </View>

        <View style={styles.albumHeader}>
          <TouchableOpacity onPress={() => setSelectedTag(null)}><Ionicons name="chevron-back" size={30} color={info?.color ?? '#FFD700'} /></TouchableOpacity>
          <View style={styles.albumTitleBox}>
            <Text style={styles.albumTitle}>{selectedTag.toUpperCase()}</Text>
            <Text style={[styles.albumSub, { color: info?.color ?? '#FFD700' }]}>
              {formatDisplay((info?.totalBase ?? 0) / currency.rate)} {currency.symbol}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.albumAddBtn, { backgroundColor: info?.color ?? '#FFD700' }]} 
            onPress={() => router.push({ pathname: '/modal', params: { tag: selectedTag } })}
          >
            <Ionicons name="camera" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        <FlatList
          key="album-grid"
          data={itemsInTag}
          numColumns={2}
          contentContainerStyle={styles.gridContent}
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              <TouchableOpacity 
                activeOpacity={0.9}
                onPress={() => router.push({ pathname: '/modal', params: { editId: item.id.toString(), oldAmount: item.amount, oldImage: item.imageUri, oldCurrency: item.currency, oldTag: item.tag } })}
              >
                <View style={styles.imageWrapper}>
                    <Image source={{ uri: item.imageUri }} style={styles.itemImg} />
                    {/* GIÁ TIỀN NỔI BẬT NẰM TRONG ẢNH */}
                    <View style={styles.itemPriceBadge}>
                        <Text style={styles.itemPriceText}>{formatDisplay(item.amount_base / currency.rate)}{currency.symbol}</Text>
                    </View>
                </View>
              </TouchableOpacity>

              {/* NÚT XÓA SỬA NẰM NGOÀI ĐỂ DỄ CLICK - GIỐNG INDEX */}
              <View style={styles.itemActionRow}>
                <TouchableOpacity 
                    style={styles.actionBtn} 
                    onPress={() => router.push({ pathname: '/modal', params: { editId: item.id.toString(), oldAmount: item.amount, oldImage: item.imageUri, oldCurrency: item.currency, oldTag: item.tag } })}
                >
                  <Ionicons name="pencil" size={16} color="#FFD700" />
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.actionBtn, { marginLeft: 10 }]} 
                    onPress={() => confirmDeleteItem(item.id)}
                >
                  <Ionicons name="trash" size={16} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Khám phá</Text>
          <TouchableOpacity onPress={() => { resetForm(); toggleModal(true); }}>
            <Ionicons name="add-circle" size={38} color="#FFD700" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={albums}
          keyExtractor={(item) => item.name}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <Swipeable renderRightActions={() => renderRightActions(item)} overshootRight={false}>
              <TouchableOpacity 
                activeOpacity={0.8}
                style={styles.albumCard} 
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedTag(item.name); }}
              >
                <Image source={item.bgImage ? { uri: item.bgImage } : undefined} style={styles.cardBg} blurRadius={15} />
                <View style={[styles.cardOverlay, { backgroundColor: item.bgImage ? 'rgba(0,0,0,0.6)' : '#222224' }]} />
                <View style={[styles.iconBox, { backgroundColor: item.color + '20' }]}>
                  <Ionicons name={item.icon as any} size={24} color={item.color} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{item.name.toUpperCase()}</Text>
                  <Text style={styles.cardStats}>{item.count} món • {formatDisplay(item.totalBase / currency.rate)} {currency.symbol}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={item.color + '80'} />
              </TouchableOpacity>
            </Swipeable>
          )}
        />

        <Modal visible={isModalOpen} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1, justifyContent: 'flex-end' }}
            >
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.modalContent}>
                  <View style={styles.modalTop}>
                    <Text style={styles.modalTitle}>{isEditAlbum ? "Sửa Album" : "Album mới"}</Text>
                    <TouchableOpacity onPress={() => toggleModal(false)}><Ionicons name="close-circle" size={30} color="#444" /></TouchableOpacity>
                  </View>
                  
                  <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <TextInput style={styles.input} placeholder="Tên album..." placeholderTextColor="#555" value={newName} onChangeText={setNewName} />
                    <Text style={styles.label}>BIỂU TƯỢNG & MÀU SẮC</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                      {ICON_LIST.map(i => (
                        <TouchableOpacity key={i} style={[styles.iconPick, selIcon === i && { backgroundColor: selColor }]} onPress={() => setSelIcon(i)}>
                          <Ionicons name={i as any} size={20} color={selIcon === i ? "#000" : "#888"} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 30 }}>
                      {COLOR_LIST.map(c => (
                        <TouchableOpacity key={c} style={[styles.colorPick, { backgroundColor: c }, selColor === c && styles.colorActive]} onPress={() => setSelColor(c)} />
                      ))}
                    </ScrollView>
                    <View style={styles.imgActionRow}>
                      <TouchableOpacity style={styles.imgActionBtn} onPress={() => ImagePicker.launchCameraAsync({quality:0.6}).then(res => !res.canceled && setSelBg(res.assets[0].uri))}><Ionicons name="camera" size={18} color="#FFD700" /><Text style={styles.imgText}>CHỤP</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.imgActionBtn} onPress={() => ImagePicker.launchImageLibraryAsync({quality:0.6}).then(res => !res.canceled && setSelBg(res.assets[0].uri))}><Ionicons name="image" size={18} color="#FFD700" /><Text style={styles.imgText}>KHO ẢNH</Text></TouchableOpacity>
                    </View>
                    {selBg && <Image source={{ uri: selBg }} style={styles.preview} blurRadius={10} />}
                    <TouchableOpacity style={[styles.createBtn, { backgroundColor: selColor }]} onPress={handleSaveAlbum}>
                      <Text style={styles.createBtnText}>XÁC NHẬN</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#161618' },
  fixedBg: { ...StyleSheet.absoluteFillObject, zIndex: -1 },
  header: { marginTop: 60, paddingHorizontal: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { color: '#fff', fontSize: 34, fontWeight: '900' },
  listContainer: { paddingHorizontal: 20, paddingBottom: 150 },
  albumCard: { height: 95, borderRadius: 28, marginBottom: 15, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, overflow: 'hidden' },
  cardBg: { ...StyleSheet.absoluteFillObject },
  cardOverlay: { ...StyleSheet.absoluteFillObject },
  iconBox: { width: 48, height: 48, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  cardInfo: { flex: 1 },
  cardName: { color: '#fff', fontSize: 18, fontWeight: '900' },
  cardStats: { color: '#888', fontSize: 12, marginTop: 4 },
  swipeActions: { flexDirection: 'row', width: 140, marginBottom: 15, marginLeft: 10 },
  swipeBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 25, marginHorizontal: 2 },
  
  albumHeader: { marginTop: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 25 },
  albumTitleBox: { flex: 1, alignItems: 'center' },
  albumTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  albumSub: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  albumAddBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

  // GRID OPTIMIZED
  gridContent: { paddingHorizontal: 20, paddingBottom: 100 },
  itemCard: { width: ITEM_WIDTH, marginBottom: 25, marginRight: 20 },
  imageWrapper: { borderRadius: 28, overflow: 'hidden', position: 'relative' },
  itemImg: { width: '100%', aspectRatio: 1 },
  
  // GIÁ TIỀN TRONG ẢNH
  itemPriceBadge: { 
    position: 'absolute', 
    bottom: 12, 
    left: 12, 
    backgroundColor: 'rgba(0,0,0,0.75)', 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 12 
  },
  itemPriceText: { color: '#fff', fontSize: 12, fontWeight: '900' },

  // NÚT BẤM NGOÀI ẢNH (ĐỒNG BỘ INDEX)
  itemActionRow: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginTop: 12 
  },
  actionBtn: { 
    width: 38, 
    height: 38, 
    borderRadius: 19, 
    backgroundColor: '#222', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333'
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  modalContent: { backgroundColor: '#1c1c1e', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 30, maxHeight: height * 0.85 },
  modalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: '900' },
  input: { backgroundColor: '#2c2c2e', color: '#fff', padding: 20, borderRadius: 20, fontSize: 16, marginBottom: 25 },
  label: { color: '#555', fontSize: 10, fontWeight: 'bold', marginBottom: 15, letterSpacing: 1 },
  iconPick: { width: 45, height: 45, borderRadius: 22, backgroundColor: '#2c2c2e', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  colorPick: { width: 35, height: 35, borderRadius: 18, marginRight: 15 },
  colorActive: { borderWidth: 2, borderColor: '#fff' },
  imgActionRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  imgActionBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#2c2c2e', padding: 15, borderRadius: 18, justifyContent: 'center', alignItems: 'center', gap: 8 },
  imgText: { color: '#FFD700', fontSize: 11, fontWeight: 'bold' },
  preview: { width: '100%', height: 120, borderRadius: 20, marginBottom: 20 },
  createBtn: { padding: 20, borderRadius: 22, alignItems: 'center', marginTop: 10 },
  createBtnText: { color: '#000', fontWeight: '900', fontSize: 16 }
});