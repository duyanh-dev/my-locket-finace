import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('finance.db');

export const initDatabase = () => {
  // 1. Tạo bảng cơ bản trước
  db.execSync(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount TEXT,
      currency TEXT, 
      imageUri TEXT,
      date TEXT
    );
  `);

  // 2. ÉP THÊM CỘT: Dùng cách này cho chắc chắn
  try {
    // Kiểm tra xem cột amount_base đã tồn tại chưa
    const tableInfo: any = db.getAllSync("PRAGMA table_info(expenses)");
    const hasAmountBase = tableInfo.some((col: any) => col.name === 'amount_base');
    const hasCurrency = tableInfo.some((col: any) => col.name === 'currency');

    if (!hasCurrency) {
      db.execSync("ALTER TABLE expenses ADD COLUMN currency TEXT DEFAULT 'VNĐ';");
    }
    if (!hasAmountBase) {
      db.execSync("ALTER TABLE expenses ADD COLUMN amount_base REAL DEFAULT 0;");
    }
  } catch (e) {
    console.log("Migration error:", e);
  }
};

export const addExpense = (amount: string, currency: string, amount_base: number, imageUri: string) => {
  const date = new Date().toISOString();
  db.runSync(
    'INSERT INTO expenses (amount, currency, amount_base, imageUri, date) VALUES (?, ?, ?, ?, ?)',
    [amount, currency, amount_base, imageUri, date]
  );
};

export const updateExpense = (id: number, amount: string, currency: string, amount_base: number, imageUri: string) => {
  db.runSync(
    'UPDATE expenses SET amount = ?, currency = ?, amount_base = ?, imageUri = ? WHERE id = ?',
    [amount, currency, amount_base, imageUri, id]
  );
};

export const getExpenses = () => {
  try { return db.getAllSync('SELECT * FROM expenses ORDER BY id DESC'); }
  catch (error) { return []; }
};

export const deleteExpense = (id: number) => {
  db.runSync('DELETE FROM expenses WHERE id = ?', [id]);
};