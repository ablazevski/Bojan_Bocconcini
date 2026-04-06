import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Clock, MapPin, Phone, Package, ArrowLeft, ExternalLink, ShieldCheck, Star, Facebook, Instagram, Twitter, Linkedin, Globe, Navigation, Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import SEO from '../components/SEO';
import QRCode from 'qrcode';
import { io } from 'socket.io-client';
import DeliveryRouteMap from '../components/DeliveryRouteMap';
import { safeFetchJson } from '../utils/api';
import { useTheme } from '../context/ThemeContext';

export default function TrackOrder() {
  const { theme, toggleTheme } = useTheme();
  const { token } = useParams<{ token: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string>('');
  const [isCompleting, setIsCompleting] = useState(false);
  const [review, setReview] = useState({ rating: 5, comment: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<Record<string, string>>({});
  const [partnerLocation, setPartnerLocation] = useState<[number, number] | null>(null);
  const [preciseEta, setPreciseEta] = useState<number | null>(null);

  useEffect(() => {
    fetchOrder();
    generateQR();
    checkDeliveryPickup();
    fetchSettings();

    const socket = io();
    socket.emit('join_order', token);

    socket.on('status_updated', (data) => {
      console.log('Order status updated via socket:', data);
      fetchOrder();
    });

    socket.on('location_updated', (data) => {
      console.log('Partner location updated:', data);
      setPartnerLocation([data.lat, data.lng]);
    });

    socket.on('order_stale_reminder', () => {
      alert('Вашата нарачка е подготвена и ве чека! Ве молиме подигнете ја или очекувајте го доставувачот наскоро.');
    });

    const interval = setInterval(fetchOrder, 30000); // Fallback

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, [token]);

  useEffect(() => {
    if (order && (order.status === 'delivering' || order.status === 'ready' || order.status === 'preparing' || order.status === 'accepted')) {
      calculatePreciseEta();
    }
  }, [order?.status, partnerLocation, order?.delivery_lat, order?.delivery_lng]);

  const calculatePreciseEta = async () => {
    if (!order) return;

    let startLat, startLng;
    const endLat = order.delivery_lat;
    const endLng = order.delivery_lng;

    if (order.status === 'delivering' && partnerLocation) {
      [startLat, startLng] = partnerLocation;
    } else {
      startLat = order.restaurant_lat;
      startLng = order.restaurant_lng;
    }

    if (!startLat || !startLng || !endLat || !endLng) return;

    try {
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=false`);
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const durationSeconds = data.routes[0].duration;
        let durationMinutes = Math.round(durationSeconds / 60);
        
        // Add buffer if still preparing
        if (order.status === 'preparing' || order.status === 'accepted') {
          durationMinutes += 10; // Assume 10 mins more for prep
        }
        
        setPreciseEta(durationMinutes);
      }
    } catch (err) {
      console.error('Failed to calculate precise ETA:', err);
    }
  };

  const fetchOrder = async () => {
    try {
      const data = await safeFetchJson(`/api/orders/track/${token}`);
      setOrder(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const data = await safeFetchJson('/api/settings');
      setGlobalSettings(data);
    } catch (err) {
      console.error('Failed to fetch settings', err);
    }
  };

  const generateQR = async () => {
    try {
      const url = window.location.href;
      const qr = await QRCode.toDataURL(url);
      setQrCode(qr);
    } catch (err) {
      console.error('Failed to generate QR', err);
    }
  };

  const checkDeliveryPickup = async () => {
    const auth = localStorage.getItem('delivery_auth');
    if (!auth) return;

    try {
      const partner = JSON.parse(auth);
      const res = await fetch(`/api/orders/track/${token}`);
      if (!res.ok) return;
      const orderData = await res.json();

      // If order is ready or accepted and scanned by a logged-in delivery partner
      if (['ready', 'accepted'].includes(orderData.status)) {
        await fetch(`/api/delivery/orders/${orderData.id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            status: 'delivering',
            partnerId: partner.id,
            partnerName: partner.name
          })
        });
        fetchOrder();
      }
    } catch (err) {
      console.error('Delivery pickup check failed', err);
    }
  };

  const handleComplete = async () => {
    if (!window.confirm('Дали потврдувате дека ја примивте нарачката?')) return;
    
    setIsCompleting(true);
    try {
      const res = await fetch(`/api/orders/track/${token}/complete`, { method: 'POST' });
      if (res.ok) {
        fetchOrder();
      }
    } catch (err) {
      console.error('Failed to complete order', err);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReview(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          restaurant_id: order.restaurant_id,
          customer_name: order.customer_name,
          rating: review.rating,
          comment: review.comment
        })
      });
      if (res.ok) {
        setReviewSubmitted(true);
      } else {
        const data = await res.json();
        alert(data.error || 'Грешка при испраќање на рецензијата');
      }
    } catch (err) {
      console.error('Failed to submit review', err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Package size={40} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Грешка</h1>
          <p className="text-slate-500 mb-8">{error || 'Нарачката не постои'}</p>
          <Link to="/" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all">
            <ArrowLeft size={20} />
            Назад кон почетна
          </Link>
        </div>
      </div>
    );
  }

  const items = JSON.parse(order.items || '[]');
  const statusColors: Record<string, string> = {
    'pending': 'bg-amber-100 text-amber-700',
    'accepted': 'bg-blue-100 text-blue-700',
    'preparing': 'bg-indigo-100 text-indigo-700',
    'delivering': 'bg-purple-100 text-purple-700',
    'completed': 'bg-emerald-100 text-emerald-700',
    'cancelled': 'bg-red-100 text-red-700'
  };

  const statusLabels: Record<string, string> = {
    'pending': 'Се чека потврда',
    'accepted': 'Прифатена',
    'preparing': 'Се подготвува',
    'delivering': 'Во достава',
    'completed': 'Доставена',
    'cancelled': 'Одбиена'
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950' : 'bg-[#F5F2ED]'} pb-20 font-sans transition-colors duration-300`}>
      <SEO 
        title={`Следење на нарачка #${order.id} - PizzaTime`}
        description={`Следете го статусот на вашата нарачка од ${order.restaurant_name} во реално време.`}
      />
      <header className={`${theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'} backdrop-blur-md border-b sticky top-0 z-10 transition-colors duration-300`}>
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className={`p-2 ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} rounded-full transition-colors`}>
            <ArrowLeft size={24} className={theme === 'dark' ? 'text-slate-300' : 'text-slate-800'} />
          </Link>
          <div className="text-center">
            {globalSettings.company_logo_url ? (
              <img src={globalSettings.company_logo_url} alt="Logo" className="h-8 object-contain mx-auto" />
            ) : (
              <h1 className={`font-black text-xl ${theme === 'dark' ? 'text-white' : 'text-slate-900'} tracking-tight`}>{globalSettings.company_name || 'PIZZA TIME'}</h1>
            )}
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-sans font-bold">Tracking Service</p>
          </div>
          <button 
            onClick={toggleTheme}
            className={`p-2 ${theme === 'dark' ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'} rounded-full transition-colors`}
            title={theme === 'light' ? 'Префрли во темен режим' : 'Префрли во светол режим'}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Status Hero */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${theme === 'dark' ? 'bg-slate-900 border-slate-800 shadow-slate-950/50' : 'bg-white border-white shadow-slate-200/50'} rounded-[40px] shadow-2xl overflow-hidden border transition-colors duration-300`}
        >
          <div className="p-10 text-center">
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              <div className={`inline-flex items-center gap-2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest font-sans ${statusColors[order.status] || (theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')}`}>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                </span>
                {statusLabels[order.status] || order.status}
              </div>

              {order.payment_method === 'card' && (
                <div className={`inline-flex items-center gap-2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest font-sans ${
                  order.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 
                  order.payment_status === 'failed' ? 'bg-red-100 text-red-700' : 
                  (theme === 'dark' ? 'bg-amber-900/30 text-amber-500' : 'bg-amber-100 text-amber-700')
                }`}>
                  <ShieldCheck size={12} />
                  {order.payment_status === 'paid' ? 'Платено' : 
                   order.payment_status === 'failed' ? 'Плаќањето не успеа' : 
                   'Се чека плаќање'}
                </div>
              )}
            </div>

            {new URLSearchParams(window.location.search).get('payment') === 'success' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 p-6 rounded-3xl mb-8 font-sans font-bold flex items-center justify-center gap-3"
              >
                <CheckCircle size={24} />
                Плаќањето е успешно процесирано!
              </motion.div>
            )}

            {new URLSearchParams(window.location.search).get('payment') === 'failed' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-6 rounded-3xl mb-8 font-sans font-bold flex flex-col items-center gap-2"
              >
                <div className="flex items-center gap-3">
                  <Package size={24} />
                  Плаќањето не успеа
                </div>
                <p className="text-sm opacity-80">{new URLSearchParams(window.location.search).get('error')}</p>
              </motion.div>
            )}

            <h2 className={`text-5xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} mb-4 tracking-tighter`}>#{order.id}</h2>
            
            {(preciseEta || order.eta_minutes) && order.status !== 'completed' && order.status !== 'cancelled' && (
              <div className="mb-8 flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-sans font-bold mb-1">
                  {preciseEta ? 'Прецизно време (Live)' : 'Проценето време'}
                </span>
                <div className={`flex items-center gap-2 ${preciseEta ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                  <Clock size={20} className={preciseEta ? "animate-pulse" : ""} />
                  <span className="text-3xl font-black tracking-tighter">~{preciseEta || order.eta_minutes} мин.</span>
                </div>
              </div>
            )}
            
            {order.status === 'cancelled' && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-3xl mb-8 font-sans font-bold">
                Кујната е презафатена. Вашата нарачка не може да биде прифатена во овој момент.
              </div>
            )}

            <p className="text-slate-400 font-sans text-sm mb-12">Нарачано на {(() => {
              const dateStr = order.created_at;
              const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr.replace(' ', 'T') + 'Z');
              return new Intl.DateTimeFormat('mk-MK', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              }).format(date);
            })()}</p>

            {order.status !== 'pending' && order.status !== 'cancelled' && order.status !== 'completed' && (
              <div className="mb-12">
                <h3 className="font-sans font-black text-[10px] uppercase tracking-widest text-slate-400 mb-4 flex items-center justify-center gap-2">
                  <Navigation size={14} className={order.status === 'delivering' ? "animate-pulse" : ""} />
                  {order.status === 'delivering' ? 'Следење во живо' : 'Локација на достава'}
                </h3>
                <DeliveryRouteMap 
                  restaurantCoords={[order.restaurant_lat || 41.9981, order.restaurant_lng || 21.4254]}
                  customerCoords={[order.delivery_lat || 41.9981, order.delivery_lng || 21.4254]}
                  partnerCoords={partnerLocation || undefined}
                  restaurantName={order.restaurant_name}
                  customerAddress={order.delivery_address}
                />
              </div>
            )}

            {/* Visual Stepper */}
            <div className="max-w-md mx-auto mb-12 px-4">
              <div className="relative flex justify-between items-center">
                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}></div>
                <div 
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-indigo-600 transition-all duration-1000"
                  style={{ 
                    width: order.status === 'pending' ? '0%' : 
                           order.status === 'accepted' ? '30%' : 
                           order.status === 'ready' ? '60%' :
                           order.status === 'delivering' ? '85%' : 
                           order.status === 'completed' ? '100%' : '0%' 
                  }}
                ></div>
                
                {['pending', 'accepted', 'ready', 'delivering', 'completed'].map((s, i) => {
                  const isPast = ['pending', 'accepted', 'ready', 'delivering', 'completed'].indexOf(order.status) >= i;
                  return (
                    <div key={s} className="relative z-10 flex flex-col items-center">
                      <div className={`w-4 h-4 rounded-full border-4 transition-all duration-500 ${isPast ? 'bg-indigo-600 border-indigo-100 dark:border-indigo-900/50' : (theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100')}`}></div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-4 font-sans text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                <span>Примена</span>
                <span>Кујна</span>
                <span>Пат</span>
                <span>Дома</span>
              </div>
            </div>

            {order.status !== 'completed' && order.status !== 'cancelled' && (
              <button 
                onClick={handleComplete}
                disabled={isCompleting}
                className={`w-full max-w-sm ${theme === 'dark' ? 'bg-white text-slate-900 hover:bg-slate-200' : 'bg-slate-900 text-white hover:bg-indigo-600'} py-5 rounded-3xl font-sans font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-slate-900/20 disabled:opacity-50`}
              >
                {isCompleting ? 'Се процесира...' : 'Потврди прием'}
              </button>
            )}

            {order.status === 'completed' && (
              <div className="space-y-6">
                <div className={`inline-flex items-center gap-3 px-8 py-4 ${theme === 'dark' ? 'bg-emerald-900/20 text-emerald-400 border-emerald-900/30' : 'bg-emerald-50 text-emerald-700 border-emerald-100'} rounded-full font-sans font-black text-xs uppercase tracking-widest border`}>
                  <ShieldCheck size={20} />
                  Успешно доставено
                </div>

                {!reviewSubmitted ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`max-w-md mx-auto mt-8 p-8 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'} rounded-[32px] border`}
                  >
                    <h3 className={`font-sans text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} mb-2`}>Како беше храната?</h3>
                    <p className="text-slate-500 font-sans text-sm mb-6">Вашето мислење ни помага да бидеме подобри.</p>
                    
                    <form onSubmit={handleSubmitReview} className="space-y-6">
                      <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReview({ ...review, rating: star })}
                            className={`p-2 transition-all ${review.rating >= star ? 'text-amber-500' : 'text-slate-300'}`}
                          >
                            <Star size={32} fill={review.rating >= star ? "currentColor" : "none"} />
                          </button>
                        ))}
                      </div>
                      
                      <textarea
                        value={review.comment}
                        onChange={(e) => setReview({ ...review, comment: e.target.value })}
                        placeholder="Напишете коментар (опционално)..."
                        className={`w-full p-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'} rounded-2xl font-sans text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none`}
                      />
                      
                      <button
                        type="submit"
                        disabled={isSubmittingReview}
                        className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-sans font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50"
                      >
                        {isSubmittingReview ? 'Се испраќа...' : 'Испрати рецензија'}
                      </button>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-8 p-6 ${theme === 'dark' ? 'bg-emerald-900/20 text-emerald-400' : 'bg-emerald-50 text-emerald-700'} rounded-2xl font-sans font-bold text-sm`}
                  >
                    Благодариме за вашата рецензија!
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Details */}
          <div className="space-y-8">
            <div className={`${theme === 'dark' ? 'bg-slate-900 border-slate-800 shadow-slate-950/30' : 'bg-white border-white shadow-slate-200/30'} p-8 rounded-[32px] shadow-xl border transition-colors duration-300`}>
              <h3 className="font-sans font-black text-[10px] uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                <Store size={14} />
                Ресторан
              </h3>
              <div className="space-y-4 font-sans">
                <p className={`font-sans text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{order.restaurant_name}</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-slate-500 text-sm">
                    <MapPin size={16} className="text-indigo-600 dark:text-indigo-400" />
                    {order.restaurant_address}
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 text-sm">
                    <Phone size={16} className="text-indigo-600 dark:text-indigo-400" />
                    {order.restaurant_phone}
                  </div>
                </div>
              </div>
            </div>

            <div className={`${theme === 'dark' ? 'bg-slate-900 border-slate-800 shadow-slate-950/30' : 'bg-white border-white shadow-slate-200/30'} p-8 rounded-[32px] shadow-xl border transition-colors duration-300`}>
              <h3 className="font-sans font-black text-[10px] uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                <Package size={14} />
                Вашата Нарачка
              </h3>
              <div className="space-y-6 font-sans">
                {items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={`font-sans text-lg font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{item.name}</p>
                        {item.user_name && (
                          <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {item.user_name}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">
                        {Object.entries(item.selectedModifiers || {}).map(([key, val]: any) => 
                          `${key}: ${Array.isArray(val) ? val.join(', ') : val}`
                        ).join(' • ')}
                      </p>
                    </div>
                    <p className={`font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{item.finalPrice} ден.</p>
                  </div>
                ))}

                {/* Fees and Payment */}
                <div className={`pt-6 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'} space-y-3`}>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Плаќање</span>
                    <span className={`font-black ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                      {order.payment_method === 'cash' ? 'Готовина' : order.payment_method === 'card' ? 'Картичка' : 'Поени'}
                    </span>
                  </div>
                  {order.selected_fees && JSON.parse(order.selected_fees).length > 0 && (
                    <div className="space-y-1">
                      <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px] block mb-2">Додатоци</span>
                      {JSON.parse(order.selected_fees).map((fee: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-slate-500">{fee.name}</span>
                          <span className={`font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>+{fee.amount} ден.</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={`pt-6 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'} flex justify-between items-center`}>
                  <span className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Вкупно</span>
                  <span className={`font-sans text-3xl font-black ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>{order.total_price} ден.</span>
                </div>
              </div>
            </div>
          </div>

          {/* QR & Share */}
          <div className="space-y-8">
            <div className={`${theme === 'dark' ? 'bg-slate-900 border-slate-800 shadow-slate-950/30' : 'bg-white border-white shadow-slate-200/30'} p-10 rounded-[32px] shadow-xl border transition-colors duration-300 text-center`}>
              <h3 className="font-sans font-black text-[10px] uppercase tracking-widest text-slate-400 mb-8">Скенирај за следење</h3>
              {qrCode && (
                <div className={`inline-block p-6 ${theme === 'dark' ? 'bg-white rounded-[40px]' : 'bg-[#F5F2ED] rounded-[40px]'} mb-8`}>
                  <img src={qrCode} alt="Tracking QR" className="w-48 h-48 mix-blend-multiply" />
                </div>
              )}
              <div className="space-y-4">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Линкот е копиран!');
                  }}
                  className={`w-full py-4 ${theme === 'dark' ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-50 text-slate-900 hover:bg-slate-100'} rounded-2xl font-sans font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2`}
                >
                  <ExternalLink size={16} />
                  Копирај линк
                </button>
              </div>
            </div>

            <div className="p-8 bg-indigo-600 rounded-[32px] text-white shadow-xl shadow-indigo-600/20">
              <h4 className="font-sans font-black text-[10px] uppercase tracking-widest opacity-60 mb-4">Помош</h4>
              <p className="font-sans text-lg leading-tight mb-6">Имате проблем со нарачката? Контактирајте го ресторанот директно.</p>
              <a 
                href={`tel:${order.restaurant_phone}`}
                className="inline-flex items-center gap-2 font-sans font-black text-xs uppercase tracking-widest bg-white/20 hover:bg-white/30 px-6 py-3 rounded-full transition-all"
              >
                <Phone size={16} />
                Повикај сега
              </a>
            </div>

            {globalSettings.company_phone && (
              <div className="p-8 bg-slate-900 rounded-[32px] text-white shadow-xl shadow-slate-900/20">
                <h4 className="font-sans font-black text-[10px] uppercase tracking-widest opacity-60 mb-4">Поддршка</h4>
                <p className="font-sans text-lg leading-tight mb-6">Потребна ви е помош од {globalSettings.company_name || 'платформата'}?</p>
                <a 
                  href={`tel:${globalSettings.company_phone}`}
                  className="inline-flex items-center gap-2 font-sans font-black text-xs uppercase tracking-widest bg-white/10 hover:bg-white/20 px-6 py-3 rounded-full transition-all"
                >
                  <Phone size={16} />
                  Контактирај не
                </a>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className={`max-w-6xl mx-auto px-6 mt-12 pt-12 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-orange-100'} relative z-10 pb-12 transition-colors duration-300`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">
          <div className="space-y-4">
            {globalSettings.company_logo_url ? (
              <img src={globalSettings.company_logo_url || null} alt="Logo" className="h-10 object-contain mb-4" />
            ) : (
              <h2 className={`font-black text-xl ${theme === 'dark' ? 'text-white' : 'text-slate-900'} tracking-tight mb-4`}>{globalSettings.company_name || 'PIZZA TIME'}</h2>
            )}
            <div className="space-y-1 text-sm text-slate-500 dark:text-slate-400">
              <p className={`font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{globalSettings.company_name}</p>
              <p>{globalSettings.company_address}</p>
              {globalSettings.company_phone && <p>Тел: {globalSettings.company_phone}</p>}
              {globalSettings.company_website && (
                <a href={globalSettings.company_website} target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors block">
                  {globalSettings.company_website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className={`font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'} uppercase text-xs tracking-widest`}>Информации</h4>
            <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <Link to="/privacy-policy" className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors block">Политика за приватност</Link>
              <Link to="/payment-terms" className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors block">Услови за плаќање</Link>
              <Link to="/delivery-terms" className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors block">Начини на достава и враќање на средствата</Link>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className={`font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'} uppercase text-xs tracking-widest`}>Следете не</h4>
            <div className="flex gap-4">
              {globalSettings.company_facebook && (
                <a href={globalSettings.company_facebook} target="_blank" rel="noopener noreferrer" className={`p-2 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-blue-400' : 'bg-white border-orange-50 text-slate-600 hover:text-blue-600'} rounded-full shadow-sm border transition-colors`}>
                  <Facebook size={18} />
                </a>
              )}
              {globalSettings.company_instagram && (
                <a href={globalSettings.company_instagram} target="_blank" rel="noopener noreferrer" className={`p-2 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-pink-400' : 'bg-white border-orange-50 text-slate-600 hover:text-pink-600'} rounded-full shadow-sm border transition-colors`}>
                  <Instagram size={18} />
                </a>
              )}
              {globalSettings.company_twitter && (
                <a href={globalSettings.company_twitter} target="_blank" rel="noopener noreferrer" className={`p-2 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-blue-300' : 'bg-white border-orange-50 text-slate-600 hover:text-blue-400'} rounded-full shadow-sm border transition-colors`}>
                  <Twitter size={18} />
                </a>
              )}
              {globalSettings.company_linkedin && (
                <a href={globalSettings.company_linkedin} target="_blank" rel="noopener noreferrer" className={`p-2 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-blue-500' : 'bg-white border-orange-50 text-slate-600 hover:text-blue-700'} rounded-full shadow-sm border transition-colors`}>
                  <Linkedin size={18} />
                </a>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {globalSettings.bank_logo_url && (
              <img src={globalSettings.bank_logo_url} alt="Bank Logo" className="h-10 object-contain" />
            )}
            <div className="flex flex-wrap gap-3">
              {globalSettings.visa_logo_url && <img src={globalSettings.visa_logo_url} alt="Visa" className="h-6 object-contain" />}
              {globalSettings.mastercard_logo_url && <img src={globalSettings.mastercard_logo_url} alt="Mastercard" className="h-6 object-contain" />}
              {globalSettings.diners_logo_url && <img src={globalSettings.diners_logo_url} alt="Diners" className="h-6 object-contain" />}
              {globalSettings.maestro_logo_url && <img src={globalSettings.maestro_logo_url} alt="Maestro" className="h-6 object-contain" />}
            </div>
          </div>
        </div>

        <div className={`max-w-6xl mx-auto px-6 mt-12 pt-8 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'} flex flex-col md:flex-row justify-between items-center gap-4`}>
          <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            © {new Date().getFullYear()} {globalSettings.company_name || 'PizzaTime'}. Сите права се задржани.
          </p>
          <Link to="/portal" className={`text-[10px] ${theme === 'dark' ? 'text-slate-600 hover:text-orange-500' : 'text-slate-300 hover:text-orange-300'} transition-colors uppercase font-bold tracking-widest`}>
            Портал за соработници
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Store({ className, size }: { className?: string, size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size || 24} 
      height={size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
      <path d="M2 7h20" />
      <path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7" />
    </svg>
  );
}
