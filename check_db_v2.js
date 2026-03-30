import Database from 'better-sqlite3';
const db = new Database('pizza.db');
console.log('--- DB CHECK START ---');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', JSON.stringify(tables, null, 2));
try {
  const ordersCount = db.prepare("SELECT COUNT(*) as count FROM orders").get();
  console.log('Orders count:', ordersCount.count);
} catch (e) {
  console.log('Orders table error:', e.message);
}
try {
  const invoicesCount = db.prepare("SELECT COUNT(*) as count FROM invoices").get();
  console.log('Invoices count:', invoicesCount.count);
} catch (e) {
  console.log('Invoices table error:', e.message);
}
console.log('--- DB CHECK END ---');
