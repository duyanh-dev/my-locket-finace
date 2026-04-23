import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('finance.db');

export const initDatabase = () => {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount TEXT,
      currency TEXT, 
      amount_base REAL,
      imageUri TEXT,
      tag TEXT,
      date TEXT
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS tags (
      name TEXT PRIMARY KEY,
      icon TEXT,
      color TEXT,
      bgImage TEXT
    );
  `);

  try {
    const tableInfo: any = db.getAllSync("PRAGMA table_info(expenses)");
    const hasTag = tableInfo.some((col: any) => col.name === 'tag');
    const hasAmountBase = tableInfo.some((col: any) => col.name === 'amount_base');
    const hasCurrency = tableInfo.some((col: any) => col.name === 'currency');

    if (!hasCurrency) db.execSync("ALTER TABLE expenses ADD COLUMN currency TEXT DEFAULT 'VNĐ';");
    if (!hasAmountBase) db.execSync("ALTER TABLE expenses ADD COLUMN amount_base REAL DEFAULT 0;");
    if (!hasTag) db.execSync("ALTER TABLE expenses ADD COLUMN tag TEXT DEFAULT '';"); // MIGRATION TAG
  } catch (e) {
    console.log("Migration error:", e);
  }
};

// Thêm tham số tag vào hàm Add (mặc định là chuỗi rỗng)
export const addExpense = (amount: string, currency: string, amount_base: number, imageUri: string, tag: string = '') => {
  const date = new Date().toISOString();
  db.runSync(
    'INSERT INTO expenses (amount, currency, amount_base, imageUri, tag, date) VALUES (?, ?, ?, ?, ?, ?)',
    [amount, currency, amount_base, imageUri, tag, date]
  );
};

export const saveTag = (name: string, icon: string, color: string, bgImage: string) => {
  db.runSync(
    'INSERT OR REPLACE INTO tags (name, icon, color, bgImage) VALUES (?, ?, ?, ?)',
    [name, icon, color, bgImage]
  );
};

// Hàm lấy tất cả Tag
export const getAllTags = () => {
  return db.getAllSync('SELECT * FROM tags');
};

// Thêm tham số tag vào hàm Update
export const updateExpense = (id: number, amount: string, currency: string, amount_base: number, imageUri: string, tag: string = '') => {
  db.runSync(
    'UPDATE expenses SET amount = ?, currency = ?, amount_base = ?, imageUri = ?, tag = ? WHERE id = ?',
    [amount, currency, amount_base, imageUri, tag, id]
  );
};

export const deleteTag = (tagName: string) => {
  db.runSync('DELETE FROM tags WHERE name = ?', [tagName]);
  // Giữ lại món đồ nhưng gỡ tag ra để không mất dữ liệu chi tiêu
  db.runSync('UPDATE expenses SET tag = "" WHERE tag = ?', [tagName]);
};

// Hàm cập nhật Album (Bao gồm đổi tên): Cần update cả 2 bảng để không mất liên kết
export const updateTagFull = (oldName: string, newName: string, icon: string, color: string, bgImage: string) => {
  db.runSync(
    'INSERT OR REPLACE INTO tags (name, icon, color, bgImage) VALUES (?, ?, ?, ?)',
    [newName, icon, color, bgImage]
  );
  if (oldName !== newName) {
    db.runSync('DELETE FROM tags WHERE name = ?', [oldName]);
    db.runSync('UPDATE expenses SET tag = ? WHERE tag = ?', [newName, oldName]);
  }
};

export const getExpenses = () => {
  try { return db.getAllSync('SELECT * FROM expenses ORDER BY id DESC'); }
  catch (error) { return []; }
};

export const deleteExpense = (id: number) => {
  db.runSync('DELETE FROM expenses WHERE id = ?', [id]);
};