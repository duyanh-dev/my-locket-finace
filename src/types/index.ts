// src/types/index.ts

export interface Currency {
  label: string;
  code: string;
  symbol: string;
  rate: number;
}

export interface Expense {
  id: number;
  amount: string;
  currency: string;
  amount_base: number;
  imageUri: string;
  tag: string;
  date: string;
}

export interface TagInfo {
  name: string;
  icon: string;
  color: string;
}