import Database from 'better-sqlite3';
try {
  const db = new Database('pizza.db');
  console.log('Database opened successfully');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables:', tables.map(t => (t as any).name));
  db.close();
} catch (e) {
  console.error('Failed to open database:', e);
  process.exit(1);
}
