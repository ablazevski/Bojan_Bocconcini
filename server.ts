import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import crypto from "crypto";

const db = new Database('pizza.db');

// Migration for subcategory and modifiers
try { db.exec('ALTER TABLE menu_items ADD COLUMN subcategory TEXT DEFAULT "Општо"'); } catch (e) {}
try { db.exec('ALTER TABLE menu_items ADD COLUMN modifiers TEXT DEFAULT "[]"'); } catch (e) {}

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
    modifiers TEXT
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

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
    const PORT = 3000;
  
    app.use(express.json({ limit: '50mb' }));
  
    // API routes
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
      
      res.setHeader('Content-disposition', 'attachment; filename=pizzatime-backup.json');
      res.setHeader('Content-type', 'application/json');
      res.send(JSON.stringify({ 
        restaurants, 
        menu_items, 
        orders,
        delivery_partners,
        marketing_associates,
        campaigns,
        campaign_codes
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
        campaign_codes
      } = req.body;
      
      try {
        const transaction = db.transaction(() => {
          // Clear existing
          db.prepare("DELETE FROM restaurants").run();
          db.prepare("DELETE FROM menu_items").run();
          db.prepare("DELETE FROM orders").run();
          db.prepare("DELETE FROM delivery_partners").run();
          db.prepare("DELETE FROM marketing_associates").run();
          db.prepare("DELETE FROM campaigns").run();
          db.prepare("DELETE FROM campaign_codes").run();
          
          // Insert restaurants
          if (restaurants && restaurants.length > 0) {
            const insertRest = db.prepare(`INSERT INTO restaurants (id, name, city, address, email, phone, bank_account, has_own_delivery, delivery_zones, spare_1, spare_2, spare_3, status, username, password, contract_percentage, working_hours) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            for (const r of restaurants) {
              insertRest.run(r.id, r.name, r.city, r.address, r.email, r.phone, r.bank_account, r.has_own_delivery, r.delivery_zones, r.spare_1, r.spare_2, r.spare_3, r.status, r.username, r.password, r.contract_percentage, r.working_hours);
            }
          }
          
          // Insert menu items
          if (menu_items && menu_items.length > 0) {
            const insertMenu = db.prepare(`INSERT INTO menu_items (id, restaurant_id, name, description, price, image_url, category, subcategory, modifiers) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            for (const m of menu_items) {
              insertMenu.run(m.id, m.restaurant_id, m.name, m.description, m.price, m.image_url, m.category, m.subcategory, m.modifiers);
            }
          }
          
          // Insert orders
          if (orders && orders.length > 0) {
            const insertOrder = db.prepare(`INSERT INTO orders (id, restaurant_id, customer_name, customer_email, customer_phone, delivery_address, delivery_lat, delivery_lng, items, total_price, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            for (const o of orders) {
              insertOrder.run(o.id, o.restaurant_id, o.customer_name, o.customer_email, o.customer_phone, o.delivery_address, o.delivery_lat, o.delivery_lng, o.items, o.total_price, o.status, o.created_at);
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
            const insertCamp = db.prepare(`INSERT INTO campaigns (id, associate_id, name, description, budget, start_date, end_date, location_type, selected_cities, map_zones, status, quantity, code_format, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            for (const c of campaigns) {
              insertCamp.run(c.id, c.associate_id, c.name, c.description, c.budget, c.start_date, c.end_date, c.location_type, c.selected_cities, c.map_zones, c.status, c.quantity, c.code_format, c.created_at);
            }
          }

          // Insert campaign codes
          if (campaign_codes && campaign_codes.length > 0) {
            const insertCode = db.prepare(`INSERT INTO campaign_codes (id, campaign_id, code, is_used, used_at, created_at) VALUES (?, ?, ?, ?, ?, ?)`);
            for (const c of campaign_codes) {
              insertCode.run(c.id, c.campaign_id, c.code, c.is_used, c.used_at, c.created_at);
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
    const { name, city, address, email, phone, bank_account, logo_url, has_own_delivery, delivery_zones, spare_1, spare_2, spare_3, spare_4, working_hours } = req.body;
    const insert = db.prepare(`
      INSERT INTO restaurants (name, city, address, email, phone, bank_account, logo_url, has_own_delivery, delivery_zones, spare_1, spare_2, spare_3, spare_4, working_hours, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `);
    const result = insert.run(name, city, address, email, phone, bank_account, logo_url, has_own_delivery ? 1 : 0, JSON.stringify(delivery_zones || []), spare_1, spare_2, spare_3, spare_4, JSON.stringify(working_hours || {}));
    res.json({ success: true, id: result.lastInsertRowid });
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
    const { contract_percentage, username, password } = req.body;
    
    db.prepare("UPDATE restaurants SET status = 'approved', username = ?, password = ?, contract_percentage = ? WHERE id = ?").run(username, password, contract_percentage || 0, id);
    
    res.json({ success: true, username, password });
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
    const { password, phone, bank_account, logo_url, spare_1, spare_2, spare_3, spare_4 } = req.body;
    db.prepare("UPDATE restaurants SET password = ?, phone = ?, bank_account = ?, logo_url = ?, spare_1 = ?, spare_2 = ?, spare_3 = ?, spare_4 = ? WHERE id = ?")
      .run(password, phone, bank_account, logo_url, spare_1, spare_2, spare_3, spare_4, req.params.id);
    res.json({ success: true });
  });

  // --- CUSTOMER ENDPOINTS ---
  app.get("/api/customer/cities", (req, res) => {
    const cities = db.prepare("SELECT DISTINCT city FROM restaurants WHERE status = 'approved'").all() as any[];
    res.json(cities.map(c => c.city));
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
    const items = db.prepare(`SELECT * FROM menu_items WHERE restaurant_id IN (${placeholders})`).all(...restaurantIds) as any[];
    
    res.json({ 
      restaurants: availableRestaurants.map(r => ({ 
        id: r.id, 
        name: r.name, 
        address: r.address, 
        working_hours: r.working_hours,
        delivery_zones: r.delivery_zones 
      })), 
      items: items 
    });
  });

  app.post("/api/orders", (req, res) => {
    const { customer_name, customer_email, customer_phone, delivery_address, delivery_lat, delivery_lng, items, campaign_id } = req.body;
    
    // Group items by restaurant
    const itemsByRestaurant = items.reduce((acc: any, item: any) => {
      if (!acc[item.restaurant_id]) acc[item.restaurant_id] = [];
      acc[item.restaurant_id].push(item);
      return acc;
    }, {});

    const insert = db.prepare(`
      INSERT INTO orders (restaurant_id, customer_name, customer_email, customer_phone, delivery_address, delivery_lat, delivery_lng, items, total_price, spare_1)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const orderIds = [];
    let campaignApplied = false;

    for (const [restaurantId, restItems] of Object.entries(itemsByRestaurant)) {
      let totalPrice = (restItems as any[]).reduce((sum, item) => sum + item.finalPrice, 0);
      let campaignCode = null;

      if (campaign_id && !campaignApplied) {
        const campaign = db.prepare("SELECT * FROM campaigns WHERE id = ? AND status = 'active'").get(campaign_id) as any;
        if (campaign) {
          totalPrice += campaign.budget; // Add campaign price to total
          const codeRow = db.prepare("SELECT code FROM campaign_codes WHERE campaign_id = ? AND is_used = 0 LIMIT 1").get(campaign_id) as any;
          if (codeRow) {
            campaignCode = codeRow.code;
            db.prepare("UPDATE campaign_codes SET is_used = 1, used_at = CURRENT_TIMESTAMP WHERE code = ?").run(campaignCode);
            campaignApplied = true;
          }
        }
      }

      const info = insert.run(
        restaurantId, customer_name, customer_email, customer_phone, delivery_address, delivery_lat, delivery_lng, JSON.stringify(restItems), totalPrice, campaignCode
      );
      orderIds.push(info.lastInsertRowid);
    }

    res.json({ success: true, orderIds });
  });

  app.get("/api/orders/:restaurantId", (req, res) => {
    const orders = db.prepare("SELECT * FROM orders WHERE restaurant_id = ? ORDER BY created_at DESC").all(req.params.restaurantId);
    res.json(orders);
  });

  app.put("/api/orders/:orderId/status", (req, res) => {
    const { status } = req.body;
    const { orderId } = req.params;
    
    let delivery_code = null;
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
    } else {
      db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, orderId);
    }
    
    res.json({ success: true, delivery_code });
  });

  app.get("/api/delivery/orders", (req, res) => {
    const partnerId = req.query.partnerId;
    if (!partnerId) {
      return res.json([]);
    }
    const partner = db.prepare("SELECT preferred_restaurants FROM delivery_partners WHERE id = ?").get(partnerId) as any;
    if (!partner) return res.json([]);
    
    const preferred = JSON.parse(partner.preferred_restaurants || '[]');
    if (preferred.length === 0) return res.json([]);
    
    const placeholders = preferred.map(() => '?').join(',');
    const orders = db.prepare(`SELECT * FROM orders WHERE restaurant_id IN (${placeholders}) AND status IN ('accepted', 'delivering') ORDER BY created_at DESC`).all(...preferred);
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
    const orders = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
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
    const { name, description, price, image_url, category, subcategory, modifiers } = req.body;
    const modifiersJson = JSON.stringify(modifiers || []);
    const insert = db.prepare('INSERT INTO menu_items (restaurant_id, name, description, price, image_url, category, subcategory, modifiers) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const result = insert.run(req.params.restaurantId, name, description, price, image_url, category, subcategory, modifiersJson);
    res.json({ id: result.lastInsertRowid, restaurant_id: req.params.restaurantId, name, description, price, image_url, category, subcategory, modifiers });
  });

  app.put("/api/menu/:id", (req, res) => {
    const { name, description, price, image_url, category, subcategory, modifiers } = req.body;
    const modifiersJson = JSON.stringify(modifiers || []);
    const update = db.prepare('UPDATE menu_items SET name = ?, description = ?, price = ?, image_url = ?, category = ?, subcategory = ?, modifiers = ? WHERE id = ?');
    update.run(name, description, price, image_url, category, subcategory, modifiersJson, req.params.id);
    res.json({ success: true });
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
    const { associate_id, name, description, budget, start_date, end_date, location_type, selected_cities, map_zones, quantity } = req.body;
    try {
      db.prepare(`
        INSERT INTO campaigns (associate_id, name, description, budget, start_date, end_date, location_type, selected_cities, map_zones, quantity)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(associate_id, name, description, budget, start_date, end_date, location_type, JSON.stringify(selected_cities || []), JSON.stringify(map_zones || []), quantity);
      res.json({ success: true });
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
      SELECT c.*, ma.company_name as associate_name 
      FROM campaigns c 
      JOIN marketing_associates ma ON c.associate_id = ma.id 
      ORDER BY c.created_at DESC
    `).all();
    res.json(campaigns);
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
