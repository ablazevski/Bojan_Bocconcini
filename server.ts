import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import Database from "better-sqlite3";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";
import session from "express-session";
import SQLiteStore from "better-sqlite3-session-store";
const SqliteStore = SQLiteStore(session);
import axios from "axios";
import nodemailer from "nodemailer";
import handlebars from "handlebars";
import webpush from "web-push";

const db = new Database('pizza.db');

// Create tables first
db.exec(`
  CREATE TABLE IF NOT EXISTS global_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
  
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    subscription TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE,
    email TEXT UNIQUE,
    name TEXT,
    role TEXT DEFAULT 'customer',
    loyalty_points INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER,
    name TEXT,
    description TEXT,
    price REAL,
    image_url TEXT,
    category TEXT,
    subcategory TEXT,
    modifiers TEXT,
    is_available INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    delivery_address TEXT,
    delivery_lat REAL,
    delivery_lng REAL,
    items TEXT,
    total_price REAL,
    status TEXT DEFAULT 'pending',
    delivery_code TEXT,
    delivery_partner_id INTEGER,
    delivery_partner_name TEXT,
    spare_1 TEXT,
    spare_2 TEXT,
    spare_3 TEXT,
    tracking_token TEXT,
    user_id INTEGER,
    payment_method TEXT,
    selected_fees TEXT,
    delivery_fee REAL,
    payment_status TEXT DEFAULT 'pending',
    payment_transaction_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS bundles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id INTEGER,
      name TEXT,
      description TEXT,
      price REAL,
      image_url TEXT,
      status TEXT DEFAULT 'pending',
      start_time TEXT,
      end_time TEXT,
      available_days TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bundle_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bundle_id INTEGER,
      menu_item_id INTEGER,
      quantity INTEGER DEFAULT 1,
      modifiers TEXT DEFAULT '[]'
    );
  `);

  try {
    db.exec("ALTER TABLE bundle_items ADD COLUMN modifiers TEXT DEFAULT '[]'");
  } catch (e) {}

  db.exec(`
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    restaurant_id INTEGER,
    customer_name TEXT,
    rating INTEGER,
    comment TEXT,
    is_visible INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS restaurants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      city TEXT,
      address TEXT,
      email TEXT,
      phone TEXT,
      bank_account TEXT,
      has_own_delivery INTEGER,
      delivery_zones TEXT,
      lat REAL,
      lng REAL,
      spare_1 TEXT,
      spare_2 TEXT,
      spare_3 TEXT,
      spare_4 TEXT,
      header_image TEXT,
      status TEXT DEFAULT 'pending',
      username TEXT,
      password TEXT,
      contract_percentage REAL DEFAULT 0,
      working_hours TEXT DEFAULT '{}',
      billing_cycle_days INTEGER DEFAULT 7,
      vat_rate REAL DEFAULT 0,
      edb TEXT,
      delivery_fee REAL DEFAULT 0,
      min_order_amount REAL DEFAULT 0
    );
  `);

  try {
    db.exec("ALTER TABLE restaurants ADD COLUMN edb TEXT");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE restaurants ADD COLUMN header_image TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE restaurants ADD COLUMN billing_cycle_days INTEGER DEFAULT 7");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE restaurants ADD COLUMN vat_rate REAL DEFAULT 0");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE restaurants ADD COLUMN delivery_fee REAL DEFAULT 0");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE restaurants ADD COLUMN min_order_amount REAL DEFAULT 0");
  } catch (e) {}

  db.exec(`
  CREATE TABLE IF NOT EXISTS email_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    subject TEXT,
    body TEXT,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS email_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_name TEXT,
    recipient TEXT,
    subject TEXT,
    status TEXT,
    error TEXT,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS delivery_partners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    city TEXT,
    address TEXT,
    email TEXT,
    phone TEXT,
    bank_account TEXT,
    working_hours TEXT DEFAULT '{}',
    preferred_restaurants TEXT DEFAULT '[]',
    delivery_methods TEXT DEFAULT '[]',
    status TEXT DEFAULT 'pending',
    role TEXT DEFAULT 'rider',
    fleet_manager_id INTEGER,
    username TEXT,
    password TEXT,
    has_signed_contract INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS marketing_associates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    company_name TEXT,
    contact_person TEXT,
    phone TEXT,
    bank_account TEXT,
    address TEXT,
    city TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    associate_id INTEGER,
    name TEXT,
    description TEXT,
    budget REAL,
    start_date TEXT,
    end_date TEXT,
    location_type TEXT,
    selected_cities TEXT DEFAULT '[]',
    map_zones TEXT DEFAULT '[]',
    status TEXT DEFAULT 'pending',
    quantity INTEGER DEFAULT 0,
    code_format TEXT,
    is_visible INTEGER DEFAULT 1,
    restaurant_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER,
    invoice_number TEXT,
    period_start DATETIME,
    period_end DATETIME,
    total_amount REAL,
    commission_amount REAL,
    net_amount REAL,
    base_amount REAL,
    vat_amount REAL,
    contract_percentage REAL,
    vat_rate REAL,
    status TEXT DEFAULT 'Draft',
    type TEXT DEFAULT 'calculation',
    parent_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  `);

  try {
    db.exec("UPDATE invoices SET status = 'Draft' WHERE status = 'draft'");
    db.exec("UPDATE invoices SET status = 'Pending' WHERE status = 'pending'");
    db.exec("UPDATE invoices SET status = 'Approved' WHERE status = 'approved'");
    db.exec("UPDATE invoices SET status = 'Paid' WHERE status = 'paid'");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE invoices ADD COLUMN invoice_number TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE invoices ADD COLUMN total_amount REAL");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE invoices ADD COLUMN contract_percentage REAL");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE invoices ADD COLUMN vat_rate REAL");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE invoices ADD COLUMN type TEXT DEFAULT 'calculation'");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE invoices ADD COLUMN parent_id INTEGER");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE invoices ADD COLUMN base_amount REAL");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE invoices ADD COLUMN vat_amount REAL");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE invoices ADD COLUMN commission_amount REAL");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE invoices ADD COLUMN net_amount REAL");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE invoices ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE invoices ADD COLUMN spare_1 TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE invoices ADD COLUMN spare_2 TEXT");
  } catch (e) {}

  db.exec(`
  CREATE TABLE IF NOT EXISTS invoice_orders (
    invoice_id INTEGER,
    order_id INTEGER,
    PRIMARY KEY (invoice_id, order_id)
  );
  `);

  db.exec(`
  CREATE TABLE IF NOT EXISTS group_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER,
    creator_name TEXT,
    creator_email TEXT,
    code TEXT UNIQUE,
    status TEXT DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS group_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_order_id INTEGER,
    user_name TEXT,
    item_id INTEGER,
    item_name TEXT,
    price REAL,
    quantity INTEGER,
    modifiers TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS campaign_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER,
    code TEXT UNIQUE,
    is_used INTEGER DEFAULT 0,
    used_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(campaign_id) REFERENCES campaigns(id)
  );

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    name TEXT,
    email TEXT,
    role TEXT DEFAULT 'admin',
    permissions TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS home_slider (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    image_url TEXT NOT NULL,
    cta_text TEXT,
    cta_link TEXT,
    display_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration for users role
try { db.exec('ALTER TABLE users ADD COLUMN role TEXT DEFAULT "customer"'); } catch (e) {}

// Migration for home_slider title
try { db.exec('ALTER TABLE home_slider ADD COLUMN title TEXT'); } catch (e) {}

// Ensure admin role for specific user
try {
  db.prepare("UPDATE users SET role = 'admin' WHERE email = 'aleksandar.busav@gmail.com'").run();
} catch (e) {}

// Default super admin
try {
  const superAdmin = db.prepare("SELECT * FROM admins WHERE username = 'superadmin'").get() as any;
  if (!superAdmin) {
    db.prepare("INSERT INTO admins (username, password, name, email, role, permissions) VALUES (?, ?, ?, ?, ?, ?)")
      .run('superadmin', 'admin123', 'Super Admin', 'aleksandar.busav@gmail.com', 'super', JSON.stringify(['restaurants', 'delivery', 'marketing', 'invoices', 'reviews', 'settings', 'admins', 'email', 'database', 'orders', 'invoicing', 'billing', 'users', 'campaigns', 'dashboard']));
  } else if (superAdmin.role !== 'super') {
    db.prepare("UPDATE admins SET role = 'super', permissions = ? WHERE username = 'superadmin'")
      .run(JSON.stringify(['restaurants', 'delivery', 'marketing', 'invoices', 'reviews', 'settings', 'admins', 'email', 'database', 'orders', 'invoicing', 'billing', 'users', 'campaigns', 'dashboard']));
  }
} catch (e) {}

// Migration for subcategory and modifiers
try { db.exec('ALTER TABLE menu_items ADD COLUMN subcategory TEXT DEFAULT "Општо"'); } catch (e) {}
try { db.exec('ALTER TABLE menu_items ADD COLUMN modifiers TEXT DEFAULT "[]"'); } catch (e) {}

// Migration for orders table
try { db.exec('ALTER TABLE orders ADD COLUMN user_id INTEGER'); } catch (e) {}
try { db.exec('ALTER TABLE orders ADD COLUMN payment_method TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE orders ADD COLUMN selected_fees TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE orders ADD COLUMN delivery_fee REAL'); } catch (e) {}
try { db.exec('ALTER TABLE menu_items ADD COLUMN is_available INTEGER DEFAULT 1'); } catch (e) {}

// Migration for orders
try { db.exec('ALTER TABLE orders ADD COLUMN delivery_code TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE orders ADD COLUMN spare_1 TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE orders ADD COLUMN spare_2 TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE orders ADD COLUMN spare_3 TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE orders ADD COLUMN delivery_partner_id INTEGER'); } catch (e) {}
try { db.exec('ALTER TABLE orders ADD COLUMN delivery_partner_name TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE orders ADD COLUMN user_id INTEGER'); } catch (e) {}
try { db.exec('ALTER TABLE orders ADD COLUMN tracking_token TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE orders ADD COLUMN ready_at DATETIME'); } catch (e) {}
try { db.exec('ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT "cash"'); } catch (e) {}
try { db.exec('ALTER TABLE orders ADD COLUMN selected_fees TEXT DEFAULT "[]"'); } catch (e) {}
try { db.exec('ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT "pending"'); } catch (e) {}
try { db.exec('ALTER TABLE orders ADD COLUMN payment_transaction_id TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE orders ADD COLUMN accepted_at DATETIME'); } catch (e) {}
try { db.exec('ALTER TABLE orders ADD COLUMN picked_up_at DATETIME'); } catch (e) {}
try { db.exec('ALTER TABLE orders ADD COLUMN delivered_at DATETIME'); } catch (e) {}

// Migration for restaurants
try { db.exec('ALTER TABLE restaurants ADD COLUMN contract_percentage REAL DEFAULT 0'); } catch (e) {}
try { db.exec('ALTER TABLE restaurants ADD COLUMN working_hours TEXT DEFAULT "{}"'); } catch (e) {}
try { db.exec('ALTER TABLE restaurants ADD COLUMN spare_4 TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE restaurants ADD COLUMN logo_url TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE restaurants ADD COLUMN cover_url TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE restaurants ADD COLUMN payment_config TEXT DEFAULT \'{"methods":["cash"],"fees":[]}\''); } catch (e) {}

// Migration for delivery partners
try { db.exec('ALTER TABLE delivery_partners ADD COLUMN has_signed_contract INTEGER DEFAULT 0'); } catch (e) {}
try { db.exec('ALTER TABLE delivery_partners ADD COLUMN role TEXT DEFAULT "rider"'); } catch (e) {}
try { db.exec('ALTER TABLE delivery_partners ADD COLUMN fleet_manager_id INTEGER'); } catch (e) {}
try { db.exec('ALTER TABLE delivery_partners ADD COLUMN username TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE delivery_partners ADD COLUMN password TEXT'); } catch (e) {}
try { db.exec("UPDATE delivery_partners SET has_signed_contract = 1 WHERE spare_4 = 'signed'"); } catch (e) {}

// Migration for campaigns
try { db.exec('ALTER TABLE campaigns ADD COLUMN is_visible INTEGER DEFAULT 1'); } catch (e) {}
try { db.exec('ALTER TABLE campaigns ADD COLUMN restaurant_id INTEGER'); } catch (e) {}

// Migration for delivery partners
try { db.exec('ALTER TABLE delivery_partners ADD COLUMN delivery_methods TEXT DEFAULT "[]"'); } catch (e) {}
try { db.exec('ALTER TABLE delivery_partners ADD COLUMN role TEXT DEFAULT "rider"'); } catch (e) {}
try { db.exec('ALTER TABLE delivery_partners ADD COLUMN fleet_manager_id INTEGER'); } catch (e) {}

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// VAPID keys should be generated once and stored in global_settings
const getVapidKeys = () => {
  let publicKey = db.prepare('SELECT value FROM global_settings WHERE key = ?').get('vapid_public_key') as any;
  let privateKey = db.prepare('SELECT value FROM global_settings WHERE key = ?').get('vapid_private_key') as any;

  if (!publicKey || !privateKey) {
    const keys = webpush.generateVAPIDKeys();
    db.prepare('INSERT OR REPLACE INTO global_settings (key, value) VALUES (?, ?)').run('vapid_public_key', keys.publicKey);
    db.prepare('INSERT OR REPLACE INTO global_settings (key, value) VALUES (?, ?)').run('vapid_private_key', keys.privateKey);
    publicKey = { value: keys.publicKey };
    privateKey = { value: keys.privateKey };
  }

  return {
    publicKey: publicKey.value,
    privateKey: privateKey.value
  };
};

const vapidKeys = getVapidKeys();
webpush.setVapidDetails(
  'mailto:aleksandar.busav@gmail.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

async function sendPushNotification(userId: number | null, payload: any, orderId?: number) {
  let subscriptions;
  if (userId) {
    subscriptions = db.prepare('SELECT subscription FROM push_subscriptions WHERE user_id = ?').all(userId);
  } else if (orderId) {
    // If no userId, try to find subscriptions associated with the email in the order
    const order = db.prepare('SELECT customer_email FROM orders WHERE id = ?').get(orderId) as any;
    if (order?.customer_email) {
      const user = db.prepare('SELECT id FROM users WHERE email = ?').get(order.customer_email) as any;
      if (user) {
        subscriptions = db.prepare('SELECT subscription FROM push_subscriptions WHERE user_id = ?').all(user.id);
      }
    }
  }

  if (!subscriptions) return;

  for (const sub of subscriptions as any[]) {
    try {
      await webpush.sendNotification(JSON.parse(sub.subscription), JSON.stringify(payload));
    } catch (error: any) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        // Subscription has expired or is no longer valid
        db.prepare('DELETE FROM push_subscriptions WHERE subscription = ?').run(sub.subscription);
      } else {
        console.error('Error sending push notification:', error);
      }
    }
  }
}
// Seed initial templates if they don't exist
const seedTemplates = [
  {
    name: 'order_confirmation',
    subject: 'Потврда за вашата нарачка #{{order_id}}',
    body: '<h1>Здраво {{customer_name}},</h1><p>Вашата нарачка е успешно примена.</p><p>Вкупна сума: {{total_price}} ден.</p><p>Ресторан: {{restaurant_name}}</p><p>Благодариме што нарачувате преку PizzaTime!</p>',
    description: 'Се испраќа до купувачот по успешна нарачка'
  },
  {
    name: 'new_order_alert',
    subject: 'Нова нарачка пристигна! #{{order_id}}',
    body: '<h1>Нова нарачка!</h1><p>Имате нова нарачка од {{customer_name}}.</p><p>Вкупна сума: {{total_price}} ден.</p><p>Ве молиме проверете го вашиот панел за детали.</p>',
    description: 'Се испраќа до ресторанот кога ќе пристигне нова нарачка'
  },
  {
    name: 'registration_welcome',
    subject: 'Добредојдовте во PizzaTime!',
    body: '<h1>Здраво {{customer_name}},</h1><p>Добредојдовте во најголемата мрежа за достава на храна.</p><p>Уживајте во вашите омилени јадења!</p>',
    description: 'Се испраќа до купувачот по регистрација'
  },
  {
    name: 'restaurant_registration',
    subject: 'Успешна апликација за ресторан: {{restaurant_name}}',
    body: '<h1>Здраво,</h1><p>Вашата апликација за ресторанот {{restaurant_name}} е успешно примена.</p><p>Нашиот тим ќе ја прегледа и ќе ве контактира наскоро.</p>',
    description: 'Се испраќа до сопственикот на ресторан по аплицирање'
  },
  {
    name: 'delivery_registration',
    subject: 'Успешна апликација за доставувач: {{partner_name}}',
    body: '<h1>Здраво,</h1><p>Вашата апликација за доставувач е успешно примена.</p><p>Нашиот тим ќе ве контактира за понатамошни чекори.</p>',
    description: 'Се испраќа до доставувачот по аплицирање'
  },
  {
    name: 'order_delivering',
    subject: 'Вашата нарачка #{{order_id}} е на пат!',
    body: '<h1>Здраво {{customer_name}},</h1><p>Вашата нарачка од {{restaurant_name}} е преземена и е на пат кон вас.</p><p>Можете да ја следите во реално време на овој линк: <a href="{{tracking_url}}">Следи нарачка</a></p><p>Благодариме што нарачувате преку PizzaTime!</p>',
    description: 'Се испраќа до купувачот кога нарачката ќе тргне во достава'
  },
  {
    name: 'order_completed',
    subject: 'Вашата нарачка #{{order_id}} е доставена!',
    body: '<h1>Здраво {{customer_name}},</h1><p>Вашата нарачка е успешно доставена. Се надеваме дека ќе уживате во храната!</p><p>Ве молиме оставете рецензија за вашето искуство: <a href="{{tracking_url}}">Остави рецензија</a></p><p>Благодариме што нарачувате преку PizzaTime!</p>',
    description: 'Се испраќа до купувачот по успешна достава'
  },
  {
    name: 'delivery_approval',
    subject: 'Вашата апликација за доставувач е ОДОБРЕНА!',
    body: '<h1>Честитки {{partner_name}}!</h1><p>Вашата апликација за доставувач е одобрена од нашиот тим.</p><p>Вашите податоци за најава се:</p><ul><li>Корисничко име: {{username}}</li><li>Лозинка: {{password}}</li></ul><p>Ве молиме прочитајте го и потпишете го договорот за соработка на следниот линк: <a href="{{contract_url}}">Договор за соработка</a></p><p>По потпишувањето, ќе можете да започнете со достава.</p><p>Добредојдовте во тимот!</p>',
    description: 'Се испраќа до доставувачот по одобрување од админ'
  }
];

const insertTemplate = db.prepare('INSERT OR IGNORE INTO email_templates (name, subject, body, description) VALUES (?, ?, ?, ?)');
seedTemplates.forEach(t => insertTemplate.run(t.name, t.subject, t.body, t.description));

try { db.exec('ALTER TABLE delivery_partners ADD COLUMN current_lat REAL'); } catch (e) {}
try { db.exec('ALTER TABLE delivery_partners ADD COLUMN current_lng REAL'); } catch (e) {}
try { db.exec('ALTER TABLE delivery_partners ADD COLUMN last_location_update DATETIME'); } catch (e) {}

// Seed data if empty
const count = db.prepare('SELECT COUNT(*) as count FROM menu_items').get() as {count: number};
if (count.count === 0) {
  const insert = db.prepare('INSERT INTO menu_items (restaurant_id, name, description, price, image_url, category, subcategory, modifiers) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  
  const pizzaModifiers = JSON.stringify([
    {
      name: "Големина",
      type: "single",
      options: [
        { name: "Мала", price: 0 },
        { name: "Средна", price: 100 },
        { name: "Голема", price: 200 }
      ]
    },
    {
      name: "Додатоци",
      type: "multiple",
      options: [
        { name: "Сусам", price: 20 },
        { name: "Јајце", price: 30 },
        { name: "Екстра кашкавал", price: 50 }
      ]
    }
  ]);

  insert.run(1, 'Капричиоза', 'Печурки, шунка, кашкавал, доматен сос, оригано', 350, 'https://picsum.photos/seed/capri/400/300', 'Храна', 'Пица', pizzaModifiers);
  insert.run(1, 'Маргарита', 'Кашкавал, доматен сос, маслиново масло, босилек', 280, 'https://picsum.photos/seed/marg/400/300', 'Храна', 'Пица', pizzaModifiers);
  insert.run(1, 'Цезар Салата', 'Марула, пилешко, пармезан, крутони, цезар сос', 220, 'https://picsum.photos/seed/caesar/400/300', 'Храна', 'Салата', '[]');
  insert.run(1, 'Кечап', 'Доматен кечап', 30, 'https://picsum.photos/seed/ketchup/400/300', 'Додатоци', 'Сосови', '[]');
  insert.run(1, 'Кока Кола 0.33l', 'Газиран сок', 80, 'https://picsum.photos/seed/cola/400/300', 'Пијалоци', 'Безалкохолни', '[]');
}

// Seed one approved restaurant for demo purposes
const restCount = db.prepare('SELECT COUNT(*) as count FROM restaurants').get() as {count: number};
if (restCount.count === 0) {
  db.prepare(`INSERT INTO restaurants (name, city, address, email, phone, bank_account, has_own_delivery, status, username, password, lat, lng) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    'Demo Pizza', 'Скопје', 'Ул. Македонија 1', 'demo@pizza.mk', '070123456', '210000000000001', 1, 'approved', 'demo', 'demo123', 41.9981, 21.4254
  );
}

  async function startServer() {
    const app = express();
    app.set('trust proxy', true);
    
    // Middleware to force HTTPS headers because we are always behind an HTTPS proxy
    app.use((req, res, next) => {
      req.headers['x-forwarded-proto'] = 'https';
      next();
    });
    const httpServer = createServer(app);
    const io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    const PORT = 3000;

    io.on("connection", (socket) => {
      console.log("A user connected:", socket.id);

      socket.on("join_restaurant", (restaurantId) => {
        socket.join(`restaurant_${restaurantId}`);
        console.log(`Socket ${socket.id} joined restaurant_${restaurantId}`);
      });

      socket.on("join_order", (token) => {
        socket.join(`order_${token}`);
        console.log(`Socket ${socket.id} joined order_${token}`);
      });

      socket.on("join_delivery", (data) => {
        socket.join("delivery_partners");
        if (data && typeof data === 'object') {
          if (data.id) socket.join(`delivery_${data.id}`);
          if (Array.isArray(data.restaurantIds)) {
            data.restaurantIds.forEach((rid: number) => {
              socket.join(`delivery_restaurant_${rid}`);
            });
          }
        } else if (data) {
          socket.join(`delivery_${data}`);
        }
        console.log(`Socket ${socket.id} joined delivery rooms`);
      });

      socket.on("join_admin", () => {
        socket.join("admin_room");
        console.log(`Socket ${socket.id} joined admin_room`);
      });

      socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
      });
    });
  
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true }));
    app.use(session({
      store: new SqliteStore({
        client: db,
        expired: {
          clear: true,
          intervalMs: 900000 // 15 minutes
        }
      }),
      name: 'pizza.sid',
      secret: process.env.SESSION_SECRET || 'pizza-loyalty-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        secure: true,
        sameSite: 'none',
        httpOnly: true,
      },
      proxy: true
    }));

    // Debug middleware for sessions
    app.use((req, res, next) => {
      if (req.path.startsWith('/api/restaurant') || req.path.startsWith('/api/restaurants/login') || req.path.startsWith('/api/admin')) {
        const hasRestaurant = !!(req.session as any).restaurant;
        const hasAdmin = !!(req.session as any).admin;
        const hasUser = !!(req.session as any).user;
        const restaurantId = hasRestaurant ? (req.session as any).restaurant.id : 'N/A';
        const adminId = hasAdmin ? (req.session as any).admin.id : 'N/A';
        const userEmail = hasUser ? (req.session as any).user.email : 'N/A';
        const proto = req.headers['x-forwarded-proto'] || 'N/A';
        const host = req.headers.host || 'N/A';
        const isSecure = req.secure;
        
        console.log(`[SESSION DEBUG] Path: ${req.path}, Method: ${req.method}, HasRestaurant: ${hasRestaurant}, HasAdmin: ${hasAdmin}, HasUser: ${hasUser}, AdminID: ${adminId}, UserEmail: ${userEmail}, Secure: ${isSecure}`);
        console.log(`[SESSION DEBUG] Proto: ${proto}, Host: ${host}, CookieHeader: ${req.headers.cookie ? 'Present' : 'Missing'}`);
        if (req.headers.cookie) {
          console.log(`[SESSION DEBUG] Cookie Header: ${req.headers.cookie}`);
        }
        console.log(`[SESSION DEBUG] Session Data: ${JSON.stringify(req.session)}`);
      }
      next();
    });

    // Google OAuth Routes
    app.get('/api/auth/google/url', (req, res) => {
      if (!process.env.GOOGLE_CLIENT_ID) {
        return res.status(500).json({ error: 'Google Client ID is not configured' });
      }
      const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
      const options = {
        redirect_uri: `${process.env.APP_URL}/api/auth/google/callback`,
        client_id: process.env.GOOGLE_CLIENT_ID,
        access_type: 'offline',
        response_type: 'code',
        prompt: 'consent',
        scope: [
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/userinfo.email',
        ].join(' '),
      };

      const qs = new URLSearchParams(options);
      res.json({ url: `${rootUrl}?${qs.toString()}` });
    });

    app.get('/api/auth/google/callback', async (req, res) => {
      const code = req.query.code as string;
      if (!process.env.GOOGLE_CLIENT_SECRET) {
        return res.status(500).send('Google Client Secret is not configured');
      }

      try {
        const { data } = await axios.post('https://oauth2.googleapis.com/token', {
          code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: `${process.env.APP_URL}/api/auth/google/callback`,
          grant_type: 'authorization_code',
        });

        const { access_token } = data;
        const { data: googleUser } = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${access_token}` },
        });

        // Upsert user
        let user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleUser.id) as any;
        if (!user) {
          const result = db.prepare('INSERT INTO users (google_id, email, name) VALUES (?, ?, ?)').run(googleUser.id, googleUser.email, googleUser.name);
          user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
          
          // Send welcome email
          sendEmail('registration_welcome', googleUser.email, { customer_name: googleUser.name }).catch(console.error);
        } else {
          db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(googleUser.name, googleUser.email, user.id);
        }

        // Super admin fallback
        if (googleUser.email === 'aleksandar.busav@gmail.com') {
          db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', user.id);
          user.role = 'admin';
        }

        (req.session as any).user = user;

        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
          }
          res.send(`
            <html>
              <body>
                <script>
                  if (window.opener) {
                    window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                    window.close();
                  } else {
                    window.location.href = '/admin';
                  }
                </script>
                <p>Authentication successful. This window should close automatically.</p>
              </body>
            </html>
          `);
        });
      } catch (error) {
        console.error('Google OAuth error:', error);
        res.status(500).send('Authentication failed');
      }
    });

    app.get('/api/auth/me', (req, res) => {
      const user = (req.session as any).user;
      if (user) {
        // Refresh user data from DB to get latest loyalty points
        const freshUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
        res.json(freshUser);
      } else {
        res.status(401).json({ error: 'Not authenticated' });
      }
    });

    app.post('/api/auth/logout', (req, res) => {
      req.session = null;
      res.json({ success: true });
    });

    app.get("/api/customer/home-slider", (req, res) => {
    const items = db.prepare("SELECT * FROM home_slider WHERE is_active = 1 ORDER BY display_order ASC").all();
    res.json(items);
  });

  app.get("/api/admin/home-slider", (req, res) => {
    const items = db.prepare("SELECT * FROM home_slider ORDER BY display_order ASC").all();
    res.json(items);
  });

  app.post("/api/admin/home-slider", (req, res) => {
    console.log('POST /api/admin/home-slider body:', req.body);
    const { id, title, image_url, cta_text, cta_link, display_order, is_active } = req.body;
    if (id) {
      db.prepare("UPDATE home_slider SET title = ?, image_url = ?, cta_text = ?, cta_link = ?, display_order = ?, is_active = ? WHERE id = ?")
        .run(title, image_url, cta_text, cta_link, display_order || 0, is_active === undefined ? 1 : is_active, id);
      res.json({ success: true });
    } else {
      const result = db.prepare("INSERT INTO home_slider (title, image_url, cta_text, cta_link, display_order, is_active) VALUES (?, ?, ?, ?, ?, ?)")
        .run(title, image_url, cta_text, cta_link, display_order || 0, is_active === undefined ? 1 : is_active);
      res.json({ success: true, id: result.lastInsertRowid });
    }
  });

  app.delete("/api/admin/home-slider/:id", (req, res) => {
    db.prepare("DELETE FROM home_slider WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/admin/users", (req, res) => {
      if (!checkAdminAuth(req, res, 'users')) return;
      const users = db.prepare("SELECT * FROM users ORDER BY created_at DESC").all();
      res.json(users);
    });

    app.post("/api/admin/users", (req, res) => {
      if (!checkAdminAuth(req, res, 'users')) return;
      const { name, email } = req.body;
      try {
        db.prepare("INSERT INTO users (name, email) VALUES (?, ?)").run(name, email);
        res.json({ success: true });
      } catch (e) {
        res.status(400).json({ error: 'Email already exists' });
      }
    });

    // Tracking Endpoints
    // Group Orders API
app.post("/api/group-orders", (req, res) => {
  const { restaurant_id, creator_name, creator_email } = req.body;
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  try {
    const result = db.prepare(`
      INSERT INTO group_orders (restaurant_id, creator_name, creator_email, code)
      VALUES (?, ?, ?, ?)
    `).run(restaurant_id, creator_name, creator_email, code);
    
    res.json({ id: result.lastInsertRowid, code });
  } catch (error) {
    res.status(500).json({ error: "Failed to create group order" });
  }
});

app.get("/api/group-orders/:code", (req, res) => {
  const { code } = req.params;
  
  const groupOrder = db.prepare("SELECT * FROM group_orders WHERE code = ?").get(code);
  if (!groupOrder) return res.status(404).json({ error: "Group order not found" });
  
  const items = db.prepare("SELECT * FROM group_order_items WHERE group_order_id = ?").all(groupOrder.id);
  
  res.json({ ...groupOrder, items });
});

app.post("/api/group-orders/:code/items", (req, res) => {
  const { code } = req.params;
  const { user_name, item_id, item_name, price, quantity, modifiers } = req.body;
  
  const groupOrder = db.prepare("SELECT id, status FROM group_orders WHERE code = ?").get(code);
  if (!groupOrder) return res.status(404).json({ error: "Group order not found" });
  if (groupOrder.status !== 'open') return res.status(400).json({ error: "Group order is closed" });
  
  try {
    db.prepare(`
      INSERT INTO group_order_items (group_order_id, user_name, item_id, item_name, price, quantity, modifiers)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(groupOrder.id, user_name, item_id, item_name, price, quantity, JSON.stringify(modifiers));
    
    // Notify participants via socket
    io.to(`group_${code}`).emit('group_order_updated');
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to add item" });
  }
});

app.delete("/api/group-orders/:code/items/:itemId", (req, res) => {
  const { code, itemId } = req.params;
  
  const groupOrder = db.prepare("SELECT id, status FROM group_orders WHERE code = ?").get(code);
  if (!groupOrder) return res.status(404).json({ error: "Group order not found" });
  if (groupOrder.status !== 'open') return res.status(400).json({ error: "Group order is closed" });
  
  try {
    db.prepare("DELETE FROM group_order_items WHERE id = ? AND group_order_id = ?").run(itemId, groupOrder.id);
    
    io.to(`group_${code}`).emit('group_order_updated');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to remove item" });
  }
});

app.post("/api/group-orders/:code/finalize", (req, res) => {
  const { code } = req.params;
  const { customer_phone, delivery_address, delivery_lat, delivery_lng } = req.body;
  
  const groupOrder = db.prepare("SELECT * FROM group_orders WHERE code = ?").get(code);
  if (!groupOrder) return res.status(404).json({ error: "Group order not found" });
  if (groupOrder.status !== 'open') return res.status(400).json({ error: "Group order already finalized" });
  
  const items = db.prepare("SELECT * FROM group_order_items WHERE group_order_id = ?").all(groupOrder.id);
  if (items.length === 0) return res.status(400).json({ error: "No items in group order" });
  
  try {
    // Calculate total price
    const totalPrice = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    
    // Create the actual order
    const trackingToken = crypto.randomBytes(16).toString('hex');
    const deliveryCode = Math.floor(1000 + Math.random() * 9000).toString();
    
    const deliveryFeeSetting = db.prepare("SELECT value FROM global_settings WHERE key = 'delivery_fee'").get() as any;
    const deliveryFee = deliveryFeeSetting ? Number(deliveryFeeSetting.value) : 0;
    
    const orderResult = db.prepare(`
      INSERT INTO orders (
        restaurant_id, customer_name, customer_email, customer_phone, 
        delivery_address, delivery_lat, delivery_lng, items, total_price, 
        tracking_token, delivery_code, spare_1, delivery_fee
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      groupOrder.restaurant_id, 
      groupOrder.creator_name, 
      groupOrder.creator_email, 
      customer_phone,
      delivery_address,
      delivery_lat,
      delivery_lng,
      JSON.stringify(items.map(i => ({
        id: i.item_id,
        name: i.item_name,
        price: i.price,
        quantity: i.quantity,
        modifiers: JSON.parse(i.modifiers),
        user_name: i.user_name // Keep track of who ordered what
      }))),
      totalPrice + deliveryFee,
      trackingToken,
      deliveryCode,
      'group', // Mark as group order
      deliveryFee
    );
    
    // Update group order status
    db.prepare("UPDATE group_orders SET status = 'placed' WHERE id = ?").run(groupOrder.id);
    
    io.to(`group_${code}`).emit('group_order_finalized', { trackingToken });
    
    res.json({ success: true, trackingToken });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to finalize group order" });
  }
});

app.get("/api/orders/track/:token", (req, res) => {
      const order = db.prepare(`
        SELECT o.*, r.name as restaurant_name, r.phone as restaurant_phone, r.address as restaurant_address, r.lat as restaurant_lat, r.lng as restaurant_lng
        FROM orders o
        JOIN restaurants r ON o.restaurant_id = r.id
        WHERE o.tracking_token = ?
      `).get(req.params.token) as any;
      
      if (!order) {
        return res.status(404).json({ error: "Нарачката не е пронајдена" });
      }

      // Calculate ETA if order is in delivery
      if ((order.status === 'delivering' || order.status === 'ready') && order.restaurant_lat && order.restaurant_lng && order.delivery_lat && order.delivery_lng) {
        // Simple distance calculation (Haversine)
        const R = 6371; // Earth radius in km
        const dLat = (order.delivery_lat - order.restaurant_lat) * Math.PI / 180;
        const dLon = (order.delivery_lng - order.restaurant_lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(order.restaurant_lat * Math.PI / 180) * Math.cos(order.delivery_lat * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

        // Assume average speed 30km/h
        const travelTimeMinutes = Math.round((distance / 30) * 60);
        // Add some buffer for traffic
        order.eta_minutes = travelTimeMinutes + 5;
        
        // If it's ready but not yet delivering, it's still about 20 mins away
        if (order.status === 'ready') {
          order.eta_minutes = Math.max(20, order.eta_minutes);
        }
      } else if (order.status === 'accepted' || order.status === 'preparing') {
        // Assume 30 mins preparation time initially
        order.eta_minutes = 30;
      }
      
      res.json(order);
    });

    app.get("/api/orders/track-by-code/:code", (req, res) => {
      const { code } = req.params;
      if (!code || code.length < 4) {
        return res.status(400).json({ error: "Невалиден код" });
      }
      // Search for orders where tracking_token ends with the code
      const order = db.prepare("SELECT tracking_token FROM orders WHERE tracking_token LIKE ? ORDER BY created_at DESC LIMIT 1").get(`%${code.toUpperCase()}`) as any;
      if (!order) {
        return res.status(404).json({ error: "Нарачката не е пронајдена" });
      }
      res.json({ token: order.tracking_token });
    });

    app.post("/api/orders/track/:token/complete", (req, res) => {
      const order = db.prepare("SELECT * FROM orders WHERE tracking_token = ?").get(req.params.token) as any;
      if (!order) {
        return res.status(404).json({ error: "Нарачката не е пронајдена" });
      }
      
      if (order.status === 'completed') {
        return res.json({ success: true, message: "Нарачката е веќе затворена" });
      }

      db.prepare("UPDATE orders SET status = 'completed', delivered_at = CURRENT_TIMESTAMP WHERE id = ?").run(order.id);
      
      // Notify admin
      io.to("admin_room").emit("order_status_changed");
      
      // Award loyalty points
      if (order.user_id) {
        const points = Math.floor(order.total_price / 100);
        db.prepare("UPDATE users SET loyalty_points = loyalty_points + ? WHERE id = ?").run(points, order.user_id);
      }
      
      res.json({ success: true });
    });

    app.use('/uploads', express.static(uploadDir));
  
    // Email Service Helper
    const sendEmail = async (templateName: string, recipient: string, data: any) => {
      const settings = db.prepare('SELECT * FROM global_settings').all();
      const s = settings.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});

      if (!s.smtp_host || !s.smtp_user || !s.smtp_pass) {
        console.warn('SMTP settings not configured. Skipping email.');
        return;
      }

      const template = db.prepare('SELECT * FROM email_templates WHERE name = ? AND is_active = 1').get(templateName) as any;
      if (!template) {
        console.warn(`Email template ${templateName} not found or inactive.`);
        return;
      }

      try {
        const transporter = nodemailer.createTransport({
          host: s.smtp_host,
          port: parseInt(s.smtp_port || '587'),
          secure: s.smtp_secure === 'true',
          auth: {
            user: s.smtp_user,
            pass: s.smtp_pass
          }
        });

        const subjectTemplate = handlebars.compile(template.subject);
        const bodyTemplate = handlebars.compile(template.body);

        const subject = subjectTemplate(data);
        const body = bodyTemplate(data);

        await transporter.sendMail({
          from: s.smtp_from || s.smtp_user,
          to: recipient,
          subject: subject,
          html: body
        });

        db.prepare('INSERT INTO email_logs (template_name, recipient, subject, status) VALUES (?, ?, ?, ?)')
          .run(templateName, recipient, subject, 'sent');
      } catch (error: any) {
        console.error('Failed to send email:', error);
        db.prepare('INSERT INTO email_logs (template_name, recipient, subject, status, error) VALUES (?, ?, ?, ?, ?)')
          .run(templateName, recipient, template.subject, 'failed', error.message);
      }
    };

    // Email Management Routes
    app.post('/api/push/subscribe', (req, res) => {
      const { subscription } = req.body;
      const user = (req.session as any).user;
      
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      try {
        db.prepare('INSERT OR REPLACE INTO push_subscriptions (user_id, subscription) VALUES (?, ?)')
          .run(user.id, JSON.stringify(subscription));
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: 'Failed to subscribe' });
      }
    });

    app.get('/api/push/key', (req, res) => {
      res.json({ publicKey: vapidKeys.publicKey });
    });

    app.get('/sitemap.xml', (req, res) => {
      const restaurants = db.prepare("SELECT username FROM restaurants WHERE status = 'approved'").all() as any[];
      const baseUrl = process.env.APP_URL || 'http://localhost:3000';
      
      let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${baseUrl}/</loc><priority>1.0</priority></url>
  <url><loc>${baseUrl}/register-restaurant</loc><priority>0.8</priority></url>
  <url><loc>${baseUrl}/register-delivery</loc><priority>0.8</priority></url>`;

      restaurants.forEach(r => {
        sitemap += `
  <url><loc>${baseUrl}/r/${r.username}</loc><priority>0.9</priority></url>`;
      });

      sitemap += `
</urlset>`;
      
      res.header('Content-Type', 'application/xml');
      res.send(sitemap);
    });

    app.get('/manifest.json', (req, res) => {
      const settings = db.prepare('SELECT * FROM global_settings').all() as any[];
      const s = settings.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});

      const manifest = {
        "name": s.company_name || "PizzaTime - Достава на храна",
        "short_name": s.company_name || "PizzaTime",
        "description": "Најбрза достава на храна во Македонија",
        "start_url": "/",
        "display": "standalone",
        "orientation": "portrait",
        "background_color": "#fff7ed",
        "theme_color": "#ea580c",
        "icons": [
          {
            "src": s.app_icon_url || "https://api.dicebear.com/7.x/initials/png?seed=PT&backgroundColor=ea580c",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any"
          },
          {
            "src": s.app_icon_url || "https://api.dicebear.com/7.x/initials/png?seed=PT&backgroundColor=ea580c",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "any"
          },
          {
            "src": s.app_icon_url || "https://api.dicebear.com/7.x/initials/png?seed=PT&backgroundColor=ea580c",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "maskable"
          }
        ]
      };

      res.header('Content-Type', 'application/manifest+json');
      res.json(manifest);
    });

    function checkAdminAuth(req: any, res: any, permission?: string) {
      const admin = req.session.admin;
      const user = req.session.user;

      // Allow Google OAuth super admin (fallback)
      if (user && user.email === 'aleksandar.busav@gmail.com') {
        return true;
      }

      if (!admin) {
        console.log(`[AUTH DEBUG] Unauthorized access attempt to ${req.path}. Session ID: ${req.sessionID}, HasUser: ${!!user}, UserEmail: ${user?.email}`);
        res.status(401).json({ error: 'Unauthorized' });
        return false;
      }

      if (admin.role === 'super') return true;

      if (permission) {
        let permissions = admin.permissions;
        if (typeof permissions === 'string') {
          try {
            permissions = JSON.parse(permissions);
          } catch (e) {
            permissions = [];
          }
        }
        if (!Array.isArray(permissions) || !permissions.includes(permission)) {
          res.status(403).json({ error: 'Forbidden: No permission for ' + permission });
          return false;
        }
      }

      return true;
    }

    app.get('/api/email/templates', (req, res) => {
      if (!checkAdminAuth(req, res, 'email')) return;
      try {
        const templates = db.prepare('SELECT * FROM email_templates').all();
        res.json(templates);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch templates' });
      }
    });

    app.put('/api/email/templates/:id', (req, res) => {
      if (!checkAdminAuth(req, res, 'email')) return;
      const { subject, body, is_active } = req.body;
      db.prepare('UPDATE email_templates SET subject = ?, body = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(subject, body, is_active ? 1 : 0, req.params.id);
      res.json({ success: true });
    });

    app.get('/api/email/logs', (req, res) => {
      if (!checkAdminAuth(req, res, 'email')) return;
      const logs = db.prepare('SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 100').all();
      res.json(logs);
    });

    app.post('/api/admin/login', (req, res) => {
      const { username, password } = req.body;
      const admin = db.prepare('SELECT * FROM admins WHERE username = ? AND password = ?').get(username, password) as any;
      if (admin) {
        (req.session as any).admin = admin;
        req.session.save((err) => {
          if (err) {
            console.error('Admin session save error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
          }
          res.json({ success: true, admin });
        });
      } else {
        res.status(401).json({ error: 'Невалидно корисничко име или лозинка' });
      }
    });

    app.get('/api/admin/me', (req, res) => {
      const admin = (req.session as any).admin;
      const user = (req.session as any).user;

      if (admin) {
        const freshAdmin = db.prepare('SELECT * FROM admins WHERE id = ?').get(admin.id);
        if (freshAdmin) {
          return res.json(freshAdmin);
        }
      }
      
      if (user && user.email === 'aleksandar.busav@gmail.com') {
        return res.json({
          id: 0,
          username: 'superadmin',
          name: user.name || 'Super Admin',
          email: user.email,
          role: 'super',
          permissions: '["*"]'
        });
      }

      res.status(401).json({ error: 'Unauthorized' });
    });

    app.post('/api/admin/logout', (req, res) => {
      (req.session as any).admin = null;
      res.json({ success: true });
    });

    app.get('/api/admin/admins', (req, res) => {
      if (!checkAdminAuth(req, res, 'admins')) return;
      const admins = db.prepare('SELECT id, username, name, email, role, permissions, created_at FROM admins').all();
      res.json(admins);
    });

    app.post('/api/admin/admins', (req, res) => {
      if (!checkAdminAuth(req, res, 'admins')) return;
      const { username, password, name, email, role, permissions } = req.body;
      try {
        db.prepare('INSERT INTO admins (username, password, name, email, role, permissions) VALUES (?, ?, ?, ?, ?, ?)')
          .run(username, password, name, email, role || 'admin', JSON.stringify(permissions || []));
        res.json({ success: true });
      } catch (e) {
        res.status(400).json({ error: 'Username already exists' });
      }
    });

    app.put('/api/admin/admins/:id', (req, res) => {
      if (!checkAdminAuth(req, res, 'admins')) return;
      const { name, email, role, permissions, password } = req.body;
      if (password) {
        db.prepare('UPDATE admins SET name = ?, email = ?, role = ?, permissions = ?, password = ? WHERE id = ?')
          .run(name, email, role, JSON.stringify(permissions), password, req.params.id);
      } else {
        db.prepare('UPDATE admins SET name = ?, email = ?, role = ?, permissions = ? WHERE id = ?')
          .run(name, email, role, JSON.stringify(permissions), req.params.id);
      }
      res.json({ success: true });
    });

    app.delete('/api/admin/admins/:id', (req, res) => {
      if (!checkAdminAuth(req, res, 'admins')) return;
      db.prepare("DELETE FROM admins WHERE id = ? AND role != 'super'").run(req.params.id);
      res.json({ success: true });
    });

    // Simple log collector for debugging
    const debugLogs: string[] = [];
    const originalLog = console.log;
    console.log = (...args) => {
      const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      debugLogs.push(`[${new Date().toISOString()}] ${msg}`);
      if (debugLogs.length > 200) debugLogs.shift();
      originalLog.apply(console, args);
    };

    app.get('/api/debug/logs', (req, res) => {
      res.send(`
        <html>
          <body style="background: #1a1a1a; color: #00ff00; font-family: monospace; padding: 20px;">
            <h2>Server Debug Logs</h2>
            <button onclick="location.reload()">Refresh</button>
            <pre>${debugLogs.reverse().join('\n')}</pre>
          </body>
        </html>
      `);
    });

    // Debug route to check invoices
    app.get('/api/debug/invoices', (req, res) => {
      try {
        const invoices = db.prepare("SELECT * FROM invoices").all();
        const restaurants = db.prepare("SELECT id, name FROM restaurants").all();
        res.json({ invoices, restaurants });
      } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
      }
    });

    // Invoicing Routes
    app.get('/api/admin/invoices', (req, res) => {
      if (!checkAdminAuth(req, res, 'invoicing')) return;
      
      const invoices = db.prepare(`
        SELECT i.*, r.name as restaurant_name 
        FROM invoices i 
        JOIN restaurants r ON i.restaurant_id = r.id 
        ORDER BY i.created_at DESC
      `).all();
      res.json(invoices);
    });

    // Helper function for rounding
    const roundTo2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;
    const roundTo0 = (num: number) => Math.round(num);

    app.post('/api/admin/invoices/generate-calculation', (req, res) => {
      if (!checkAdminAuth(req, res, 'invoicing')) return;
      
      const { restaurant_id: raw_restaurant_id, period_start, period_end } = req.body;
      const restaurant_id = Number(raw_restaurant_id);
      console.log(`Generating calculation for restaurant ID: ${restaurant_id}, period: ${period_start} to ${period_end}`);
      
      const r = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(restaurant_id) as any;
      if (!r) return res.status(404).json({ error: 'Restaurant not found' });
      
      // Find orders that are 'completed' and not yet in any invoice
      let ordersQuery = `
        SELECT * FROM orders 
        WHERE restaurant_id = ? 
        AND status = 'completed' 
        AND id NOT IN (SELECT order_id FROM invoice_orders)
      `;
      const params: any[] = [restaurant_id];

      if (period_start) {
        ordersQuery += " AND created_at >= ?";
        params.push(period_start);
      }
      if (period_end) {
        ordersQuery += " AND created_at <= ?";
        params.push(period_end);
      }
      
      ordersQuery += " ORDER BY created_at ASC";
      
      const orders = db.prepare(ordersQuery).all(...params) as any[];
      
      if (orders.length === 0) {
        return res.status(400).json({ error: 'Нема нови завршени нарачки за овој период.' });
      }
      
      const total_with_vat = roundTo2(orders.reduce((sum, o) => sum + o.total_price, 0));
      const vat_rate = r.vat_rate || 0;
      const base_amount = roundTo2(total_with_vat / (1 + vat_rate / 100));
      const vat_amount = roundTo2(total_with_vat - base_amount);
      
      const shortId = Math.floor(10000 + Math.random() * 90000);
      const yearSuffix = new Date().getFullYear().toString().slice(-2);
      const invoice_number = `CALC-${shortId}-${yearSuffix}`;
      
      const result = db.prepare(`
        INSERT INTO invoices (
          restaurant_id, invoice_number, period_start, period_end, 
          total_amount, commission_amount, net_amount, base_amount, vat_amount, 
          contract_percentage, vat_rate, status, type
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending Approval', 'calculation')
      `).run(
        restaurant_id,
        invoice_number,
        period_start || orders[0].created_at,
        period_end || orders[orders.length - 1].created_at,
        total_with_vat,
        0, // Commission will be calculated on final invoices
        total_with_vat,
        base_amount,
        vat_amount,
        r.contract_percentage,
        vat_rate
      );
      
      const invoiceId = result.lastInsertRowid;
      console.log(`[DEBUG] Invoice inserted successfully. ID: ${invoiceId}, RestaurantID: ${restaurant_id}, Number: ${invoice_number}`);
      
      // Link orders
      const insertOrder = db.prepare("INSERT INTO invoice_orders (invoice_id, order_id) VALUES (?, ?)");
      for (const order of orders) {
        insertOrder.run(invoiceId, order.id);
      }
      
      // Notify restaurant
      console.log(`[DEBUG] Notifying restaurant_${restaurant_id} via socket`);
      io.to(`restaurant_${restaurant_id}`).emit('new_invoice', {
        id: invoiceId,
        invoice_number,
        type: 'calculation',
        message: `Нова пресметка #${invoice_number} е генерирана.`
      });
      
      res.json({ success: true, invoiceId });
    });

    // Test route for demo invoice visibility
    app.post('/api/admin/test/insert-demo-invoice', (req, res) => {
      if (!checkAdminAuth(req, res)) return;
      const { restaurant_id: raw_id } = req.body;
      if (!raw_id) return res.status(400).json({ error: 'Missing restaurant_id' });

      const restaurant_id = Number(raw_id);

      const shortId = Math.floor(10000 + Math.random() * 90000);
      const yearSuffix = new Date().getFullYear().toString().slice(-2);
      const invoice_number = `DEMO-${shortId}-${yearSuffix}`;
      try {
        const result = db.prepare(`
          INSERT INTO invoices (
            restaurant_id, invoice_number, period_start, period_end, 
            total_amount, commission_amount, net_amount, base_amount, vat_amount, 
            contract_percentage, vat_rate, status, type
          )
          VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1000, 100, 900, 800, 200, 10, 18, 'Pending Approval', 'calculation')
        `).run(restaurant_id, invoice_number);
        
        const invoiceId = result.lastInsertRowid;
        
        console.log(`[DEMO] Inserted demo invoice ${invoice_number} for restaurant ${restaurant_id}`);
        
        io.to(`restaurant_${restaurant_id}`).emit('new_invoice', {
          id: invoiceId,
          invoice_number,
          type: 'calculation',
          message: `ДЕМО ПРЕСМЕТКА #${invoice_number}`,
          isDemo: true
        });
        
        res.json({ success: true, invoiceId, invoice_number });
      } catch (error) {
        console.error('[DEMO] Failed to insert demo invoice:', error);
        res.status(500).json({ error: 'Failed to insert demo invoice' });
      }
    });

    app.post('/api/restaurant/invoices/:id/approve', (req, res) => {
      const restaurant = (req.session as any).restaurant;
      if (!restaurant) return res.status(401).json({ error: 'Unauthorized' });
      
      const calculation = db.prepare("SELECT * FROM invoices WHERE id = ? AND restaurant_id = ? AND type = 'calculation'").get(req.params.id, restaurant.id) as any;
      if (!calculation) return res.status(404).json({ error: 'Calculation not found' });
      
      if (calculation.status !== 'Pending Approval') {
        return res.status(400).json({ error: 'Оваа пресметка е веќе обработена.' });
      }
      
      // 1. Update calculation status
      db.prepare("UPDATE invoices SET status = 'Approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
      
      const r = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(restaurant.id) as any;
      
      // 2. Generate Invoice 1 (Restaurant -> PIZZATIME)
      const calcId = calculation.invoice_number.replace('CALC-', '');
      const inv1_number = `INV-${calcId}`;
      const inv1_result = db.prepare(`
        INSERT INTO invoices (
          restaurant_id, invoice_number, period_start, period_end, 
          total_amount, commission_amount, net_amount, base_amount, vat_amount, 
          contract_percentage, vat_rate, status, type, parent_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Approved', 'invoice', ?)
      `).run(
        restaurant.id,
        inv1_number,
        calculation.period_start,
        calculation.period_end,
        calculation.total_amount,
        0,
        calculation.total_amount,
        calculation.base_amount,
        calculation.vat_amount,
        calculation.contract_percentage,
        calculation.vat_rate,
        calculation.id
      );
      
      const inv1_id = inv1_result.lastInsertRowid;
      
      // Link orders to the final invoice too
      const orders = db.prepare("SELECT order_id FROM invoice_orders WHERE invoice_id = ?").all(calculation.id) as any[];
      const insertOrder = db.prepare("INSERT INTO invoice_orders (invoice_id, order_id) VALUES (?, ?)");
      for (const order of orders) {
        insertOrder.run(inv1_id, order.order_id);
      }
      
      // 3. Generate Invoice 2 (PIZZATIME -> Restaurant - Commission)
      const commission_percentage = calculation.contract_percentage || 0;
      const commission_total = roundTo2(calculation.total_amount * (commission_percentage / 100));
      const pizzatime_vat_rate = 18; // Standard service VAT in MK
      const commission_base = roundTo2(commission_total / (1 + pizzatime_vat_rate / 100));
      const commission_vat = roundTo2(commission_total - commission_base);
      
      const inv2_number = `PRO-${calcId}`;
      const inv2_id = db.prepare(`
        INSERT INTO invoices (
          restaurant_id, invoice_number, period_start, period_end, 
          total_amount, commission_amount, net_amount, base_amount, vat_amount, 
          contract_percentage, vat_rate, status, type, parent_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Approved', 'commission', ?)
      `).run(
        restaurant.id,
        inv2_number,
        calculation.period_start,
        calculation.period_end,
        commission_total,
        commission_total,
        commission_total,
        commission_base,
        commission_vat,
        commission_percentage,
        pizzatime_vat_rate,
        calculation.id
      ).lastInsertRowid;

      // 4. Generate Compensation Document
      const comp_number = `COMP-${calcId}`;
      db.prepare(`
        INSERT INTO invoices (
          restaurant_id, invoice_number, period_start, period_end, 
          total_amount, commission_amount, net_amount, base_amount, vat_amount, 
          contract_percentage, vat_rate, status, type, parent_id,
          spare_1, spare_2
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Approved', 'КОМПЕНЗАЦИЈА', ?, ?, ?)
      `).run(
        restaurant.id,
        comp_number,
        calculation.period_start,
        calculation.period_end,
        calculation.total_amount, // Restaurant receivables
        commission_total,         // PizzaTime receivables
        roundTo2(calculation.total_amount - commission_total), // Difference
        0, 0, 0, 0,
        calculation.id,
        inv1_number,
        inv2_number
      );
      
      // Notify admin
      io.to('admins').emit('invoice_status_updated', {
        id: calculation.id,
        status: 'Approved',
        restaurant_name: r.name
      });
      
      res.json({ success: true });
    });

    app.post('/api/admin/invoices/:id/approve', (req, res) => {
      if (!checkAdminAuth(req, res, 'invoicing')) return;
      
      db.prepare("UPDATE invoices SET status = 'Approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
      
      // Notify restaurant
      const invoice = db.prepare('SELECT restaurant_id, invoice_number FROM invoices WHERE id = ?').get(req.params.id) as any;
      if (invoice) {
        io.to(`restaurant_${invoice.restaurant_id}`).emit('invoice_status_updated', {
          id: req.params.id,
          invoice_number: invoice.invoice_number,
          status: 'Approved'
        });
      }
      
      res.json({ success: true });
    });

    app.delete('/api/admin/invoices/:id', (req, res) => {
      if (!checkAdminAuth(req, res, 'invoicing')) return;
      
      db.prepare("DELETE FROM invoice_orders WHERE invoice_id = ?").run(req.params.id);
      db.prepare("DELETE FROM invoices WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    });

    app.post('/api/admin/invoices/clear-all', (req, res) => {
      if (!checkAdminAuth(req, res, 'invoicing')) return;
      db.prepare("DELETE FROM invoice_orders").run();
      db.prepare("DELETE FROM invoices").run();
      res.json({ success: true });
    });

    app.get('/api/debug/invoices', (req, res) => {
      const invoices = db.prepare('SELECT * FROM invoices').all();
      res.json(invoices);
    });

    app.get('/api/restaurant/me', (req, res) => {
      const sessionRest = (req.session as any).restaurant;
      if (sessionRest && sessionRest.id) {
        const restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(sessionRest.id) as any;
        if (restaurant) {
          restaurant.id = Number(restaurant.id);
          return res.json({ restaurant });
        }
      }
      res.json({ restaurant: null });
    });

    app.get('/api/restaurant/invoices', (req, res) => {
      const restaurant = (req.session as any).restaurant;
      if (!restaurant) {
        console.log('[ERROR] Invoice fetch failed: No restaurant in session');
        console.log('[DEBUG] Session object:', JSON.stringify(req.session));
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const restaurantId = Number(restaurant.id);
      console.log(`[DEBUG] Fetching invoices for restaurant ID: ${restaurantId} (type: ${typeof restaurantId})`);
      
      try {
        // Check schema
        const schema = db.prepare("PRAGMA table_info(invoices)").all() as any[];
        console.log(`[DEBUG] Invoices table schema: ${JSON.stringify(schema)}`);

        // Check total count in table
        const totalCount = db.prepare("SELECT COUNT(*) as count FROM invoices").get() as any;
        console.log(`[DEBUG] Total invoices in entire table: ${totalCount.count}`);

        // Log raw data for first 5 invoices to see types
        const rawInvoices = db.prepare("SELECT id, restaurant_id, invoice_number, status FROM invoices LIMIT 5").all() as any[];
        console.log(`[DEBUG] Raw sample invoices: ${JSON.stringify(rawInvoices)}`);

        // Use a more direct query without CAST first to see if it works, 
        // but try both if needed. SQLite is flexible but can be tricky with types.
        const invoices = db.prepare(`
          SELECT * FROM invoices 
          WHERE (restaurant_id = ? OR CAST(restaurant_id AS TEXT) = CAST(? AS TEXT))
          AND status NOT IN ('Draft', 'draft')
          ORDER BY created_at DESC
        `).all(restaurantId, restaurantId) as any[];

        console.log(`[DEBUG] Found ${invoices.length} invoices for restaurant ID: ${restaurantId}`);
        
        // Check for ANY invoices for this restaurant regardless of status
        const anyInvoices = db.prepare("SELECT id, restaurant_id, status, type FROM invoices WHERE restaurant_id = ? OR CAST(restaurant_id AS TEXT) = CAST(? AS TEXT)").all(restaurantId, restaurantId) as any[];
        console.log(`[DEBUG] Total invoices in DB for this restaurant (any status): ${anyInvoices.length}`);
        
        if (anyInvoices.length === 0) {
          // If 0 found for this ID, check what IDs DO exist
          const existingIds = db.prepare("SELECT DISTINCT restaurant_id FROM invoices").all() as any[];
          console.log(`[DEBUG] Existing restaurant IDs in invoices table: ${existingIds.map(e => e.restaurant_id).join(', ')}`);
        } else {
          console.log('[DEBUG] Invoice statuses:', anyInvoices.map(inv => `ID:${inv.id}, Status:${inv.status}, Type:${inv.type}`));
        }
        
        res.json(invoices);
      } catch (error) {
        console.error('[DEBUG] Error fetching restaurant invoices:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.get('/api/invoices/:id', (req, res) => {
      const invoice = db.prepare(`
        SELECT i.*, r.name as restaurant_name, r.address as restaurant_address, 
               r.bank_account as restaurant_bank_account, r.logo_url as restaurant_logo,
               r.email as restaurant_email, r.phone as restaurant_phone, r.edb as restaurant_edb,
               COALESCE(i.contract_percentage, r.contract_percentage) as contract_percentage,
               COALESCE(i.vat_rate, r.vat_rate) as vat_rate,
               p.invoice_number as parent_invoice_number
        FROM invoices i 
        JOIN restaurants r ON i.restaurant_id = r.id 
        LEFT JOIN invoices p ON i.parent_id = p.id
        WHERE i.id = ?
      `).get(req.params.id) as any;
      
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
      
      // Fetch PIZZATIME info from global_settings
      const settings = db.prepare("SELECT * FROM global_settings WHERE key LIKE 'pizzatime_%'").all() as any[];
      const pizzatimeInfo: any = {};
      settings.forEach(s => {
        pizzatimeInfo[s.key] = s.value;
      });
      
      const orders = db.prepare(`
        SELECT o.* 
        FROM orders o 
        JOIN invoice_orders io ON o.id = io.order_id 
        WHERE io.invoice_id = ?
      `).all(req.params.id);
      
      res.json({ ...invoice, orders, pizzatimeInfo });
    });

    app.post('/api/invoices/:id/status', (req, res) => {
      const { status } = req.body;
      console.log(`Updating invoice status to ${status} for invoice ID ${req.params.id}`);
      db.prepare('UPDATE invoices SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
      
      // Notify restaurant of status changes
      const invoice = db.prepare('SELECT restaurant_id, invoice_number FROM invoices WHERE id = ?').get(req.params.id) as any;
      if (invoice) {
        console.log(`Emitting invoice_status_updated to restaurant_${invoice.restaurant_id} for invoice #${invoice.invoice_number} with status ${status}`);
        io.to(`restaurant_${invoice.restaurant_id}`).emit('invoice_status_updated', {
          id: req.params.id,
          invoice_number: invoice.invoice_number,
          status: status
        });
        
        // Also emit new_invoice if it's now Pending (first time restaurant sees it)
        if (status === 'Pending') {
          console.log(`Emitting new_invoice to restaurant_${invoice.restaurant_id} for invoice #${invoice.invoice_number}`);
          io.to(`restaurant_${invoice.restaurant_id}`).emit('new_invoice', {
            id: req.params.id,
            invoice_number: invoice.invoice_number
          });
        }
      }
      
      res.json({ success: true });
    });

    app.put('/api/invoices/:id', (req, res) => {
      if (!checkAdminAuth(req, res, 'invoices')) return;
      
      const { total_amount, commission_amount, net_amount, base_amount, vat_amount, status } = req.body;
      db.prepare(`
        UPDATE invoices 
        SET total_amount = ?, commission_amount = ?, net_amount = ?, base_amount = ?, vat_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(total_amount, commission_amount, net_amount, base_amount, vat_amount, status, req.params.id);

      // Notify restaurant of status changes
      const invoice = db.prepare('SELECT restaurant_id, invoice_number FROM invoices WHERE id = ?').get(req.params.id) as any;
      if (invoice) {
        io.to(`restaurant_${invoice.restaurant_id}`).emit('invoice_status_updated', {
          id: req.params.id,
          invoice_number: invoice.invoice_number,
          status: status
        });
        
        // Also emit new_invoice if it's now Pending (first time restaurant sees it)
        if (status === 'Pending') {
          io.to(`restaurant_${invoice.restaurant_id}`).emit('new_invoice', {
            id: req.params.id,
            invoice_number: invoice.invoice_number
          });
        }
      }

      res.json({ success: true });
    });

    app.post('/api/email/test', async (req, res) => {
      const { recipient, host, port, user, pass, secure, from } = req.body;
      
      try {
        const transporter = nodemailer.createTransport({
          host,
          port: parseInt(port),
          secure: secure === 'true',
          auth: { user, pass }
        });

        await transporter.sendMail({
          from: from || user,
          to: recipient,
          subject: 'Test Email from PizzaTime',
          text: 'This is a test email to verify your SMTP settings.'
        });

        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // API routes
    app.get('/api/settings', (req, res) => {
      const settings = db.prepare('SELECT * FROM global_settings').all();
      const settingsObj = settings.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});
      res.json(settingsObj);
    });

    app.put('/api/settings', (req, res) => {
      const settings = req.body;
      const stmt = db.prepare('INSERT OR REPLACE INTO global_settings (key, value) VALUES (?, ?)');
      
      const transaction = db.transaction((settingsObj) => {
        for (const [key, value] of Object.entries(settingsObj)) {
          stmt.run(key, value as string);
        }
      });

      try {
        transaction(settings);
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: 'Failed to save settings' });
      }
    });

    app.post('/api/email/newsletter', async (req, res) => {
      const { template_id, user_ids } = req.body;
      const template = db.prepare('SELECT * FROM email_templates WHERE id = ?').get(template_id) as any;
      if (!template) return res.status(404).json({ error: 'Template not found' });

      const users = user_ids 
        ? db.prepare(`SELECT * FROM users WHERE id IN (${user_ids.join(',')})`).all()
        : db.prepare('SELECT * FROM users').all();

      let successCount = 0;
      let failCount = 0;

      for (const user of users as any[]) {
        try {
          await sendEmail(template.name, user.email, { customer_name: user.name });
          successCount++;
        } catch (e) {
          failCount++;
        }
      }

      res.json({ success: true, successCount, failCount });
    });

    app.post('/api/email/acelle-sync', async (req, res) => {
      const { apiUrl, apiKey, listUid } = req.body;
      if (!apiUrl || !apiKey || !listUid) return res.status(400).json({ error: 'Missing Acelle credentials' });

      const users = db.prepare('SELECT * FROM users').all() as any[];
      let successCount = 0;
      let failCount = 0;

      for (const user of users) {
        try {
          // Acelle Mail API v1 subscriber add
          await axios.post(`${apiUrl}/api/v1/subscribers?api_token=${apiKey}`, {
            list_uid: listUid,
            EMAIL: user.email,
            FIRST_NAME: user.name.split(' ')[0],
            LAST_NAME: user.name.split(' ').slice(1).join(' ')
          });
          successCount++;
        } catch (e) {
          failCount++;
        }
      }

      res.json({ success: true, successCount, failCount });
    });

    app.post('/api/upload', upload.single('image'), (req, res) => {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ url: fileUrl });
    });

    app.get("/api/health", (req, res) => {
      res.json({ status: "ok", message: "Backend is running successfully!" });
    });
  
    // --- ADMIN EXPORT/IMPORT ---
    app.get("/api/admin/export", (req, res) => {
      if (!checkAdminAuth(req, res, 'settings')) return;
      const restaurants = db.prepare("SELECT * FROM restaurants").all();
      const menu_items = db.prepare("SELECT * FROM menu_items").all();
      const orders = db.prepare("SELECT * FROM orders").all();
      const delivery_partners = db.prepare("SELECT * FROM delivery_partners").all();
      const marketing_associates = db.prepare("SELECT * FROM marketing_associates").all();
      const campaigns = db.prepare("SELECT * FROM campaigns").all();
      const campaign_codes = db.prepare("SELECT * FROM campaign_codes").all();
      const global_settings = db.prepare("SELECT * FROM global_settings").all();
      const reviews = db.prepare("SELECT * FROM reviews").all();
      const users = db.prepare("SELECT * FROM users").all();
      const invoices = db.prepare("SELECT * FROM invoices").all();
      const invoice_orders = db.prepare("SELECT * FROM invoice_orders").all();
      const admins = db.prepare("SELECT * FROM admins").all();
      
      res.setHeader('Content-disposition', 'attachment; filename=pizzatime-backup.json');
      res.setHeader('Content-type', 'application/json');
      res.send(JSON.stringify({ 
        restaurants, 
        menu_items, 
        orders,
        delivery_partners,
        marketing_associates,
        campaigns,
        campaign_codes,
        global_settings,
        reviews,
        users,
        invoices,
        invoice_orders,
        admins
      }, null, 2));
    });
  
    app.post("/api/admin/import", (req, res) => {
      if (!checkAdminAuth(req, res, 'database')) return;
      const { 
        restaurants, 
        menu_items, 
        orders,
        delivery_partners,
        marketing_associates,
        campaigns,
        campaign_codes,
        global_settings,
        reviews,
        users,
        invoices,
        invoice_orders
      } = req.body;
      
      try {
        const transaction = db.transaction(() => {
          // Clear existing
          db.prepare("DELETE FROM campaign_codes").run();
          db.prepare("DELETE FROM campaigns").run();
          db.prepare("DELETE FROM marketing_associates").run();
          db.prepare("DELETE FROM delivery_partners").run();
          db.prepare("DELETE FROM orders").run();
          db.prepare("DELETE FROM menu_items").run();
          db.prepare("DELETE FROM restaurants").run();
          db.prepare("DELETE FROM global_settings").run();
          db.prepare("DELETE FROM reviews").run();
          db.prepare("DELETE FROM users").run();
          db.prepare("DELETE FROM invoices").run();
          db.prepare("DELETE FROM invoice_orders").run();
          db.prepare("DELETE FROM admins WHERE role != 'super'").run();
          
          // Insert admins (except super)
          if (req.body.admins && req.body.admins.length > 0) {
            const insertAdmin = db.prepare(`INSERT INTO admins (id, username, password, name, email, role, permissions) VALUES (?, ?, ?, ?, ?, ?, ?)`);
            for (const a of req.body.admins) {
              if (a.role !== 'super') {
                insertAdmin.run(a.id, a.username, a.password, a.name, a.email, a.role || 'admin', typeof a.permissions === 'string' ? a.permissions : JSON.stringify(a.permissions || []));
              }
            }
          }

          // Insert restaurants
          if (restaurants && restaurants.length > 0) {
            const insertRest = db.prepare(`INSERT INTO restaurants (id, name, city, address, email, phone, bank_account, logo_url, cover_url, has_own_delivery, delivery_zones, spare_1, spare_2, spare_3, spare_4, status, username, password, contract_percentage, working_hours, header_image, billing_cycle_days, vat_rate, edb, payment_config, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            for (const r of restaurants) {
              insertRest.run(
                r.id, r.name, r.city, r.address, r.email, r.phone, r.bank_account, 
                r.logo_url || null, r.cover_url || null, 
                r.has_own_delivery, r.delivery_zones, r.spare_1, r.spare_2, r.spare_3, r.spare_4 || null, r.status, r.username, r.password, r.contract_percentage || 0, r.working_hours || '{}',
                r.header_image || null, r.billing_cycle_days || 7, r.vat_rate || 0, r.edb || null, r.payment_config || '{"methods":["cash"],"fees":[]}', r.lat || null, r.lng || null
              );
            }
          }
          
          // Insert menu items
          if (menu_items && menu_items.length > 0) {
            const insertMenu = db.prepare(`INSERT INTO menu_items (id, restaurant_id, name, description, price, image_url, category, subcategory, modifiers, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            for (const m of menu_items) {
              insertMenu.run(
                m.id, 
                m.restaurant_id, 
                m.name, 
                m.description, 
                m.price, 
                m.image_url || null, 
                m.category, 
                m.subcategory || 'Општо', 
                typeof m.modifiers === 'string' ? m.modifiers : JSON.stringify(m.modifiers || []), 
                m.is_available !== undefined ? m.is_available : 1
              );
            }
          }
          
          // Insert orders
          if (orders && orders.length > 0) {
            const insertOrder = db.prepare(`INSERT INTO orders (id, restaurant_id, customer_name, customer_email, customer_phone, delivery_address, delivery_lat, delivery_lng, items, total_price, status, delivery_code, delivery_partner_id, delivery_partner_name, spare_1, spare_2, spare_3, tracking_token, user_id, created_at, payment_method, selected_fees, delivery_fee, payment_status, payment_transaction_id, ready_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            for (const o of orders) {
              insertOrder.run(
                o.id, o.restaurant_id, o.customer_name, o.customer_email, o.customer_phone, o.delivery_address, o.delivery_lat, o.delivery_lng, o.items, o.total_price, o.status, o.delivery_code || null, o.delivery_partner_id || null, o.delivery_partner_name || null, o.spare_1 || null, o.spare_2 || null, o.spare_3 || null, o.tracking_token || null, o.user_id || null, o.created_at,
                o.payment_method || 'cash', o.selected_fees || '[]', o.delivery_fee || 0, o.payment_status || 'pending', o.payment_transaction_id || null, o.ready_at || null
              );
            }
          }

          // Insert delivery partners
          if (delivery_partners && delivery_partners.length > 0) {
            const insertDel = db.prepare(`INSERT INTO delivery_partners (id, name, city, address, email, phone, bank_account, working_hours, preferred_restaurants, delivery_methods, status, username, password, role, fleet_manager_id, created_at, has_signed_contract, current_lat, current_lng, last_location_update) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            for (const d of delivery_partners) {
              insertDel.run(
                d.id, d.name, d.city, d.address, d.email, d.phone, d.bank_account, d.working_hours, d.preferred_restaurants, d.delivery_methods || '[]', d.status, d.username, d.password, d.role || 'rider', d.fleet_manager_id || null, d.created_at,
                d.has_signed_contract || 0, d.current_lat || null, d.current_lng || null, d.last_location_update || null
              );
            }
          }

          // Insert marketing associates
          if (marketing_associates && marketing_associates.length > 0) {
            const insertMark = db.prepare(`INSERT INTO marketing_associates (id, username, password, company_name, contact_person, phone, bank_account, address, city, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            for (const m of marketing_associates) {
              insertMark.run(m.id, m.username, m.password, m.company_name, m.contact_person, m.phone, m.bank_account, m.address, m.city, m.created_at);
            }
          }

          // Insert campaigns
          if (campaigns && campaigns.length > 0) {
            const insertCamp = db.prepare(`INSERT INTO campaigns (id, associate_id, name, description, budget, start_date, end_date, location_type, selected_cities, map_zones, status, quantity, code_format, created_at, is_visible, restaurant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            for (const c of campaigns) {
              insertCamp.run(c.id, c.associate_id, c.name, c.description, c.budget, c.start_date, c.end_date, c.location_type, c.selected_cities, c.map_zones, c.status, c.quantity, c.code_format, c.created_at, c.is_visible !== undefined ? c.is_visible : 1, c.restaurant_id || null);
            }
          }

          // Insert campaign codes
          if (campaign_codes && campaign_codes.length > 0) {
            const insertCode = db.prepare(`INSERT INTO campaign_codes (id, campaign_id, code, is_used, used_at, created_at) VALUES (?, ?, ?, ?, ?, ?)`);
            for (const c of campaign_codes) {
              insertCode.run(c.id, c.campaign_id, c.code, c.is_used, c.used_at, c.created_at);
            }
          }
          
          // Insert reviews
          if (reviews && reviews.length > 0) {
            const insertReview = db.prepare(`INSERT INTO reviews (id, order_id, restaurant_id, customer_name, rating, comment, is_visible, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
            for (const r of reviews) {
              insertReview.run(r.id, r.order_id, r.restaurant_id, r.customer_name, r.rating, r.comment, r.is_visible !== undefined ? r.is_visible : 1, r.created_at);
            }
          }
          
          // Insert users
          if (users && users.length > 0) {
            const insertUser = db.prepare(`INSERT INTO users (id, google_id, email, name, role, loyalty_points, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
            for (const u of users) {
              insertUser.run(u.id, u.google_id, u.email, u.name, u.role || 'customer', u.loyalty_points || 0, u.created_at);
            }
          }
          
          // Insert invoices
          if (invoices && invoices.length > 0) {
            const insertInvoice = db.prepare(`INSERT INTO invoices (id, restaurant_id, invoice_number, period_start, period_end, total_amount, commission_amount, net_amount, base_amount, vat_amount, contract_percentage, vat_rate, status, type, parent_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            for (const i of invoices) {
              insertInvoice.run(i.id, i.restaurant_id, i.invoice_number, i.period_start, i.period_end, i.total_amount, i.commission_amount, i.net_amount, i.base_amount, i.vat_amount, i.contract_percentage || 0, i.vat_rate || 0, i.status, i.type || 'calculation', i.parent_id || null, i.created_at, i.updated_at);
            }
          }
          
          // Insert invoice orders
          if (invoice_orders && invoice_orders.length > 0) {
            const insertInvOrder = db.prepare(`INSERT INTO invoice_orders (invoice_id, order_id) VALUES (?, ?)`);
            for (const io of invoice_orders) {
              insertInvOrder.run(io.invoice_id, io.order_id);
            }
          }

          // Insert global settings
          if (global_settings && global_settings.length > 0) {
            const insertSetting = db.prepare(`INSERT INTO global_settings (key, value) VALUES (?, ?)`);
            for (const s of global_settings) {
              insertSetting.run(s.key, s.value);
            }
          }
        });
        
        transaction();
        res.json({ success: true });
      } catch (e: any) {
        console.error("Import error:", e);
        res.status(500).json({ success: false, error: e.message });
      }
    });
  
    // --- RESTAURANT REGISTRATION & ADMIN ---
  app.post("/api/restaurants/register", (req, res) => {
    const { name, city, address, email, phone, bank_account, logo_url, cover_url, has_own_delivery, delivery_zones, spare_1, spare_2, spare_3, spare_4, working_hours } = req.body;
    const insert = db.prepare(`
      INSERT INTO restaurants (name, city, address, email, phone, bank_account, logo_url, cover_url, has_own_delivery, delivery_zones, spare_1, spare_2, spare_3, spare_4, working_hours, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `);
    const result = insert.run(name, city, address, email, phone, bank_account, logo_url, cover_url, has_own_delivery ? 1 : 0, JSON.stringify(delivery_zones || []), spare_1, spare_2, spare_3, spare_4, JSON.stringify(working_hours || {}));
    
    // Send registration email
    if (email) {
      sendEmail('restaurant_registration', email, { restaurant_name: name }).catch(console.error);
    }
    
    res.json({ success: true, id: result.lastInsertRowid });
  });

  app.get("/api/admin/billing", (req, res) => {
    if (!checkAdminAuth(req, res, 'billing')) return;
    const { startDate, endDate } = req.query;
    
    let dateFilter = "";
    const params: any[] = [];
    
    if (startDate) {
      dateFilter += " AND date(created_at) >= ?";
      params.push(startDate);
    }
    if (endDate) {
      dateFilter += " AND date(created_at) <= ?";
      params.push(endDate);
    }

    // Calculate Restaurant Billing
    const restaurants = db.prepare("SELECT id, name, contract_percentage FROM restaurants WHERE status = 'approved'").all() as any[];
    const restaurantBilling = restaurants.map(r => {
      const orders = db.prepare(`SELECT total_price FROM orders WHERE restaurant_id = ? AND status = 'completed' ${dateFilter}`).all(r.id, ...params) as any[];
      const totalRevenue = orders.reduce((sum, o) => sum + o.total_price, 0);
      const totalOrders = orders.length;
      const platformFee = totalRevenue * (r.contract_percentage / 100);
      const netPayout = totalRevenue - platformFee;
      
      return {
        id: r.id,
        name: r.name,
        contract_percentage: r.contract_percentage,
        totalOrders,
        totalRevenue,
        platformFee,
        netPayout
      };
    });

    // Calculate Delivery Partner Billing
    const deliveryPartners = db.prepare("SELECT id, name FROM delivery_partners WHERE status = 'approved'").all() as any[];
    const deliveryBilling = deliveryPartners.map(dp => {
      const orders = db.prepare(`SELECT id FROM orders WHERE delivery_partner_id = ? AND status = 'completed' ${dateFilter}`).all(dp.id, ...params) as any[];
      const totalDeliveries = orders.length;
      const feePerDelivery = 100; // Fixed fee per delivery
      const netPayout = totalDeliveries * feePerDelivery;
      
      return {
        id: dp.id,
        name: dp.name,
        totalDeliveries,
        feePerDelivery,
        netPayout
      };
    });

    res.json({
      restaurants: restaurantBilling,
      deliveryPartners: deliveryBilling
    });
  });

  app.get("/api/admin/restaurants/pending", (req, res) => {
    if (!checkAdminAuth(req, res, 'restaurants')) return;
    const items = db.prepare("SELECT * FROM restaurants WHERE status = 'pending'").all();
    res.json(items);
  });

  app.get("/api/admin/restaurants/approved", (req, res) => {
    if (!checkAdminAuth(req, res, 'restaurants')) return;
    const items = db.prepare("SELECT * FROM restaurants WHERE status = 'approved'").all();
    res.json(items);
  });

  app.post("/api/admin/restaurants/:id/approve", (req, res) => {
    if (!checkAdminAuth(req, res, 'restaurants')) return;
    const id = req.params.id;
    const { 
      name, city, address, phone, email, bank_account, lat, lng,
      contract_percentage, billing_cycle_days, vat_rate, delivery_fee, min_order_amount, 
      username, password, payment_config, logo_url, cover_url, header_image 
    } = req.body;
    
    db.prepare(`
      UPDATE restaurants SET 
        status = 'approved', name = ?, city = ?, address = ?, phone = ?, email = ?, 
        bank_account = ?, lat = ?, lng = ?, username = ?, password = ?, 
        contract_percentage = ?, billing_cycle_days = ?, vat_rate = ?, 
        delivery_fee = ?, min_order_amount = ?, payment_config = ?, 
        logo_url = ?, cover_url = ?, header_image = ? 
      WHERE id = ?
    `).run(
      name,
      city,
      address,
      phone,
      email,
      bank_account,
      lat || null,
      lng || null,
      username, 
      password, 
      contract_percentage || 0, 
      billing_cycle_days || 7,
      vat_rate || 0,
      delivery_fee || 0,
      min_order_amount || 0,
      payment_config || '{"methods":["cash"],"fees":[]}',
      logo_url || null,
      cover_url || null,
      header_image || null,
      id
    );
    
    res.json({ success: true, username, password });
  });

  app.put("/api/admin/restaurants/:id", (req, res) => {
    if (!checkAdminAuth(req, res, 'restaurants')) return;
    const id = req.params.id;
    const { 
      name, city, address, phone, email, bank_account, lat, lng,
      contract_percentage, billing_cycle_days, vat_rate, delivery_fee, min_order_amount, 
      username, password, payment_config, logo_url, cover_url, header_image, status 
    } = req.body;
    
    db.prepare(`
      UPDATE restaurants SET 
        name = ?, city = ?, address = ?, phone = ?, email = ?, bank_account = ?, lat = ?, lng = ?,
        username = ?, password = ?, contract_percentage = ?, billing_cycle_days = ?, vat_rate = ?, 
        delivery_fee = ?, min_order_amount = ?, payment_config = ?, logo_url = ?, cover_url = ?, 
        header_image = ?, status = ? 
      WHERE id = ?
    `).run(
      name,
      city,
      address,
      phone,
      email,
      bank_account,
      lat || null,
      lng || null,
      username,
      password,
      contract_percentage || 0,
      billing_cycle_days || 7,
      vat_rate || 0,
      delivery_fee || 0,
      min_order_amount || 0,
      payment_config || '{"methods":["cash"],"fees":[]}',
      logo_url || null,
      cover_url || null,
      header_image || null,
      status || 'approved',
      id
    );
    
    res.json({ success: true });
  });

  app.post("/api/admin/restaurants/:id/reject", (req, res) => {
    if (!checkAdminAuth(req, res, 'restaurants')) return;
    db.prepare("UPDATE restaurants SET status = 'rejected' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // --- BUNDLE ADMIN ---
  app.get("/api/admin/bundles/pending", (req, res) => {
    if (!checkAdminAuth(req, res, 'restaurants')) return;
    const bundles = db.prepare(`
      SELECT b.*, r.name as restaurant_name 
      FROM bundles b 
      JOIN restaurants r ON b.restaurant_id = r.id 
      WHERE b.status = 'pending'
    `).all() as any[];
    
    for (const b of bundles) {
      try {
        b.available_days = JSON.parse(b.available_days || '[]');
      } catch (e) {
        b.available_days = [];
      }
      b.items = db.prepare(`
        SELECT bi.*, mi.name, mi.price 
        FROM bundle_items bi 
        JOIN menu_items mi ON bi.menu_item_id = mi.id 
        WHERE bi.bundle_id = ?
      `).all(b.id);
      for (const item of b.items) {
        try {
          item.modifiers = JSON.parse(item.modifiers || '[]');
        } catch (e) {
          item.modifiers = [];
        }
      }
    }
    res.json(bundles);
  });

  app.post("/api/admin/bundles/:id/approve", (req, res) => {
    if (!checkAdminAuth(req, res, 'restaurants')) return;
    db.prepare("UPDATE bundles SET status = 'approved' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/admin/bundles/:id/reject", (req, res) => {
    if (!checkAdminAuth(req, res, 'restaurants')) return;
    db.prepare("UPDATE bundles SET status = 'rejected' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/admin/bundles/clear", (req, res) => {
    if (!checkAdminAuth(req, res, 'restaurants')) return;
    
    db.transaction(() => {
      db.prepare("DELETE FROM bundle_items").run();
      db.prepare("DELETE FROM bundles").run();
    })();
    
    res.json({ success: true, message: "Сите пакети се избришани." });
  });

  app.get("/api/admin/bundles", (req, res) => {
    if (!checkAdminAuth(req, res, 'restaurants')) return;
    const { restaurant_id, start_date, end_date } = req.query;
    
    let query = "SELECT b.*, r.name as restaurant_name FROM bundles b JOIN restaurants r ON b.restaurant_id = r.id WHERE 1=1";
    const params: any[] = [];
    
    if (restaurant_id) {
      query += " AND b.restaurant_id = ?";
      params.push(restaurant_id);
    }
    if (start_date) {
      query += " AND b.created_at >= ?";
      params.push(start_date);
    }
    if (end_date) {
      query += " AND b.created_at <= ?";
      params.push(end_date + " 23:59:59");
    }
    
    query += " ORDER BY b.created_at DESC";
    
    const bundles = db.prepare(query).all(...params) as any[];
    for (const b of bundles) {
      try {
        b.available_days = JSON.parse(b.available_days || '[]');
      } catch (e) {
        b.available_days = [];
      }
      b.items = db.prepare(`
        SELECT bi.*, mi.name, mi.price 
        FROM bundle_items bi 
        JOIN menu_items mi ON bi.menu_item_id = mi.id 
        WHERE bi.bundle_id = ?
      `).all(b.id);
      for (const item of b.items) {
        try {
          item.modifiers = JSON.parse(item.modifiers || '[]');
        } catch (e) {
          item.modifiers = [];
        }
      }
    }
    res.json(bundles);
  });

  // --- RESTAURANT BUNDLES ---
  app.get("/api/restaurants/:id/bundles", (req, res) => {
    const bundles = db.prepare("SELECT * FROM bundles WHERE restaurant_id = ?").all(req.params.id) as any[];
    for (const b of bundles) {
      try {
        b.available_days = JSON.parse(b.available_days || '[]');
      } catch (e) {
        b.available_days = [];
      }
      b.items = db.prepare(`
        SELECT bi.*, mi.name, mi.price, mi.modifiers as available_modifiers
        FROM bundle_items bi 
        JOIN menu_items mi ON bi.menu_item_id = mi.id 
        WHERE bi.bundle_id = ?
      `).all(b.id);
      for (const item of b.items) {
        try {
          item.modifiers = JSON.parse(item.modifiers || '[]');
          item.available_modifiers = JSON.parse(item.available_modifiers || '[]');
        } catch (e) {
          item.modifiers = [];
          item.available_modifiers = [];
        }
      }
    }
    res.json(bundles);
  });

  app.post("/api/restaurants/:id/bundles", (req, res) => {
    const { name, description, price, image_url, start_time, end_time, available_days, items } = req.body;
    const restaurantId = req.params.id;
    
    const result = db.prepare(`
      INSERT INTO bundles (restaurant_id, name, description, price, image_url, start_time, end_time, available_days, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      restaurantId, 
      name, 
      description, 
      price, 
      image_url, 
      start_time, 
      end_time, 
      typeof available_days === 'string' ? available_days : JSON.stringify(available_days || [])
    );
    
    const bundleId = result.lastInsertRowid;
    
    if (items && Array.isArray(items)) {
      const insertItem = db.prepare("INSERT INTO bundle_items (bundle_id, menu_item_id, quantity, modifiers) VALUES (?, ?, ?, ?)");
      for (const item of items) {
        insertItem.run(bundleId, item.menu_item_id, item.quantity || 1, JSON.stringify(item.modifiers || []));
      }
    }
    
    res.json({ success: true, id: bundleId });
  });

  app.put("/api/restaurants/:id/bundles/:bundleId", (req, res) => {
    const { name, description, price, image_url, start_time, end_time, available_days, items } = req.body;
    const bundleId = req.params.bundleId;
    
    db.prepare(`
      UPDATE bundles 
      SET name = ?, description = ?, price = ?, image_url = ?, start_time = ?, end_time = ?, available_days = ?, status = 'pending'
      WHERE id = ? AND restaurant_id = ?
    `).run(
      name, 
      description, 
      price, 
      image_url, 
      start_time, 
      end_time, 
      typeof available_days === 'string' ? available_days : JSON.stringify(available_days || []), 
      bundleId, 
      req.params.id
    );
    
    // Refresh items
    db.prepare("DELETE FROM bundle_items WHERE bundle_id = ?").run(bundleId);
    if (items && Array.isArray(items)) {
      const insertItem = db.prepare("INSERT INTO bundle_items (bundle_id, menu_item_id, quantity, modifiers) VALUES (?, ?, ?, ?)");
      for (const item of items) {
        insertItem.run(bundleId, item.menu_item_id, item.quantity || 1, JSON.stringify(item.modifiers || []));
      }
    }
    
    res.json({ success: true });
  });

  app.delete("/api/restaurants/:id/bundles/:bundleId", (req, res) => {
    db.prepare("DELETE FROM bundles WHERE id = ? AND restaurant_id = ?").run(req.params.bundleId, req.params.id);
    db.prepare("DELETE FROM bundle_items WHERE bundle_id = ?").run(req.params.bundleId);
    res.json({ success: true });
  });

  // --- DELIVERY PARTNER REGISTRATION & ADMIN ---
  app.post("/api/delivery/register", (req, res) => {
    const { name, city, address, email, phone, bank_account, working_hours, preferred_restaurants, delivery_methods } = req.body;
    const insert = db.prepare(`
      INSERT INTO delivery_partners (name, city, address, email, phone, bank_account, working_hours, preferred_restaurants, delivery_methods, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `);
    const result = insert.run(name, city, address, email, phone, bank_account, JSON.stringify(working_hours || {}), JSON.stringify(preferred_restaurants || []), JSON.stringify(delivery_methods || []));
    
    // Send registration email
    if (email) {
      sendEmail('delivery_registration', email, { partner_name: name }).catch(console.error);
    }
    
    res.json({ success: true, id: result.lastInsertRowid });
  });

  app.get("/api/admin/delivery/pending", (req, res) => {
    if (!checkAdminAuth(req, res, 'delivery')) return;
    const items = db.prepare("SELECT * FROM delivery_partners WHERE status = 'pending'").all();
    res.json(items);
  });

  app.get("/api/admin/delivery/approved", (req, res) => {
    if (!checkAdminAuth(req, res, 'delivery')) return;
    const items = db.prepare("SELECT * FROM delivery_partners WHERE status = 'approved'").all();
    res.json(items);
  });

  app.get("/api/admin/delivery/inactive", (req, res) => {
    if (!checkAdminAuth(req, res, 'delivery')) return;
    const items = db.prepare("SELECT * FROM delivery_partners WHERE status = 'inactive'").all();
    res.json(items);
  });

  app.post("/api/admin/delivery/:id/toggle-status", (req, res) => {
    if (!checkAdminAuth(req, res, 'delivery')) return;
    const id = req.params.id;
    const partner = db.prepare("SELECT status FROM delivery_partners WHERE id = ?").get(id) as any;
    if (partner) {
      const newStatus = partner.status === 'approved' ? 'inactive' : 'approved';
      db.prepare("UPDATE delivery_partners SET status = ? WHERE id = ?").run(newStatus, id);
      res.json({ success: true, newStatus });
    } else {
      res.status(404).json({ success: false, message: "Не е пронајден доставувач" });
    }
  });

  app.post("/api/admin/delivery/:id/toggle-contract", (req, res) => {
    if (!checkAdminAuth(req, res, 'delivery')) return;
    const id = req.params.id;
    const partner = db.prepare("SELECT has_signed_contract FROM delivery_partners WHERE id = ?").get(id) as any;
    if (partner) {
      const newValue = partner.has_signed_contract === 1 ? 0 : 1;
      db.prepare("UPDATE delivery_partners SET has_signed_contract = ? WHERE id = ?").run(newValue, id);
      res.json({ success: true, has_signed_contract: newValue });
    } else {
      res.status(404).json({ success: false, message: "Не е пронајден доставувач" });
    }
  });

  app.post("/api/admin/delivery/:id/approve", (req, res) => {
    if (!checkAdminAuth(req, res, 'delivery')) return;
    const id = req.params.id;
    const { username, password, has_signed_contract } = req.body;
    db.prepare("UPDATE delivery_partners SET status = 'approved', username = ?, password = ?, has_signed_contract = ? WHERE id = ?").run(username, password, has_signed_contract || 0, id);
    
    // Send approval email
    const partner = db.prepare("SELECT name, email FROM delivery_partners WHERE id = ?").get(id) as any;
    if (partner) {
      sendEmail('delivery_approval', partner.email, {
        partner_name: partner.name,
        username,
        password,
        contract_url: `${process.env.APP_URL}/delivery/contract`
      }).catch(console.error);
    }
    
    res.json({ success: true, username, password });
  });

  app.post("/api/admin/delivery/:id/reject", (req, res) => {
    if (!checkAdminAuth(req, res, 'delivery')) return;
    db.prepare("UPDATE delivery_partners SET status = 'rejected' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/delivery/login", (req, res) => {
    const { username, password } = req.body;
    const partner = db.prepare("SELECT * FROM delivery_partners WHERE username = ? AND password = ? AND status = 'approved'").get(username, password);
    if (partner) {
      res.json({ success: true, partner });
    } else {
      res.status(401).json({ success: false, message: "Невалидно корисничко име или лозинка" });
    }
  });

  app.get("/api/delivery/partner/:id", (req, res) => {
    const partner = db.prepare("SELECT id, name, email, has_signed_contract FROM delivery_partners WHERE id = ?").get(req.params.id);
    if (!partner) return res.status(404).json({ error: "Доставувачот не е пронајден" });
    res.json(partner);
  });

  app.post("/api/delivery/partner/:id/sign", (req, res) => {
    db.prepare("UPDATE delivery_partners SET has_signed_contract = 1 WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/restaurants/by-city/:city", (req, res) => {
    const restaurants = db.prepare("SELECT id, name, address FROM restaurants WHERE city = ? AND status = 'approved'").all(req.params.city);
    res.json(restaurants);
  });

  app.get("/api/restaurants/:id/active-delivery-partners", (req, res) => {
    const restaurantId = Number(req.params.id);
    const partners = db.prepare("SELECT preferred_restaurants, working_hours, delivery_methods FROM delivery_partners WHERE status = 'approved'").all() as any[];
    
    let totalCount = 0;
    const countsByMethod: Record<string, number> = {
      'bicycle': 0,
      'motorcycle': 0,
      'car': 0
    };

    const days = ['Недела', 'Понеделник', 'Вторник', 'Среда', 'Четврток', 'Петок', 'Сабота'];
    const macedoniaTime = new Date().toLocaleString("en-US", {timeZone: "Europe/Skopje"});
    const now = new Date(macedoniaTime);
    const currentDay = days[now.getDay()];
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

    for (const p of partners) {
      try {
        const preferred = JSON.parse(p.preferred_restaurants || '[]');
        const isPreferred = preferred.length === 0 || preferred.includes(restaurantId) || preferred.includes(restaurantId.toString());
        
        if (isPreferred) {
          const workingHours = JSON.parse(p.working_hours || '{}');
          const todayHours = workingHours[currentDay] || workingHours[currentDay.toLowerCase()];
          
          let isWorking = false;
          if (todayHours && todayHours.active !== undefined) {
            isWorking = todayHours.active && currentTime >= (todayHours.start || '00:00') && currentTime <= (todayHours.end || '23:59');
          } else {
            // Default if not explicitly set
            isWorking = currentTime >= '00:00' && currentTime <= '23:59';
          }
            
          if (isWorking) {
            totalCount++;
            const methods = JSON.parse(p.delivery_methods || '[]');
            methods.forEach((m: string) => {
              if (countsByMethod[m] !== undefined) {
                countsByMethod[m]++;
              }
            });
          }
        }
      } catch (e) {}
    }
    res.json({ count: totalCount, countsByMethod });
  });

  // --- RESTAURANT LOGIN & SETTINGS ---
  app.post("/api/restaurants/login", (req, res) => {
    const { username, password } = req.body;
    const restaurant = db.prepare("SELECT * FROM restaurants WHERE username = ? AND password = ? AND status = 'approved'").get(username, password) as any;
    if (restaurant) {
      restaurant.id = Number(restaurant.id);
      (req.session as any).restaurant = { id: restaurant.id };
      console.log(`[DEBUG] Restaurant login successful for ID: ${restaurant.id}. Session set with ID only.`);
      res.json({ success: true, restaurant });
    } else {
      res.status(401).json({ success: false, message: "Невалидно корисничко име или лозинка" });
    }
  });

  app.post("/api/admin/login-as-restaurant/:id", (req, res) => {
    if (!checkAdminAuth(req, res, 'restaurants')) return;
    const restaurant = db.prepare("SELECT * FROM restaurants WHERE id = ?").get(req.params.id) as any;
    if (restaurant) {
      restaurant.id = Number(restaurant.id);
      (req.session as any).restaurant = { id: restaurant.id };
      console.log(`[DEBUG] Admin login-as-restaurant successful for ID: ${restaurant.id}. Session set with ID only.`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Restaurant not found' });
    }
  });

  app.put("/api/restaurants/:id/zones", (req, res) => {
    const { delivery_zones } = req.body;
    db.prepare("UPDATE restaurants SET delivery_zones = ? WHERE id = ?").run(JSON.stringify(delivery_zones || []), req.params.id);
    res.json({ success: true });
  });

  app.put("/api/restaurants/:id/settings", (req, res) => {
    const { name, password, phone, bank_account, logo_url, cover_url, header_image, city, address, spare_1, spare_2, spare_3, spare_4, working_hours, delivery_fee, min_order_amount, lat, lng } = req.body;
    console.log(`Updating settings for restaurant ${req.params.id}: name=${name}, delivery_fee=${delivery_fee}, min_order_amount=${min_order_amount}`);
    db.prepare("UPDATE restaurants SET name = ?, password = ?, phone = ?, bank_account = ?, logo_url = ?, cover_url = ?, header_image = ?, city = ?, address = ?, spare_1 = ?, spare_2 = ?, spare_3 = ?, spare_4 = ?, working_hours = ?, delivery_fee = ?, min_order_amount = ?, lat = ?, lng = ? WHERE id = ?")
      .run(name, password, phone, bank_account, logo_url, cover_url, header_image, city, address, spare_1, spare_2, spare_3, spare_4, working_hours, delivery_fee || 0, min_order_amount || 0, lat || null, lng || null, req.params.id);
    res.json({ success: true });
  });

  // --- CUSTOMER ENDPOINTS ---
  app.get("/api/customer/cities", (req, res) => {
    const cities = db.prepare("SELECT DISTINCT city FROM restaurants WHERE status = 'approved'").all() as any[];
    res.json(cities.map(c => c.city));
  });

  app.get("/api/customer/restaurant/:username", (req, res) => {
    const restaurant = db.prepare("SELECT id, name, city, address, phone, logo_url, cover_url, header_image, has_own_delivery, working_hours, payment_config, delivery_zones, delivery_fee, min_order_amount FROM restaurants WHERE LOWER(username) = LOWER(?) AND status = 'approved'").get(req.params.username) as any;
    if (!restaurant) {
      return res.status(404).json({ error: "Ресторанот не е пронајден" });
    }
    const menu = db.prepare("SELECT * FROM menu_items WHERE restaurant_id = ? AND is_available = 1 ORDER BY category, subcategory, name").all(restaurant.id);
    
    const bundles = db.prepare("SELECT * FROM bundles WHERE restaurant_id = ? AND status = 'approved'").all(restaurant.id) as any[];
    for (const b of bundles) {
      b.items = db.prepare(`
        SELECT bi.*, mi.name, mi.price 
        FROM bundle_items bi 
        JOIN menu_items mi ON bi.menu_item_id = mi.id 
        WHERE bi.bundle_id = ?
      `).all(b.id);
    }
    
    res.json({ restaurant, menu, bundles });
  });

  app.get("/api/customer/restaurant-by-id/:id", (req, res) => {
    const restaurant = db.prepare("SELECT * FROM restaurants WHERE id = ? AND status = 'approved'").get(req.params.id) as any;
    if (!restaurant) {
      return res.status(404).json({ error: "Ресторанот не е пронајден" });
    }
    const menu = db.prepare("SELECT * FROM menu_items WHERE restaurant_id = ? AND is_available = 1 ORDER BY category, subcategory, name").all(restaurant.id);
    
    const bundles = db.prepare("SELECT * FROM bundles WHERE restaurant_id = ? AND status = 'approved'").all(restaurant.id) as any[];
    for (const b of bundles) {
      b.items = db.prepare(`
        SELECT bi.*, mi.name, mi.price 
        FROM bundle_items bi 
        JOIN menu_items mi ON bi.menu_item_id = mi.id 
        WHERE bi.bundle_id = ?
      `).all(b.id);
    }
    
    res.json({ restaurant, menu, bundles });
  });

  app.post("/api/customer/available", (req, res) => {
    const { city, lat, lng } = req.body;
    const latNum = Number(lat);
    const lngNum = Number(lng);
    const restaurants = db.prepare("SELECT * FROM restaurants WHERE status = 'approved' AND city = ?").all(city) as any[];
    
    const isPointInPolygon = (point: number[], vs: number[][]) => {
      let x = point[0], y = point[1];
      let inside = false;
      for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        let xi = vs[i][0], yi = vs[i][1];
        let xj = vs[j][0], yj = vs[j][1];
        let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    };

    const availableRestaurants = restaurants.filter(r => {
      // If the restaurant uses platform delivery (has_own_delivery === 0), they are available in the whole city
      if (r.has_own_delivery !== 1) return true;
      
      // If they have own delivery, check zones
      try {
        const zones = JSON.parse(r.delivery_zones || '[]');
        if (zones.length === 0) return true; // If no zones defined but has delivery, assume delivers everywhere in city
        for (const zone of zones) {
          if (isPointInPolygon([latNum, lngNum], zone)) return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    });

    if (availableRestaurants.length === 0) {
      return res.json({ restaurants: [], items: [] });
    }

    const restaurantIds = availableRestaurants.map(r => r.id);
    const placeholders = restaurantIds.map(() => '?').join(',');
    const items = db.prepare(`SELECT * FROM menu_items WHERE restaurant_id IN (${placeholders}) AND is_available = 1`).all(...restaurantIds) as any[];
    
    const bundles = db.prepare(`SELECT * FROM bundles WHERE restaurant_id IN (${placeholders}) AND status = 'approved'`).all(...restaurantIds) as any[];
    for (const b of bundles) {
      b.items = db.prepare(`
        SELECT bi.*, mi.name, mi.price 
        FROM bundle_items bi 
        JOIN menu_items mi ON bi.menu_item_id = mi.id 
        WHERE bi.bundle_id = ?
      `).all(b.id);
    }
    
    res.json({ 
      restaurants: availableRestaurants.map(r => {
        const activeOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE restaurant_id = ? AND status IN ('pending', 'accepted')").get(r.id) as { count: number };
        
        let isOpen = true;
        if (r.working_hours) {
          try {
            const workingHours = JSON.parse(r.working_hours);
            // Get current time in Macedonia timezone
            const macedoniaTime = new Date().toLocaleString("en-US", {timeZone: "Europe/Skopje"});
            const now = new Date(macedoniaTime);
            const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayName = days[now.getDay()];
            const dayHours = workingHours[dayName];

            if (dayHours) {
              const openTime = dayHours.open || dayHours.start;
              const closeTime = dayHours.close || dayHours.end;
              const isActive = dayHours.active !== undefined ? dayHours.active : true;

              if (!isActive) {
                isOpen = false;
              } else if (openTime && closeTime) {
                const [openH, openM] = openTime.split(':').map(Number);
                const [closeH, closeM] = closeTime.split(':').map(Number);
                const currentH = now.getHours();
                const currentM = now.getMinutes();
                
                const openTotal = openH * 60 + openM;
                const closeTotal = closeH * 60 + closeM;
                const currentTotal = currentH * 60 + currentM;

                if (currentTotal < openTotal || currentTotal > closeTotal) {
                  isOpen = false;
                }
              }
            }
          } catch (e) {
            console.error("Error parsing working hours for restaurant", r.id, e);
          }
        }

        // Add 5 minutes for every 4 active orders
        const deliveryDelay = Math.floor(activeOrders.count / 4) * 5;

        return { 
          id: r.id, 
          name: r.name, 
          address: r.address, 
          working_hours: r.working_hours,
          delivery_zones: r.delivery_zones,
          payment_config: r.payment_config,
          active_orders: activeOrders.count,
          is_open: isOpen,
          delivery_delay: deliveryDelay
        };
      }), 
      items: items,
      bundles: bundles
    });
  });

  app.post("/api/orders", (req, res) => {
    const { customer_name, customer_email, customer_phone, delivery_address, delivery_lat, delivery_lng, items, campaign_id, user_id, payment_method, selected_fees } = req.body;
    
    // Group items by restaurant
    const itemsByRestaurant = items.reduce((acc: any, item: any) => {
      if (!acc[item.restaurant_id]) acc[item.restaurant_id] = [];
      acc[item.restaurant_id].push(item);
      return acc;
    }, {});

    const insert = db.prepare(`
      INSERT INTO orders (restaurant_id, customer_name, customer_email, customer_phone, delivery_address, delivery_lat, delivery_lng, items, total_price, spare_1, user_id, tracking_token, payment_method, selected_fees, delivery_fee, payment_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const deliveryFeeSetting = db.prepare("SELECT value FROM global_settings WHERE key = 'delivery_fee'").get() as any;
    const deliveryFee = deliveryFeeSetting ? Number(deliveryFeeSetting.value) : 0;

    const orderIds = [];
    const trackingTokens: Record<number, string> = {};
    let campaignApplied = false;
    let campaignCodeToUse = null;
    let campaignBudget = 0;
    let campaignRestId = null;

    if (campaign_id) {
      const campaign = db.prepare("SELECT * FROM campaigns WHERE id = ? AND status = 'active'").get(campaign_id) as any;
      if (campaign) {
        if (campaign.restaurant_id && !itemsByRestaurant[campaign.restaurant_id]) {
          return res.status(400).json({ error: "Оваа кампања е валидна само за одреден ресторан кој не е во вашата кошничка." });
        }
        const codeRow = db.prepare("SELECT code FROM campaign_codes WHERE campaign_id = ? AND is_used = 0 LIMIT 1").get(campaign_id) as any;
        if (codeRow) {
          campaignCodeToUse = codeRow.code;
          campaignBudget = campaign.budget;
          campaignRestId = campaign.restaurant_id;
        } else {
          return res.status(400).json({ error: "Избраната кампања нема повеќе слободни кодови. Ве молиме освежете ја страницата и обидете се повторно." });
        }
      }
    }

    for (const [restaurantId, restItems] of Object.entries(itemsByRestaurant)) {
      // Check if restaurant is open
      const restaurant = db.prepare("SELECT id, working_hours, name, payment_config, delivery_fee, min_order_amount, email FROM restaurants WHERE id = ?").get(restaurantId) as any;
      if (restaurant && restaurant.working_hours) {
        try {
          const workingHours = JSON.parse(restaurant.working_hours);
          // Get current time in Macedonia timezone
          const macedoniaTime = new Date().toLocaleString("en-US", {timeZone: "Europe/Skopje"});
          const now = new Date(macedoniaTime);
          const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const dayName = days[now.getDay()];
          const dayHours = workingHours[dayName];

          if (dayHours) {
            const openTime = dayHours.open || dayHours.start;
            const closeTime = dayHours.close || dayHours.end;
            const isActive = dayHours.active !== undefined ? dayHours.active : true;

            if (!isActive) {
              return res.status(400).json({ error: `Ресторанот "${restaurant.name}" е затворен денес.` });
            }

            if (openTime && closeTime) {
              const [openH, openM] = openTime.split(':').map(Number);
              const [closeH, closeM] = closeTime.split(':').map(Number);
              const currentH = now.getHours();
              const currentM = now.getMinutes();
              
              const openTotal = openH * 60 + openM;
              const closeTotal = closeH * 60 + closeM;
              const currentTotal = currentH * 60 + currentM;

              if (currentTotal < openTotal || currentTotal > closeTotal) {
                return res.status(400).json({ error: `Ресторанот "${restaurant.name}" моментално е затворен. Работно време за денес: ${openTime} - ${closeTime}` });
              }
            }
          }
        } catch (e) {
          console.error("Error checking working hours:", e);
        }
      }

      let totalPrice = (restItems as any[]).reduce((sum, item) => sum + item.finalPrice, 0);
      
      // Check min order amount
      if (restaurant && restaurant.min_order_amount > 0 && totalPrice < restaurant.min_order_amount) {
        return res.status(400).json({ error: `Минималниот износ за нарачка од "${restaurant.name}" е ${restaurant.min_order_amount} ден.` });
      }

      // Determine delivery fee for this restaurant
      const restDeliveryFee = restaurant ? (restaurant.delivery_fee || 0) : deliveryFee;
      
      // Add selected fees for this restaurant
      let restFees = [];
      if (selected_fees) {
        try {
          const allSelectedFees = JSON.parse(selected_fees);
          const feeNames = allSelectedFees[restaurantId] || [];
          if (feeNames.length > 0 && restaurant && restaurant.payment_config) {
            const config = JSON.parse(restaurant.payment_config);
            const fees = config.fees || [];
            fees.forEach((f: any) => {
              if (feeNames.includes(f.name)) {
                totalPrice += f.amount;
                restFees.push(f);
              }
            });
          }
        } catch (e) {
          console.error("Error parsing selected fees:", e);
        }
      }

      // Handle loyalty points payment
      if (payment_method === 'points' && user_id) {
        const user = db.prepare("SELECT loyalty_points FROM users WHERE id = ?").get(user_id) as any;
        if (!user || user.loyalty_points < totalPrice) {
          return res.status(400).json({ error: "Немате доволно поени за оваа нарачка." });
        }
        
        // Check max redemption percent from restaurant config
        if (restaurant && restaurant.payment_config) {
          try {
            const config = JSON.parse(restaurant.payment_config);
            const maxRedemptionPercent = config.loyalty_max_pay_percent ?? 100;
            const maxRedeemable = (totalPrice * maxRedemptionPercent) / 100;
            if (totalPrice > maxRedeemable && maxRedemptionPercent < 100) {
              return res.status(400).json({ error: `Овој ресторан дозволува плаќање со поени до максимум ${maxRedemptionPercent}% од износот на нарачката.` });
            }
          } catch (e) {}
        }

        // Deduct points
        db.prepare("UPDATE users SET loyalty_points = loyalty_points - ? WHERE id = ?").run(totalPrice, user_id);
      }

      let campaignCode = null;

      const shouldApplyCampaign = campaignCodeToUse && !campaignApplied && (!campaignRestId || Number(restaurantId) === Number(campaignRestId));

      if (shouldApplyCampaign) {
        totalPrice -= campaignBudget; // Subtract campaign discount from total
        campaignCode = campaignCodeToUse;
        db.prepare("UPDATE campaign_codes SET is_used = 1, used_at = CURRENT_TIMESTAMP WHERE code = ?").run(campaignCode);
        campaignApplied = true;
      }

      const trackingToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const info = insert.run(
        restaurantId, customer_name, customer_email, customer_phone, delivery_address, delivery_lat, delivery_lng, JSON.stringify(restItems), totalPrice, campaignCode, user_id || null, trackingToken, payment_method || 'cash', JSON.stringify(restFees), restDeliveryFee, payment_method === 'card' ? 'pending' : 'paid'
      );
      orderIds.push(info.lastInsertRowid);
      trackingTokens[Number(info.lastInsertRowid)] = trackingToken;

      // Send confirmation emails
      if (customer_email) {
        const trackingUrl = `${process.env.APP_URL || 'http://localhost:3000'}/track/${trackingToken}`;
        sendEmail('order_confirmation', customer_email, {
          order_id: info.lastInsertRowid,
          customer_name: customer_name,
          total_price: totalPrice,
          restaurant_name: restaurant.name,
          tracking_url: trackingUrl
        }).catch(console.error);
      }

      if (restaurant.email) {
        sendEmail('new_order_alert', restaurant.email, {
          order_id: info.lastInsertRowid,
          customer_name: customer_name,
          total_price: totalPrice
        }).catch(console.error);
      }

      // Notify restaurant
      io.to(`restaurant_${restaurantId}`).emit("new_order", { id: info.lastInsertRowid });
      // Notify delivery partners
      io.to("delivery_partners").emit("new_available_order");
      // Notify admin
      io.to("admin_room").emit("new_order", { id: info.lastInsertRowid, restaurantId });
    }

    res.json({ success: true, orderIds, trackingTokens });
  });

  // --- PAYTEN PAYMENT GATEWAY ---
  app.post("/api/payment/payten/request", (req, res) => {
    const { orderId } = req.body;
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as any;
    if (!order) return res.status(404).json({ error: "Order not found" });

    const settings = db.prepare("SELECT * FROM global_settings").all();
    const s = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    if (s.payten_enabled !== 'true') {
      return res.status(400).json({ error: "Payment gateway is disabled" });
    }

    const clientId = s.payten_client_id;
    const storeKey = s.payten_store_key;
    const mode = s.payten_mode || 'test';
    const storetype = s.payten_store_type || '3D_PAY';
    const currency = s.payten_currency || '807';
    let baseUrl = process.env.APP_URL || `https://${req.get('host')}`;
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

    const rnd = crypto.randomBytes(16).toString('hex');
    const oid = order.id.toString();
    const amount = order.total_price.toFixed(2);
    const okUrl = `${baseUrl}/api/payment/payten/callback`;
    const failUrl = `${baseUrl}/api/payment/payten/callback`;
    const trantype = "Auth";

    const params: any = {
      clientid: clientId,
      oid: oid,
      amount: amount,
      okUrl: okUrl,
      failUrl: failUrl,
      trantype: trantype,
      currency: currency,
      rnd: rnd,
      storetype: storetype,
      hashAlgorithm: "ver3",
      lang: "mk",
      encoding: "utf-8"
    };

    if (s.payten_username) {
      params.userid = s.payten_username;
    }

    // Hash Version 3 Calculation
    const sortedKeys = Object.keys(params).filter(k => k !== 'hash' && k !== 'encoding').sort();
    const escape = (val: string) => (val || "").toString().replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
    let plaintext = sortedKeys.map(k => escape(params[k])).join('|');
    plaintext += '|' + escape(storeKey);

    const hash = crypto.createHash('sha512').update(plaintext, 'utf-8').digest('base64');
    params.hash = hash;

    let gateUrl = s.payten_3d_url;
    if (!gateUrl) {
      gateUrl = mode === 'test' 
        ? "https://entest.asseco-see.com.tr/fis/test/index.jsp" 
        : "https://payment.payten.com.mk/gateway";
    }

    console.log(`Initiating Payten payment for Order ${oid}. Amount: ${amount}. okUrl: ${okUrl}`);

    res.json({
      url: gateUrl,
      params: params
    });
  });

  const paytenCallbackHandler = (req: any, res: any) => {
    console.log(`Payten Callback Received (${req.method}):`, req.method === 'POST' ? req.body : req.query);
    const params = req.method === 'POST' ? req.body : req.query;
    
    if (!params || Object.keys(params).length === 0) {
      console.warn("Payten callback received empty parameters");
      return res.status(400).send("Empty callback parameters");
    }

    const hashReceived = params.HASH;
    const oid = params.oid;
    const response = params.Response; // "Approved" or "Error"
    
    const settings = db.prepare("SELECT * FROM global_settings").all();
    const s = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    const storeKey = s.payten_store_key;

    // Verify Hash
    let plaintext = "";
    if (params.HASHPARAMS && params.HASHPARAMSVAL) {
      plaintext = params.HASHPARAMSVAL + "|" + storeKey;
    } else {
      const sortedKeys = Object.keys(params).filter(k => k !== 'HASH' && k !== 'encoding').sort();
      const escape = (val: string) => (val || "").toString().replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
      plaintext = sortedKeys.map(k => escape(params[k])).join('|');
      plaintext += '|' + escape(storeKey);
    }
    
    const hashCalculated = crypto.createHash('sha512').update(plaintext, 'utf-8').digest('base64');
    const isHashValid = hashReceived === hashCalculated;
    
    console.log(`Order ${oid} Callback. Response: ${response}. Hash Match: ${isHashValid}`);
    
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(oid) as any;
    if (!order) {
      console.error(`Order ${oid} not found in callback`);
      return res.status(404).send("Order not found");
    }

    if (response === "Approved") {
      db.prepare("UPDATE orders SET payment_status = 'paid', payment_transaction_id = ? WHERE id = ?")
        .run(params.TransId || '', oid);
      
      console.log(`Order ${oid} marked as PAID. TransId: ${params.TransId}`);

      res.send(`
        <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
            <h2>Плаќањето е успешно!</h2>
            <p>Ве пренасочуваме кон вашата нарачка...</p>
            <script>
              setTimeout(() => {
                window.location.href = "/track/${order.tracking_token}?payment=success";
              }, 2000);
            </script>
          </body>
        </html>
      `);
    } else {
      db.prepare("UPDATE orders SET payment_status = 'failed' WHERE id = ?").run(oid);
      console.log(`Order ${oid} payment FAILED. Error: ${params.ErrMsg}`);

      res.send(`
        <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
            <h2 style="color: red;">Плаќањето не успеа</h2>
            <p>Грешка: ${params.ErrMsg || 'Непозната грешка'}</p>
            <p>Ве враќаме назад...</p>
            <script>
              setTimeout(() => {
                window.location.href = "/track/${order.tracking_token}?payment=failed&error=${encodeURIComponent(params.ErrMsg || 'Payment failed')}";
              }, 3000);
            </script>
          </body>
        </html>
      `);
    }
  };

  app.post("/api/payment/payten/callback", paytenCallbackHandler);
  app.get("/api/payment/payten/callback", paytenCallbackHandler);

  app.get("/api/orders/:restaurantId", (req, res) => {
    const orders = db.prepare(`
      SELECT o.*, dp.name as delivery_partner_name, dp.delivery_methods as delivery_partner_methods
      FROM orders o
      LEFT JOIN delivery_partners dp ON o.delivery_partner_id = dp.id
      WHERE o.restaurant_id = ?
      ORDER BY o.created_at DESC
    `).all(req.params.restaurantId);
    res.json(orders);
  });

  app.put("/api/orders/:orderId/delay", (req, res) => {
    const { delayMinutes } = req.body;
    const { orderId } = req.params;
    
    const targetTime = new Date(Date.now() + delayMinutes * 60000).toISOString();
    
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as any;
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    
    // Update spare_2 but keep current status
    db.prepare("UPDATE orders SET spare_2 = ? WHERE id = ?").run(targetTime, orderId);
    
    // Notify customer
    io.to(`order_${order.tracking_token}`).emit("status_updated", { 
      status: order.status, 
      targetTime,
      message: `Вашата нарачка ќе влезе во подготовка за ${delayMinutes} минути.`
    });
    
    // Notify restaurant staff
    io.to(`restaurant_${order.restaurant_id}`).emit("order_update");

    // Notify drivers
    io.emit("new_available_order", { ...order, spare_2: targetTime });

    sendPushNotification(null, {
      title: 'Нарачката е на чекање',
      body: `Вашата нарачка #${orderId} ќе влезе во подготовка за ${delayMinutes} минути.`,
      url: `/track/${order.tracking_token}`
    }, Number(orderId)).catch(console.error);

    res.json({ success: true, targetTime });
  });

  app.put("/api/orders/:orderId/status", (req, res) => {
    const { status } = req.body;
    const { orderId } = req.params;
    
    let delivery_code = null;
    let delivery_partner_name = null;
    
    if (status === 'ready') {
      const pickupDeadline = new Date(Date.now() + 25 * 60000).toISOString();
      db.prepare("UPDATE orders SET status = ?, ready_at = CURRENT_TIMESTAMP, spare_2 = ? WHERE id = ?").run(status, pickupDeadline, orderId);
      const order = db.prepare("SELECT tracking_token, restaurant_id FROM orders WHERE id = ?").get(orderId) as any;
      if (order) {
        io.to(`order_${order.tracking_token}`).emit("status_updated", { status });
        io.to(`restaurant_${order.restaurant_id}`).emit("order_update");
        
        // Notify delivery partners that a new order is ready for pickup
        io.to("delivery_partners").emit("new_available_order");
        io.to("admin_room").emit("order_status_changed");

        sendPushNotification(null, {
          title: 'Нарачката е подготвена!',
          body: `Вашата нарачка #${orderId} е подготвена за достава.`,
          url: `/track/${order.tracking_token}`
        }, Number(orderId)).catch(console.error);
      }
      return res.json({ success: true });
    }

    if (status === 'accepted') {
      // Generate delivery code: Name, Address, and 4 spare fields from restaurant
      const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as any;
      const restaurant = db.prepare("SELECT * FROM restaurants WHERE id = ?").get(order.restaurant_id) as any;
      
      const codeData = {
        customer: order.customer_name,
        address: order.delivery_address,
        restaurant_name: restaurant.name,
        spare_1: restaurant.spare_1 || '',
        spare_2: restaurant.spare_2 || '',
        spare_3: restaurant.spare_3 || '',
        spare_4: restaurant.spare_4 || '',
        campaign_code: order.spare_1 || ''
      };
      delivery_code = JSON.stringify(codeData);
      
      db.prepare("UPDATE orders SET status = ?, delivery_code = ?, accepted_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, delivery_code, orderId);
      
      // Notify customer
      io.to(`order_${order.tracking_token}`).emit("status_updated", { status });
      
      // Notify restaurant staff (chef) and delivery partners
      io.to(`restaurant_${order.restaurant_id}`).emit("order_preparing", { orderId, status: 'accepted' });
      io.to(`delivery_restaurant_${order.restaurant_id}`).emit("order_preparing", { orderId, status: 'accepted' });
      
      sendPushNotification(null, {
        title: 'Нарачката е прифатена!',
        body: `Вашата нарачка #${orderId} е прифатена од ресторанот.`,
        url: `/track/${order.tracking_token}`
      }, Number(orderId)).catch(console.error);

      // Notify delivery partners
      io.to("delivery_partners").emit("new_available_order");
      io.to("admin_room").emit("order_status_changed");
    } else if (status === 'delivering' || status === 'completed') {
      const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as any;
      // If no delivery partner is assigned yet, the restaurant is delivering it themselves
      if (order && !order.delivery_partner_id) {
        const restaurant = db.prepare("SELECT * FROM restaurants WHERE id = ?").get(order.restaurant_id) as any;
        delivery_partner_name = restaurant.name;
        
        if (order.delivery_code) {
          try {
            const codeData = JSON.parse(order.delivery_code);
            codeData.spare_1 = restaurant.name;
            codeData.delivery_partner = restaurant.name;
            
            delivery_code = JSON.stringify(codeData);
            db.prepare("UPDATE orders SET status = ?, delivery_partner_name = ?, delivery_code = ? WHERE id = ?")
              .run(status, restaurant.name, delivery_code, orderId);
          } catch (e) {
            db.prepare("UPDATE orders SET status = ?, delivery_partner_name = ? WHERE id = ?")
              .run(status, restaurant.name, orderId);
          }
        } else {
          db.prepare("UPDATE orders SET status = ?, delivery_partner_name = ? WHERE id = ?")
            .run(status, restaurant.name, orderId);
        }
      } else {
        db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, orderId);
      }
      
      // Notify customer
      if (order) {
        io.to(`order_${order.tracking_token}`).emit("status_updated", { status });
        
        const statusText = status === 'delivering' ? 'е на пат кон вас' : 'е успешно доставена';
        sendPushNotification(null, {
          title: status === 'delivering' ? 'Нарачката е на пат!' : 'Нарачката е доставена!',
          body: `Вашата нарачка #${orderId} ${statusText}.`,
          url: `/track/${order.tracking_token}`
        }, Number(orderId)).catch(console.error);

        // Send email notification
        if (order.customer_email) {
          const restaurant = db.prepare("SELECT name FROM restaurants WHERE id = ?").get(order.restaurant_id) as any;
          const templateName = status === 'delivering' ? 'order_delivering' : 'order_completed';
          const trackingUrl = `${process.env.APP_URL || ''}/track/${order.tracking_token}`;
          
          sendEmail(templateName, order.customer_email, {
            order_id: orderId,
            customer_name: order.customer_name,
            restaurant_name: restaurant?.name || 'Ресторанот',
            tracking_url: trackingUrl
          }).catch(console.error);
        }
      }
    } else {
      db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, orderId);
      
      // Notify customer
      const order = db.prepare("SELECT tracking_token FROM orders WHERE id = ?").get(orderId) as any;
      if (order) {
        io.to(`order_${order.tracking_token}`).emit("status_updated", { status });
      }
    }
    
    // Award loyalty points on completion
    if (status === 'completed') {
      const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as any;
      if (order && order.user_id) {
        const restaurant = db.prepare("SELECT payment_config FROM restaurants WHERE id = ?").get(order.restaurant_id) as any;
        let earnPercent = 1; // Default 1% if not specified
        if (restaurant && restaurant.payment_config) {
          try {
            const config = JSON.parse(restaurant.payment_config);
            earnPercent = config.loyalty_earn_percent ?? 1;
          } catch (e) {}
        }
        // Only award points if not paid with points (or maybe award on the cash portion? let's keep it simple: award on total price)
        const points = Math.floor((order.total_price * earnPercent) / 100);
        if (points > 0) {
          db.prepare("UPDATE users SET loyalty_points = loyalty_points + ? WHERE id = ?").run(points, order.user_id);
        }
      }
    }
    
    res.json({ success: true, delivery_code, delivery_partner_name });
  });

  app.get("/api/delivery/orders", (req, res) => {
    const { partnerId, clientTime, clientDay } = req.query;
    if (!partnerId) {
      return res.json([]);
    }
    const partner = db.prepare("SELECT preferred_restaurants, working_hours, city, role FROM delivery_partners WHERE id = ?").get(partnerId) as any;
    if (!partner) return res.json([]);
    
    const preferred = JSON.parse(partner.preferred_restaurants || '[]');
    const workingHours = JSON.parse(partner.working_hours || '{}');
    
    // Use client time/day if provided, otherwise fallback to Macedonia timezone (Europe/Skopje)
    const days = ['Недела', 'Понеделник', 'Вторник', 'Среда', 'Четврток', 'Петок', 'Сабота'];
    const macedoniaTime = new Date().toLocaleString("en-US", {timeZone: "Europe/Skopje"});
    const now = new Date(macedoniaTime);
    const currentDay = (clientDay as string) || days[now.getDay()];
    const currentTime = (clientTime as string) || (now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0'));
    
    const todayHours = workingHours[currentDay] || workingHours[currentDay.toLowerCase()];
    
    const timeToMinutes = (t: string) => {
      if (!t) return 0;
      const [h, m] = t.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    // Default to active if no hours are set for today
    let isWorking = true;
    if (todayHours) {
      if (todayHours.active === false) {
        isWorking = false;
      } else {
        const currentMin = timeToMinutes(currentTime);
        const startMin = timeToMinutes(todayHours.start || '00:00');
        const endMin = timeToMinutes(todayHours.end || '23:59');
        isWorking = currentMin >= startMin && currentMin <= endMin;
      }
    }

    let query = `
      SELECT o.*, r.name as restaurant_name, r.city as restaurant_city 
      FROM orders o 
      JOIN restaurants r ON o.restaurant_id = r.id 
      WHERE `;
    
    const params: any[] = [];
    
    if (preferred.length > 0) {
      const placeholders = preferred.map(() => '?').join(',');
      query += `o.restaurant_id IN (${placeholders}) `;
      params.push(...preferred);
    } else {
      // If no preferred restaurants, show all orders in the partner's city
      query += `r.city = ? `;
      params.push(partner.city);
    }

    query += `AND (
      ((o.status IN ('preparing', 'accepted', 'ready') OR (o.status = 'pending' AND o.spare_2 IS NOT NULL)) AND o.delivery_partner_id IS NULL AND ?)
      OR (o.delivery_partner_id = ? AND o.status IN ('preparing', 'accepted', 'ready', 'delivering'))
    ) 
    ORDER BY o.created_at DESC`;
    params.push(isWorking ? 1 : 0);
    params.push(partnerId);

    try {
      const orders = db.prepare(query).all(...params);
      res.json(orders);
    } catch (e) {
      console.error("Error fetching delivery orders:", e);
      res.json([]);
    }
  });

  app.post("/api/delivery/location", (req, res) => {
    const { partnerId, lat, lng } = req.body;
    if (!partnerId || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    db.prepare("UPDATE delivery_partners SET current_lat = ?, current_lng = ?, last_location_update = CURRENT_TIMESTAMP WHERE id = ?")
      .run(lat, lng, partnerId);

    // Find active orders for this partner and notify customers
    const activeOrders = db.prepare("SELECT tracking_token FROM orders WHERE delivery_partner_id = ? AND status = 'delivering'").all(partnerId) as any[];
    activeOrders.forEach(order => {
      io.to(`order_${order.tracking_token}`).emit("location_updated", { lat, lng });
    });

    res.json({ success: true });
  });

  app.get("/api/delivery/earnings/:partnerId", (req, res) => {
    const { partnerId } = req.params;
    const earnings = db.prepare(`
      SELECT 
        COUNT(*) as total_deliveries,
        SUM(delivery_fee) as total_earned,
        DATE(created_at) as date
      FROM orders
      WHERE delivery_partner_id = ? AND status = 'completed'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `).all(partnerId);
    res.json(earnings);
  });

  app.get("/api/admin/delivery/all", (req, res) => {
    if (!checkAdminAuth(req, res, 'delivery')) return;
    const partners = db.prepare("SELECT id, name, city, role, fleet_manager_id, status FROM delivery_partners").all();
    res.json(partners);
  });

  app.put("/api/admin/delivery/:id/role", (req, res) => {
    if (!checkAdminAuth(req, res, 'delivery')) return;
    const { role, fleet_manager_id } = req.body;
    db.prepare("UPDATE delivery_partners SET role = ?, fleet_manager_id = ? WHERE id = ?")
      .run(role || 'rider', fleet_manager_id || null, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/delivery/team/:leadId", (req, res) => {
    const team = db.prepare("SELECT id, name, phone, status FROM delivery_partners WHERE fleet_manager_id = ?").all(req.params.leadId);
    res.json(team);
  });

  app.get("/api/delivery/team/:leadId/orders", (req, res) => {
    const teamMembers = db.prepare("SELECT id FROM delivery_partners WHERE fleet_manager_id = ? OR id = ?").all(req.params.leadId, req.params.leadId) as any[];
    const ids = teamMembers.map(t => t.id).join(',');
    if (!ids) return res.json([]);
    
    const orders = db.prepare(`
      SELECT o.*, r.name as restaurant_name 
      FROM orders o 
      JOIN restaurants r ON o.restaurant_id = r.id 
      WHERE (o.delivery_partner_id IN (${ids}) AND o.status IN ('preparing', 'accepted', 'ready', 'delivering')) 
         OR (o.status IN ('preparing', 'accepted', 'ready') AND o.delivery_partner_id IS NULL AND r.city = (SELECT city FROM delivery_partners WHERE id = ?))
      ORDER BY o.created_at DESC
    `).all(req.params.leadId);
    res.json(orders);
  });

  app.get("/api/delivery/team/:leadId/analytics", (req, res) => {
    const teamMembers = db.prepare("SELECT id, name FROM delivery_partners WHERE fleet_manager_id = ? OR id = ?").all(req.params.leadId, req.params.leadId) as any[];
    const ids = teamMembers.map(t => t.id).join(',');
    if (!ids) return res.json([]);

    const orders = db.prepare(`
      SELECT delivery_partner_id, total_price, selected_fees, status
      FROM orders 
      WHERE delivery_partner_id IN (${ids}) AND status = 'completed'
    `).all() as any[];

    const analytics = teamMembers.map(member => {
      const memberOrders = orders.filter(o => o.delivery_partner_id === member.id);
      const totalOrders = memberOrders.length;
      const totalValue = memberOrders.reduce((sum, o) => sum + o.total_price, 0);
      
      let totalEarnings = 0;
      memberOrders.forEach(o => {
        try {
          const fees = JSON.parse(o.selected_fees || '[]');
          fees.forEach((f: any) => {
            if (f.name.toLowerCase().includes('достава') || f.name.toLowerCase().includes('delivery')) {
              totalEarnings += f.amount;
            }
          });
        } catch (e) {}
      });

      return {
        id: member.id,
        name: member.name,
        totalOrders,
        totalValue,
        totalEarnings
      };
    });

    res.json(analytics);
  });

  app.post("/api/delivery/team/assign", (req, res) => {
    const { orderId, partnerId, partnerName } = req.body;
    db.prepare("UPDATE orders SET delivery_partner_id = ?, delivery_partner_name = ?, status = 'delivering' WHERE id = ?")
      .run(partnerId, partnerName, orderId);
    io.to("admin_room").emit("order_status_changed");
    res.json({ success: true });
  });

  app.put("/api/delivery/orders/:orderId/status", (req, res) => {
    const { status, partnerId, partnerName } = req.body;
    const { orderId } = req.params;

    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as any;
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    if (status === 'delivering' && partnerId && partnerName) {
      // If the order is not ready yet, we just assign the partner but keep the current status
      const shouldActuallyStartDelivery = order.status === 'ready';
      const finalStatus = shouldActuallyStartDelivery ? 'delivering' : order.status;

      // Update order with partner info
      if (order.delivery_code) {
        try {
          const codeData = JSON.parse(order.delivery_code);
          codeData.spare_1 = partnerName;
          codeData.delivery_partner = partnerName;
          
          const updatedCode = JSON.stringify(codeData);
          db.prepare("UPDATE orders SET status = ?, delivery_partner_id = ?, delivery_partner_name = ?, delivery_code = ?, picked_up_at = CURRENT_TIMESTAMP WHERE id = ?")
            .run(finalStatus, partnerId, partnerName, updatedCode, orderId);
        } catch (e) {
          db.prepare("UPDATE orders SET status = ?, delivery_partner_id = ?, delivery_partner_name = ?, picked_up_at = CURRENT_TIMESTAMP WHERE id = ?")
            .run(finalStatus, partnerId, partnerName, orderId);
        }
      } else {
        db.prepare("UPDATE orders SET status = ?, delivery_partner_id = ?, delivery_partner_name = ?, picked_up_at = CURRENT_TIMESTAMP WHERE id = ?")
          .run(finalStatus, partnerId, partnerName, orderId);
      }

      // ONLY notify customer if delivery actually started
      if (shouldActuallyStartDelivery) {
        io.to(`order_${order.tracking_token}`).emit("status_updated", { status: 'delivering' });
        
        sendPushNotification(null, {
          title: 'Нарачката е на пат!',
          body: `Вашата нарачка #${orderId} е преземена од доставувачот и е на пат кон вас.`,
          url: `/track/${order.tracking_token}`
        }, Number(orderId)).catch(console.error);
      } else {
        // Just notify that a driver was assigned (optional, but good for restaurant UI)
        io.to(`order_${order.tracking_token}`).emit("driver_assigned", { partnerName });
      }
    } else {
      const deliveredAtUpdate = status === 'completed' ? ', delivered_at = CURRENT_TIMESTAMP' : '';
      db.prepare(`UPDATE orders SET status = ? ${deliveredAtUpdate} WHERE id = ?`).run(status, orderId);
      io.to(`order_${order.tracking_token}`).emit("status_updated", { status });
    }

    // Notify restaurant
    io.to(`restaurant_${order.restaurant_id}`).emit("order_update");
    io.to("admin_room").emit("order_status_changed");
    
    res.json({ success: true });
  });

  app.get("/api/admin/orders", (req, res) => {
    if (!checkAdminAuth(req, res, 'orders')) return;
    const { restaurantId, deliveryPartnerId, startDate, endDate } = req.query;
    let query = "SELECT * FROM orders WHERE 1=1";
    const params: any[] = [];

    if (restaurantId) {
      query += " AND restaurant_id = ?";
      params.push(restaurantId);
    }
    
    if (deliveryPartnerId) {
      query += " AND delivery_partner_id = ?";
      params.push(deliveryPartnerId);
    }
    
    if (startDate) {
      query += " AND date(created_at) >= ?";
      params.push(startDate);
    }
    
    if (endDate) {
      query += " AND date(created_at) <= ?";
      params.push(endDate);
    }
    
    query += " ORDER BY created_at DESC";
    
    const orders = db.prepare(query).all(...params);
    res.json(orders);
  });

  // --- MENU ENDPOINTS ---
  app.get("/api/menu/:restaurantId", (req, res) => {
    const items = db.prepare('SELECT * FROM menu_items WHERE restaurant_id = ?').all(req.params.restaurantId) as any[];
    // Parse modifiers JSON
    const parsedItems = items.map(item => ({
      ...item,
      modifiers: JSON.parse(item.modifiers || '[]')
    }));
    res.json(parsedItems);
  });

  app.post("/api/menu/:restaurantId", (req, res) => {
    const { name, description, price, image_url, category, subcategory, modifiers, is_available } = req.body;
    const modifiersJson = JSON.stringify(modifiers || []);
    const isAvail = is_available !== undefined ? (is_available ? 1 : 0) : 1;
    const insert = db.prepare('INSERT INTO menu_items (restaurant_id, name, description, price, image_url, category, subcategory, modifiers, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const result = insert.run(req.params.restaurantId, name, description, price, image_url, category, subcategory, modifiersJson, isAvail);
    res.json({ id: result.lastInsertRowid, restaurant_id: req.params.restaurantId, name, description, price, image_url, category, subcategory, modifiers, is_available: isAvail });
  });

  app.put("/api/menu/:id", (req, res) => {
    const { name, description, price, image_url, category, subcategory, modifiers, is_available } = req.body;
    const modifiersJson = JSON.stringify(modifiers || []);
    const isAvail = is_available !== undefined ? (is_available ? 1 : 0) : 1;
    const update = db.prepare('UPDATE menu_items SET name = ?, description = ?, price = ?, image_url = ?, category = ?, subcategory = ?, modifiers = ?, is_available = ? WHERE id = ?');
    update.run(name, description, price, image_url, category, subcategory, modifiersJson, isAvail, req.params.id);
    res.json({ success: true });
  });

  app.put("/api/menu/:id/toggle-availability", (req, res) => {
    const id = req.params.id;
    const item = db.prepare("SELECT is_available FROM menu_items WHERE id = ?").get(id) as any;
    if (item) {
      const newStatus = item.is_available ? 0 : 1;
      db.prepare("UPDATE menu_items SET is_available = ? WHERE id = ?").run(newStatus, id);
      res.json({ success: true, is_available: newStatus });
    } else {
      res.status(404).json({ success: false, message: "Не е пронајден продуктот" });
    }
  });

  app.delete("/api/menu/:id", (req, res) => {
    db.prepare('DELETE FROM menu_items WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.put("/api/delivery/:id/profile", (req, res) => {
    const { preferred_restaurants, working_hours, delivery_methods } = req.body;
    const { id } = req.params;
    
    try {
      db.prepare("UPDATE delivery_partners SET preferred_restaurants = ?, working_hours = ?, delivery_methods = ? WHERE id = ?")
        .run(JSON.stringify(preferred_restaurants), JSON.stringify(working_hours), JSON.stringify(delivery_methods || []), id);
      
      const updatedPartner = db.prepare("SELECT * FROM delivery_partners WHERE id = ?").get(id);
      res.json({ success: true, partner: updatedPartner });
    } catch (e) {
      res.status(500).json({ error: "Грешка при ажурирање на профилот" });
    }
  });

  // Marketing Associate Endpoints
  app.get("/api/admin/marketing-associates", (req, res) => {
    if (!checkAdminAuth(req, res, 'marketing')) return;
    const associates = db.prepare("SELECT * FROM marketing_associates ORDER BY created_at DESC").all();
    res.json(associates);
  });

  app.post("/api/admin/marketing-associates", (req, res) => {
    if (!checkAdminAuth(req, res, 'marketing')) return;
    const { username, password, company_name, contact_person, phone, bank_account, address, city } = req.body;
    try {
      db.prepare(`
        INSERT INTO marketing_associates (username, password, company_name, contact_person, phone, bank_account, address, city)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(username, password, company_name, contact_person, phone, bank_account, address, city);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Корисничкото име веќе постои" });
    }
  });

  app.post("/api/marketing/login", (req, res) => {
    const { username, password } = req.body;
    const associate = db.prepare("SELECT * FROM marketing_associates WHERE username = ? AND password = ?").get(username, password) as any;
    if (associate) {
      res.json({ success: true, associate });
    } else {
      res.status(401).json({ error: "Невалидни податоци" });
    }
  });

  // Campaign Endpoints
  app.get("/api/customer/campaigns/active", (req, res) => {
    const macedoniaTime = new Date().toLocaleString("en-US", {timeZone: "Europe/Skopje"});
    const today = new Date(macedoniaTime).toISOString().split('T')[0];
    const campaigns = db.prepare(`
      SELECT * FROM campaigns 
      WHERE status = 'active' 
      AND start_date <= ? 
      AND end_date >= ?
      AND EXISTS (
        SELECT 1 FROM campaign_codes cc 
        WHERE cc.campaign_id = campaigns.id AND cc.is_used = 0
      )
    `).all(today, today);
    res.json(campaigns);
  });

  app.get("/api/marketing/campaigns", (req, res) => {
    const { associateId } = req.query;
    const campaigns = db.prepare(`
      SELECT c.*, 
             (SELECT COUNT(*) FROM campaign_codes WHERE campaign_id = c.id) as total_codes,
             (SELECT COUNT(*) FROM campaign_codes WHERE campaign_id = c.id AND is_used = 1) as used_codes
      FROM campaigns c 
      WHERE c.associate_id = ? 
      ORDER BY c.created_at DESC
    `).all(associateId);
    res.json(campaigns);
  });

  app.post("/api/marketing/campaigns", (req, res) => {
    const { associate_id, name, description, budget, start_date, end_date, location_type, selected_cities, map_zones, quantity, is_visible } = req.body;
    try {
      db.prepare(`
        INSERT INTO campaigns (associate_id, name, description, budget, start_date, end_date, location_type, selected_cities, map_zones, quantity, is_visible)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(associate_id, name, description, budget, start_date, end_date, location_type, JSON.stringify(selected_cities || []), JSON.stringify(map_zones || []), quantity, is_visible === false ? 0 : 1);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Грешка при креирање на кампања" });
    }
  });

  app.post("/api/admin/campaigns", (req, res) => {
    if (!checkAdminAuth(req, res, 'campaigns')) return;
    const { name, description, budget, start_date, end_date, location_type, selected_cities, map_zones, quantity, is_visible, restaurant_id } = req.body;
    try {
      const result = db.prepare(`
        INSERT INTO campaigns (associate_id, name, description, budget, start_date, end_date, location_type, selected_cities, map_zones, quantity, is_visible, restaurant_id, status)
        VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `).run(name, description, budget, start_date, end_date, location_type, JSON.stringify(selected_cities || []), JSON.stringify(map_zones || []), quantity, is_visible === false ? 0 : 1, restaurant_id || null);
      
      const campaignId = result.lastInsertRowid;
      
      // Generate codes for admin created campaigns immediately
      const code_format = name.substring(0, 4).toUpperCase() + '-[XXXX]';
      db.prepare("UPDATE campaigns SET code_format = ? WHERE id = ?").run(code_format, campaignId);
      
      const insertCode = db.prepare("INSERT INTO campaign_codes (campaign_id, code) VALUES (?, ?)");
      const prefix = code_format.split('[')[0];
      
      const generateRandomString = (length: number) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      for (let i = 0; i < quantity; i++) {
        let code = '';
        let isUnique = false;
        while (!isUnique) {
          code = prefix + generateRandomString(4);
          const existing = db.prepare("SELECT id FROM campaign_codes WHERE code = ?").get(code);
          if (!existing) isUnique = true;
        }
        insertCode.run(campaignId, code);
      }

      res.json({ success: true, id: campaignId, generated: quantity });
    } catch (e) {
      res.status(500).json({ error: "Грешка при креирање на кампања" });
    }
  });

  app.post("/api/admin/campaigns/:id/approve", (req, res) => {
    if (!checkAdminAuth(req, res, 'campaigns')) return;
    const { id } = req.params;
    const { code_format } = req.body;
    
    try {
      const campaign = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(id) as any;
      if (!campaign) return res.status(404).json({ error: "Кампањата не е пронајдена" });

      // Generate codes
      const generateCode = (format: string) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < format.length; i++) {
          if (format[i] === '-') {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
          } else if (format[i] === ' ') {
            result += ' ';
          } else {
            result += format[i];
          }
        }
        return result;
      };

      const codes = [];
      const stmt = db.prepare("INSERT OR IGNORE INTO campaign_codes (campaign_id, code) VALUES (?, ?)");
      
      let generatedCount = 0;
      let attempts = 0;
      const maxAttempts = campaign.quantity * 2;

      while (generatedCount < campaign.quantity && attempts < maxAttempts) {
        const code = generateCode(code_format);
        const info = stmt.run(id, code);
        if (info.changes > 0) {
          generatedCount++;
        }
        attempts++;
      }

      db.prepare("UPDATE campaigns SET status = 'active', code_format = ? WHERE id = ?").run(code_format, id);
      
      res.json({ success: true, generated: generatedCount });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Грешка при одобрување" });
    }
  });

  app.post("/api/admin/campaigns/:id/reject", (req, res) => {
    if (!checkAdminAuth(req, res, 'campaigns')) return;
    const { id } = req.params;
    try {
      db.prepare("UPDATE campaigns SET status = 'rejected' WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Грешка при одбивање" });
    }
  });

  app.get("/api/campaigns/:id/export", (req, res) => {
    const { id } = req.params;
    try {
      const campaign = db.prepare("SELECT * FROM campaigns WHERE id = ?").get(id) as any;
      const codes = db.prepare("SELECT code FROM campaign_codes WHERE campaign_id = ?").all(id) as any[];
      
      if (!campaign || codes.length === 0) {
        return res.status(404).send("Нема кодови за оваа кампања");
      }

      let csv = "Код\n";
      codes.forEach(c => {
        csv += `${c.code}\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=campaign_codes_${id}.csv`);
      res.send(csv);
    } catch (e) {
      res.status(500).send("Грешка при експорт");
    }
  });

  app.get("/api/campaigns/:id/used-codes", (req, res) => {
    const { id } = req.params;
    try {
      const usedCodes = db.prepare(`
        SELECT 
          cc.code,
          cc.used_at,
          o.id as order_id,
          o.delivery_address,
          r.name as restaurant_name
        FROM campaign_codes cc
        JOIN orders o ON cc.code = o.spare_1
        JOIN restaurants r ON o.restaurant_id = r.id
        WHERE cc.campaign_id = ? AND cc.is_used = 1
        ORDER BY cc.used_at DESC
      `).all(id);
      res.json(usedCodes);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Грешка при вчитување на кодови" });
    }
  });

  app.get("/api/admin/campaigns", (req, res) => {
    if (!checkAdminAuth(req, res, 'campaigns')) return;
    const campaigns = db.prepare(`
      SELECT c.*, 
             ma.company_name as associate_name,
             r.name as restaurant_name,
             (SELECT COUNT(*) FROM campaign_codes cc WHERE cc.campaign_id = c.id AND cc.is_used = 1) as used_codes_count
      FROM campaigns c 
      LEFT JOIN marketing_associates ma ON c.associate_id = ma.id 
      LEFT JOIN restaurants r ON c.restaurant_id = r.id
      ORDER BY c.created_at DESC
    `).all();
    res.json(campaigns);
  });

  // Background check for stale orders
  setInterval(() => {
    const now = new Date();
    const staleThreshold = 15 * 60 * 1000; // 15 minutes
    const criticalThreshold = 30 * 60 * 1000; // 30 minutes
    
    try {
      const staleOrders = db.prepare(`
        SELECT o.*, r.name as restaurant_name 
        FROM orders o
        JOIN restaurants r ON o.restaurant_id = r.id
        WHERE o.status = 'ready' AND o.ready_at IS NOT NULL
      `).all() as any[];
      
      staleOrders.forEach(order => {
        const readyTime = new Date(order.ready_at).getTime();
        const elapsed = now.getTime() - readyTime;
        
        if (elapsed > criticalThreshold) {
          // Solution 5: Alert Admin
          io.to("admin_room").emit("stale_order_alert", { 
            orderId: order.id, 
            restaurant: order.restaurant_name,
            elapsed: Math.floor(elapsed / 60000)
          });
        } else if (elapsed > staleThreshold) {
          // Solution 1: Notify Delivery Partners / Customer
          io.to("delivery_partners").emit("stale_order_reminder", { orderId: order.id });
          io.to(`order_${order.tracking_token}`).emit("order_stale_reminder");
        }
        
        // Solution 3: Re-assignment (if assigned but not picked up)
        if (elapsed > 20 * 60 * 1000 && order.delivery_partner_id) {
          const prevPartner = order.delivery_partner_name;
          db.prepare("UPDATE orders SET delivery_partner_id = NULL, delivery_partner_name = NULL WHERE id = ?").run(order.id);
          io.to("delivery_partners").emit("new_available_order");
          io.to(`restaurant_${order.restaurant_id}`).emit("order_update");
          
          // Alert Admin about re-assignment
          io.to("admin_room").emit("stale_order_alert", { 
            orderId: order.id, 
            restaurant: order.restaurant_name,
            elapsed: Math.floor(elapsed / 60000),
            isReassignment: true,
            prevPartner
          });
        }
      });
    } catch (e) {
      console.error("Error in stale order check:", e);
    }
  }, 60000); // Every minute

  // Review Endpoints
  app.post("/api/reviews", (req, res) => {
    const { order_id, restaurant_id, customer_name, rating, comment } = req.body;
    try {
      // Check if review already exists for this order
      const existing = db.prepare("SELECT id FROM reviews WHERE order_id = ?").get(order_id);
      if (existing) {
        return res.status(400).json({ error: "Веќе оставивте рецензија за оваа нарачка." });
      }

      db.prepare(`
        INSERT INTO reviews (order_id, restaurant_id, customer_name, rating, comment)
        VALUES (?, ?, ?, ?, ?)
      `).run(order_id, restaurant_id, customer_name, rating, comment);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Грешка при зачувување на рецензијата" });
    }
  });

  app.get("/api/restaurants/:id/reviews", (req, res) => {
    const { id } = req.params;
    try {
      const reviews = db.prepare(`
        SELECT * FROM reviews 
        WHERE restaurant_id = ? AND is_visible = 1 
        ORDER BY created_at DESC
      `).all(id);
      res.json(reviews);
    } catch (e) {
      res.status(500).json({ error: "Грешка при вчитување на рецензиите" });
    }
  });

  app.get("/api/admin/reviews", (req, res) => {
    if (!checkAdminAuth(req, res, 'reviews')) return;
    try {
      const reviews = db.prepare(`
        SELECT rev.*, r.name as restaurant_name 
        FROM reviews rev
        JOIN restaurants r ON rev.restaurant_id = r.id
        ORDER BY rev.created_at DESC
      `).all();
      res.json(reviews);
    } catch (e) {
      res.status(500).json({ error: "Грешка при вчитување на рецензиите" });
    }
  });

  app.put("/api/admin/reviews/:id/toggle", (req, res) => {
    if (!checkAdminAuth(req, res, 'reviews')) return;
    const { id } = req.params;
    try {
      db.prepare("UPDATE reviews SET is_visible = 1 - is_visible WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Грешка при промена на видливоста" });
    }
  });

  app.delete("/api/admin/reviews/:id", (req, res) => {
    if (!checkAdminAuth(req, res, 'reviews')) return;
    const { id } = req.params;
    try {
      db.prepare("DELETE FROM reviews WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Грешка при бришење на рецензијата" });
    }
  });

  // Campaign Endpoints
  app.get("/api/restaurants/:id/campaigns", (req, res) => {
    const { id } = req.params;
    try {
      const campaigns = db.prepare("SELECT * FROM campaigns WHERE restaurant_id = ? ORDER BY created_at DESC").all(id);
      res.json(campaigns);
    } catch (e) {
      res.status(500).json({ error: "Грешка при вчитување на кампањите" });
    }
  });

  app.post("/api/campaigns/request", (req, res) => {
    const { name, description, budget, quantity, start_date, end_date, restaurant_id } = req.body;
    try {
      db.prepare(`
        INSERT INTO campaigns (name, description, budget, quantity, start_date, end_date, restaurant_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
      `).run(name, description, budget, quantity, start_date, end_date, restaurant_id);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Грешка при испраќање на барањето" });
    }
  });

  app.get("/api/admin/campaigns/pending", (req, res) => {
    if (!checkAdminAuth(req, res, 'campaigns')) return;
    try {
      const campaigns = db.prepare(`
        SELECT c.*, r.name as restaurant_name 
        FROM campaigns c
        JOIN restaurants r ON c.restaurant_id = r.id
        WHERE c.status = 'pending'
        ORDER BY c.created_at DESC
      `).all();
      res.json(campaigns);
    } catch (e) {
      res.status(500).json({ error: "Грешка при вчитување на барањата" });
    }
  });

  app.put("/api/admin/campaigns/:id/status", (req, res) => {
    if (!checkAdminAuth(req, res, 'campaigns')) return;
    const { id } = req.params;
    const { status } = req.body;
    try {
      db.prepare("UPDATE campaigns SET status = ? WHERE id = ?").run(status, id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Грешка при промена на статусот" });
    }
  });

  app.post("/api/campaigns/:id/stop", (req, res) => {
    const restaurant = (req.session as any).restaurant;
    if (!restaurant) {
      return res.status(401).json({ error: "Неовластен пристап" });
    }
    const { id } = req.params;
    try {
      const campaign = db.prepare("SELECT * FROM campaigns WHERE id = ? AND restaurant_id = ? AND status = 'active'").get(id, restaurant.id);
      if (!campaign) {
        return res.status(404).json({ error: "Кампањата не е пронајдена или веќе е прекината" });
      }
      
      db.prepare("UPDATE campaigns SET status = 'ended' WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Грешка при прекинување на кампањата" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
