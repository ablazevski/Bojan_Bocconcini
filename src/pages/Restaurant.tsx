import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Pizza, Clock, CheckCircle, Plus, Trash2, Image as ImageIcon, MenuSquare, Settings2, Pencil, MapPin, Save, LogOut, X } from 'lucide-react';
import DeliveryZoneMap from '../components/DeliveryZoneMap';

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
  delivery_partner_name?: string;
  created_at: string;
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

export default function Restaurant() {
  const [loggedInRestaurant, setLoggedInRestaurant] = useState<any>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'settings'>('orders');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deliveryZones, setDeliveryZones] = useState<[number, number][][]>([]);
  const [isSavingZones, setIsSavingZones] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [orderView, setOrderView] = useState<'active' | 'completed'>('active');
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
  const maxOrderIdRef = useRef<number>(0);

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
  const [settingsForm, setSettingsForm] = useState({
    password: '',
    phone: '',
    bank_account: '',
    logo_url: '',
    city: '',
    address: '',
    spare_1: '',
    spare_2: '',
    spare_3: '',
    spare_4: ''
  });

  useEffect(() => {
    if (loggedInRestaurant) {
      setSettingsForm({
        password: loggedInRestaurant.password || '',
        phone: loggedInRestaurant.phone || '',
        bank_account: loggedInRestaurant.bank_account || '',
        logo_url: loggedInRestaurant.logo_url || '',
        city: loggedInRestaurant.city || '',
        address: loggedInRestaurant.address || '',
        spare_1: loggedInRestaurant.spare_1 || '',
        spare_2: loggedInRestaurant.spare_2 || '',
        spare_3: loggedInRestaurant.spare_3 || '',
        spare_4: loggedInRestaurant.spare_4 || ''
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
      
      const interval = setInterval(() => {
        fetchOrders(true);
      }, 10000);
      
      return () => clearInterval(interval);
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

  const fetchOrders = async (isBackground = false) => {
    if (!loggedInRestaurant) return;
    const res = await fetch(`/api/orders/${loggedInRestaurant.id}`);
    const data = await res.json();
    
    if (data.length > 0) {
      const currentMaxId = Math.max(...data.map((o: any) => o.id));
      if (isBackground && maxOrderIdRef.current > 0 && currentMaxId > maxOrderIdRef.current) {
        playNotificationSound();
      }
      maxOrderIdRef.current = currentMaxId;
    }
    setOrders(data);
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
      <div className="min-h-screen bg-red-50/30 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-red-100 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MenuSquare size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Најава за Ресторани</h1>
            <p className="text-slate-500 mt-2">Внесете ги податоците добиени од администраторот</p>
          </div>

          {loginError && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium mb-6 border border-red-100 text-center">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Корисничко име</label>
              <input 
                required 
                type="text" 
                value={loginForm.username} 
                onChange={e => setLoginForm({...loginForm, username: e.target.value})} 
                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" 
                placeholder="пр. rest_1_a1b2" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Лозинка</label>
              <input 
                required 
                type="password" 
                value={loginForm.password} 
                onChange={e => setLoginForm({...loginForm, password: e.target.value})} 
                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" 
                placeholder="••••••••" 
              />
            </div>
            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors mt-4">
              Најави се
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <Link to="/" className="text-slate-500 hover:text-slate-800 text-sm font-medium flex items-center justify-center gap-2">
              <ArrowLeft size={16} /> Назад кон почетна
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-red-50/30">
      <header className="bg-white border-b border-red-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-red-50 rounded-full text-red-500 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{loggedInRestaurant.name}</h1>
            <p className="text-xs text-slate-500">Ресторан Панел</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'orders' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Нарачки
            </button>
            <button 
              onClick={() => setActiveTab('menu')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'menu' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Мени
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Поставки
            </button>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors" title="Одјави се">
            <LogOut size={18} />
            <span className="hidden sm:inline">Одјави се</span>
          </button>
        </div>
      </header>
      
      {/* Mobile Tabs */}
      <div className="md:hidden bg-white border-b border-red-100 p-2 flex gap-2">
        <button 
          onClick={() => setActiveTab('orders')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'orders' ? 'bg-red-50 text-red-600' : 'text-slate-500'}`}
        >
          Нарачки
        </button>
        <button 
          onClick={() => setActiveTab('menu')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'menu' ? 'bg-red-50 text-red-600' : 'text-slate-500'}`}
        >
          Мени
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-red-50 text-red-600' : 'text-slate-500'}`}
        >
          Поставки
        </button>
      </div>
      
      <main className="max-w-6xl mx-auto p-6">
        {activeTab === 'orders' ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Clock className="text-orange-500" />
                Нарачки
              </h2>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setOrderView('active')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${orderView === 'active' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Во тек
                </button>
                <button
                  onClick={() => setOrderView('completed')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${orderView === 'completed' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Завршени
                </button>
              </div>
            </div>
            
            {(() => {
              const filteredOrders = orders.filter(o => 
                orderView === 'active' 
                  ? ['pending', 'accepted', 'delivering'].includes(o.status)
                  : ['completed', 'rejected', 'cancelled'].includes(o.status)
              );
              
              if (filteredOrders.length === 0) {
                return (
                  <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-8 text-center">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Pizza size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Нема нарачки</h2>
                    <p className="text-slate-500">Моментално немате {orderView === 'active' ? 'активни' : 'завршени'} нарачки.</p>
                  </div>
                );
              }
              
              return (
                <div className="grid gap-6">
                  {filteredOrders.map(order => {
                    const items = JSON.parse(order.items);
                    const isExpanded = expandedOrders.has(order.id);
                    return (
                      <div key={order.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div 
                          className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer ${isExpanded ? 'mb-6 pb-4 border-b border-slate-100' : ''}`}
                          onClick={() => toggleOrderExpansion(order.id)}
                        >
                        <div>
                          <h3 className="font-bold text-lg text-slate-800">Нарачка #{order.id}</h3>
                          <p className="text-sm text-slate-500">{new Date(order.created_at).toLocaleString()}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center" onClick={e => e.stopPropagation()}>
                          {[
                            { id: 'pending', label: 'Чека потврда', color: 'yellow' },
                            { id: 'accepted', label: 'Се подготвува', color: 'blue' },
                            { id: 'delivering', label: 'Се доставува', color: 'purple' },
                            { id: 'completed', label: 'Доставена', color: 'green' }
                          ].map((s, idx, arr) => {
                            const isCurrent = order.status === s.id;
                            const isPast = arr.findIndex(x => x.id === order.status) > idx;
                            const isNext = arr.findIndex(x => x.id === order.status) === idx - 1;
                            const isDisabled = !isNext && !isCurrent && !isPast;
                            
                            const colorClasses: Record<string, string> = {
                              yellow: isCurrent ? 'bg-yellow-500 text-white border-yellow-600' : isPast ? 'bg-yellow-50 text-yellow-400 border-yellow-100' : isNext ? 'bg-white text-yellow-600 border-yellow-200 hover:bg-yellow-50' : 'bg-slate-50 text-slate-300 border-slate-100',
                              blue: isCurrent ? 'bg-blue-500 text-white border-blue-600' : isPast ? 'bg-blue-50 text-blue-400 border-blue-100' : isNext ? 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50' : 'bg-slate-50 text-slate-300 border-slate-100',
                              purple: isCurrent ? 'bg-purple-500 text-white border-purple-600' : isPast ? 'bg-purple-50 text-purple-400 border-purple-100' : isNext ? 'bg-white text-purple-600 border-purple-200 hover:bg-purple-50' : 'bg-slate-50 text-slate-300 border-slate-100',
                              green: isCurrent ? 'bg-green-500 text-white border-green-600' : isPast ? 'bg-green-50 text-green-400 border-green-100' : isNext ? 'bg-white text-green-600 border-green-200 hover:bg-green-50' : 'bg-slate-50 text-slate-300 border-slate-100',
                            };
                            
                            return (
                              <button
                                key={s.id}
                                disabled={isDisabled || isPast || order.status === 'cancelled'}
                                onClick={() => updateOrderStatus(order.id, s.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${colorClasses[s.color]}`}
                              >
                                {s.label}
                              </button>
                            );
                          })}
                          <button
                            disabled={order.status === 'completed' || order.status === 'cancelled'}
                            onClick={() => updateOrderStatus(order.id, 'cancelled')}
                            className={`ml-auto px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                              order.status === 'cancelled' ? 'bg-red-500 text-white border-red-600' : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                            }`}
                          >
                            Откажи
                          </button>
                          <div className="ml-2 text-slate-400">
                            {isExpanded ? '▲' : '▼'}
                          </div>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <>
                          {order.delivery_code && (
                            <div className="mb-6 p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs overflow-x-auto border-l-4 border-orange-500">
                              <div className="flex justify-between items-start mb-2">
                                <p className="text-orange-400 font-bold uppercase tracking-wider">Генериран код за достава:</p>
                                {order.delivery_partner_name && (
                                  <div className="text-right">
                                    <p className="text-emerald-400 font-bold uppercase tracking-wider">Доставувач:</p>
                                    <p className="text-white">{order.delivery_partner_name}</p>
                                  </div>
                                )}
                              </div>
                              <pre>{JSON.stringify(JSON.parse(order.delivery_code), null, 2)}</pre>
                            </div>
                          )}
                          
                          <div className="grid md:grid-cols-2 gap-8">
                            <div>
                              <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Информации за клиент</h4>
                              <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <p className="font-bold text-slate-800">{order.customer_name}</p>
                                <p className="text-slate-600 flex items-center gap-2">
                                  <span className="w-5 h-5 bg-white rounded flex items-center justify-center border border-slate-200 text-xs">📞</span>
                                  {order.customer_phone}
                                </p>
                                <p className="text-slate-600 flex items-center gap-2">
                                  <span className="w-5 h-5 bg-white rounded flex items-center justify-center border border-slate-200 text-xs">📍</span>
                                  {order.delivery_address}
                                </p>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Содржина на нарачка</h4>
                              <ul className="space-y-3 mb-4">
                                {items.map((item: any, idx: number) => (
                                  <li key={idx} className="text-sm bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div className="flex justify-between font-bold text-slate-800 mb-1">
                                      <span>1x {item.name}</span>
                                      <span className="text-orange-600">{item.finalPrice} ден.</span>
                                    </div>
                                    {Object.entries(item.selectedModifiers || {}).map(([group, sel]: [string, any]) => {
                                      if (Array.isArray(sel) && sel.length > 0) return <div key={group} className="text-xs text-slate-500 flex gap-1"><span className="font-medium">{group}:</span> {sel.join(', ')}</div>;
                                      if (typeof sel === 'string' && sel) return <div key={group} className="text-xs text-slate-500 flex gap-1"><span className="font-medium">{group}:</span> {sel}</div>;
                                      return null;
                                    })}
                                  </li>
                                ))}
                              </ul>
                              <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-auto">
                                <span className="font-bold text-slate-600">Вкупно за наплата:</span>
                                <span className="text-2xl font-extrabold text-slate-800">{order.total_price} ден.</span>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            );
            })()}
          </div>
        ) : activeTab === 'settings' ? (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Settings2 className="text-red-500" />
                Основни поставки
              </h2>
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Град *</label>
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
                      className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none bg-white"
                    >
                      <option value="" disabled>Изберете град</option>
                      {MACEDONIAN_CITIES.map(city => (
                        <option key={city.name} value={city.name}>{city.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Адреса *</label>
                    <input type="text" required value={settingsForm.address} onChange={e => setSettingsForm({...settingsForm, address: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" placeholder="Пр. Ул. Партизанска бр. 10" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Телефонски број</label>
                    <input type="text" value={settingsForm.phone} onChange={e => setSettingsForm({...settingsForm, phone: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Жиро сметка</label>
                    <input type="text" value={settingsForm.bank_account} onChange={e => setSettingsForm({...settingsForm, bank_account: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Лозинка</label>
                    <input type="text" value={settingsForm.password} onChange={e => setSettingsForm({...settingsForm, password: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Лого URL</label>
                    <input type="text" value={settingsForm.logo_url} onChange={e => setSettingsForm({...settingsForm, logo_url: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" placeholder="https://..." />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Географска ширина (Latitude)</label>
                    <input type="text" value={settingsForm.spare_1} onChange={e => setSettingsForm({...settingsForm, spare_1: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" placeholder="Пр. 41.9981" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Географска должина (Longitude)</label>
                    <input type="text" value={settingsForm.spare_2} onChange={e => setSettingsForm({...settingsForm, spare_2: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" placeholder="Пр. 21.4254" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Поштенски број</label>
                    <input type="text" value={settingsForm.spare_3} onChange={e => setSettingsForm({...settingsForm, spare_3: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" placeholder="Пр. 1000" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Резервно поле 4</label>
                    <input type="text" value={settingsForm.spare_4} onChange={e => setSettingsForm({...settingsForm, spare_4: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <button type="submit" disabled={isSavingSettings} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-70">
                    <Save size={20} />
                    {isSavingSettings ? 'Се зачувува...' : 'Зачувај поставки'}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <MapPin className="text-red-500" />
                Зони на достава
              </h2>
              
              {loggedInRestaurant.has_own_delivery === 1 ? (
                <>
                  <p className="text-slate-600 mb-4">
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
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-70"
                    >
                      <Save size={20} />
                      {isSavingZones ? 'Се зачувува...' : 'Зачувај зони'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p>Вашиот ресторан не врши сопствена достава. Оваа опција е исклучена.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
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
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors"
              >
                {isAdding ? 'Откажи' : <><Plus size={20} /> Додади продукт</>}
              </button>
            </div>

            {isAdding && (
              <form onSubmit={handleAddItem} className="bg-white p-6 rounded-2xl shadow-sm border border-red-100 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Име на продукт</label>
                    <input required type="text" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" placeholder="на пр. Капричиоза" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Опис / Состојки</label>
                    <textarea required value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" placeholder="на пр. Печурки, кашкавал..." rows={3}></textarea>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Цена (ден.)</label>
                      <input required type="number" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" placeholder="350" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Категорија</label>
                      <input required type="text" list="categories" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" placeholder="на пр. Храна" />
                      <datalist id="categories">
                        <option value="Храна" />
                        <option value="Пијалоци" />
                        <option value="Додатоци" />
                      </datalist>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Подкатегорија</label>
                    <input required type="text" list="subcategories" value={newItem.subcategory} onChange={e => setNewItem({...newItem, subcategory: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" placeholder="на пр. Пица, Салата, Сосови" />
                    <datalist id="subcategories">
                      <option value="Пица" />
                      <option value="Паста" />
                      <option value="Салата" />
                      <option value="Сосови" />
                      <option value="Безалкохолни" />
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Слика (URL) - Опционално</label>
                    <div className="relative">
                      <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input type="url" value={newItem.image_url} onChange={e => setNewItem({...newItem, image_url: e.target.value})} className="w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" placeholder="https://..." />
                    </div>
                  </div>
                  
                  {/* Modifiers Section */}
                  <div className="col-span-1 md:col-span-2 border-t border-slate-100 pt-8 mt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                          <Settings2 className="text-red-500" size={24} />
                          Опции и Додатоци
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">Додадете варијации (пр. Големина) или екстра додатоци (пр. Кашкавал)</p>
                      </div>
                      <button type="button" onClick={addModifierGroup} className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 whitespace-nowrap">
                        <Plus size={18} /> Нова Група
                      </button>
                    </div>
                    
                    <div className="space-y-6">
                      {newItem.modifiers.map((group, gIndex) => (
                        <div key={gIndex} className="bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-sm relative group/group">
                          <button 
                            type="button" 
                            onClick={() => removeModifierGroup(gIndex)} 
                            className="absolute -top-3 -right-3 bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 p-1.5 rounded-full transition-all shadow-sm opacity-0 group-hover/group:opacity-100"
                            title="Избриши група"
                          >
                            <X size={16} />
                          </button>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Име на група</label>
                              <input 
                                type="text" 
                                value={group.name} 
                                onChange={e => updateModifierGroup(gIndex, 'name', e.target.value)} 
                                placeholder="пр. Избор на големина" 
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 outline-none font-medium text-slate-800" 
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Тип на избор</label>
                              <select 
                                value={group.type} 
                                onChange={e => updateModifierGroup(gIndex, 'type', e.target.value)} 
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 outline-none font-medium text-slate-800 cursor-pointer"
                              >
                                <option value="single">Еден избор (Задолжително)</option>
                                <option value="multiple">Повеќе избори (Опционално)</option>
                              </select>
                            </div>
                          </div>
                          
                          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <div className="flex items-center justify-between mb-3">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Опции во оваа група</label>
                              <span className="text-xs font-medium text-slate-400">{group.options.length} опции</span>
                            </div>
                            
                            <div className="space-y-3">
                              {group.options.map((opt, oIndex) => (
                                <div key={oIndex} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white p-2 rounded-lg border border-slate-200 group/option">
                                  <div className="flex-1 w-full">
                                    <input 
                                      type="text" 
                                      value={opt.name} 
                                      onChange={e => updateModifierOption(gIndex, oIndex, 'name', e.target.value)} 
                                      placeholder="Име на опција (пр. Мала)" 
                                      className="w-full p-2 bg-transparent border-none focus:ring-0 outline-none text-sm font-medium text-slate-700 placeholder:font-normal" 
                                    />
                                  </div>
                                  <div className="flex items-center gap-2 w-full sm:w-auto pl-2 sm:pl-0 border-t sm:border-t-0 sm:border-l border-slate-100 pt-2 sm:pt-0">
                                    <span className="text-sm font-bold text-slate-400 pl-2">+</span>
                                    <input 
                                      type="number" 
                                      value={opt.price} 
                                      onChange={e => updateModifierOption(gIndex, oIndex, 'price', parseFloat(e.target.value) || 0)} 
                                      placeholder="0" 
                                      className="w-20 p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-red-500 outline-none text-sm font-bold text-slate-700 text-right" 
                                    />
                                    <span className="text-sm font-bold text-slate-400 pr-2">ден.</span>
                                    <button 
                                      type="button" 
                                      onClick={() => removeModifierOption(gIndex, oIndex)} 
                                      className="text-slate-300 hover:text-red-500 p-2 rounded-lg transition-colors sm:opacity-0 group-hover/option:opacity-100"
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
                                className="w-full py-3 border-2 border-dashed border-slate-200 hover:border-red-300 hover:bg-red-50 rounded-lg text-sm font-bold text-slate-500 hover:text-red-600 transition-all flex items-center justify-center gap-2"
                              >
                                <Plus size={16} /> Додади нова опција
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {newItem.modifiers.length === 0 && (
                        <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                          <Settings2 className="mx-auto text-slate-300 mb-3" size={32} />
                          <p className="text-slate-500 font-medium">Немате додадено опции за овој продукт.</p>
                          <p className="text-sm text-slate-400 mt-1">Продуктот ќе се продава само по основната цена.</p>
                          <button 
                            type="button" 
                            onClick={addModifierGroup} 
                            className="mt-4 text-red-600 hover:text-red-700 font-bold text-sm flex items-center justify-center gap-1 mx-auto"
                          >
                            <Plus size={16} /> Додади прва група на опции
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2 pt-6 mt-4 border-t border-slate-100">
                    <button type="submit" disabled={isAddingItem} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-slate-800/20 disabled:opacity-70 text-lg">
                      {isAddingItem ? 'Се зачувува...' : (editingId ? 'Зачувај промени' : 'Зачувај продукт')}
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menuItems.map(item => (
                <div key={item.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 group flex flex-col">
                  <div className="h-48 overflow-hidden relative">
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold text-slate-800 shadow-sm">
                      {item.price} ден.
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-slate-800">{item.name}</h3>
                      <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{item.category} &gt; {item.subcategory}</span>
                    </div>
                    <p className="text-slate-500 text-sm mb-4 line-clamp-2 flex-1">{item.description}</p>
                    
                    {item.modifiers && item.modifiers.length > 0 && (
                      <div className="mb-4 flex flex-wrap gap-1">
                        {item.modifiers.map((mod, idx) => (
                          <span key={idx} className="text-[10px] font-medium bg-orange-50 text-orange-700 px-2 py-1 rounded border border-orange-100">
                            {mod.name} ({mod.options.length})
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-auto">
                      <button onClick={() => handleEditItem(item)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium">
                        <Pencil size={16} /> Уреди
                      </button>
                      <button onClick={() => handleDeleteItem(item.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium">
                        <Trash2 size={16} /> Избриши
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {menuItems.length === 0 && !isAdding && (
                <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-500">
                  <Pizza className="mx-auto mb-3 text-slate-300" size={32} />
                  <p>Вашето мени е празно. Додадете го првиот продукт!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
