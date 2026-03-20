import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Pizza, Clock, CheckCircle, Plus, Trash2, Image as ImageIcon, MenuSquare, Settings2, Pencil, MapPin, Save, LogOut, X, TrendingUp, DollarSign, ShoppingBag, Check, Share2, Upload, Truck, Star, Target, Bike, Car, Printer, User, Moon, Sun, Receipt, RefreshCw, Eye, Percent, Store, FileText } from 'lucide-react';
import DeliveryZoneMap from '../components/DeliveryZoneMap';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { io } from 'socket.io-client';
import QRCode from 'qrcode';
import { useTheme } from '../context/ThemeContext';

interface ModifierOption {
  name: string;
  price: number;
}

interface ModifierGroup {
  name: string;
  type: 'single' | 'multiple';
  options: ModifierOption[];
}

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  subcategory: string;
  modifiers: ModifierGroup[];
  is_available?: number;
}

interface Order {
  id: number;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  items: string;
  total_price: number;
  status: string;
  delivery_code: string;
  tracking_token?: string;
  delivery_partner_name?: string;
  delivery_partner_methods?: string;
  created_at: string;
  spare_2?: string;
  ready_at?: string;
  payment_method: string;
  selected_fees: string;
}

const MACEDONIAN_CITIES = [
  { name: 'Скопје', zip: '1000' },
  { name: 'Битола', zip: '7000' },
  { name: 'Куманово', zip: '1300' },
  { name: 'Прилеп', zip: '7500' },
  { name: 'Тетово', zip: '1200' },
  { name: 'Велес', zip: '1400' },
  { name: 'Штип', zip: '2000' },
  { name: 'Охрид', zip: '6000' },
  { name: 'Гостивар', zip: '1230' },
  { name: 'Струмица', zip: '2400' },
  { name: 'Кавадарци', zip: '1430' },
  { name: 'Кочани', zip: '2300' },
  { name: 'Кичево', zip: '6250' },
  { name: 'Струга', zip: '6330' },
  { name: 'Радовиш', zip: '2420' },
  { name: 'Гевгелија', zip: '1480' },
  { name: 'Дебар', zip: '1250' },
  { name: 'Крива Паланка', zip: '1330' },
  { name: 'Свети Николе', zip: '2080' },
  { name: 'Неготино', zip: '1440' },
  { name: 'Делчево', zip: '2320' },
  { name: 'Виница', zip: '2310' },
  { name: 'Ресен', zip: '7310' },
  { name: 'Пробиштип', zip: '2210' },
  { name: 'Берово', zip: '2330' },
  { name: 'Кратово', zip: '1360' },
  { name: 'Крушево', zip: '7430' },
  { name: 'Македонски Брод', zip: '6530' },
  { name: 'Валандово', zip: '2460' },
  { name: 'Демир Хисар', zip: '7240' }
].sort((a, b) => a.name.localeCompare(b.name));

function Countdown({ targetTime, onExpire }: { targetTime: string, onExpire?: () => void }) {
  const [timeLeft, setTimeLeft] = useState('');
  const expiredRef = useRef(false);

  useEffect(() => {
    const parseDate = (dateStr: string) => {
      if (!dateStr) return new Date();
      if (dateStr.includes(' ') && !dateStr.includes('T')) {
        return new Date(dateStr.replace(' ', 'T') + 'Z');
      }
      return new Date(dateStr);
    };

    const target = parseDate(targetTime).getTime();
    
    const updateTimer = () => {
      const now = new Date().getTime();
      const difference = target - now;
      
      if (difference <= 0) {
        setTimeLeft('00:00');
        if (onExpire && !expiredRef.current) {
          expiredRef.current = true;
          onExpire();
        }
        return;
      }
      
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      
      setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetTime, onExpire]);

  return <span>{timeLeft}</span>;
}

function FreshnessTimer({ readyAt }: { readyAt: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    // SQLite CURRENT_TIMESTAMP is "YYYY-MM-DD HH:MM:SS" (UTC)
    // We need to ensure it's parsed as UTC by converting to ISO format if needed
    const parseDate = (dateStr: string) => {
      if (!dateStr) return new Date();
      if (dateStr.includes(' ') && !dateStr.includes('T')) {
        return new Date(dateStr.replace(' ', 'T') + 'Z');
      }
      return new Date(dateStr);
    };

    const start = parseDate(readyAt).getTime();
    const deadline = start + (25 * 60 * 1000); // 25 minutes deadline
    
    const updateTimer = () => {
      const now = new Date().getTime();
      const difference = deadline - now;
      
      if (difference <= 0) {
        setTimeLeft('00:00');
        return;
      }
      
      const minutes = Math.floor(difference / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [readyAt]);

  const minutes = parseInt(timeLeft.split(':')[0]);
  let colorClass = "text-emerald-600";
  if (minutes < 5) colorClass = "text-red-600 animate-pulse font-black";
  else if (minutes < 10) colorClass = "text-orange-600 font-bold";

  return (
    <div className={`flex items-center gap-1 ${colorClass}`}>
      <Clock size={14} />
      <span className="text-sm font-mono font-bold">{timeLeft}</span>
    </div>
  );
}

export default function Restaurant() {
  const { theme, toggleTheme } = useTheme();
  const [loggedInRestaurant, setLoggedInRestaurant] = useState<any>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'menu' | 'settings' | 'reviews' | 'campaigns' | 'invoicing'>('orders');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [dashboardFilter, setDashboardFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [activeDeliveryPartners, setActiveDeliveryPartners] = useState<number>(0);
  const [deliveryMethodCounts, setDeliveryMethodCounts] = useState<Record<string, number>>({
    bicycle: 0,
    motorcycle: 0,
    car: 0
  });
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deliveryZones, setDeliveryZones] = useState<[number, number][][]>([]);
  const [isSavingZones, setIsSavingZones] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [orderView, setOrderView] = useState<'active' | 'completed'>('active');
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
  const [hasNewOrders, setHasNewOrders] = useState(false);
  const maxOrderIdRef = useRef<number>(0);
  const audioIntervalRef = useRef<any>(null);

  const toggleOrderExpansion = (orderId: number) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const playNotificationSound = () => {
    if (audioIntervalRef.current) return; // Already playing

    const play = () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.5);
        oscillator.stop(audioCtx.currentTime + 0.5);
      } catch (e) {
        console.error("Audio playback failed", e);
      }
    };

    play();
    audioIntervalRef.current = setInterval(play, 2000);
  };

  const stopNotificationSound = () => {
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
    setHasNewOrders(false);
  };

  const sendBrowserNotification = (orderId: number) => {
    if (!("Notification" in window)) return;
    
    if (Notification.permission === "granted") {
      new Notification("Нова нарачка!", {
        body: `Пристигна нова нарачка #${orderId}`,
        icon: "/favicon.ico"
      });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification("Нова нарачка!", {
            body: `Пристигна нова нарачка #${orderId}`,
            icon: "/favicon.ico"
          });
        }
      });
    }
  };
  const [settingsForm, setSettingsForm] = useState({
    password: '',
    phone: '',
    bank_account: '',
    logo_url: '',
    cover_url: '',
    header_image: '',
    city: '',
    address: '',
    spare_1: '',
    spare_2: '',
    spare_3: '',
    spare_4: '',
    working_hours: '{}'
  });

  const fetchInvoices = async () => {
    try {
      const res = await fetch('/api/restaurant/invoices');
      if (res.ok) setInvoices(await res.json());
    } catch (e) {
      console.error('Failed to fetch invoices', e);
    }
  };

  const viewInvoice = async (invoice: any) => {
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`);
      if (res.ok) {
        setSelectedInvoice(await res.json());
        setIsInvoiceModalOpen(true);
      }
    } catch (e) {
      console.error('Failed to fetch invoice details', e);
    }
  };

  const handleUpdateInvoiceStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchInvoices();
        setIsInvoiceModalOpen(false);
        setSelectedInvoice(null);
      }
    } catch (e) {
      console.error('Failed to update invoice status', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'invoicing') {
      fetchInvoices();
    }
  }, [activeTab]);

  useEffect(() => {
    if (loggedInRestaurant) {
      setSettingsForm({
        password: loggedInRestaurant.password || '',
        phone: loggedInRestaurant.phone || '',
        bank_account: loggedInRestaurant.bank_account || '',
        logo_url: loggedInRestaurant.logo_url || '',
        cover_url: loggedInRestaurant.cover_url || '',
        header_image: loggedInRestaurant.header_image || '',
        city: loggedInRestaurant.city || '',
        address: loggedInRestaurant.address || '',
        spare_1: loggedInRestaurant.spare_1 || '',
        spare_2: loggedInRestaurant.spare_2 || '',
        spare_3: loggedInRestaurant.spare_3 || '',
        spare_4: loggedInRestaurant.spare_4 || '',
        working_hours: typeof loggedInRestaurant.working_hours === 'string' 
          ? loggedInRestaurant.working_hours 
          : JSON.stringify(loggedInRestaurant.working_hours || {}, null, 2)
      });
    }
  }, [loggedInRestaurant]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedInRestaurant) return;
    setIsSavingSettings(true);
    const res = await fetch(`/api/restaurants/${loggedInRestaurant.id}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingsForm)
    });
    if (res.ok) {
      const updatedRest = { ...loggedInRestaurant, ...settingsForm };
      setLoggedInRestaurant(updatedRest);
      localStorage.setItem('restaurant_auth', JSON.stringify(updatedRest));
      alert('Поставките се успешно зачувани!');
    }
    setIsSavingSettings(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo_url' | 'cover_url' | 'header_image') => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setSettingsForm(prev => ({ ...prev, [field]: data.url }));
    } catch (err) {
      console.error(err);
      alert('Грешка при прикачување на сликата.');
    }
  };
  
  const handleItemImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setNewItem(prev => ({ ...prev, image_url: data.url }));
    } catch (err) {
      console.error(err);
      alert('Грешка при прикачување на сликата.');
    }
  };

  const initialNewItem = { 
    name: '', description: '', price: '', image_url: '', 
    category: 'Храна', subcategory: 'Пица', modifiers: [] as ModifierGroup[] 
  };
  const [newItem, setNewItem] = useState(initialNewItem);

  useEffect(() => {
    const saved = localStorage.getItem('restaurant_auth');
    if (saved) {
      const parsed = JSON.parse(saved);
      setLoggedInRestaurant(parsed);
      try {
        setDeliveryZones(JSON.parse(parsed.delivery_zones || '[]'));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (loggedInRestaurant) {
      fetchMenu();
      fetchOrders();
      fetchReviews();
      fetchCampaigns();
      
      const socket = io();
      socket.emit('join_restaurant', loggedInRestaurant.id);

      socket.on('new_order', (data) => {
        console.log('New order received via socket:', data);
        setHasNewOrders(true);
        playNotificationSound();
        sendBrowserNotification(data.id);
        fetchOrders(true);
      });

      socket.on('order_preparing', (data) => {
        console.log('Order preparing signal received:', data);
        fetchOrders(true);
      });

      const interval = setInterval(() => {
        fetchOrders(true);
      }, 30000); // Keep as fallback but less frequent
      
      return () => {
        socket.disconnect();
        clearInterval(interval);
      };
    }
  }, [loggedInRestaurant]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const res = await fetch('/api/restaurants/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm)
    });
    const data = await res.json();
    if (res.ok && data.success) {
      setLoggedInRestaurant(data.restaurant);
      localStorage.setItem('restaurant_auth', JSON.stringify(data.restaurant));
      try {
        setDeliveryZones(JSON.parse(data.restaurant.delivery_zones || '[]'));
      } catch (e) {}
    } else {
      setLoginError(data.message || 'Грешка при најава');
    }
  };

  const handleLogout = () => {
    setLoggedInRestaurant(null);
    localStorage.removeItem('restaurant_auth');
  };

  const fetchMenu = async () => {
    if (!loggedInRestaurant) return;
    const res = await fetch(`/api/menu/${loggedInRestaurant.id}`);
    const data = await res.json();
    setMenuItems(data);
  };

  const fetchReviews = async () => {
    if (!loggedInRestaurant) return;
    const res = await fetch(`/api/restaurants/${loggedInRestaurant.id}/reviews`);
    const data = await res.json();
    setReviews(data);
  };

  const fetchCampaigns = async () => {
    if (!loggedInRestaurant) return;
    const res = await fetch(`/api/restaurants/${loggedInRestaurant.id}/campaigns`);
    const data = await res.json();
    setCampaigns(data);
  };

  const fetchActiveDeliveryPartners = async () => {
    if (!loggedInRestaurant) return;
    try {
      const res = await fetch(`/api/restaurants/${loggedInRestaurant.id}/active-delivery-partners`);
      const data = await res.json();
      setActiveDeliveryPartners(data.count || 0);
      setDeliveryMethodCounts(data.countsByMethod || { bicycle: 0, motorcycle: 0, car: 0 });
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOrders = async (isBackground = false) => {
    if (!loggedInRestaurant) return;
    const res = await fetch(`/api/orders/${loggedInRestaurant.id}`);
    const data = await res.json();
    
    if (data.length > 0) {
      const currentMaxId = Math.max(...data.map((o: any) => o.id));
      if (isBackground && maxOrderIdRef.current > 0 && currentMaxId > maxOrderIdRef.current) {
        setHasNewOrders(true);
        playNotificationSound();
        const newOrder = data.find((o: any) => o.id === currentMaxId);
        if (newOrder) sendBrowserNotification(newOrder.id);
      }
      maxOrderIdRef.current = currentMaxId;
    }
    setOrders(data);
    
    fetchActiveDeliveryPartners();
  };

  const updateOrderDelay = async (orderId: number, delayMinutes: number) => {
    const res = await fetch(`/api/orders/${orderId}/delay`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delayMinutes })
    });
    const data = await res.json();
    if (data.success) {
      setOrders(orders.map(o => {
        if (o.id === orderId) {
          return { ...o, spare_2: data.targetTime };
        }
        return o;
      }));
    }
  };

  const handlePrintLabel = async (order: Order) => {
    try {
      const trackingUrl = `${window.location.origin}/track/${order.tracking_token}`;
      const qrDataUrl = await QRCode.toDataURL(trackingUrl, { margin: 1, width: 200 });
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Ве молиме овозможете скокачки прозорци (pop-ups) за да печатите.');
        return;
      }

      const restaurantLogo = loggedInRestaurant?.logo_url || 'https://pizzatime.mk/logo.png';
      const restaurantName = loggedInRestaurant?.name || 'PizzaTime';
      const restaurantAddress = loggedInRestaurant?.address || '';
      const restaurantCity = loggedInRestaurant?.city || '';
      const restaurantZip = loggedInRestaurant?.spare_3 || '';

      printWindow.document.write(`
        <html>
          <head>
            <title>Печати Налепница #${order.id}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
              @page { margin: 0; size: 80mm 150mm; }
              body { 
                font-family: 'Inter', sans-serif; 
                margin: 0; 
                padding: 10px; 
                width: 70mm; 
                text-align: center;
                color: #000;
                background: #fff;
              }
              .header { font-size: 14px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; }
              .logo-container { margin: 10px auto; width: 50mm; height: 30mm; display: flex; items-center; justify-content: center; border-radius: 10px; overflow: hidden; }
              .logo { max-width: 100%; max-height: 100%; object-fit: contain; }
              .restaurant-name { font-size: 24px; font-weight: 900; color: #e11d48; margin: 5px 0; text-transform: uppercase; line-height: 1; }
              .address { font-size: 11px; color: #444; margin-bottom: 10px; font-weight: 700; }
              .qr-container { padding: 10px; margin: 10px 0; display: inline-block; border-radius: 15px; }
              .qr-code { width: 45mm; height: 45mm; }
              .order-info { font-size: 14px; margin: 10px 0; font-weight: bold; line-height: 1.5; }
              .order-id { color: #e11d48; font-size: 18px; }
              .footer-text { font-size: 9px; color: #666; margin-top: 15px; line-height: 1.4; font-weight: 500; }
              .divider { border-top: 1px solid #eee; margin: 10px 0; }
              .bold { font-weight: 900; }
              .highlight { color: #e11d48; }
            </style>
          </head>
          <body>
            <div class="header">PizzaTime delivery by</div>
            <div class="logo-container">
              <img src="${restaurantLogo}" class="logo" />
            </div>
            <div class="restaurant-name">${restaurantName}</div>
            <div class="address">${restaurantAddress}<br/>${restaurantZip}, ${restaurantCity}</div>
            
            <div class="qr-container">
              <img src="${qrDataUrl}" class="qr-code" />
            </div>
            
            <div class="order-info">
              Број на нарачка: <span class="order-id">#PT-${new Date().getFullYear()}-${order.id.toString().padStart(3, '0')}</span><br/>
              Време на подготовка: <span class="bold">${new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>

            <div class="bold" style="font-size: 13px; margin-top: 10px; line-height: 1.2;">
              Скенирај го кодот за да ја оцениш услугата!
            </div>
            
            <div class="footer-text">
              Твоето мислење ни е важно.<br/>
              Ви благодариме за довербата!<br/>
              <div class="divider"></div>
              Оваа нарачка е процесирана преку PizzaTime. За поддршка или рекламации: 07X XXX XXX<br/>
              www.pizzatime.mk
            </div>

            <script>
              window.onload = () => {
                setTimeout(() => {
                  window.print();
                  window.close();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error('Print error:', err);
      alert('Грешка при генерирање на налепницата.');
    }
  };

  const updateOrderStatus = async (orderId: number, status: string) => {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    setOrders(orders.map(o => {
      if (o.id === orderId) {
        return { 
          ...o, 
          status, 
          delivery_code: data.delivery_code || o.delivery_code,
          delivery_partner_name: data.delivery_partner_name || o.delivery_partner_name
        };
      }
      return o;
    }));
  };

  const handleSaveZones = async () => {
    if (!loggedInRestaurant) return;
    setIsSavingZones(true);
    const res = await fetch(`/api/restaurants/${loggedInRestaurant.id}/zones`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delivery_zones: deliveryZones })
    });
    if (res.ok) {
      const updatedRest = { ...loggedInRestaurant, delivery_zones: JSON.stringify(deliveryZones) };
      setLoggedInRestaurant(updatedRest);
      localStorage.setItem('restaurant_auth', JSON.stringify(updatedRest));
      alert('Зоните на достава се успешно зачувани!');
    }
    setIsSavingZones(false);
  };

  const [isAddingItem, setIsAddingItem] = useState(false);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedInRestaurant || isAddingItem) return;
    setIsAddingItem(true);
    const payload = {
      ...newItem,
      price: parseFloat(newItem.price as string),
      image_url: newItem.image_url || `https://picsum.photos/seed/${Math.random()}/400/300`
    };

    if (editingId) {
      const res = await fetch(`/api/menu/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsAdding(false);
        setEditingId(null);
        setNewItem(initialNewItem);
        fetchMenu();
      }
    } else {
      const res = await fetch(`/api/menu/${loggedInRestaurant.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsAdding(false);
        setNewItem(initialNewItem);
        fetchMenu();
      }
    }
    setIsAddingItem(false);
  };

  const handleEditItem = (item: MenuItem) => {
    setNewItem({
      name: item.name,
      description: item.description,
      price: item.price.toString() as any,
      image_url: item.image_url,
      category: item.category,
      subcategory: item.subcategory,
      modifiers: item.modifiers || []
    });
    setEditingId(item.id);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteItem = async (id: number) => {
    const res = await fetch(`/api/menu/${id}`, { method: 'DELETE' });
    if (res.ok) fetchMenu();
  };

  const handleToggleAvailability = async (id: number) => {
    const res = await fetch(`/api/menu/${id}/toggle-availability`, { method: 'PUT' });
    if (res.ok) fetchMenu();
  };

  const addModifierGroup = () => {
    setNewItem({
      ...newItem,
      modifiers: [...newItem.modifiers, { name: '', type: 'single', options: [] }]
    });
  };

  const updateModifierGroup = (index: number, field: keyof ModifierGroup, value: any) => {
    const updatedModifiers = [...newItem.modifiers];
    updatedModifiers[index] = { ...updatedModifiers[index], [field]: value };
    setNewItem({ ...newItem, modifiers: updatedModifiers });
  };

  const removeModifierGroup = (index: number) => {
    const updatedModifiers = newItem.modifiers.filter((_, i) => i !== index);
    setNewItem({ ...newItem, modifiers: updatedModifiers });
  };

  const addModifierOption = (groupIndex: number) => {
    const updatedModifiers = [...newItem.modifiers];
    updatedModifiers[groupIndex].options.push({ name: '', price: 0 });
    setNewItem({ ...newItem, modifiers: updatedModifiers });
  };

  const updateModifierOption = (groupIndex: number, optionIndex: number, field: keyof ModifierOption, value: any) => {
    const updatedModifiers = [...newItem.modifiers];
    updatedModifiers[groupIndex].options[optionIndex] = { 
      ...updatedModifiers[groupIndex].options[optionIndex], 
      [field]: value 
    };
    setNewItem({ ...newItem, modifiers: updatedModifiers });
  };

  const removeModifierOption = (groupIndex: number, optionIndex: number) => {
    const updatedModifiers = [...newItem.modifiers];
    updatedModifiers[groupIndex].options = updatedModifiers[groupIndex].options.filter((_, i) => i !== optionIndex);
    setNewItem({ ...newItem, modifiers: updatedModifiers });
  };

  if (!loggedInRestaurant) {
    return (
      <div className="min-h-screen bg-red-50/30 dark:bg-slate-950 flex flex-col items-center justify-center p-6 transition-colors duration-300">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-red-100 dark:border-slate-800 p-8 transition-colors">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors">
              <MenuSquare size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white transition-colors">Најава за Ресторани</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 transition-colors">Внесете ги податоците добиени од администраторот</p>
          </div>

          {loginError && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-medium mb-6 border border-red-100 dark:border-red-900/30 text-center transition-colors">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 transition-colors">Корисничко име</label>
              <input 
                required 
                type="text" 
                value={loginForm.username} 
                onChange={e => setLoginForm({...loginForm, username: e.target.value})} 
                className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white transition-colors" 
                placeholder="пр. rest_1_a1b2" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 transition-colors">Лозинка</label>
              <input 
                required 
                type="password" 
                value={loginForm.password} 
                onChange={e => setLoginForm({...loginForm, password: e.target.value})} 
                className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white transition-colors" 
                placeholder="••••••••" 
              />
            </div>
            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors mt-4 shadow-lg shadow-red-600/20 dark:shadow-none">
              Најави се
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <Link to="/" className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-sm font-medium flex items-center justify-center gap-2 transition-colors">
              <ArrowLeft size={16} /> Назад кон почетна
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-red-50/30 dark:bg-slate-950 transition-colors duration-300">
      <header className="bg-white dark:bg-slate-900 border-b border-red-100 dark:border-slate-800 sticky top-0 z-10 transition-colors">
        {loggedInRestaurant.header_image && (
          <div className="h-32 w-full relative overflow-hidden">
            <img 
              src={loggedInRestaurant.header_image} 
              alt="Header" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          </div>
        )}
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-red-50 rounded-full text-red-500 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">{loggedInRestaurant.name}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Ресторан Панел</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Дашборд
            </button>
            <button 
              onClick={() => {
                setActiveTab('orders');
                stopNotificationSound();
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'orders' ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'} ${hasNewOrders ? 'animate-pulse bg-red-600 text-white shadow-lg shadow-red-200' : ''}`}
            >
              Нарачки {hasNewOrders && <span className="ml-1 w-2 h-2 bg-white rounded-full inline-block animate-ping"></span>}
            </button>
            <button 
              onClick={() => setActiveTab('menu')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'menu' ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Мени
            </button>
            <button 
              onClick={() => setActiveTab('reviews')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'reviews' ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Рецензии
            </button>
            <button 
              onClick={() => setActiveTab('campaigns')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'campaigns' ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Промоции
            </button>
            <button 
              onClick={() => setActiveTab('invoicing')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'invoicing' ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Фактурирање
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Поставки
            </button>
          </div>
          <button onClick={() => {
            const url = `${window.location.origin}/r/${loggedInRestaurant.username}`;
            if (navigator.clipboard && window.isSecureContext) {
              navigator.clipboard.writeText(url)
                .then(() => alert('Линкот е копиран: ' + url))
                .catch(() => prompt('Вашиот прелистувач не дозволува автоматско копирање (поради iframe). Копирајте го линкот рачно:', url));
            } else {
              prompt('Копирајте го линкот рачно:', url);
            }
          }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/40 rounded-lg transition-colors" title="Сподели линк">
            <Share2 size={18} />
            <span className="hidden sm:inline">Сподели</span>
          </button>
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={theme === 'light' ? 'Префрли во темен режим' : 'Префрли во светол режим'}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors" title="Одјави се">
            <LogOut size={18} />
            <span className="hidden sm:inline">Одјави се</span>
          </button>
        </div>
      </div>
    </header>
      
      {/* Mobile Tabs */}
      <div className="md:hidden bg-white dark:bg-slate-900 border-b border-red-100 dark:border-slate-800 p-2 flex gap-2 transition-colors">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}
        >
          Дашборд
        </button>
        <button 
          onClick={() => {
            setActiveTab('orders');
            stopNotificationSound();
          }}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'orders' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'} ${hasNewOrders ? 'bg-red-600 text-white animate-pulse' : ''}`}
        >
          Нарачки
        </button>
        <button 
          onClick={() => setActiveTab('menu')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'menu' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}
        >
          Мени
        </button>
        <button 
          onClick={() => setActiveTab('invoicing')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'invoicing' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}
        >
          Фактури
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}
        >
          Поставки
        </button>
      </div>
      
      <main className="max-w-6xl mx-auto p-6">
        {activeTab === 'dashboard' ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <TrendingUp className="text-blue-500" />
                Дашборд
              </h2>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto overflow-x-auto hide-scrollbar">
                <button
                  onClick={() => setDashboardFilter('today')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${dashboardFilter === 'today' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  Денес
                </button>
                <button
                  onClick={() => setDashboardFilter('week')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${dashboardFilter === 'week' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  Оваа недела
                </button>
                <button
                  onClick={() => setDashboardFilter('month')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${dashboardFilter === 'month' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  Овој месец
                </button>
                <button
                  onClick={() => setDashboardFilter('all')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${dashboardFilter === 'all' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  Вкупно
                </button>
              </div>
            </div>

            {(() => {
              const now = new Date();
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              
              const startOfWeek = new Date(today);
              startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Monday
              
              const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

              const filteredOrders = orders.filter(o => {
                if (dashboardFilter === 'all') return true;
                
                const orderDate = new Date(o.created_at);
                if (dashboardFilter === 'today') return orderDate >= today;
                if (dashboardFilter === 'week') return orderDate >= startOfWeek;
                if (dashboardFilter === 'month') return orderDate >= startOfMonth;
                return true;
              });

              return (
                <>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                          <DollarSign size={24} />
                        </div>
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Вкупен Промет</p>
                          <p className="text-2xl font-bold text-slate-800 dark:text-white">
                            {filteredOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.total_price, 0).toLocaleString()} ден.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
                          <ShoppingBag size={24} />
                        </div>
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Вкупно Нарачки</p>
                          <p className="text-2xl font-bold text-slate-800 dark:text-white">
                            {filteredOrders.length}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-xl">
                          <TrendingUp size={24} />
                        </div>
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Просечна Нарачка</p>
                          <p className="text-2xl font-bold text-slate-800 dark:text-white">
                            {filteredOrders.length > 0 ? Math.round(filteredOrders.reduce((sum, o) => sum + o.total_price, 0) / filteredOrders.length).toLocaleString() : 0} ден.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Charts Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors min-w-0">
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Нарачки по статус</h3>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={[
                              { name: 'Нови', count: filteredOrders.filter(o => o.status === 'pending').length },
                              { name: 'Се подготвува', count: filteredOrders.filter(o => o.status === 'accepted').length },
                              { name: 'Се доставува', count: filteredOrders.filter(o => o.status === 'delivering').length },
                              { name: 'Доставени', count: filteredOrders.filter(o => o.status === 'completed').length },
                              { name: 'Одбиени', count: filteredOrders.filter(o => ['rejected', 'cancelled'].includes(o.status)).length }
                            ]}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#f1f5f9'} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                            <Tooltip 
                              cursor={{ fill: theme === 'dark' ? '#1e293b' : '#f8fafc' }}
                              contentStyle={{ 
                                borderRadius: '12px', 
                                border: 'none', 
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                                color: theme === 'dark' ? '#ffffff' : '#000000'
                              }}
                            />
                            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors min-w-0">
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Трендови на продажба</h3>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={(() => {
                              const salesByDay: Record<string, number> = {};
                              filteredOrders.forEach(o => {
                                const date = new Date(o.created_at).toLocaleDateString('mk-MK', { weekday: 'short' });
                                salesByDay[date] = (salesByDay[date] || 0) + o.total_price;
                              });
                              return Object.entries(salesByDay).map(([name, total]) => ({ name, total }));
                            })()}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#f1f5f9'} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                            <Tooltip 
                              contentStyle={{ 
                                borderRadius: '12px', 
                                border: 'none', 
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                                color: theme === 'dark' ? '#ffffff' : '#000000'
                              }}
                            />
                            <Line type="monotone" dataKey="total" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444' }} activeDot={{ r: 6 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors min-w-0">
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Најпопуларни продукти</h3>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={(() => {
                                const itemCounts: Record<string, number> = {};
                                filteredOrders.forEach(order => {
                                  try {
                                    const items = JSON.parse(order.items);
                                    items.forEach((item: any) => {
                                      itemCounts[item.name] = (itemCounts[item.name] || 0) + (item.quantity || 1);
                                    });
                                  } catch (e) {}
                                });
                                return Object.entries(itemCounts)
                                  .map(([name, value]) => ({ name, value }))
                                  .sort((a, b) => b.value - a.value)
                                  .slice(0, 5);
                              })()}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#6366f1'].map((color, index) => (
                                <Cell key={`cell-${index}`} fill={color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                borderRadius: '12px', 
                                border: 'none', 
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                                color: theme === 'dark' ? '#ffffff' : '#000000'
                              }}
                            />
                            <Legend verticalAlign="bottom" height={36}/>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Брза Статистика</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm transition-colors">
                              <DollarSign size={16} className="text-emerald-500" />
                            </div>
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Најголема нарачка:</span>
                          </div>
                          <span className="font-bold text-slate-800 dark:text-white">{Math.max(...filteredOrders.map(o => o.total_price), 0).toLocaleString()} ден.</span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm transition-colors">
                              <CheckCircle size={16} className="text-blue-500" />
                            </div>
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Завршени нарачки:</span>
                          </div>
                          <span className="font-bold text-slate-800 dark:text-white">{filteredOrders.filter(o => o.status === 'completed').length}</span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm transition-colors">
                              <X size={16} className="text-red-500" />
                            </div>
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Откажани:</span>
                          </div>
                          <span className="font-bold text-slate-800 dark:text-white">{filteredOrders.filter(o => ['rejected', 'cancelled'].includes(o.status)).length}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        ) : activeTab === 'orders' ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Clock className="text-orange-500" />
                  Нарачки
                </h2>
                {hasNewOrders && (
                  <button 
                    onClick={stopNotificationSound}
                    className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-sm animate-bounce shadow-lg flex items-center gap-2"
                  >
                    <X size={16} /> СТОП АЛАРМ
                  </button>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-4 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg border border-emerald-100 dark:border-emerald-800 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-sm font-bold">Активни: {activeDeliveryPartners}</span>
                  </div>
                  <div className="h-4 w-px bg-emerald-200 dark:bg-emerald-800 hidden sm:block"></div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1" title="Велосипед">
                      <Bike size={16} />
                      <span className="text-xs font-bold">{deliveryMethodCounts.bicycle}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Мотор">
                      <Bike size={16} className="opacity-70" />
                      <span className="text-xs font-bold">{deliveryMethodCounts.motorcycle}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Автомобил">
                      <Car size={16} />
                      <span className="text-xs font-bold">{deliveryMethodCounts.car}</span>
                    </div>
                  </div>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg transition-colors">
                  <button
                    onClick={() => setOrderView('active')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${orderView === 'active' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    Во тек
                  </button>
                  <button
                    onClick={() => setOrderView('completed')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${orderView === 'completed' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    Завршени
                  </button>
                </div>
              </div>
            </div>
            
            {(() => {
              const activeOrders = orders.filter(o => ['pending', 'accepted', 'ready', 'delivering'].includes(o.status));
              const completedOrders = orders.filter(o => ['completed', 'rejected', 'cancelled'].includes(o.status));
              
              if (orderView === 'completed') {
                if (completedOrders.length === 0) {
                  return (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-red-100 dark:border-slate-800 p-8 text-center transition-colors">
                      <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Pizza size={32} />
                      </div>
                      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Нема завршени нарачки</h2>
                    </div>
                  );
                }
                return (
                  <div className="grid gap-4">
                    {completedOrders.map(order => (
                      <div key={order.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center transition-colors">
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white">#{order.id} - {order.customer_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(order.created_at).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-800 dark:text-white">{order.total_price} ден.</p>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${order.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'}`}>
                            {order.status === 'completed' ? 'Доставена' : 'Откажана'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }

              const columns = [
                { id: 'pending', title: 'Нови', color: 'bg-amber-500', icon: <Clock size={16} /> },
                { id: 'accepted', title: 'Се подготвува', color: 'bg-blue-500', icon: <Pizza size={16} /> },
                { id: 'ready', title: 'Подготвено', color: 'bg-emerald-500', icon: <CheckCircle size={16} /> },
                { id: 'delivering', title: 'Во достава', color: 'bg-purple-500', icon: <MapPin size={16} /> }
              ];

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                  {columns.map(col => {
                    const colOrders = activeOrders.filter(o => o.status === col.id);
                    return (
                      <div key={col.id} className="flex flex-col gap-4">
                        <div className="flex items-center justify-between px-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${col.color}`}></div>
                            <h3 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-sm flex items-center gap-2">
                              {col.icon}
                              {col.title}
                            </h3>
                          </div>
                          <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full text-xs font-bold transition-colors">
                            {colOrders.length}
                          </span>
                        </div>
                        
                        <div className="space-y-4 min-h-[500px] bg-slate-100/50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 transition-colors">
                          {colOrders.map(order => {
                            const items = JSON.parse(order.items || '[]');
                            const isExpanded = expandedOrders.has(order.id);
                            
                            return (
                              <div 
                                key={order.id} 
                                className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-all ${isExpanded ? 'ring-2 ring-indigo-500/20 shadow-md' : 'hover:border-slate-300 dark:hover:border-slate-700'}`}
                              >
                                <div 
                                  className="p-4 cursor-pointer"
                                  onClick={() => toggleOrderExpansion(order.id)}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500">#{order.id}</span>
                                    <div className="flex flex-col items-end">
                                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                      {order.status === 'pending' && order.spare_2 && (
                                        <div className="text-lg font-black text-orange-600 animate-pulse">
                                          <Countdown targetTime={order.spare_2} onExpire={() => updateOrderStatus(order.id, 'accepted')} />
                                        </div>
                                      )}
                                      {order.status === 'ready' && order.ready_at && (
                                        <FreshnessTimer readyAt={order.ready_at} />
                                      )}
                                    </div>
                                  </div>
                                  <h4 className="font-bold text-slate-800 dark:text-white truncate">{order.customer_name}</h4>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-3">{order.delivery_address}</p>
                                  
                                    <div className="flex justify-between items-center mb-3">
                                      <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">{order.total_price} ден.</span>
                                      <div className="flex gap-1">
                                        {order.status === 'pending' && (
                                          <div className="flex gap-1">
                                            <button 
                                              onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'accepted'); }}
                                              className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                                              title="Прифати"
                                            >
                                              <Check size={16} />
                                            </button>
                                            <button 
                                              onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'cancelled'); }}
                                              className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                              title="Одбиј"
                                            >
                                              <X size={16} />
                                            </button>
                                          </div>
                                        )}
                                        {order.status === 'accepted' && (
                                          <div className="flex gap-1">
                                            <button 
                                              onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'ready'); }}
                                              className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                                              title="Подготвено"
                                            >
                                              <CheckCircle size={16} />
                                            </button>
                                            <button 
                                              onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'cancelled'); }}
                                              className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                              title="Откажи"
                                            >
                                              <X size={16} />
                                            </button>
                                          </div>
                                        )}
                                        {order.status === 'ready' && (
                                          <div className="flex gap-1">
                                            <button 
                                              onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'delivering'); }}
                                              className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                                              title="Во достава"
                                            >
                                              <MapPin size={16} />
                                            </button>
                                            {activeDeliveryPartners === 0 && (
                                              <button 
                                                onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'delivering'); }}
                                                className="px-2 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors text-[10px] font-bold flex items-center gap-1"
                                                title="Сопствена достава"
                                              >
                                                <Truck size={12} /> Сопствена
                                              </button>
                                            )}
                                          </div>
                                        )}
                                        {order.status === 'delivering' && (
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'completed'); }}
                                            className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                                            title="Заврши"
                                          >
                                            <CheckCircle size={16} />
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {order.status === 'pending' && (
                                      <div className="flex gap-1 mt-2">
                                        <button onClick={(e) => { e.stopPropagation(); updateOrderDelay(order.id, 5); }} className="flex-1 py-1 rounded-lg text-[10px] font-bold bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">+5м</button>
                                        <button onClick={(e) => { e.stopPropagation(); updateOrderDelay(order.id, 10); }} className="flex-1 py-1 rounded-lg text-[10px] font-bold bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">+10м</button>
                                        <button onClick={(e) => { e.stopPropagation(); updateOrderDelay(order.id, 20); }} className="flex-1 py-1 rounded-lg text-[10px] font-bold bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">+20м</button>
                                      </div>
                                    )}
                                  </div>

                                  {(isExpanded || ['pending', 'accepted', 'ready', 'delivering'].includes(order.status)) && (
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in slide-in-from-top-2 transition-colors">
                                      <div className="space-y-2">
                                        {items.map((item: any, i: number) => (
                                          <div key={i} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-1 transition-colors">
                                            <div className="flex justify-between font-black text-slate-800 dark:text-white text-sm">
                                              <div className="flex items-center gap-2">
                                                <span>{item.quantity || 1}x {item.name}</span>
                                                {item.user_name && (
                                                  <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                    {item.user_name}
                                                  </span>
                                                )}
                                              </div>
                                              <span>{item.finalPrice} ден.</span>
                                            </div>
                                            {item.selectedModifiers && Object.keys(item.selectedModifiers).length > 0 && (
                                              <div className="pl-2 border-l-2 border-indigo-100 dark:border-indigo-900 space-y-1">
                                                {Object.entries(item.selectedModifiers).map(([group, options]: [string, any]) => {
                                                  let selectedText = '';
                                                  if (Array.isArray(options)) {
                                                    selectedText = options
                                                      .map((o: any) => (typeof o === 'string' ? o : o.name))
                                                      .filter(val => val && val.trim() !== '')
                                                      .join(', ');
                                                  } else if (typeof options === 'string') {
                                                    selectedText = options.trim();
                                                  } else if (options && options.name) {
                                                    selectedText = options.name.trim();
                                                  }
                                                  
                                                  if (!selectedText) return null;
                                                  
                                                  return (
                                                    <div key={group} className="text-[11px] leading-tight">
                                                      <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[9px] block">{group}:</span>
                                                      <span className="text-slate-700 dark:text-slate-300 font-medium italic">{selectedText}</span>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>

                                      {/* Payment & Fees */}
                                      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 transition-colors">
                                        <div className="flex justify-between items-center">
                                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Плаќање:</span>
                                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                            {order.payment_method === 'cash' ? 'Готовина' : order.payment_method === 'card' ? 'Картичка' : 'Поени'}
                                          </span>
                                        </div>
                                        {order.selected_fees && JSON.parse(order.selected_fees).length > 0 && (
                                          <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-1">Додатоци:</span>
                                            {JSON.parse(order.selected_fees).map((fee: any, idx: number) => (
                                              <div key={idx} className="flex justify-between text-[10px] text-slate-600 dark:text-slate-400">
                                                <span>{fee.name}</span>
                                                <span>+{fee.amount} ден.</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div className="flex flex-col gap-2 pt-2">
                                        {order.delivery_partner_name && (
                                          <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 mb-2 transition-colors">
                                            <div className="flex items-center gap-2">
                                              <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm transition-colors">
                                                {(() => {
                                                  try {
                                                    const methods = JSON.parse(order.delivery_partner_methods || '[]');
                                                    if (methods.includes('bicycle')) return <Bike size={16} className="text-indigo-600 dark:text-indigo-400" />;
                                                    if (methods.includes('motorcycle')) return <Bike size={16} className="text-indigo-600 dark:text-indigo-400 opacity-70" />;
                                                    if (methods.includes('car')) return <Car size={16} className="text-indigo-600 dark:text-indigo-400" />;
                                                    return <User size={16} className="text-indigo-600 dark:text-indigo-400" />;
                                                  } catch (e) {
                                                    return <User size={16} className="text-indigo-600 dark:text-indigo-400" />;
                                                  }
                                                })()}
                                              </div>
                                              <div>
                                                <p className="text-[10px] font-bold text-indigo-400 dark:text-indigo-500 uppercase">Доставувач:</p>
                                                <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200">{order.delivery_partner_name}</p>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); window.open(`/track/${order.tracking_token}`, '_blank'); }}
                                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                                        >
                                          <Share2 size={14} /> Следење & QR
                                        </button>
                                        {(order.status === 'accepted' || order.status === 'ready') && (
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); handlePrintLabel(order); }}
                                            className="w-full py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg text-xs font-bold hover:bg-slate-900 dark:hover:bg-slate-600 transition-all flex items-center justify-center gap-2"
                                          >
                                            <Printer size={14} /> Принт
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )}
                              </div>
                            );
                          })}
                          {colOrders.length === 0 && (
                            <div className="h-24 flex items-center justify-center text-slate-300 dark:text-slate-600 text-xs italic">
                              Нема нарачки
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        ) : activeTab === 'settings' ? (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-red-100 dark:border-slate-800 p-6 transition-colors">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <Settings2 className="text-red-500" />
                Основни поставки
              </h2>
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Град *</label>
                    <select 
                      required 
                      value={settingsForm.city} 
                      onChange={e => {
                        const selectedCity = MACEDONIAN_CITIES.find(c => c.name === e.target.value);
                        setSettingsForm({
                          ...settingsForm, 
                          city: e.target.value,
                          spare_3: selectedCity ? selectedCity.zip : settingsForm.spare_3
                        });
                      }} 
                      className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white transition-colors"
                    >
                      <option value="" disabled>Изберете град</option>
                      {MACEDONIAN_CITIES.map(city => (
                        <option key={city.name} value={city.name}>{city.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Адреса *</label>
                    <input type="text" required value={settingsForm.address} onChange={e => setSettingsForm({...settingsForm, address: e.target.value})} className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white transition-colors" placeholder="Пр. Ул. Партизанска бр. 10" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Телефонски број</label>
                    <input type="text" value={settingsForm.phone} onChange={e => setSettingsForm({...settingsForm, phone: e.target.value})} className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white transition-colors" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Жиро сметка</label>
                    <input type="text" value={settingsForm.bank_account} onChange={e => setSettingsForm({...settingsForm, bank_account: e.target.value})} className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white transition-colors" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Лозинка</label>
                    <input type="text" value={settingsForm.password} onChange={e => setSettingsForm({...settingsForm, password: e.target.value})} className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white transition-colors" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Лого</label>
                    <div className="flex gap-2">
                      <input type="text" value={settingsForm.logo_url} onChange={e => setSettingsForm({...settingsForm, logo_url: e.target.value})} className="flex-1 p-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white transition-colors" placeholder="https://..." />
                      <label className="cursor-pointer bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 px-4 py-3 rounded-xl font-bold transition-colors flex items-center gap-2">
                        <Upload size={18} />
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'logo_url')} />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Насловна фотографија (Cover)</label>
                    <div className="flex gap-2">
                      <input type="text" value={settingsForm.cover_url} onChange={e => setSettingsForm({...settingsForm, cover_url: e.target.value})} className="flex-1 p-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white transition-colors" placeholder="https://..." />
                      <label className="cursor-pointer bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 px-4 py-3 rounded-xl font-bold transition-colors flex items-center gap-2">
                        <Upload size={18} />
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'cover_url')} />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">HEADER PHOTO</label>
                    <div className="flex gap-2">
                      <input type="text" value={settingsForm.header_image} onChange={e => setSettingsForm({...settingsForm, header_image: e.target.value})} className="flex-1 p-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white transition-colors" placeholder="https://..." />
                      <label className="cursor-pointer bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 px-4 py-3 rounded-xl font-bold transition-colors flex items-center gap-2">
                        <Upload size={18} />
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'header_image')} />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Географска ширина (Latitude)</label>
                    <input type="text" value={settingsForm.spare_1} onChange={e => setSettingsForm({...settingsForm, spare_1: e.target.value})} className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white transition-colors" placeholder="Пр. 41.9981" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Географска должина (Longitude)</label>
                    <input type="text" value={settingsForm.spare_2} onChange={e => setSettingsForm({...settingsForm, spare_2: e.target.value})} className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white transition-colors" placeholder="Пр. 21.4254" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Поштенски број</label>
                    <input type="text" value={settingsForm.spare_3} onChange={e => setSettingsForm({...settingsForm, spare_3: e.target.value})} className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white transition-colors" placeholder="Пр. 1000" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Резервно поле 4</label>
                    <input type="text" value={settingsForm.spare_4} onChange={e => setSettingsForm({...settingsForm, spare_4: e.target.value})} className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white transition-colors" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                      <Clock size={18} className="text-red-500" />
                      Работно време
                    </label>
                    <div className="space-y-3">
                      {[
                        { key: 'monday', label: 'Понеделник' },
                        { key: 'tuesday', label: 'Вторник' },
                        { key: 'wednesday', label: 'Среда' },
                        { key: 'thursday', label: 'Четврток' },
                        { key: 'friday', label: 'Петок' },
                        { key: 'saturday', label: 'Сабота' },
                        { key: 'sunday', label: 'Недела' }
                      ].map((day) => {
                        let hours = { active: true, open: '08:00', close: '22:00' };
                        try {
                          const parsed = JSON.parse(settingsForm.working_hours || '{}');
                          if (parsed[day.key]) {
                            hours = { 
                              active: parsed[day.key].active !== undefined ? parsed[day.key].active : true,
                              open: parsed[day.key].open || parsed[day.key].start || '08:00',
                              close: parsed[day.key].close || parsed[day.key].end || '22:00'
                            };
                          }
                        } catch (e) {}

                        const updateDay = (updates: any) => {
                          try {
                            const current = JSON.parse(settingsForm.working_hours || '{}');
                            current[day.key] = { ...hours, ...updates };
                            setSettingsForm({ ...settingsForm, working_hours: JSON.stringify(current) });
                          } catch (e) {
                            const current: any = {};
                            current[day.key] = { ...hours, ...updates };
                            setSettingsForm({ ...settingsForm, working_hours: JSON.stringify(current) });
                          }
                        };

                        return (
                          <div key={day.key} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors">
                            <span className="font-bold text-slate-700 dark:text-slate-300 w-32">{day.label}</span>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <input 
                                  type="time" 
                                  value={hours.open} 
                                  disabled={!hours.active}
                                  onChange={(e) => updateDay({ open: e.target.value })}
                                  className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none disabled:opacity-50 bg-white dark:bg-slate-800 text-slate-800 dark:text-white transition-colors"
                                />
                                <span className="text-slate-400 dark:text-slate-600">-</span>
                                <input 
                                  type="time" 
                                  value={hours.close} 
                                  disabled={!hours.active}
                                  onChange={(e) => updateDay({ close: e.target.value })}
                                  className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none disabled:opacity-50 bg-white dark:bg-slate-800 text-slate-800 dark:text-white transition-colors"
                                />
                              </div>
                              <input 
                                type="checkbox" 
                                checked={hours.active} 
                                onChange={(e) => updateDay({ active: e.target.checked })}
                                className="w-5 h-5 rounded text-red-600 focus:ring-red-500 cursor-pointer bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <button type="submit" disabled={isSavingSettings} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-70 shadow-lg shadow-red-200 dark:shadow-none">
                    <Save size={20} />
                    {isSavingSettings ? 'Се зачувува...' : 'Зачувај поставки'}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-red-100 dark:border-slate-800 p-6 transition-colors">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <MapPin className="text-red-500" />
                Зони на достава
              </h2>
              
              {loggedInRestaurant.has_own_delivery === 1 ? (
                <>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    Нацртајте ги зоните каде што вршите достава. Можете да додадете повеќе зони (на пример, за различни населби). 
                    Секоја нова зона ќе добие различна боја.
                  </p>
                  
                  <div className="mb-6">
                    <DeliveryZoneMap 
                      zones={deliveryZones} 
                      setZones={setDeliveryZones} 
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <button 
                      onClick={handleSaveZones}
                      disabled={isSavingZones}
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-70 shadow-lg shadow-red-200 dark:shadow-none"
                    >
                      <Save size={20} />
                      {isSavingZones ? 'Се зачувува...' : 'Зачувај зони'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 transition-colors">
                  <p>Вашиот ресторан не врши сопствена достава. Оваа опција е исклучена.</p>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'menu' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2 transition-colors">
                <MenuSquare className="text-red-500" />
                Управување со Мени
              </h2>
              <button 
                onClick={() => {
                  if (isAdding) {
                    setIsAdding(false);
                    setEditingId(null);
                    setNewItem(initialNewItem);
                  } else {
                    setIsAdding(true);
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-lg shadow-red-200 dark:shadow-none"
              >
                {isAdding ? 'Откажи' : <><Plus size={20} /> Додади продукт</>}
              </button>
            </div>

            {isAdding && (
              <form onSubmit={handleAddItem} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-red-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 transition-colors">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Име на продукт</label>
                    <input required type="text" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white transition-colors" placeholder="на пр. Капричиоза" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Опис / Состојки</label>
                    <textarea required value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white transition-colors" placeholder="на пр. Печурки, кашкавал..." rows={3}></textarea>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Цена (ден.)</label>
                      <input required type="number" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white transition-colors" placeholder="350" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Категорија</label>
                      <input required type="text" list="categories" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white transition-colors" placeholder="на пр. Храна" />
                      <datalist id="categories">
                        <option value="Храна" />
                        <option value="Пијалоци" />
                        <option value="Додатоци" />
                      </datalist>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Подкатегорија</label>
                    <input required type="text" list="subcategories" value={newItem.subcategory} onChange={e => setNewItem({...newItem, subcategory: e.target.value})} className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white transition-colors" placeholder="на пр. Пица, Салата, Сосови" />
                    <datalist id="subcategories">
                      <option value="Пица" />
                      <option value="Паста" />
                      <option value="Салата" />
                      <option value="Сосови" />
                      <option value="Безалкохолни" />
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Слика - Опционално</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
                        <input type="text" value={newItem.image_url} onChange={e => setNewItem({...newItem, image_url: e.target.value})} className="w-full pl-10 p-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white transition-colors" placeholder="https://..." />
                      </div>
                      <label className="cursor-pointer bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 px-4 py-3 rounded-xl font-bold transition-colors flex items-center gap-2">
                        <Upload size={18} />
                        <input type="file" accept="image/*" className="hidden" onChange={handleItemImageUpload} />
                      </label>
                    </div>
                  </div>
                  
                  {/* Modifiers Section */}
                  <div className="col-span-1 md:col-span-2 border-t border-slate-100 dark:border-slate-800 pt-8 mt-4 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2 transition-colors">
                          <Settings2 className="text-red-500" size={24} />
                          Опции и Додатоци
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Додадете варијации (пр. Големина) или екстра додатоци (пр. Кашкавал)</p>
                      </div>
                      <button type="button" onClick={addModifierGroup} className="bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 whitespace-nowrap">
                        <Plus size={18} /> Нова Група
                      </button>
                    </div>
                    
                    <div className="space-y-6">
                      {newItem.modifiers.map((group, gIndex) => (
                        <div key={gIndex} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border-2 border-slate-100 dark:border-slate-700 shadow-sm relative group/group transition-colors">
                          <button 
                            type="button" 
                            onClick={() => removeModifierGroup(gIndex)} 
                            className="absolute -top-3 -right-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-full transition-all shadow-sm opacity-0 group-hover/group:opacity-100"
                            title="Избриши група"
                          >
                            <X size={16} />
                          </button>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 transition-colors">Име на група</label>
                              <input 
                                type="text" 
                                value={group.name} 
                                onChange={e => updateModifierGroup(gIndex, 'name', e.target.value)} 
                                placeholder="пр. Избор на големина" 
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-red-500 outline-none font-medium text-slate-800 dark:text-white transition-colors" 
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 transition-colors">Тип на избор</label>
                              <select 
                                value={group.type} 
                                onChange={e => updateModifierGroup(gIndex, 'type', e.target.value)} 
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-red-500 outline-none font-medium text-slate-800 dark:text-white cursor-pointer transition-colors"
                              >
                                <option value="single">Еден избор (Задолжително)</option>
                                <option value="multiple">Повеќе избори (Опционално)</option>
                              </select>
                            </div>
                          </div>
                          
                          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">Опции во оваа група</label>
                              <span className="text-xs font-medium text-slate-400 dark:text-slate-500 transition-colors">{group.options.length} опции</span>
                            </div>
                            
                            <div className="space-y-3">
                              {group.options.map((opt, oIndex) => (
                                <div key={oIndex} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 group/option transition-colors">
                                  <div className="flex-1 w-full">
                                    <input 
                                      type="text" 
                                      value={opt.name} 
                                      onChange={e => updateModifierOption(gIndex, oIndex, 'name', e.target.value)} 
                                      placeholder="Име на опција (пр. Мала)" 
                                      className="w-full p-2 bg-transparent border-none focus:ring-0 outline-none text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:font-normal transition-colors" 
                                    />
                                  </div>
                                  <div className="flex items-center gap-2 w-full sm:w-auto pl-2 sm:pl-0 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-700 pt-2 sm:pt-0 transition-colors">
                                    <span className="text-sm font-bold text-slate-400 dark:text-slate-500 pl-2 transition-colors">+</span>
                                    <input 
                                      type="number" 
                                      value={opt.price} 
                                      onChange={e => updateModifierOption(gIndex, oIndex, 'price', parseFloat(e.target.value) || 0)} 
                                      placeholder="0" 
                                      className="w-20 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-red-500 outline-none text-sm font-bold text-slate-700 dark:text-white text-right transition-colors" 
                                    />
                                    <span className="text-sm font-bold text-slate-400 dark:text-slate-500 pr-2 transition-colors">ден.</span>
                                    <button 
                                      type="button" 
                                      onClick={() => removeModifierOption(gIndex, oIndex)} 
                                      className="text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 p-2 rounded-lg transition-colors sm:opacity-0 group-hover/option:opacity-100"
                                      title="Избриши опција"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              
                              <button 
                                type="button" 
                                onClick={() => addModifierOption(gIndex)} 
                                className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-all flex items-center justify-center gap-2"
                              >
                                <Plus size={16} /> Додади нова опција
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {newItem.modifiers.length === 0 && (
                        <div className="text-center py-10 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 transition-colors">
                          <Settings2 className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={32} />
                          <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors">Немате додадено опции за овој продукт.</p>
                          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 transition-colors">Продуктот ќе се продава само по основната цена.</p>
                          <button 
                            type="button" 
                            onClick={addModifierGroup} 
                            className="mt-4 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-bold text-sm flex items-center justify-center gap-1 mx-auto transition-colors"
                          >
                            <Plus size={16} /> Додади прва група на опции
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2 pt-6 mt-4 border-t border-slate-100 dark:border-slate-800 transition-colors">
                    <button type="submit" disabled={isAddingItem} className="w-full bg-slate-800 dark:bg-red-600 hover:bg-slate-900 dark:hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-slate-800/20 dark:shadow-none disabled:opacity-70 text-lg">
                      {isAddingItem ? 'Се зачувува...' : (editingId ? 'Зачувај промени' : 'Зачувај продукт')}
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menuItems.map(item => (
                <div key={item.id} className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 group flex flex-col transition-colors">
                  <div className="h-48 overflow-hidden relative bg-slate-100 dark:bg-slate-800 transition-colors">
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                    <div className="absolute top-3 right-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold text-slate-800 dark:text-white shadow-sm transition-colors">
                      {item.price} ден.
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white transition-colors">{item.name}</h3>
                      <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-md transition-colors">{item.category} &gt; {item.subcategory}</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 line-clamp-2 flex-1 transition-colors">{item.description}</p>
                    
                    {item.modifiers && item.modifiers.length > 0 && (
                      <div className="mb-4 flex flex-wrap gap-1">
                        {item.modifiers.map((mod, idx) => (
                          <span key={idx} className="text-[10px] font-medium bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 px-2 py-1 rounded border border-orange-100 dark:border-orange-900/30 transition-colors">
                            {mod.name} ({mod.options.length})
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-4 mt-auto transition-colors">
                      <button 
                        onClick={() => handleToggleAvailability(item.id)} 
                        className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${item.is_available === 0 ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}
                      >
                        {item.is_available === 0 ? <><X size={16} /> Нема на залиха</> : <><Check size={16} /> Достапно</>}
                      </button>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditItem(item)} className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium">
                          <Pencil size={16} /> Уреди
                        </button>
                        <button onClick={() => handleDeleteItem(item.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium">
                          <Trash2 size={16} /> Избриши
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {menuItems.length === 0 && !isAdding && (
                <div className="col-span-full text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 transition-colors">
                  <Pizza className="mx-auto mb-3 text-slate-300 dark:text-slate-600" size={32} />
                  <p>Вашето мени е празно. Додадете го првиот продукт!</p>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {activeTab === 'invoicing' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white transition-colors">Фактурирање</h2>
                <p className="text-slate-500 dark:text-slate-400">Преглед и управување со вашите фактури</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 transition-colors">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Број</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Период</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">За исплата</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Статус</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Акција</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {invoices.length > 0 ? (
                      invoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                            {invoice.invoice_number}
                          </td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                            {new Date(invoice.period_start).toLocaleDateString('mk-MK')} - {new Date(invoice.period_end).toLocaleDateString('mk-MK')}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                            {invoice.net_amount.toLocaleString()} ден.
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              invoice.status === 'Paid' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                              invoice.status === 'Approved' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                              invoice.status === 'Pending' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                              'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              {invoice.status === 'Draft' ? 'Предлог' :
                               invoice.status === 'Pending' ? 'Испратено' :
                               invoice.status === 'Approved' ? 'Одобрено' :
                               invoice.status === 'Paid' ? 'Платено' : invoice.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => viewInvoice(invoice)}
                              className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                            >
                              <Eye size={20} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center">
                          <Receipt className="mx-auto text-slate-200 dark:text-slate-700 mb-4" size={48} />
                          <p className="text-slate-500 dark:text-slate-400 font-medium">Сè уште немате генерирано фактури.</p>
                          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Фактурите ќе бидат видливи тука откако ќе бидат генерирани од администраторот.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white transition-colors">Рецензии од корисници</h2>
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
                <Star className="text-yellow-400 fill-yellow-400" size={20} />
                <span className="text-lg font-bold text-slate-800 dark:text-white transition-colors">
                  {reviews.length > 0 
                    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) 
                    : '0.0'}
                </span>
                <span className="text-slate-400 dark:text-slate-500 text-sm transition-colors">({reviews.length})</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reviews.map(review => (
                <div key={review.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-white transition-colors">{review.customer_name}</h3>
                      <p className="text-xs text-slate-400 dark:text-slate-500 transition-colors">{new Date(review.created_at).toLocaleDateString('mk-MK')}</p>
                    </div>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          size={16} 
                          className={i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200 dark:text-slate-700'} 
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 italic transition-colors">"{review.comment}"</p>
                </div>
              ))}
              {reviews.length === 0 && (
                <div className="col-span-full text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 transition-colors">
                  <Star className="mx-auto text-slate-200 dark:text-slate-700 mb-4" size={48} />
                  <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors">Сè уште немате рецензии.</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 transition-colors">Рецензиите се појавуваат откако корисниците ќе ги примат своите нарачки.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white transition-colors">Промотивни Кампањи</h2>
              <button 
                onClick={() => setIsAdding(prev => !prev)} 
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${isAdding ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20 dark:shadow-none'}`}
              >
                {isAdding ? <><X size={20} /> Затвори</> : <><Plus size={20} /> Побарај промоција</>}
              </button>
            </div>

            {isAdding && (
              <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-indigo-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-4 duration-300 transition-colors">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6 transition-colors">Барање за нова промотивна кампања</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30 transition-colors">
                  <strong>Напомена:</strong> Секое барање за промоција мора да биде одобрено од администраторот пред да стане активно.
                </p>
                
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const formData = new FormData(form);
                  const payload = {
                    name: formData.get('name'),
                    description: formData.get('description'),
                    budget: parseFloat(formData.get('budget') as string),
                    quantity: parseInt(formData.get('quantity') as string),
                    start_date: formData.get('start_date'),
                    end_date: formData.get('end_date'),
                    restaurant_id: loggedInRestaurant.id
                  };
                  
                  const res = await fetch('/api/campaigns/request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                  });
                  
                  if (res.ok) {
                    alert('Барањето е успешно испратено до администраторот!');
                    setIsAdding(false);
                    fetchCampaigns();
                  }
                }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 transition-colors">Име на кампања</label>
                      <input name="name" required type="text" className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-white transition-colors" placeholder="пр. Викенд Попуст" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 transition-colors">Опис</label>
                      <textarea name="description" required className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 h-24 bg-white dark:bg-slate-800 text-slate-800 dark:text-white transition-colors" placeholder="Опис на промоцијата..." />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 transition-colors">Буџет (ден.)</label>
                        <input name="budget" required type="number" className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-white transition-colors" placeholder="5000" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 transition-colors">Број на купони</label>
                        <input name="quantity" required type="number" className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-white transition-colors" placeholder="50" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 transition-colors">Почеток</label>
                        <input name="start_date" required type="date" className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-white transition-colors" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 transition-colors">Крај</label>
                        <input name="end_date" required type="date" className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-white transition-colors" />
                      </div>
                    </div>
                  </div>
                  <div className="col-span-full pt-4">
                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-600/20 dark:shadow-none">
                      Испрати барање за одобрување
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map(campaign => (
                <div key={campaign.id} className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col transition-colors">
                  <div className={`p-4 text-center text-xs font-bold uppercase tracking-wider transition-colors ${
                    campaign.status === 'active' ? 'bg-emerald-500 text-white' : 
                    campaign.status === 'pending' ? 'bg-amber-500 text-white' : 
                    'bg-slate-500 dark:bg-slate-700 text-white'
                  }`}>
                    {campaign.status === 'active' ? 'Активна' : 
                     campaign.status === 'pending' ? 'Чека одобрување' : 
                     'Завршена/Одбиена'}
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2 transition-colors">{campaign.name}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 flex-1 transition-colors">{campaign.description}</p>
                    
                    <div className="space-y-3 pt-4 border-t border-slate-50 dark:border-slate-800 transition-colors">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400 dark:text-slate-500 transition-colors">Буџет:</span>
                        <span className="font-bold text-slate-800 dark:text-white transition-colors">{campaign.budget} ден.</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400 dark:text-slate-500 transition-colors">Купони:</span>
                        <span className="font-bold text-slate-800 dark:text-white transition-colors">{campaign.quantity}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400 dark:text-slate-500 transition-colors">Период:</span>
                        <span className="font-medium text-slate-600 dark:text-slate-300 transition-colors">{new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {campaigns.length === 0 && !isAdding && (
                <div className="col-span-full text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 transition-colors">
                  <Target className="mx-auto text-slate-200 dark:text-slate-700 mb-4" size={48} />
                  <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors">Сè уште немате побарано промоции.</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 transition-colors">Промоциите ви помагаат да привлечете повеќе корисници.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Invoice Detail Modal */}
      {isInvoiceModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col transition-colors">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 transition-colors">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Фактура {selectedInvoice.invoice_number}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Период: {new Date(selectedInvoice.period_start).toLocaleDateString('mk-MK')} - {new Date(selectedInvoice.period_end).toLocaleDateString('mk-MK')}
                </p>
              </div>
              <button 
                onClick={() => {
                  setIsInvoiceModalOpen(false);
                  setSelectedInvoice(null);
                }}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X size={24} className="text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Од: PizzaTime</h4>
                  <div className="space-y-1 text-slate-700 dark:text-slate-300">
                    <p className="font-bold">PizzaTime DOOEL</p>
                    <p>ЕДБ: 4030020000000</p>
                    <p>Адреса: Бул. Партизански Одреди 1</p>
                    <p>Скопје, Македонија</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">До: {selectedInvoice.restaurant_name}</h4>
                  <div className="space-y-1 text-slate-700 dark:text-slate-300">
                    <p className="font-bold">{selectedInvoice.restaurant_name}</p>
                    <p>Адреса: {selectedInvoice.restaurant_address}</p>
                    <p>Град: {selectedInvoice.restaurant_city}</p>
                    <p>Сметка: {selectedInvoice.restaurant_bank_account}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 mb-8 transition-colors">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Вкупно промет</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{selectedInvoice.total_amount.toLocaleString()} ден.</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Провизија ({selectedInvoice.contract_percentage}%)</p>
                    <p className="text-lg font-bold text-red-600">-{selectedInvoice.commission_amount.toLocaleString()} ден.</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">ДДВ ({selectedInvoice.vat_rate}%)</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{selectedInvoice.vat_amount.toLocaleString()} ден.</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">За исплата</p>
                    <p className="text-lg font-bold text-emerald-600">{selectedInvoice.net_amount.toLocaleString()} ден.</p>
                  </div>
                </div>
              </div>

              <h4 className="font-bold text-slate-800 dark:text-white mb-4">Листа на нарачки</h4>
              <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden transition-colors">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 transition-colors">
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">ID</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Датум</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase text-right">Износ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedInvoice.orders?.map((order: any) => (
                      <tr key={order.id}>
                        <td className="px-4 py-3 text-sm font-mono text-slate-600 dark:text-slate-400">#{order.id}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{new Date(order.created_at).toLocaleDateString('mk-MK')}</td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-slate-900 dark:text-white">{order.total_price.toLocaleString()} ден.</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end gap-4 transition-colors">
              <button 
                onClick={() => {
                  setIsInvoiceModalOpen(false);
                  setSelectedInvoice(null);
                }}
                className="px-6 py-2 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Затвори
              </button>
              {selectedInvoice.status === 'Pending' && (
                <button 
                  onClick={() => handleUpdateInvoiceStatus(selectedInvoice.id, 'Approved')}
                  className="px-8 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                >
                  Одобри фактура
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
