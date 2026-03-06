import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Clock, MapPin, Phone, Package, ArrowLeft, ExternalLink, ShieldCheck, Star } from 'lucide-react';
import { motion } from 'motion/react';
import QRCode from 'qrcode';

export default function TrackOrder() {
  const { token } = useParams<{ token: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string>('');
  const [isCompleting, setIsCompleting] = useState(false);
  const [review, setReview] = useState({ rating: 5, comment: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

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
    'cancelled': 'Откажана'
  };

  return (
    <div className="min-h-screen bg-[#F5F2ED] pb-20 font-serif">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft size={24} className="text-slate-800" />
          </Link>
          <div className="text-center">
            <h1 className="font-black text-xl text-slate-900 tracking-tight">PIZZA TIME</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-sans font-bold">Tracking Service</p>
          </div>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Status Hero */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 overflow-hidden border border-white"
        >
          <div className="p-10 text-center">
            <div className={`inline-flex items-center gap-2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-8 font-sans ${statusColors[order.status] || 'bg-slate-100'}`}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
              </span>
              {statusLabels[order.status] || order.status}
            </div>

            <h2 className="text-5xl font-black text-slate-900 mb-4 tracking-tighter">#{order.id}</h2>
            <p className="text-slate-400 font-sans text-sm mb-12">Нарачано на {new Date(order.created_at).toLocaleString('mk-MK')}</p>

            {/* Visual Stepper */}
            <div className="max-w-md mx-auto mb-12 px-4">
              <div className="relative flex justify-between items-center">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-100"></div>
                <div 
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-indigo-600 transition-all duration-1000"
                  style={{ 
                    width: order.status === 'pending' ? '0%' : 
                           order.status === 'accepted' ? '33%' : 
                           order.status === 'delivering' ? '66%' : 
                           order.status === 'completed' ? '100%' : '0%' 
                  }}
                ></div>
                
                {['pending', 'accepted', 'delivering', 'completed'].map((s, i) => {
                  const isPast = ['pending', 'accepted', 'delivering', 'completed'].indexOf(order.status) >= i;
                  return (
                    <div key={s} className="relative z-10 flex flex-col items-center">
                      <div className={`w-4 h-4 rounded-full border-4 transition-all duration-500 ${isPast ? 'bg-indigo-600 border-indigo-100' : 'bg-white border-slate-100'}`}></div>
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
                className="w-full max-w-sm bg-slate-900 text-white py-5 rounded-3xl font-sans font-black text-sm uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-900/20 disabled:opacity-50"
              >
                {isCompleting ? 'Се процесира...' : 'Потврди прием'}
              </button>
            )}

            {order.status === 'completed' && (
              <div className="space-y-6">
                <div className="inline-flex items-center gap-3 px-8 py-4 bg-emerald-50 rounded-full text-emerald-700 font-sans font-black text-xs uppercase tracking-widest border border-emerald-100">
                  <ShieldCheck size={20} />
                  Успешно доставено
                </div>

                {!reviewSubmitted ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md mx-auto mt-8 p-8 bg-slate-50 rounded-[32px] border border-slate-100"
                  >
                    <h3 className="font-serif text-2xl font-black text-slate-900 mb-2">Како беше храната?</h3>
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
                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-sans text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
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
                    className="mt-8 p-6 bg-emerald-50 text-emerald-700 rounded-2xl font-sans font-bold text-sm"
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
            <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-slate-200/30 border border-white">
              <h3 className="font-sans font-black text-[10px] uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                <Store size={14} />
                Ресторан
              </h3>
              <div className="space-y-4 font-sans">
                <p className="font-serif text-2xl font-black text-slate-900">{order.restaurant_name}</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-slate-500 text-sm">
                    <MapPin size={16} className="text-indigo-600" />
                    {order.restaurant_address}
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 text-sm">
                    <Phone size={16} className="text-indigo-600" />
                    {order.restaurant_phone}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-slate-200/30 border border-white">
              <h3 className="font-sans font-black text-[10px] uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                <Package size={14} />
                Вашата Нарачка
              </h3>
              <div className="space-y-6 font-sans">
                {items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-start">
                    <div>
                      <p className="font-serif text-lg font-black text-slate-900">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">
                        {Object.entries(item.selectedModifiers || {}).map(([key, val]: any) => 
                          `${key}: ${Array.isArray(val) ? val.join(', ') : val}`
                        ).join(' • ')}
                      </p>
                    </div>
                    <p className="font-black text-slate-900">{item.finalPrice} ден.</p>
                  </div>
                ))}
                <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                  <span className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Вкупно</span>
                  <span className="font-serif text-3xl font-black text-indigo-600">{order.total_price} ден.</span>
                </div>
              </div>
            </div>
          </div>

          {/* QR & Share */}
          <div className="space-y-8">
            <div className="bg-white p-10 rounded-[32px] shadow-xl shadow-slate-200/30 border border-white text-center">
              <h3 className="font-sans font-black text-[10px] uppercase tracking-widest text-slate-400 mb-8">Скенирај за следење</h3>
              {qrCode && (
                <div className="inline-block p-6 bg-[#F5F2ED] rounded-[40px] mb-8">
                  <img src={qrCode} alt="Tracking QR" className="w-48 h-48 mix-blend-multiply" />
                </div>
              )}
              <div className="space-y-4">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Линкот е копиран!');
                  }}
                  className="w-full py-4 bg-slate-50 text-slate-900 rounded-2xl font-sans font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                >
                  <ExternalLink size={16} />
                  Копирај линк
                </button>
              </div>
            </div>

            <div className="p-8 bg-indigo-600 rounded-[32px] text-white shadow-xl shadow-indigo-600/20">
              <h4 className="font-sans font-black text-[10px] uppercase tracking-widest opacity-60 mb-4">Помош</h4>
              <p className="font-serif text-lg leading-tight mb-6">Имате проблем со нарачката? Контактирајте го ресторанот директно.</p>
              <a 
                href={`tel:${order.restaurant_phone}`}
                className="inline-flex items-center gap-2 font-sans font-black text-xs uppercase tracking-widest bg-white/20 hover:bg-white/30 px-6 py-3 rounded-full transition-all"
              >
                <Phone size={16} />
                Повикај сега
              </a>
            </div>
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
