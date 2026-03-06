import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Phone, Clock, ShoppingBag, ArrowLeft, Plus, Minus, Info, Star } from 'lucide-react';

export default function RestaurantProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menu, setMenu] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/customer/restaurant/${username}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        setRestaurant(data.restaurant);
        setMenu(data.menu);
        
        // Fetch reviews
        fetch(`/api/restaurants/${data.restaurant.id}/reviews`)
          .then(res => res.json())
          .then(reviewsData => setReviews(reviewsData))
          .catch(err => console.error('Failed to fetch reviews', err));

        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });

    const savedCart = localStorage.getItem('cart');
    if (savedCart) setCart(JSON.parse(savedCart));
  }, [username]);

  const addToCart = (item: any) => {
    const newCart = [...cart, { 
      ...item, 
      cartId: Math.random().toString(36).substr(2, 9),
      selectedModifiers: {},
      finalPrice: item.price
    }];
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const removeFromCart = (cartId: number) => {
    const newCart = cart.filter(item => item.cartId !== cartId);
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <h1 className="text-3xl font-bold text-slate-800 mb-4">Ресторанот не е пронајден</h1>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors">
          Врати се на почетна
        </button>
      </div>
    );
  }

  // Group menu by category
  const groupedMenu = menu.reduce((acc: any, item: any) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Cover Image */}
      <div className="h-64 md:h-80 w-full relative bg-slate-800">
        {restaurant.cover_url ? (
          <img src={restaurant.cover_url} alt="Cover" className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-orange-400 to-red-500 opacity-80"></div>
        )}
        <button 
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 bg-white/20 backdrop-blur-md p-3 rounded-full text-white hover:bg-white/30 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10">
        {/* Restaurant Header Card */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 mb-8 flex flex-col md:flex-row items-center md:items-end gap-6">
          <div className="w-32 h-32 rounded-2xl bg-white shadow-lg p-2 flex-shrink-0">
            {restaurant.logo_url ? (
              <img src={restaurant.logo_url} alt={restaurant.name} className="w-full h-full object-contain rounded-xl" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full bg-orange-100 rounded-xl flex items-center justify-center text-orange-500 font-bold text-2xl">
                {restaurant.name.charAt(0)}
              </div>
            )}
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-2">{restaurant.name}</h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-slate-600">
              {averageRating && (
                <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-sm font-bold border border-amber-100">
                  <Star size={16} fill="currentColor" />
                  {averageRating} ({reviews.length})
                </div>
              )}
              <span className="flex items-center gap-1"><MapPin size={18} className="text-orange-500" /> {restaurant.address}, {restaurant.city}</span>
              <span className="flex items-center gap-1"><Phone size={18} className="text-orange-500" /> {restaurant.phone}</span>
              <div className="relative group">
                <span className="flex items-center gap-1 cursor-help">
                  <Clock size={18} className="text-orange-500" /> 
                  Работно време
                  <Info size={14} className="text-slate-400" />
                </span>
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                  <h4 className="font-bold text-slate-800 mb-3 text-sm border-b border-slate-50 pb-2">Работно време за достава</h4>
                  <div className="space-y-2">
                    {(() => {
                      const days = [
                        { id: 'monday', label: 'Понеделник' },
                        { id: 'tuesday', label: 'Вторник' },
                        { id: 'wednesday', label: 'Среда' },
                        { id: 'thursday', label: 'Четврток' },
                        { id: 'friday', label: 'Петок' },
                        { id: 'saturday', label: 'Сабота' },
                        { id: 'sunday', label: 'Недела' }
                      ];
                      const workingHours = typeof restaurant.working_hours === 'string' 
                        ? JSON.parse(restaurant.working_hours) 
                        : restaurant.working_hours || {};
                      
                      return days.map(day => {
                        const hours = workingHours[day.id];
                        const openTime = hours?.open || hours?.start;
                        const closeTime = hours?.close || hours?.end;
                        return (
                          <div key={day.id} className="flex justify-between text-xs">
                            <span className="text-slate-500">{day.label}</span>
                            <span className="font-medium text-slate-700">
                              {hours?.active && openTime && closeTime ? `${openTime} - ${closeTime}` : <span className="text-red-400">Затворено</span>}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end gap-2">
            {(() => {
              const workingHours = typeof restaurant.working_hours === 'string' 
                ? JSON.parse(restaurant.working_hours) 
                : restaurant.working_hours || {};
              const now = new Date();
              const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
              const dayName = days[now.getDay()];
              const dayHours = workingHours[dayName];
              
              let isOpen = true;
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

              return isOpen ? (
                <span className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  Отворено
                </span>
              ) : (
                <span className="bg-red-100 text-red-700 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  Затворено
                </span>
              );
            })()}
            <span className="text-xs text-slate-400 font-medium">
              {restaurant.has_own_delivery ? 'Сопствена достава' : 'Платформска достава'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Menu Section */}
          <div className="lg:col-span-2 space-y-8">
            {Object.keys(groupedMenu).map(category => (
              <div key={category} className="bg-white rounded-3xl shadow-sm p-6 md:p-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-6 pb-4 border-b border-slate-100">{category}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {groupedMenu[category].map((item: any) => (
                    <div key={item.id} className="group border border-slate-100 rounded-2xl p-4 hover:shadow-md transition-all hover:border-orange-200 bg-slate-50/50 hover:bg-white flex flex-col">
                      {item.image_url && (
                        <div className="w-full h-40 rounded-xl overflow-hidden mb-4 bg-slate-200">
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-slate-800 text-lg leading-tight">{item.name}</h3>
                          <span className="font-extrabold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg text-sm whitespace-nowrap ml-2">{item.price} ден.</span>
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-2 mb-4">{item.description}</p>
                      </div>
                      <button 
                        onClick={() => addToCart(item)}
                        className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 mt-auto"
                      >
                        <Plus size={18} /> Додади
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Reviews Section */}
            <div className="bg-white rounded-3xl shadow-sm p-6 md:p-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-6 pb-4 border-b border-slate-100 flex items-center gap-2">
                <Star className="text-amber-500" /> Рецензии од корисници
              </h2>
              {reviews.length === 0 ? (
                <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p>Сеуште нема рецензии за овој ресторан.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {reviews.map(rev => (
                    <div key={rev.id} className="border-b border-slate-50 pb-6 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-slate-800">{rev.customer_name}</p>
                          <div className="flex items-center gap-1 text-amber-500 mt-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={14} fill={i < rev.rating ? "currentColor" : "none"} />
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-slate-400">{new Date(rev.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-600 text-sm italic">"{rev.comment}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cart Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-xl p-6 sticky top-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                  <ShoppingBag size={20} />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Вашата нарачка</h2>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <ShoppingBag size={48} className="mx-auto text-slate-200 mb-4" />
                  <p>Кошничката е празна</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    {cart.map(item => (
                      <div key={item.cartId} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex-1 pr-4">
                          <h4 className="font-bold text-slate-800 text-sm">{item.name}</h4>
                          <span className="text-orange-600 font-bold text-sm">{item.price} ден.</span>
                        </div>
                        <button 
                          onClick={() => removeFromCart(item.cartId)}
                          className="w-8 h-8 bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 rounded-lg flex items-center justify-center transition-colors shadow-sm"
                        >
                          <Minus size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-slate-100 pt-4 mb-6">
                    <div className="flex justify-between items-center text-lg font-bold text-slate-800">
                      <span>Вкупно:</span>
                      <span>{cartTotal} ден.</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate('/customer')}
                    className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-colors shadow-lg shadow-orange-500/30 text-lg"
                  >
                    Продолжи кон наплата
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
