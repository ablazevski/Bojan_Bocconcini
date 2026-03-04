import Database from 'better-sqlite3';
const db = new Database('pizza.db');
db.prepare('DELETE FROM campaign_codes').run();
db.prepare('DELETE FROM campaigns').run();
console.log('Campaigns cleared');
