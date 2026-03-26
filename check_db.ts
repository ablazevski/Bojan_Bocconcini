import Database from 'better-sqlite3';
const db = new Database('pizza.db');
const invoices = db.prepare('SELECT * FROM invoices').all();
console.log(JSON.stringify(invoices, null, 2));
const restaurants = db.prepare('SELECT id, username, name FROM restaurants').all();
console.log(JSON.stringify(restaurants, null, 2));
