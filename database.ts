import * as SQLite from 'expo-sqlite';

// 1. Mở hoặc tạo file database trong máy iPhone
const db = SQLite.openDatabaseSync('finance.db');

// 2. Khởi tạo bảng nếu chưa có
export const initDatabase = () => {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount TEXT,
      imageUri TEXT,
      date TEXT
    );
  `);
};

// 3. Thêm mới một khoản chi tiêu
export const addExpense = (amount: string, imageUri: string) => {
  const date = new Date().toISOString();
  db.runSync(
    'INSERT INTO expenses (amount, imageUri, date) VALUES (?, ?, ?)',
    [amount, imageUri, date]
  );
};

// 4. Lấy toàn bộ danh sách chi tiêu (Sắp xếp mới nhất lên đầu)
export const getExpenses = () => {
  try {
    return db.getAllSync('SELECT * FROM expenses ORDER BY id DESC');
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu:", error);
    return [];
  }
};

// 5. Xóa một khoản chi tiêu dựa trên ID
export const deleteExpense = (id: number) => {
  try {
    db.runSync('DELETE FROM expenses WHERE id = ?', [id]);
    console.log(`Đã xóa ID: ${id}`);
  } catch (error) {
    console.error("Lỗi khi xóa dữ liệu:", error);
  }
};

// 6. Cập nhật (Sửa) một khoản chi tiêu đã có
export const updateExpense = (id: number, amount: string, imageUri: string) => {
  try {
    db.runSync(
      'UPDATE expenses SET amount = ?, imageUri = ? WHERE id = ?',
      [amount, imageUri, id]
    );
    console.log(`Đã cập nhật ID: ${id}`);
  } catch (error) {
    console.error("Lỗi khi cập nhật dữ liệu:", error);
  }
};