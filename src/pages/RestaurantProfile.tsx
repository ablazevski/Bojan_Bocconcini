import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Phone, Clock, ShoppingBag, ArrowLeft, Plus, Minus, Info } from 'lucide-react';

export default function RestaurantProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menu, setMenu] = useState<any[]>([]);
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
              <span className="flex items-center gap-1"><MapPin size={18} className="text-orange-500" /> {restaurant.address}, {restaurant.city}</span>
              <span className="flex items-center gap-1"><Phone size={18} className="text-orange-500" /> {restaurant.phone}</span>
            </div>
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
