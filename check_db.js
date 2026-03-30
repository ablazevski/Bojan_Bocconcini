import Database from 'better-sqlite3';
const db = new Database('pizza.db');
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
try {
  const admins = db.prepare("SELECT * FROM admins").all();
  console.log('Admins count:', admins.length);
} catch (e) {
  console.log('Admins table error:', e.message);
}
