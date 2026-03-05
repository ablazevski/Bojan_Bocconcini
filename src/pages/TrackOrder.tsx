import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Clock, MapPin, Phone, Package, ArrowLeft, ExternalLink, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import QRCode from 'qrcode';

export default function TrackOrder() {
  const { token } = useParams<{ token: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string>('');
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    fetchOrder();
    generateQR();
  }, [token]);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/track/${token}`);
      if (!res.ok) throw new Error('Нарачката не е пронајдена');
      const data = await res.json();
      setOrder(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
    'cancelled': 'Откажана'
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
            <ArrowLeft size={24} className="text-slate-600" />
          </Link>
          <h1 className="font-bold text-slate-800">Следење на нарачка</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Status Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center"
        >
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold mb-6 ${statusColors[order.status] || 'bg-slate-100'}`}>
            {statusLabels[order.status] || order.status}
          </div>

          <h2 className="text-3xl font-black text-slate-800 mb-2">#{order.id}</h2>
          <p className="text-slate-500 mb-8">Нарачано на {new Date(order.created_at).toLocaleString('mk-MK')}</p>

          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center ${order.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600 animate-pulse'}`}>
                {order.status === 'completed' ? <CheckCircle size={48} /> : <Clock size={48} />}
              </div>
            </div>
          </div>

          {order.status !== 'completed' && order.status !== 'cancelled' && (
            <button 
              onClick={handleComplete}
              disabled={isCompleting}
              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              {isCompleting ? 'Се процесира...' : 'Потврди дека е доставено'}
            </button>
          )}

          {order.status === 'completed' && (
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-center gap-3 text-emerald-700 font-bold">
              <ShieldCheck size={24} />
              Нарачката е успешно затворена
            </div>
          )}
        </motion.div>

        {/* Restaurant Info */}
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Store className="text-indigo-600" size={20} />
            Ресторан
          </h3>
          <div className="space-y-3">
            <p className="font-bold text-lg text-slate-800">{order.restaurant_name}</p>
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <MapPin size={16} />
              {order.restaurant_address}
            </div>
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Phone size={16} />
              {order.restaurant_phone}
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Package className="text-indigo-600" size={20} />
            Детали за нарачката
          </h3>
          <div className="space-y-4">
            {items.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between items-start py-3 border-b border-slate-50 last:border-0">
                <div>
                  <p className="font-bold text-slate-800">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    {Object.entries(item.selectedModifiers || {}).map(([key, val]: any) => 
                      `${key}: ${Array.isArray(val) ? val.join(', ') : val}`
                    ).join(' | ')}
                  </p>
                </div>
                <p className="font-bold text-slate-800">{item.finalPrice} ден.</p>
              </div>
            ))}
            <div className="pt-4 flex justify-between items-center border-t border-slate-100">
              <span className="font-black text-lg text-slate-800">Вкупно</span>
              <span className="font-black text-2xl text-indigo-600">{order.total_price} ден.</span>
            </div>
          </div>
        </div>

        {/* QR Code for sharing */}
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100 text-center">
          <h3 className="font-bold text-slate-800 mb-2">Сподели следење</h3>
          <p className="text-xs text-slate-500 mb-6">Скенирајте го овој код за да ја следите нарачката на друг уред</p>
          {qrCode && (
            <div className="inline-block p-4 bg-white border-4 border-slate-50 rounded-3xl shadow-inner">
              <img src={qrCode} alt="Tracking QR" className="w-48 h-48" />
            </div>
          )}
          <div className="mt-6">
            <button 
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('Линкот е копиран!');
              }}
              className="text-indigo-600 font-bold text-sm flex items-center justify-center gap-2 mx-auto hover:underline"
            >
              <ExternalLink size={16} />
              Копирај линк
            </button>
          </div>
        </div>
      </main>
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
