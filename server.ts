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
import axios from "axios";
import nodemailer from "nodemailer";
import handlebars from "handlebars";
import webpush from "web-push";

const db = new Database('pizza.db');

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

// Migration for subcategory and modifiers
try { db.exec('ALTER TABLE menu_items ADD COLUMN subcategory TEXT DEFAULT "Општо"'); } catch (e) {}
try { db.exec('ALTER TABLE menu_items ADD COLUMN modifiers TEXT DEFAULT "[]"'); } catch (e) {}
try { db.exec('ALTER TABLE menu_items ADD COLUMN is_available INTEGER DEFAULT 1'); } catch (e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    subscription TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

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
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE,
    email TEXT UNIQUE,
    name TEXT,
    loyalty_points INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
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
  )
`);

db.exec(`
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Migrations
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
  )
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
    spare_1 TEXT,
    spare_2 TEXT,
    spare_3 TEXT,
    spare_4 TEXT,
    status TEXT DEFAULT 'pending',
    username TEXT,
    password TEXT,
    contract_percentage REAL DEFAULT 0,
    working_hours TEXT DEFAULT '{}'
  )
`);

// Migration for contract_percentage and working_hours
try { db.exec('ALTER TABLE restaurants ADD COLUMN contract_percentage REAL DEFAULT 0'); } catch (e) {}
try { db.exec('ALTER TABLE restaurants ADD COLUMN working_hours TEXT DEFAULT "{}"'); } catch (e) {}
try { db.exec('ALTER TABLE restaurants ADD COLUMN spare_4 TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE restaurants ADD COLUMN logo_url TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE restaurants ADD COLUMN cover_url TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE restaurants ADD COLUMN payment_config TEXT DEFAULT \'{"methods":["cash"],"fees":[]}\''); } catch (e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS email_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    subject TEXT,
    body TEXT,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS email_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_name TEXT,
    recipient TEXT,
    subject TEXT,
    status TEXT,
    error TEXT,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

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
  }
];

const insertTemplate = db.prepare('INSERT OR IGNORE INTO email_templates (name, subject, body, description) VALUES (?, ?, ?, ?)');
seedTemplates.forEach(t => insertTemplate.run(t.name, t.subject, t.body, t.description));

db.exec(`
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
    status TEXT DEFAULT 'pending',
    username TEXT,
    password TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
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
  )
`);

db.exec(`
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
  )
`);

// Migration for campaigns
try { db.exec('ALTER TABLE campaigns ADD COLUMN is_visible INTEGER DEFAULT 1'); } catch (e) {}
try { db.exec('ALTER TABLE campaigns ADD COLUMN restaurant_id INTEGER'); } catch (e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS campaign_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER,
    code TEXT UNIQUE,
    is_used INTEGER DEFAULT 0,
    used_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(campaign_id) REFERENCES campaigns(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS global_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )
`);

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
  db.prepare(`INSERT INTO restaurants (name, city, address, email, phone, bank_account, has_own_delivery, status, username, password) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    'Demo Pizza', 'Скопје', 'Ул. Македонија 1', 'demo@pizza.mk', '070123456', '210000000000001', 1, 'approved', 'demo', 'demo123'
  );
}

  async function startServer() {
    const app = express();
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

      socket.on("join_delivery", () => {
        socket.join("delivery_partners");
        console.log(`Socket ${socket.id} joined delivery_partners`);
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
    app.use(session({
      secret: process.env.SESSION_SECRET || 'pizza-loyalty-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: true,
        sameSite: 'none',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    }));

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

        (req.session as any).user = user;

        res.send(`
          <html>
            <body>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                  window.close();
                } else {
                  window.location.href = '/';
                }
              </script>
              <p>Authentication successful. This window should close automatically.</p>
            </body>
          </html>
        `);
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
      req.session.destroy(() => {
        res.json({ success: true });
      });
    });

    app.get("/api/admin/users", (req, res) => {
      const users = db.prepare("SELECT * FROM users ORDER BY created_at DESC").all();
      res.json(users);
    });

    // Tracking Endpoints
    app.get("/api/orders/track/:token", (req, res) => {
      const order = db.prepare(`
        SELECT o.*, r.name as restaurant_name, r.phone as restaurant_phone, r.address as restaurant_address
        FROM orders o
        JOIN restaurants r ON o.restaurant_id = r.id
        WHERE o.tracking_token = ?
      `).get(req.params.token) as any;
      
      if (!order) {
        return res.status(404).json({ error: "Нарачката не е пронајдена" });
      }
      
      res.json(order);
    });

    app.post("/api/orders/track/:token/complete", (req, res) => {
      const order = db.prepare("SELECT * FROM orders WHERE tracking_token = ?").get(req.params.token) as any;
      if (!order) {
        return res.status(404).json({ error: "Нарачката не е пронајдена" });
      }
      
      if (order.status === 'completed') {
        return res.json({ success: true, message: "Нарачката е веќе затворена" });
      }

      db.prepare("UPDATE orders SET status = 'completed' WHERE id = ?").run(order.id);
      
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
      const restaurants = db.prepare('SELECT username FROM restaurants WHERE status = "approved"').all() as any[];
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

    app.get('/api/email/templates', (req, res) => {
      try {
        const templates = db.prepare('SELECT * FROM email_templates').all();
        res.json(templates);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch templates' });
      }
    });

    app.put('/api/email/templates/:id', (req, res) => {
      const { subject, body, is_active } = req.body;
      db.prepare('UPDATE email_templates SET subject = ?, body = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(subject, body, is_active ? 1 : 0, req.params.id);
      res.json({ success: true });
    });

    app.get('/api/email/logs', (req, res) => {
      const logs = db.prepare('SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 100').all();
      res.json(logs);
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
      const restaurants = db.prepare("SELECT * FROM restaurants").all();
      const menu_items = db.prepare("SELECT * FROM menu_items").all();
      const orders = db.prepare("SELECT * FROM orders").all();
      const delivery_partners = db.prepare("SELECT * FROM delivery_partners").all();
      const marketing_associates = db.prepare("SELECT * FROM marketing_associates").all();
      const campaigns = db.prepare("SELECT * FROM campaigns").all();
      const campaign_codes = db.prepare("SELECT * FROM campaign_codes").all();
      const global_settings = db.prepare("SELECT * FROM global_settings").all();
      
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
        global_settings
      }, null, 2));
    });
  
    app.post("/api/admin/import", (req, res) => {
      const { 
        restaurants, 
        menu_items, 
        orders,
        delivery_partners,
        marketing_associates,
        campaigns,
        campaign_codes,
        global_settings
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
          
          // Insert restaurants
          if (restaurants && restaurants.length > 0) {
            const insertRest = db.prepare(`INSERT INTO restaurants (id, name, city, address, email, phone, bank_account, logo_url, cover_url, has_own_delivery, delivery_zones, spare_1, spare_2, spare_3, spare_4, status, username, password, contract_percentage, working_hours) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            for (const r of restaurants) {
              insertRest.run(r.id, r.name, r.city, r.address, r.email, r.phone, r.bank_account, r.logo_url, r.cover_url, r.has_own_delivery, r.delivery_zones, r.spare_1, r.spare_2, r.spare_3, r.spare_4 || null, r.status, r.username, r.password, r.contract_percentage || 0, r.working_hours || '{}');
            }
          }
          
          // Insert menu items
          if (menu_items && menu_items.length > 0) {
            const insertMenu = db.prepare(`INSERT INTO menu_items (id, restaurant_id, name, description, price, image_url, category, subcategory, modifiers, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            for (const m of menu_items) {
              insertMenu.run(m.id, m.restaurant_id, m.name, m.description, m.price, m.image_url, m.category, m.subcategory, m.modifiers, m.is_available !== undefined ? m.is_available : 1);
            }
          }
          
          // Insert orders
          if (orders && orders.length > 0) {
            const insertOrder = db.prepare(`INSERT INTO orders (id, restaurant_id, customer_name, customer_email, customer_phone, delivery_address, delivery_lat, delivery_lng, items, total_price, status, delivery_code, delivery_partner_id, delivery_partner_name, spare_1, spare_2, spare_3, tracking_token, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            for (const o of orders) {
              insertOrder.run(o.id, o.restaurant_id, o.customer_name, o.customer_email, o.customer_phone, o.delivery_address, o.delivery_lat, o.delivery_lng, o.items, o.total_price, o.status, o.delivery_code || null, o.delivery_partner_id || null, o.delivery_partner_name || null, o.spare_1 || null, o.spare_2 || null, o.spare_3 || null, o.tracking_token || null, o.user_id || null, o.created_at);
            }
          }

          // Insert delivery partners
          if (delivery_partners && delivery_partners.length > 0) {
            const insertDel = db.prepare(`INSERT INTO delivery_partners (id, name, city, address, email, phone, bank_account, working_hours, preferred_restaurants, status, username, password, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            for (const d of delivery_partners) {
              insertDel.run(d.id, d.name, d.city, d.address, d.email, d.phone, d.bank_account, d.working_hours, d.preferred_restaurants, d.status, d.username, d.password, d.created_at);
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
            const insertCamp = db.prepare(`INSERT INTO campaigns (id, associate_id, name, description, budget, start_date, end_date, location_type, selected_cities, map_zones, status, quantity, code_format, created_at, is_visible) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            for (const c of campaigns) {
              insertCamp.run(c.id, c.associate_id, c.name, c.description, c.budget, c.start_date, c.end_date, c.location_type, c.selected_cities, c.map_zones, c.status, c.quantity, c.code_format, c.created_at, c.is_visible !== undefined ? c.is_visible : 1);
            }
          }

          // Insert campaign codes
          if (campaign_codes && campaign_codes.length > 0) {
            const insertCode = db.prepare(`INSERT INTO campaign_codes (id, campaign_id, code, is_used, used_at, created_at) VALUES (?, ?, ?, ?, ?, ?)`);
            for (const c of campaign_codes) {
              insertCode.run(c.id, c.campaign_id, c.code, c.is_used, c.used_at, c.created_at);
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
    const items = db.prepare("SELECT * FROM restaurants WHERE status = 'pending'").all();
    res.json(items);
  });

  app.get("/api/admin/restaurants/approved", (req, res) => {
    const items = db.prepare("SELECT * FROM restaurants WHERE status = 'approved'").all();
    res.json(items);
  });

  app.post("/api/admin/restaurants/:id/approve", (req, res) => {
    const id = req.params.id;
    const { contract_percentage, username, password, payment_config } = req.body;
    
    db.prepare("UPDATE restaurants SET status = 'approved', username = ?, password = ?, contract_percentage = ?, payment_config = ? WHERE id = ?").run(
      username, 
      password, 
      contract_percentage || 0, 
      payment_config || '{"methods":["cash"],"fees":[]}',
      id
    );
    
    res.json({ success: true, username, password });
  });

  app.put("/api/admin/restaurants/:id", (req, res) => {
    const id = req.params.id;
    const { contract_percentage, username, password, payment_config } = req.body;
    
    db.prepare("UPDATE restaurants SET username = ?, password = ?, contract_percentage = ?, payment_config = ? WHERE id = ?").run(
      username, 
      password, 
      contract_percentage || 0, 
      payment_config || '{"methods":["cash"],"fees":[]}',
      id
    );
    
    res.json({ success: true });
  });

  app.post("/api/admin/restaurants/:id/reject", (req, res) => {
    db.prepare("UPDATE restaurants SET status = 'rejected' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // --- DELIVERY PARTNER REGISTRATION & ADMIN ---
  app.post("/api/delivery/register", (req, res) => {
    const { name, city, address, email, phone, bank_account, working_hours, preferred_restaurants } = req.body;
    const insert = db.prepare(`
      INSERT INTO delivery_partners (name, city, address, email, phone, bank_account, working_hours, preferred_restaurants, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `);
    const result = insert.run(name, city, address, email, phone, bank_account, JSON.stringify(working_hours || {}), JSON.stringify(preferred_restaurants || []));
    
    // Send registration email
    if (email) {
      sendEmail('delivery_registration', email, { partner_name: name }).catch(console.error);
    }
    
    res.json({ success: true, id: result.lastInsertRowid });
  });

  app.get("/api/admin/delivery/pending", (req, res) => {
    const items = db.prepare("SELECT * FROM delivery_partners WHERE status = 'pending'").all();
    res.json(items);
  });

  app.get("/api/admin/delivery/approved", (req, res) => {
    const items = db.prepare("SELECT * FROM delivery_partners WHERE status = 'approved'").all();
    res.json(items);
  });

  app.get("/api/admin/delivery/inactive", (req, res) => {
    const items = db.prepare("SELECT * FROM delivery_partners WHERE status = 'inactive'").all();
    res.json(items);
  });

  app.post("/api/admin/delivery/:id/toggle-status", (req, res) => {
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

  app.post("/api/admin/delivery/:id/approve", (req, res) => {
    const id = req.params.id;
    const { username, password } = req.body;
    db.prepare("UPDATE delivery_partners SET status = 'approved', username = ?, password = ? WHERE id = ?").run(username, password, id);
    res.json({ success: true, username, password });
  });

  app.post("/api/admin/delivery/:id/reject", (req, res) => {
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

  app.get("/api/restaurants/by-city/:city", (req, res) => {
    const restaurants = db.prepare("SELECT id, name, address FROM restaurants WHERE city = ? AND status = 'approved'").all(req.params.city);
    res.json(restaurants);
  });

  app.get("/api/restaurants/:id/active-delivery-partners", (req, res) => {
    const restaurantId = Number(req.params.id);
    const partners = db.prepare("SELECT preferred_restaurants, working_hours FROM delivery_partners WHERE status = 'approved'").all() as any[];
    
    let count = 0;
    const days = ['Недела', 'Понеделник', 'Вторник', 'Среда', 'Четврток', 'Петок', 'Сабота'];
    const now = new Date();
    const currentDay = days[now.getDay()];
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

    for (const p of partners) {
      try {
        const preferred = JSON.parse(p.preferred_restaurants || '[]');
        if (preferred.includes(restaurantId) || preferred.includes(restaurantId.toString())) {
          const workingHours = JSON.parse(p.working_hours || '{}');
          const todayHours = workingHours[currentDay] || workingHours[currentDay.toLowerCase()];
          
          let isWorking = false;
          if (todayHours && todayHours.active !== undefined) {
            isWorking = todayHours.active && currentTime >= (todayHours.start || '08:00') && currentTime <= (todayHours.end || '22:00');
          } else {
            // Default if not explicitly set
            isWorking = currentTime >= '08:00' && currentTime <= '22:00';
          }
            
          if (isWorking) {
            count++;
          }
        }
      } catch (e) {}
    }
    res.json({ count });
  });

  // --- RESTAURANT LOGIN & SETTINGS ---
  app.post("/api/restaurants/login", (req, res) => {
    const { username, password } = req.body;
    const restaurant = db.prepare("SELECT * FROM restaurants WHERE username = ? AND password = ? AND status = 'approved'").get(username, password);
    if (restaurant) {
      res.json({ success: true, restaurant });
    } else {
      res.status(401).json({ success: false, message: "Невалидно корисничко име или лозинка" });
    }
  });

  app.put("/api/restaurants/:id/zones", (req, res) => {
    const { delivery_zones } = req.body;
    db.prepare("UPDATE restaurants SET delivery_zones = ? WHERE id = ?").run(JSON.stringify(delivery_zones || []), req.params.id);
    res.json({ success: true });
  });

  app.put("/api/restaurants/:id/settings", (req, res) => {
    const { password, phone, bank_account, logo_url, cover_url, city, address, spare_1, spare_2, spare_3, spare_4, working_hours } = req.body;
    db.prepare("UPDATE restaurants SET password = ?, phone = ?, bank_account = ?, logo_url = ?, cover_url = ?, city = ?, address = ?, spare_1 = ?, spare_2 = ?, spare_3 = ?, spare_4 = ?, working_hours = ? WHERE id = ?")
      .run(password, phone, bank_account, logo_url, cover_url, city, address, spare_1, spare_2, spare_3, spare_4, working_hours, req.params.id);
    res.json({ success: true });
  });

  // --- CUSTOMER ENDPOINTS ---
  app.get("/api/customer/cities", (req, res) => {
    const cities = db.prepare("SELECT DISTINCT city FROM restaurants WHERE status = 'approved'").all() as any[];
    res.json(cities.map(c => c.city));
  });

  app.get("/api/customer/restaurant/:username", (req, res) => {
    const restaurant = db.prepare("SELECT id, name, city, address, phone, logo_url, cover_url, has_own_delivery, working_hours, payment_config FROM restaurants WHERE username = ? AND status = 'approved'").get(req.params.username) as any;
    if (!restaurant) {
      return res.status(404).json({ error: "Ресторанот не е пронајден" });
    }
    const menu = db.prepare("SELECT * FROM menu_items WHERE restaurant_id = ? AND is_available = 1").all(restaurant.id);
    res.json({ restaurant, menu });
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
    
    res.json({ 
      restaurants: availableRestaurants.map(r => {
        const activeOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE restaurant_id = ? AND status IN ('pending', 'accepted')").get(r.id) as { count: number };
        
        let isOpen = true;
        if (r.working_hours) {
          try {
            const workingHours = JSON.parse(r.working_hours);
            const now = new Date();
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
      items: items 
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
      INSERT INTO orders (restaurant_id, customer_name, customer_email, customer_phone, delivery_address, delivery_lat, delivery_lng, items, total_price, spare_1, user_id, tracking_token, payment_method, selected_fees)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

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
      const restaurant = db.prepare("SELECT working_hours, name, payment_config FROM restaurants WHERE id = ?").get(restaurantId) as any;
      if (restaurant && restaurant.working_hours) {
        try {
          const workingHours = JSON.parse(restaurant.working_hours);
          const now = new Date();
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
              const now = new Date();
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
        totalPrice += campaignBudget; // Add campaign price to total
        campaignCode = campaignCodeToUse;
        db.prepare("UPDATE campaign_codes SET is_used = 1, used_at = CURRENT_TIMESTAMP WHERE code = ?").run(campaignCode);
        campaignApplied = true;
      }

      const trackingToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const info = insert.run(
        restaurantId, customer_name, customer_email, customer_phone, delivery_address, delivery_lat, delivery_lng, JSON.stringify(restItems), totalPrice, campaignCode, user_id || null, trackingToken, payment_method || 'cash', JSON.stringify(restFees)
      );
      orderIds.push(info.lastInsertRowid);
      trackingTokens[Number(info.lastInsertRowid)] = trackingToken;

      // Send confirmation emails
      if (customer_email) {
        sendEmail('order_confirmation', customer_email, {
          order_id: info.lastInsertRowid,
          customer_name: customer_name,
          total_price: totalPrice,
          restaurant_name: restaurant.name
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
    }

    res.json({ success: true, orderIds, trackingTokens });
  });

  app.get("/api/orders/:restaurantId", (req, res) => {
    const orders = db.prepare("SELECT * FROM orders WHERE restaurant_id = ? ORDER BY created_at DESC").all(req.params.restaurantId);
    res.json(orders);
  });

  app.put("/api/orders/:orderId/delay", (req, res) => {
    const { delayMinutes } = req.body;
    const { orderId } = req.params;
    
    const targetTime = new Date(Date.now() + delayMinutes * 60000).toISOString();
    db.prepare("UPDATE orders SET spare_2 = ? WHERE id = ?").run(targetTime, orderId);
    
    // Notify customer
    const order = db.prepare("SELECT tracking_token FROM orders WHERE id = ?").get(orderId) as any;
    if (order) {
      io.to(`order_${order.tracking_token}`).emit("status_updated", { status: 'accepted', targetTime });
    }

    res.json({ success: true, targetTime });
  });

  app.put("/api/orders/:orderId/status", (req, res) => {
    const { status } = req.body;
    const { orderId } = req.params;
    
    let delivery_code = null;
    let delivery_partner_name = null;
    
    if (status === 'ready') {
      db.prepare("UPDATE orders SET status = ?, ready_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, orderId);
      const order = db.prepare("SELECT tracking_token, restaurant_id FROM orders WHERE id = ?").get(orderId) as any;
      if (order) {
        io.to(`order_${order.tracking_token}`).emit("status_updated", { status });
        io.to(`restaurant_${order.restaurant_id}`).emit("order_update");
        
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
      
      db.prepare("UPDATE orders SET status = ?, delivery_code = ? WHERE id = ?").run(status, delivery_code, orderId);
      
      // Notify customer
      io.to(`order_${order.tracking_token}`).emit("status_updated", { status });
      
      sendPushNotification(null, {
        title: 'Нарачката е прифатена!',
        body: `Вашата нарачка #${orderId} е прифатена од ресторанот.`,
        url: `/track/${order.tracking_token}`
      }, Number(orderId)).catch(console.error);

      // Notify delivery partners
      io.to("delivery_partners").emit("new_available_order");
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
    const partnerId = req.query.partnerId;
    if (!partnerId) {
      return res.json([]);
    }
    const partner = db.prepare("SELECT preferred_restaurants, working_hours FROM delivery_partners WHERE id = ?").get(partnerId) as any;
    if (!partner) return res.json([]);
    
    const preferred = JSON.parse(partner.preferred_restaurants || '[]');
    if (preferred.length === 0) return res.json([]);
    
    const placeholders = preferred.map(() => '?').join(',');

    const workingHours = JSON.parse(partner.working_hours || '{}');
    const days = ['Недела', 'Понеделник', 'Вторник', 'Среда', 'Четврток', 'Петок', 'Сабота'];
    const now = new Date();
    const currentDay = days[now.getDay()];
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    
    // Try both exact match and lowercase match since the keys might be saved differently
    const todayHours = workingHours[currentDay] || workingHours[currentDay.toLowerCase()];
    
    // Default to true if not set, otherwise check active status and time bounds
    const isWorking = todayHours 
      ? (todayHours.active !== false && currentTime >= (todayHours.start || '08:00') && currentTime <= (todayHours.end || '22:00'))
      : (currentTime >= '08:00' && currentTime <= '22:00'); // Default working hours if not configured

    let query = `SELECT * FROM orders WHERE restaurant_id IN (${placeholders}) AND (`;
    if (isWorking) {
      query += `status = 'accepted' OR `;
    }
    query += `(status = 'delivering' AND delivery_partner_id = ?)) ORDER BY created_at DESC`;
    
    const orders = db.prepare(query).all(...preferred, partnerId);
    res.json(orders);
  });

  app.post("/api/delivery/login", (req, res) => {
    const { username, password } = req.body;
    const partner = db.prepare("SELECT * FROM delivery_partners WHERE username = ? AND password = ? AND status = 'approved'").get(username, password) as any;
    if (partner) {
      res.json({ success: true, partner });
    } else {
      res.status(401).json({ error: "Невалидни податоци или профилот не е одобрен" });
    }
  });

  app.put("/api/delivery/orders/:orderId/status", (req, res) => {
    const { status, partnerId, partnerName } = req.body;
    const { orderId } = req.params;

    if (status === 'delivering' && partnerId && partnerName) {
      // Update order with partner info and update delivery code to include partner name in spare_1
      const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as any;
      if (order && order.delivery_code) {
        try {
          const codeData = JSON.parse(order.delivery_code);
          // Use spare_1 for delivery partner name as requested
          codeData.spare_1 = partnerName;
          codeData.delivery_partner = partnerName; // Also keep this for clarity
          
          const updatedCode = JSON.stringify(codeData);
          db.prepare("UPDATE orders SET status = ?, delivery_partner_id = ?, delivery_partner_name = ?, delivery_code = ? WHERE id = ?")
            .run(status, partnerId, partnerName, updatedCode, orderId);
        } catch (e) {
          db.prepare("UPDATE orders SET status = ?, delivery_partner_id = ?, delivery_partner_name = ? WHERE id = ?")
            .run(status, partnerId, partnerName, orderId);
        }
      } else {
        db.prepare("UPDATE orders SET status = ?, delivery_partner_id = ?, delivery_partner_name = ? WHERE id = ?")
          .run(status, partnerId, partnerName, orderId);
      }
    } else {
      db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, orderId);
    }
    res.json({ success: true });
  });

  app.get("/api/admin/orders", (req, res) => {
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
    const { preferred_restaurants, working_hours } = req.body;
    const { id } = req.params;
    
    try {
      db.prepare("UPDATE delivery_partners SET preferred_restaurants = ?, working_hours = ? WHERE id = ?")
        .run(JSON.stringify(preferred_restaurants), JSON.stringify(working_hours), id);
      
      const updatedPartner = db.prepare("SELECT * FROM delivery_partners WHERE id = ?").get(id);
      res.json({ success: true, partner: updatedPartner });
    } catch (e) {
      res.status(500).json({ error: "Грешка при ажурирање на профилот" });
    }
  });

  // Marketing Associate Endpoints
  app.get("/api/admin/marketing-associates", (req, res) => {
    const associates = db.prepare("SELECT * FROM marketing_associates ORDER BY created_at DESC").all();
    res.json(associates);
  });

  app.post("/api/admin/marketing-associates", (req, res) => {
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
    const today = new Date().toISOString().split('T')[0];
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
    const { id } = req.params;
    try {
      db.prepare("UPDATE reviews SET is_visible = 1 - is_visible WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Грешка при промена на видливоста" });
    }
  });

  app.delete("/api/admin/reviews/:id", (req, res) => {
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
    const { id } = req.params;
    const { status } = req.body;
    try {
      db.prepare("UPDATE campaigns SET status = ? WHERE id = ?").run(status, id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Грешка при промена на статусот" });
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
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
