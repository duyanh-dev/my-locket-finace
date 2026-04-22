import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Currency {
  label: string;
  code: string;
  symbol: string;
}

export const CURRENCIES: Currency[] = [
  { label: 'Việt Nam Đồng', code: 'VNĐ', symbol: 'đ' },
  { label: 'Đô la Úc', code: 'AUD', symbol: '$' },
  { label: 'Đô la Mỹ', code: 'USD', symbol: '$' },
  { label: 'Euro', code: 'EUR', symbol: '€' },
];

const STORAGE_KEY = '@user_currency_config';

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