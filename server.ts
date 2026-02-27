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
      res.setHeader('Content-disposition', 'attachment; filename=pizzatime-backup.json');
      res.setHeader('Content-type', 'application/json');
      res.send(JSON.stringify({ restaurants, menu_items, orders }, null, 2));
    });
  
    app.post("/api/admin/import", (req, res) => {
      const { restaurants, menu_items, orders } = req.body;
      
      try {
        const transaction = db.transaction(() => {
          // Clear existing
          db.prepare("DELETE FROM restaurants").run();
          db.prepare("DELETE FROM menu_items").run();
          db.prepare("DELETE FROM orders").run();
          
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
    const { name, city, address, email, phone, bank_account, has_own_delivery, delivery_zones, spare_1, spare_2, spare_3, working_hours } = req.body;
    const insert = db.prepare(`
      INSERT INTO restaurants (name, city, address, email, phone, bank_account, has_own_delivery, delivery_zones, spare_1, spare_2, spare_3, working_hours, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `);
    const result = insert.run(name, city, address, email, phone, bank_account, has_own_delivery ? 1 : 0, JSON.stringify(delivery_zones || []), spare_1, spare_2, spare_3, JSON.stringify(working_hours || {}));
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
    const { password, phone, bank_account, logo_url } = req.body;
    db.prepare("UPDATE restaurants SET password = ?, phone = ?, bank_account = ?, spare_1 = ? WHERE id = ?")
      .run(password, phone, bank_account, logo_url, req.params.id);
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
    const { customer_name, customer_email, customer_phone, delivery_address, delivery_lat, delivery_lng, items } = req.body;
    
    // Group items by restaurant
    const itemsByRestaurant = items.reduce((acc: any, item: any) => {
      if (!acc[item.restaurant_id]) acc[item.restaurant_id] = [];
      acc[item.restaurant_id].push(item);
      return acc;
    }, {});

    const insert = db.prepare(`
      INSERT INTO orders (restaurant_id, customer_name, customer_email, customer_phone, delivery_address, delivery_lat, delivery_lng, items, total_price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const orderIds = [];
    for (const [restaurantId, restItems] of Object.entries(itemsByRestaurant)) {
      const totalPrice = (restItems as any[]).reduce((sum, item) => sum + item.finalPrice, 0);
      const info = insert.run(
        restaurantId, customer_name, customer_email, customer_phone, delivery_address, delivery_lat, delivery_lng, JSON.stringify(restItems), totalPrice
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
    db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, req.params.orderId);
    res.json({ success: true });
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
