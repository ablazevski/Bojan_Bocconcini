import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Map, Navigation, CheckCircle2, Phone, MapPin, Package, Bike, Settings, Clock, Save, Loader2 } from 'lucide-react';

interface Order {
  id: number;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  status: string;
  delivery_code: string;
  restaurant_id: number;
}

export default function Delivery() {
  const [partner, setPartner] = useState<any>(null);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'orders' | 'settings'>('orders');
  const [availableRestaurants, setAvailableRestaurants] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const [editHours, setEditHours] = useState<any>({});
  const [editRestaurants, setEditRestaurants] = useState<number[]>([]);

  useEffect(() => {
    if (partner) {
      setEditHours(JSON.parse(partner.working_hours || '{}'));
      setEditRestaurants(JSON.parse(partner.preferred_restaurants || '[]'));
    }
  }, [partner]);

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
      const interval = setInterval(fetchOrders, 10000);
      return () => clearInterval(interval);
    }
  }, [partner]);

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
          working_hours: editHours
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
      const res = await fetch(`/api/delivery/orders?partnerId=${partner.id}`);
      const data = await res.json();
      setOrders(data);
    } catch (e) {
      console.error(e);
    }
  };

  const updateStatus = async (orderId: number, status: string) => {
    await fetch(`/api/delivery/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        status,
        partnerId: partner.id,
        partnerName: partner.name
      })
    });
    fetchOrders();
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

  const newOrders = orders.filter(o => o.status === 'accepted');
  const activeDelivery = orders.find(o => o.status === 'delivering');

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
          <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${isWorking ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
            <span className={`w-2 h-2 rounded-full ${isWorking ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
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
        ) : (
          <>
            {/* Active Delivery Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Тековна достава</h3>
          {activeDelivery ? (
            <div className="bg-white rounded-2xl shadow-lg border border-emerald-200 p-6 animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md uppercase tracking-wider mb-2 inline-block">Во тек</span>
                  <h4 className="text-xl font-bold text-slate-800">Нарачка #{activeDelivery.id}</h4>
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
              </div>

              {activeDelivery.delivery_code && (
                <div className="mb-6 p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[10px] border-l-4 border-orange-500">
                  <p className="text-orange-400 font-bold mb-1 uppercase">Код за достава:</p>
                  <pre className="whitespace-pre-wrap">{JSON.stringify(JSON.parse(activeDelivery.delivery_code), null, 2)}</pre>
                </div>
              )}

              <button 
                onClick={() => updateStatus(activeDelivery.id, 'completed')}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={20} />
                Означи како доставена
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
            <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-xs font-bold">{newOrders.length}</span>
          </div>
          
          {newOrders.length === 0 ? (
            <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p className="text-sm">Нема нови барања за достава.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {newOrders.map(order => (
                <div key={order.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 hover:border-emerald-200 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-bold text-slate-800">Нарачка #{order.id}</h4>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Подготвена</span>
                  </div>
                  <p className="text-sm text-slate-600 mb-4 flex items-center gap-2">
                    <MapPin size={14} className="text-slate-400" />
                    {order.delivery_address}
                  </p>
                  <button 
                    onClick={() => updateStatus(order.id, 'delivering')}
                    disabled={!!activeDelivery}
                    className="w-full bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed font-bold py-2 rounded-lg text-sm transition-colors"
                  >
                    Прифати достава
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
