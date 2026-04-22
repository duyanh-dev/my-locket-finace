import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Currency {
  label: string;
  code: string;
  symbol: string;
  rate: number; // Tỷ giá so với VNĐ (Ví dụ: 1 USD = 25.500 VNĐ)
}

export const CURRENCIES: Currency[] = [
  { label: 'Việt Nam Đồng', code: 'VNĐ', symbol: 'đ', rate: 1 },
  { label: 'Đô la Úc', code: 'AUD', symbol: '$', rate: 16500 },
  { label: 'Đô la Mỹ', code: 'USD', symbol: '$', rate: 25500 }, // Giả sử tỷ giá 2026 là 25.5k
  { label: 'Euro', code: 'EUR', symbol: '€', rate: 27500 },
];

const STORAGE_KEY = '@user_currency_config';

// --- HELPER: Quy đổi tiền tệ động ---
export const convertCurrency = (amount: number, fromCode: string, toCode: string) => {
  const fromCurrency = CURRENCIES.find(c => c.code === fromCode) || CURRENCIES[0];
  const toCurrency = CURRENCIES.find(c => c.code === toCode) || CURRENCIES[0];

  if (fromCode === toCode) return amount;
  
  // Quy đổi: (Tiền gốc * Tỷ giá gốc) / Tỷ giá đích
  return (amount * fromCurrency.rate) / toCurrency.rate;
};

export const saveCurrencyConfig = async (currencyCode: string) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, currencyCode);
  } catch (e) {
    console.error("Lỗi lưu đơn vị tiền tệ:", e);
  }
};

export const getCurrencyConfig = async (): Promise<Currency> => {
  try {
    const code = await AsyncStorage.getItem(STORAGE_KEY);
    return CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
  } catch (e) {
    return CURRENCIES[0];
  }
};