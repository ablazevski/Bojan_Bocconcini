import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Map, Navigation, CheckCircle2, Phone, MapPin, Package, Bike, Settings, Clock, Save, Loader2, ExternalLink, DollarSign, Users, Users2, UserPlus, ChevronRight, BarChart2, Moon, Sun } from 'lucide-react';
import DeliveryRouteMap from '../components/DeliveryRouteMap';
import { io } from 'socket.io-client';
import { useTheme } from '../context/ThemeContext';

interface Order {
  id: number;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  status: string;
  delivery_code: string;
  restaurant_id: number;
  tracking_token?: string;
  spare_2?: string;
  ready_at?: string;
  total_price: number;
  payment_method: string;
  selected_fees: string;
  restaurant_name?: string;
  delivery_partner_id?: number;
  delivery_lat?: number;
  delivery_lng?: number;
}

function Countdown({ targetTime }: { targetTime: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const target = new Date(targetTime).getTime();
    
    const updateTimer = () => {
      const now = new Date().getTime();
      const difference = target - now;
      
      if (difference <= 0) {
        setTimeLeft('00:00');
        return;
      }
      
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      
      setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetTime]);

  const minutes = parseInt(timeLeft.split(':')[0]);
  const isUrgent = minutes < 5;

  return <span className={`font-mono font-black ${isUrgent ? 'text-red-600 animate-pulse' : ''}`}>{timeLeft}</span>;
}

export default function Delivery() {
  const { theme, toggleTheme } = useTheme();
  const [partner, setPartner] = useState<any>(null);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'orders' | 'settings' | 'team' | 'analytics' | 'earnings'>('orders');
  const [earnings, setEarnings] = useState<any[]>([]);
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [availableRestaurants, setAvailableRestaurants] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [team, setTeam] = useState<any[]>([]);
  const [teamOrders, setTeamOrders] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [creatingTest, setCreatingTest] = useState(false);

  const [editHours, setEditHours] = useState<any>({});
  const [editRestaurants, setEditRestaurants] = useState<number[]>([]);
  const [editMethods, setEditMethods] = useState<string[]>([]);

  useEffect(() => {
    if (partner) {
      setEditHours(JSON.parse(partner.working_hours || '{}'));
      setEditRestaurants(JSON.parse(partner.preferred_restaurants || '[]'));
      setEditMethods(JSON.parse(partner.delivery_methods || '[]'));
    }
  }, [partner]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('delivery_auth');
    if (saved) {
      const p = JSON.parse(saved);
      setPartner(p);
    }
  }, []);

  useEffect(() => {
    if (partner) {
      fetchOrders();
      fetchAvailableRestaurants();
      if (partner.role === 'lead') {
        fetchTeam();
        fetchTeamOrders();
        fetchAnalytics();
      }
      
      const socket = io();
      socket.emit('join_delivery', { 
        id: partner.id, 
        restaurantIds: partner.preferred_restaurants 
      });

      socket.on('new_available_order', () => {
        console.log('New available order notification received');
        fetchOrders();
        
        // Play sound
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log('Audio play failed:', e));

        // Browser notification
        if (Notification.permission === 'granted') {
          new Notification('Нова достапна нарачка!', {
            body: 'Има нова нарачка која чека доставувач. Проверете ја листата!',
            icon: '/logo.png'
          });
        }
      });

      socket.on('order_preparing', (data) => {
        console.log('Order preparing notification received:', data);
        fetchOrders();
        
        if (Notification.permission === 'granted') {
          const message = data.status === 'preparing' 
            ? `Нарачката #${data.orderId} се подготвува. Очекувано време: ${new Date(data.targetTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
            : `Нарачката #${data.orderId} е прифатена и се подготвува.`;
            
          new Notification('Подготовка на нарачка', {
            body: message,
            icon: '/logo.png'
          });
        }
      });

      socket.on('stale_order_reminder', (data) => {
        console.log('Stale order reminder received:', data);
        fetchOrders();
      });

      const interval = setInterval(fetchOrders, 30000); // Fallback
      
      // Real-time location tracking
      let locationInterval: NodeJS.Timeout;
      if ("geolocation" in navigator) {
        locationInterval = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              fetch('/api/delivery/location', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  partnerId: partner.id,
                  lat: latitude,
                  lng: longitude
                })
              }).catch(console.error);
            },
            (error) => console.error('Geolocation error:', error),
            { enableHighAccuracy: true }
          );
        }, 10000); // Update every 10 seconds
      }

      return () => {
        clearInterval(interval);
        if (locationInterval) clearInterval(locationInterval);
        socket.disconnect();
      };
    }
  }, [partner]);

  const fetchEarnings = async () => {
    if (!partner) return;
    setLoadingEarnings(true);
    try {
      const res = await fetch(`/api/delivery/earnings/${partner.id}`);
      const data = await res.json();
      setEarnings(data);
    } catch (e) {
      console.error('Failed to fetch earnings', e);
    } finally {
      setLoadingEarnings(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'earnings') {
      fetchEarnings();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'team') {
      fetchTeam();
      fetchTeamOrders();
    } else if (activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [activeTab]);

  const fetchTeam = async () => {
    if (!partner || partner.role !== 'lead') return;
    try {
      const res = await fetch(`/api/delivery/team/${partner.id}`);
      const data = await res.json();
      setTeam(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTeamOrders = async () => {
    if (!partner || partner.role !== 'lead') return;
    setLoadingTeam(true);
    try {
      const res = await fetch(`/api/delivery/team/${partner.id}/orders`);
      const data = await res.json();
      setTeamOrders(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTeam(false);
    }
  };

  const fetchAnalytics = async () => {
    if (!partner || partner.role !== 'lead') return;
    setLoadingAnalytics(true);
    try {
      const res = await fetch(`/api/delivery/team/${partner.id}/analytics`);
      const data = await res.json();
      setAnalytics(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleAssignOrder = async (orderId: number, partnerId: number, partnerName: string) => {
    try {
      const res = await fetch('/api/delivery/team/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, partnerId, partnerName })
      });
      if (res.ok) {
        fetchTeamOrders();
        fetchOrders();
        alert('Нарачката е успешно прераспределена!');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const createTestOrder = async () => {
    if (!partner) return;
    if (!isWorking) {
      alert("Моментално сте НЕАКТИВНИ според вашето работно време. Променете го работното време во Поставки (на пр. ставете 00:00 - 23:59) за да можете да ја видите тест нарачката.");
      return;
    }
    setCreatingTest(true);
    try {
      const restaurant = availableRestaurants.find(r => r.city === partner.city) || availableRestaurants[0];
      if (!restaurant) {
        alert("Нема ресторани во вашиот град за тест.");
        return;
      }

      const testOrder = {
        customer_name: "Тест Корисник",
        customer_email: "test@example.com",
        customer_phone: "070123456",
        delivery_address: "Тест Адреса 123, " + partner.city,
        delivery_lat: 41.9981,
        delivery_lng: 21.4254,
        items: [{
          id: 1,
          name: "Тест Оброк",
          price: 300,
          quantity: 1,
          restaurant_id: restaurant.id,
          finalPrice: 300
        }],
        payment_method: 'cash'
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testOrder)
      });

      if (res.ok) {
        const data = await res.json();
        const orderId = data.orderIds[0];
        await fetch(`/api/restaurant/orders/${orderId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'accepted' })
        });

        alert("Тест нарачката е креирана и прифатена од ресторанот! Почекајте неколку секунди да се појави.");
        fetchOrders();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingTest(false);
    }
  };

  const fetchAvailableRestaurants = async () => {
    if (!partner) return;
    try {
      const res = await fetch(`/api/restaurants/by-city/${partner.city}`);
      const data = await res.json();
      setAvailableRestaurants(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/delivery/${partner.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferred_restaurants: editRestaurants,
          working_hours: editHours,
          delivery_methods: editMethods
        })
      });
      const data = await res.json();
      if (res.ok) {
        setPartner(data.partner);
        localStorage.setItem('delivery_auth', JSON.stringify(data.partner));
        alert('Профилот е успешно ажуриран!');
        setActiveTab('orders');
      } else {
        alert(data.error || 'Грешка при зачувување');
      }
    } catch (e) {
      alert('Грешка при поврзување со серверот');
    } finally {
      setSaving(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/delivery/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      const data = await res.json();
      if (res.ok) {
        if (data.partner.has_signed_contract !== 1) {
          setError('Ве молиме прво потпишете го договорот кој ви беше испратен на е-маил.');
          return;
        }
        setPartner(data.partner);
        localStorage.setItem('delivery_auth', JSON.stringify(data.partner));
      } else {
        setError(data.error || 'Грешка при најава');
      }
    } catch (e) {
      setError('Грешка при поврзување со серверот');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setPartner(null);
    localStorage.removeItem('delivery_auth');
  };

  const fetchOrders = async () => {
    if (!partner) return;
    try {
      const days = ['Недела', 'Понеделник', 'Вторник', 'Среда', 'Четврток', 'Петок', 'Сабота'];
      const now = new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/Skopje"}));
      const currentDay = days[now.getDay()];
      const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
      
      const res = await fetch(`/api/delivery/orders?partnerId=${partner.id}&clientTime=${currentTime}&clientDay=${currentDay}`);
      const data = await res.json();
      setOrders(data);
    } catch (e) {
      console.error(e);
    }
  };

  const updateStatus = async (orderId: number, status: string) => {
    try {
      const res = await fetch(`/api/delivery/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status,
          partnerId: partner.id,
          partnerName: partner.name
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Грешка при ажурирање на статусот');
        return;
      }
      fetchOrders();
    } catch (err) {
      console.error('Failed to update order status', err);
      alert('Грешка при поврзување со серверот');
    }
  };

  if (!partner) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-emerald-100 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Bike size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Најава за доставувачи</h1>
            <p className="text-slate-500">Внесете ги вашите податоци за да започнете со работа</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Корисничко име</label>
              <input 
                type="text" 
                required
                value={credentials.username}
                onChange={e => setCredentials({...credentials, username: e.target.value})}
                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="Внесете корисничко име"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Лозинка</label>
              <input 
                type="password" 
                required
                value={credentials.password}
                onChange={e => setCredentials({...credentials, password: e.target.value})}
                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="Внесете лозинка"
              />
            </div>
            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              {loading ? 'Се најавува...' : 'Најави се'}
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <Link to="/" className="text-slate-500 hover:text-slate-700 text-sm font-medium inline-flex items-center gap-2">
              <ArrowLeft size={16} /> Назад кон почетна
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const workingHours = JSON.parse(partner.working_hours || '{}');
  const days = ['Недела', 'Понеделник', 'Вторник', 'Среда', 'Четврток', 'Петок', 'Сабота'];
  const now = new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/Skopje"}));
  const currentDay = days[now.getDay()];
  const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  
  const timeToMinutes = (t: string) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const todayHours = workingHours[currentDay] || workingHours[currentDay.toLowerCase()];
  
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
  
  console.log(`[Delivery] Day: ${currentDay}, Time: ${currentTime}, isWorking: ${isWorking}`, todayHours);

  const newOrders = orders.filter(o => 
    (o.status === 'preparing' || 
    o.status === 'accepted' || 
    o.status === 'ready' ||
    (o.status === 'pending' && o.spare_2)) &&
    !o.delivery_partner_id
  );
  const activeDelivery = orders.find(o => o.delivery_partner_id === partner?.id && o.status !== 'completed');

  return (
    <div className="min-h-screen bg-emerald-50/30">
      <header className="bg-white border-b border-emerald-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-emerald-50 rounded-full text-emerald-500 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Доставувач</h1>
            <p className="text-xs text-emerald-600 font-medium">{partner.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveTab(activeTab === 'earnings' ? 'orders' : 'earnings')}
            className={`p-2 rounded-full transition-colors ${activeTab === 'earnings' ? 'bg-amber-100 text-amber-600' : 'hover:bg-emerald-50 text-slate-400'}`}
            title="Заработка"
          >
            <DollarSign size={20} />
          </button>
          {partner.role === 'lead' && (
            <button 
              onClick={() => setActiveTab(activeTab === 'analytics' ? 'orders' : 'analytics')}
              className={`p-2 rounded-full transition-colors ${activeTab === 'analytics' ? 'bg-amber-100 text-amber-600' : 'hover:bg-emerald-50 text-slate-400'}`}
              title="Аналитика"
            >
              <BarChart2 size={20} />
            </button>
          )}
          {partner.role === 'lead' && (
            <button 
              onClick={() => setActiveTab(activeTab === 'team' ? 'orders' : 'team')}
              className={`p-2 rounded-full transition-colors ${activeTab === 'team' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-emerald-50 text-slate-400'}`}
              title="Тим"
            >
              <Users2 size={20} />
            </button>
          )}
          <button 
            onClick={() => setActiveTab(activeTab === 'orders' ? 'settings' : 'orders')}
            className={`p-2 rounded-full transition-colors ${activeTab === 'settings' ? 'bg-emerald-100 text-emerald-600' : 'hover:bg-emerald-50 text-slate-400'}`}
            title="Поставки"
          >
            <Settings size={20} />
          </button>
          <button 
            onClick={handleLogout}
            className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-wider"
          >
            Одјава
          </button>
          <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-sm border transition-all ${isWorking ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-slate-200 text-slate-600 border-slate-300'}`}>
            <span className={`w-2.5 h-2.5 rounded-full border-2 border-white/30 ${isWorking ? 'bg-white animate-pulse' : 'bg-slate-400'}`}></span>
            {isWorking ? 'Активен' : 'Неактивен'}
          </div>
        </div>
      </header>
      
      <main className="max-w-md mx-auto p-6 space-y-8">
        {activeTab === 'settings' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white rounded-3xl shadow-xl border border-emerald-100 overflow-hidden">
              <div className="bg-emerald-600 p-6 text-white">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Settings size={24} />
                  Поставки на профил
                </h2>
                <p className="text-emerald-100 text-sm mt-1">Ажурирајте ги вашите ресторани и работно време</p>
              </div>

              <div className="p-6 space-y-8">
                {/* Delivery Methods */}
                <section>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Bike size={18} className="text-emerald-500" />
                    Начин на достава
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'bicycle', label: 'Велосипед' },
                      { id: 'motorcycle', label: 'Мотор' },
                      { id: 'car', label: 'Автомобил' }
                    ].map(method => (
                      <label key={method.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-emerald-50 transition-colors cursor-pointer group">
                        <input 
                          type="checkbox"
                          checked={editMethods.includes(method.id)}
                          onChange={(e) => {
                            if (e.target.checked) setEditMethods([...editMethods, method.id]);
                            else setEditMethods(editMethods.filter(m => m !== method.id));
                          }}
                          className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">{method.label}</span>
                      </label>
                    ))}
                  </div>
                </section>

                {/* Restaurants Selection */}
                <section>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Package size={18} className="text-emerald-500" />
                    Ресторани за соработка
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {availableRestaurants.map(rest => (
                      <label key={rest.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-emerald-50 transition-colors cursor-pointer group">
                        <input 
                          type="checkbox"
                          checked={editRestaurants.includes(rest.id)}
                          onChange={(e) => {
                            if (e.target.checked) setEditRestaurants([...editRestaurants, rest.id]);
                            else setEditRestaurants(editRestaurants.filter(id => id !== rest.id));
                          }}
                          className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="flex-1">
                          <p className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">{rest.name}</p>
                          <p className="text-xs text-slate-500">{rest.address}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </section>

                {/* Working Hours */}
                <section>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Clock size={18} className="text-emerald-500" />
                    Работно време
                  </h3>
                  <div className="space-y-3">
                    {['Понеделник', 'Вторник', 'Среда', 'Четврток', 'Петок', 'Сабота', 'Недела'].map(day => (
                      <div key={day} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-sm font-medium text-slate-700">{day}</span>
                        <div className="flex items-center gap-2">
                          <input 
                            type="time" 
                            value={editHours[day]?.start || '08:00'}
                            onChange={e => setEditHours({...editHours, [day]: {...(editHours[day] || {}), start: e.target.value}})}
                            className="text-xs p-1 rounded border border-slate-200 outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <span className="text-slate-400">-</span>
                          <input 
                            type="time" 
                            value={editHours[day]?.end || '22:00'}
                            onChange={e => setEditHours({...editHours, [day]: {...(editHours[day] || {}), end: e.target.value}})}
                            className="text-xs p-1 rounded border border-slate-200 outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <input 
                            type="checkbox"
                            checked={editHours[day]?.active ?? true}
                            onChange={e => setEditHours({...editHours, [day]: {...(editHours[day] || {}), active: e.target.checked}})}
                            className="ml-2 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <button 
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  Зачувај промени
                </button>
              </div>
            </div>
          </div>
        ) : activeTab === 'earnings' ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <DollarSign className="text-amber-500" size={20} />
                Вашата заработка
              </h2>

              {loadingEarnings ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="animate-spin text-emerald-500" />
                </div>
              ) : earnings.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <p>Сè уште немате остварено заработка.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">Вкупно достава</span>
                      <span className="text-2xl font-black text-emerald-900">{earnings.reduce((acc, curr) => acc + curr.total_deliveries, 0)}</span>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mb-1">Вкупно заработено</span>
                      <span className="text-2xl font-black text-amber-900">{earnings.reduce((acc, curr) => acc + curr.total_earned, 0)} ден.</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {earnings.map((day, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-sm font-bold text-slate-800 block">{new Date(day.date).toLocaleDateString('mk-MK')}</span>
                          <span className="text-[10px] text-slate-400 uppercase font-bold">{day.total_deliveries} достава</span>
                        </div>
                        <span className="text-lg font-black text-emerald-600">+{day.total_earned} ден.</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : activeTab === 'analytics' ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white rounded-3xl shadow-xl border border-amber-100 overflow-hidden">
              <div className="bg-amber-500 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <DollarSign size={24} />
                      Аналитика и Исплати
                    </h2>
                    <p className="text-amber-100 text-sm mt-1">Преглед на успешно доставени нарачки и заработка</p>
                  </div>
                  <button onClick={fetchAnalytics} className="p-2 hover:bg-amber-400 rounded-full transition-colors">
                    <Loader2 size={20} className={loadingAnalytics ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 gap-4">
                  {analytics.map(item => (
                    <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center font-black text-lg">
                          {item.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-lg">{item.name}</p>
                          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                            {item.id === partner.id ? 'Вие (Шеф)' : 'Доставувач'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 flex-1 md:max-w-md">
                        <div className="text-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Нарачки</p>
                          <p className="text-lg font-black text-slate-800">{item.totalOrders}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Промет</p>
                          <p className="text-lg font-black text-slate-800">{Math.round(item.totalValue)}д</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-bold text-amber-600 uppercase">За исплата</p>
                          <p className="text-lg font-black text-amber-600">{Math.round(item.totalEarnings)}д</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {analytics.length === 0 && (
                    <div className="text-center py-12 text-slate-400 italic">
                      Нема податоци за аналитика.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'team' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white rounded-3xl shadow-xl border border-indigo-100 overflow-hidden">
              <div className="bg-indigo-600 p-6 text-white">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Users2 size={24} />
                  Менаџирање на тим
                </h2>
                <p className="text-indigo-100 text-sm mt-1">Преглед на вашиот тим и активни нарачки</p>
              </div>

              <div className="p-6 space-y-8">
                <section>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Users size={18} className="text-indigo-500" />
                    Членови на тим ({team.length})
                  </h3>
                  <div className="space-y-3">
                    {team.map(member => (
                      <div key={member.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{member.name}</p>
                            <p className="text-xs text-slate-500">{member.phone}</p>
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${member.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {member.status === 'approved' ? 'Активен' : member.status}
                        </div>
                      </div>
                    ))}
                    {team.length === 0 && (
                      <p className="text-center py-4 text-slate-400 text-sm italic">Немате членови во вашиот тим.</p>
                    )}
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Package size={18} className="text-indigo-500" />
                      Активни нарачки на тимот
                    </h3>
                    <button onClick={fetchTeamOrders} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                      <Loader2 size={16} className={loadingTeam ? 'animate-spin' : ''} />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {teamOrders.map(order => (
                      <div key={order.id} className="p-4 border border-indigo-100 rounded-2xl bg-indigo-50/30">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-800">Нарачка #{order.id}</h4>
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase ${
                                order.status === 'ready' ? 'bg-amber-100 text-amber-700' : 
                                order.status === 'preparing' ? 'bg-orange-100 text-orange-700' :
                                order.status === 'accepted' ? 'bg-blue-100 text-blue-700' : 
                                'bg-emerald-100 text-emerald-700'
                              }`}>
                                {order.status === 'ready' ? 'Подготвена' : order.status === 'preparing' ? 'Се подготвува' : order.status === 'accepted' ? 'Прифатена' : 'Во достава'}
                              </span>
                            </div>
                            <p className="text-[10px] text-indigo-600 font-bold uppercase">{order.restaurant_name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-slate-500">Доставувач:</p>
                            <p className="text-sm font-black text-indigo-700">{order.delivery_partner_name || 'НЕДОДЕЛЕНА'}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-slate-600 mb-4">
                          <MapPin size={14} className="text-slate-400" />
                          {order.delivery_address}
                        </div>

                        <div className="pt-3 border-t border-indigo-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Префрли на друг член:</p>
                          <div className="flex flex-wrap gap-2">
                            {[partner, ...team].filter(m => m.id !== order.delivery_partner_id).map(member => (
                              <button
                                key={member.id}
                                onClick={() => handleAssignOrder(order.id, member.id, member.name)}
                                className="px-3 py-1 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-[10px] font-bold hover:bg-indigo-600 hover:text-white transition-all"
                              >
                                {member.id === partner.id ? 'Мене' : member.name.split(' ')[0]}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                    {teamOrders.length === 0 && (
                      <p className="text-center py-8 text-slate-400 text-sm italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        Нема активни нарачки во тимот.
                      </p>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Active Delivery Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Тековна достава</h3>
          {activeDelivery ? (
            <div className="bg-white rounded-2xl shadow-lg border border-emerald-200 p-6 animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md uppercase tracking-wider mb-2 inline-block">
                    {activeDelivery.status === 'pending' ? 'Резервирана (На чекање)' : 'Во тек'}
                  </span>
                  <h4 className="text-xl font-bold text-slate-800">Нарачка #{activeDelivery.id}</h4>
                  {activeDelivery.status === 'pending' && activeDelivery.spare_2 && (
                    <div className="mt-2 px-3 py-2 bg-orange-50 border border-orange-100 rounded-xl flex items-center gap-2 text-orange-700">
                      <Clock size={16} className="animate-pulse" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider leading-none">Подготовката започнува за:</span>
                        <div className="text-lg font-black">
                          <Countdown targetTime={activeDelivery.spare_2} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <Navigation className="text-emerald-500 animate-bounce" />
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg text-slate-500"><MapPin size={18} /></div>
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase">Адреса</p>
                    <p className="text-slate-700 font-medium">{activeDelivery.delivery_address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg text-slate-500"><Phone size={18} /></div>
                  <div>
                    <p className="text-xs text-slate-400 font-bold uppercase">Клиент</p>
                    <p className="text-slate-700 font-medium">{activeDelivery.customer_name} ({activeDelivery.customer_phone})</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
                  <div className="p-2 bg-white rounded-lg text-orange-600 shadow-sm"><DollarSign size={18} /></div>
                  <div>
                    <p className="text-xs text-orange-400 font-bold uppercase">За наплата</p>
                    <p className="text-lg font-black text-slate-800">{activeDelivery.total_price} ден.</p>
                    <p className="text-[10px] font-bold text-orange-600 uppercase">
                      Начин: {activeDelivery.payment_method === 'cash' ? 'ГОТОВИНА (Наплати!)' : activeDelivery.payment_method === 'card' ? 'КАРТИЧКА (Платено)' : 'ПОЕНИ (Платено)'}
                    </p>
                  </div>
                </div>
              </div>

              {activeDelivery.tracking_token && (
                <div className="mb-6">
                  <button 
                    onClick={() => window.open(`/track/${activeDelivery.tracking_token}`, '_blank')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-all border border-indigo-100"
                  >
                    <ExternalLink size={16} />
                    Следење & QR Код
                  </button>
                </div>
              )}

              {activeDelivery.delivery_code && (
                <div className="mb-6 p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[10px] border-l-4 border-orange-500">
                  <p className="text-orange-400 font-bold mb-1 uppercase">Код за достава:</p>
                  <pre className="whitespace-pre-wrap">{JSON.stringify(JSON.parse(activeDelivery.delivery_code), null, 2)}</pre>
                </div>
              )}

              {activeDelivery.delivery_lat && activeDelivery.delivery_lng && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-slate-700">Маршрута за достава</p>
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
                        (availableRestaurants.find(r => r.id === activeDelivery.restaurant_id)?.address || '') + ', ' + 
                        (availableRestaurants.find(r => r.id === activeDelivery.restaurant_id)?.spare_3 ? availableRestaurants.find(r => r.id === activeDelivery.restaurant_id)?.spare_3 + ' ' : '') + 
                        (availableRestaurants.find(r => r.id === activeDelivery.restaurant_id)?.city || '')
                      )}&destination=${activeDelivery.delivery_lat},${activeDelivery.delivery_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md transition-colors"
                    >
                      <ExternalLink size={12} />
                      Отвори во Google Maps
                    </a>
                  </div>
                  <DeliveryRouteMap 
                    restaurantCoords={(() => {
                      const rest = availableRestaurants.find(r => r.id === activeDelivery.restaurant_id);
                      if (rest && rest.spare_1 && rest.spare_2) {
                        const lat = parseFloat(rest.spare_1);
                        const lng = parseFloat(rest.spare_2);
                        if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
                      }
                      if (rest && rest.delivery_zones) {
                        try {
                          const zones = JSON.parse(rest.delivery_zones);
                          if (zones.length > 0 && zones[0].length > 0) return zones[0][0];
                        } catch (e) {}
                      }
                      return [41.9981, 21.4254]; // Default Skopje
                    })()}
                    customerCoords={[activeDelivery.delivery_lat, activeDelivery.delivery_lng]}
                    restaurantName={availableRestaurants.find(r => r.id === activeDelivery.restaurant_id)?.name || 'Ресторан'}
                    customerAddress={activeDelivery.delivery_address}
                  />
                </div>
              )}

              <button 
                onClick={() => {
                  if (activeDelivery.status === 'delivering') {
                    updateStatus(activeDelivery.id, 'completed');
                  } else if (activeDelivery.status === 'ready') {
                    updateStatus(activeDelivery.id, 'delivering');
                  }
                }}
                disabled={activeDelivery.status !== 'ready' && activeDelivery.status !== 'delivering'}
                className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                  activeDelivery.status === 'delivering' 
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20' 
                    : activeDelivery.status === 'ready'
                    ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/20'
                    : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                }`}
              >
                {activeDelivery.status === 'delivering' ? (
                  <>
                    <CheckCircle2 size={20} />
                    Означи како доставена
                  </>
                ) : activeDelivery.status === 'ready' ? (
                  <>
                    <Bike size={20} />
                    Подигни и започни достава
                  </>
                ) : (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Се подготвува во ресторан...
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6">
              <div className="flex items-center justify-center py-6 text-slate-400 gap-2">
                <CheckCircle2 size={24} />
                <span>Слободен</span>
              </div>
            </div>
          )}
        </div>

        {/* New Orders Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Package className="text-emerald-500" size={20} />
              Нови барања
            </h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={createTestOrder}
                disabled={creatingTest}
                className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                {creatingTest ? <Loader2 size={12} className="animate-spin" /> : <Package size={12} />}
                Тест Нарачка
              </button>
              <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-xs font-bold">{newOrders.length}</span>
            </div>
          </div>
          
          {newOrders.length === 0 ? (
            <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p className="text-sm">Нема нови барања за достава.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {newOrders.map(order => (
                <div key={order.id} className={`p-4 border rounded-xl transition-colors ${
                  order.status === 'pending' && order.spare_2 ? 'bg-orange-50 border-orange-100 hover:border-orange-200' : 'bg-slate-50 border-slate-100 hover:border-emerald-200'
                }`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-slate-800">Нарачка #{order.id}</h4>
                      <p className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                        <Package size={12} />
                        {order.restaurant_name}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${
                        order.status === 'ready' ? 'bg-emerald-100 text-emerald-700' : 
                        (order.status === 'preparing' || order.status === 'accepted') ? 'bg-orange-100 text-orange-700' : 
                        order.status === 'pending' && order.spare_2 ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {order.status === 'ready' ? 'Подготвена' : 
                         (order.status === 'preparing' || order.status === 'accepted') ? 'Се подготвува' : 
                         order.status === 'pending' && order.spare_2 ? 'На чекање' :
                         'Прифатена'}
                      </span>
                      {order.spare_2 && (
                        <div className="px-2 py-1 rounded-md text-[10px] font-bold bg-white text-orange-700 border border-orange-200 flex items-center gap-1 shadow-sm">
                          <Clock size={10} className="animate-pulse" />
                          <span className="mr-1">Почеток за:</span>
                          <Countdown targetTime={order.spare_2} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-slate-600 flex items-center gap-2">
                      <MapPin size={14} className="text-slate-400" />
                      {order.delivery_address}
                    </p>
                  </div>
                  <button 
                    onClick={() => updateStatus(order.id, 'delivering')}
                    disabled={!!activeDelivery}
                    className={`w-full font-bold py-2 rounded-lg text-sm transition-colors border ${
                      order.status === 'pending' && order.spare_2 
                        ? 'bg-orange-600 text-white border-orange-500 hover:bg-orange-700' 
                        : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {order.status === 'pending' && order.spare_2 ? 'Прифати (на чекање)' : 'Прифати достава'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
          </>
        )}
      </main>
    </div>
  );
}
