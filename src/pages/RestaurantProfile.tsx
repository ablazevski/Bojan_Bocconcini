import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, Clock, ShoppingBag, ArrowLeft, Plus, Minus, Info, Star, X, Sun, Moon } from 'lucide-react';
import SEO from '../components/SEO';
import { useTheme } from '../context/ThemeContext';

export default function RestaurantProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menu, setMenu] = useState<any[]>([]);
  const [bundles, setBundles] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string | string[]>>({});
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/customer/restaurant/${username}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        setRestaurant(data.restaurant);
        setBundles(data.bundles || []);
        // Parse modifiers from JSON string
        const parsedMenu = data.menu.map((item: any) => ({
          ...item,
          modifiers: typeof item.modifiers === 'string' ? JSON.parse(item.modifiers) : item.modifiers
        }));
        setMenu(parsedMenu);
        
        // Set initial active category
        if (parsedMenu.length > 0) {
          const firstCat = parsedMenu[0].category || 'Останато';
          setActiveCategory(firstCat);
        } else if (data.bundles && data.bundles.length > 0) {
          setActiveCategory('Пакети');
        }
        
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

  const openItemModal = (item: any) => {
    setSelectedItem(item);
    // Initialize default selections for single choice modifiers
    const initialModifiers: Record<string, string | string[]> = {};
    if (item.modifiers) {
      item.modifiers.forEach((group: any) => {
        if (group.type === 'single' && group.options.length > 0) {
          initialModifiers[group.name] = group.options[0].name; // Select first by default
        } else if (group.type === 'multiple') {
          initialModifiers[group.name] = [];
        }
      });
    }
    setSelectedModifiers(initialModifiers);
  };

  const toggleModifier = (groupName: string, optionName: string, type: 'single' | 'multiple') => {
    setSelectedModifiers(prev => {
      const next = { ...prev };
      if (type === 'single') {
        next[groupName] = optionName;
      } else {
        const current = (next[groupName] as string[]) || [];
        if (current.includes(optionName)) {
          next[groupName] = current.filter(o => o !== optionName);
        } else {
          next[groupName] = [...current, optionName];
        }
      }
      return next;
    });
  };

  const calculateItemPrice = (item: any, modifiers: Record<string, string | string[]>) => {
    let price = item.price;
    if (!item.modifiers) return price;

    item.modifiers.forEach((group: any) => {
      const selection = modifiers[group.name];
      if (Array.isArray(selection)) {
        selection.forEach(sel => {
          const option = group.options.find((o: any) => o.name === sel);
          if (option) price += option.price;
        });
      } else if (selection) {
        const option = group.options.find((o: any) => o.name === selection);
        if (option) price += option.price;
      }
    });
    return price;
  };

  const isBundleAvailable = (bundle: any) => {
    try {
      const days = ['Недела', 'Понеделник', 'Вторник', 'Среда', 'Четврток', 'Петок', 'Сабота'];
      const macedoniaTime = new Date().toLocaleString("en-US", {timeZone: "Europe/Skopje"});
      const now = new Date(macedoniaTime);
      const dayName = days[now.getDay()];
      
      const availabilityDays = Array.isArray(bundle.available_days) 
        ? bundle.available_days 
        : (typeof bundle.available_days === 'string' ? JSON.parse(bundle.available_days) : []);
      
      if (availabilityDays.length > 0 && !availabilityDays.includes(dayName)) {
        return false;
      }
      
      if (bundle.start_time && bundle.end_time) {
        const [startH, startM] = bundle.start_time.split(':').map(Number);
        const [endH, endM] = bundle.end_time.split(':').map(Number);
        const currentH = now.getHours();
        const currentM = now.getMinutes();
        
        const startTotal = startH * 60 + startM;
        const endTotal = endH * 60 + endM;
        const currentTotal = currentH * 60 + currentM;
        
        if (currentTotal < startTotal || currentTotal > endTotal) {
          return false;
        }
      }
      
      return true;
    } catch (e) {
      console.error("Error checking bundle availability", e);
      return true;
    }
  };

  const handleAddToCart = () => {
    if (!selectedItem) return;

    const finalPrice = selectedItem.isBundle 
      ? selectedItem.price 
      : calculateItemPrice(selectedItem, selectedModifiers);
      
    const newCartItem = {
      ...selectedItem,
      cartId: Math.random().toString(36).substr(2, 9),
      selectedModifiers: selectedItem.isBundle ? {} : { ...selectedModifiers },
      finalPrice
    };

    const newCart = [...cart, newCartItem];
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
    setSelectedItem(null);
  };

  const removeFromCart = (cartId: string) => {
    const newCart = cart.filter(item => item.cartId !== cartId);
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'} p-6`}>
        <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'} mb-4`}>Ресторанот не е пронајден</h1>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors">
          Врати се на почетна
        </button>
      </div>
    );
  }

  // Group menu by category and subcategory
  const groupedMenu = menu.reduce((acc: any, item: any) => {
    const category = item.category || 'Останато';
    if (!acc[category]) acc[category] = {};
    
    const subcategory = item.subcategory || 'Останато';
    if (!acc[category][subcategory]) acc[category][subcategory] = [];
    
    acc[category][subcategory].push(item);
    return acc;
  }, {});

  // Add bundles to grouped menu
  const availableBundles = bundles.filter(isBundleAvailable);
  if (availableBundles.length > 0) {
    groupedMenu['Пакети'] = {
      'Промотивни пакети': availableBundles.map(b => ({ ...b, isBundle: true }))
    };
  }

  const cartTotal = cart.reduce((sum, item) => sum + (item.finalPrice || item.price), 0);

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'} pb-24 transition-colors duration-300`}>
      <SEO 
        title={`${restaurant.name} - Достава на храна во ${restaurant.city}`}
        description={`Нарачајте храна од ${restaurant.name} во ${restaurant.city}. Проверете го менито и нарачајте брза достава до вашиот дом.`}
        ogImage={restaurant.cover_url || restaurant.logo_url}
      />
      {/* Cover Image */}
      <div className="h-64 md:h-80 w-full relative bg-slate-800">
        {restaurant.header_image || restaurant.cover_url ? (
          <img src={restaurant.header_image || restaurant.cover_url} alt="Cover" className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-orange-400 to-red-500 opacity-80"></div>
        )}
        <div className="absolute top-6 left-6 flex gap-4">
          <button 
            onClick={() => navigate('/')}
            className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white hover:bg-white/30 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
        </div>
        <div className="absolute top-6 right-6">
          <button 
            onClick={toggleTheme}
            className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white hover:bg-white/30 transition-colors"
          >
            {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10">
        {/* Restaurant Header Card */}
        <div className={`${theme === 'dark' ? 'bg-slate-900' : 'bg-white'} rounded-3xl shadow-xl p-6 md:p-8 mb-8 flex flex-col md:flex-row items-center md:items-end gap-6 transition-colors`}>
          <div className={`w-32 h-32 rounded-2xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} shadow-lg p-2 flex-shrink-0`}>
            {restaurant.logo_url ? (
              <img src={restaurant.logo_url} alt={restaurant.name} className="w-full h-full object-contain rounded-xl" referrerPolicy="no-referrer" />
            ) : (
              <div className={`w-full h-full ${theme === 'dark' ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-500'} rounded-xl flex items-center justify-center font-bold text-2xl`}>
                {restaurant.name.charAt(0)}
              </div>
            )}
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h1 className={`text-3xl md:text-4xl font-extrabold ${theme === 'dark' ? 'text-white' : 'text-slate-800'} mb-2`}>{restaurant.name}</h1>
            <div className={`flex flex-wrap items-center justify-center md:justify-start gap-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              {averageRating && (
                <div className={`flex items-center gap-1 ${theme === 'dark' ? 'bg-amber-900/30 text-amber-400 border-amber-900/50' : 'bg-amber-50 text-amber-700 border-amber-100'} px-3 py-1 rounded-full text-sm font-bold border`}>
                  <Star size={16} fill="currentColor" />
                  {averageRating} ({reviews.length})
                </div>
              )}
              <span className="flex items-center gap-1"><MapPin size={18} className="text-orange-500" /> {restaurant.address}, {restaurant.city}</span>
              <span className="flex items-center gap-1"><Phone size={18} className="text-orange-500" /> {restaurant.phone}</span>
              <span className="flex items-center gap-1"><ShoppingBag size={18} className="text-orange-500" /> Достава: {restaurant.delivery_fee} ден.</span>
              <span className="flex items-center gap-1"><Info size={18} className="text-orange-500" /> Минимум: {restaurant.min_order_amount} ден.</span>
              <div className="relative group">
                <span className="flex items-center gap-1 cursor-help">
                  <Clock size={18} className="text-orange-500" /> 
                  Работно време
                  <Info size={14} className="text-slate-400" />
                </span>
                <div className={`absolute top-full left-0 mt-2 w-64 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} rounded-2xl shadow-xl border p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50`}>
                  <h4 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'} mb-3 text-sm border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-50'} pb-2`}>Работно време за достава</h4>
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
                            <span className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
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
              // Get current time in Macedonia timezone
              const macedoniaTime = new Date().toLocaleString("en-US", {timeZone: "Europe/Skopje"});
              const now = new Date(macedoniaTime);
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
                <span className={`${theme === 'dark' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'} px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2`}>
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  Отворено
                </span>
              ) : (
                <span className={`${theme === 'dark' ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'} px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2`}>
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
            <div className={`${theme === 'dark' ? 'bg-slate-900' : 'bg-white'} rounded-3xl shadow-sm p-6 md:p-8 transition-colors`}>
              {/* Main Category Tabs */}
              <div className="flex items-baseline gap-8 mb-10 overflow-x-auto no-scrollbar pb-2 border-b border-slate-100 dark:border-slate-800">
                {Object.keys(groupedMenu).map(category => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`transition-all duration-300 whitespace-nowrap relative pb-4 ${
                      activeCategory === category 
                        ? `text-3xl font-extrabold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}` 
                        : `text-xl font-bold ${theme === 'dark' ? 'text-slate-600' : 'text-slate-300'} hover:text-slate-400`
                    }`}
                  >
                    {category}
                    {activeCategory === category && (
                      <motion.div 
                        layoutId="activeCategoryIndicator"
                        className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 rounded-full"
                      />
                    )}
                  </button>
                ))}
              </div>

              {activeCategory && groupedMenu[activeCategory] && (
                <div className="space-y-12">
                  {/* Subcategory Navigation (Pills) */}
                  {Object.keys(groupedMenu[activeCategory]).length > 1 && (
                    <div className="flex flex-wrap gap-2 mb-8">
                      {Object.keys(groupedMenu[activeCategory]).map(sub => (
                        <button
                          key={sub}
                          onClick={() => {
                            const element = document.getElementById(`sub-${activeCategory}-${sub}`);
                            if (element) {
                              const offset = 100;
                              const elementPosition = element.getBoundingClientRect().top;
                              const offsetPosition = elementPosition + window.pageYOffset - offset;
                              window.scrollTo({
                                top: offsetPosition,
                                behavior: "smooth"
                              });
                            }
                          }}
                          className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                            theme === 'dark' 
                              ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700' 
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                          }`}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Items grouped by subcategory */}
                  {Object.keys(groupedMenu[activeCategory]).map(subcategory => (
                    <div key={subcategory} id={`sub-${activeCategory}-${subcategory}`} className="scroll-mt-24">
                      {subcategory !== 'Останато' && (
                        <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'} mb-6 flex items-center gap-2`}>
                          <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
                          {subcategory}
                        </h3>
                      )}
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {groupedMenu[activeCategory][subcategory].map((item: any) => (
                          <div 
                            key={item.id} 
                            onClick={() => openItemModal(item)}
                            className={`group cursor-pointer border ${theme === 'dark' ? 'border-slate-800 hover:border-orange-900/50 bg-slate-800/50 hover:bg-slate-800' : 'border-slate-100 hover:border-orange-200 bg-slate-50/50 hover:bg-white'} rounded-2xl p-4 hover:shadow-md transition-all flex flex-col`}
                          >
                            {item.image_url && (
                              <div className={`w-full h-40 rounded-xl overflow-hidden mb-4 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-2">
                                <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'} text-lg leading-tight group-hover:text-orange-500 transition-colors`}>{item.name}</h3>
                                <span className={`font-extrabold ${theme === 'dark' ? 'text-orange-400 bg-orange-900/30' : 'text-orange-600 bg-orange-50'} px-2 py-1 rounded-lg text-sm whitespace-nowrap ml-2`}>{item.price} ден.</span>
                              </div>
                              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} line-clamp-2 mb-4`}>{item.description}</p>
                            </div>
                            <div className={`w-full py-3 ${theme === 'dark' ? 'bg-slate-700 group-hover:bg-orange-600' : 'bg-slate-800 group-hover:bg-orange-500'} text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 mt-auto`}>
                              <Plus size={18} /> Додади
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reviews Section */}
            <div className={`${theme === 'dark' ? 'bg-slate-900' : 'bg-white'} rounded-3xl shadow-sm p-6 md:p-8 transition-colors`}>
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'} mb-6 pb-4 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'} flex items-center gap-2`}>
                <Star className="text-amber-500" /> Рецензии од корисници
              </h2>
              {reviews.length === 0 ? (
                <div className={`text-center py-12 ${theme === 'dark' ? 'text-slate-500 bg-slate-800/50 border-slate-700' : 'text-slate-400 bg-slate-50 border-slate-200'} rounded-2xl border border-dashed`}>
                  <p>Сеуште нема рецензии за овој ресторан.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {reviews.map(rev => (
                    <div key={rev.id} className={`border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-50'} pb-6 last:border-0 last:pb-0`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{rev.customer_name}</p>
                          <div className="flex items-center gap-1 text-amber-500 mt-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={14} fill={i < rev.rating ? "currentColor" : "none"} />
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-slate-400">{new Date(rev.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} text-sm italic`}>"{rev.comment}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cart Sidebar */}
          <div className="lg:col-span-1">
            <div className={`${theme === 'dark' ? 'bg-slate-900' : 'bg-white'} rounded-3xl shadow-xl p-6 sticky top-6 transition-colors`}>
              <div className={`flex items-center gap-3 mb-6 pb-4 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className={`w-10 h-10 ${theme === 'dark' ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-600'} rounded-xl flex items-center justify-center`}>
                  <ShoppingBag size={20} />
                </div>
                <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Вашата нарачка</h2>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <ShoppingBag size={48} className={`mx-auto ${theme === 'dark' ? 'text-slate-800' : 'text-slate-200'} mb-4`} />
                  <p>Кошничката е празна</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    {cart.map(item => (
                      <div key={item.cartId} className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'} p-3 rounded-xl border`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 pr-4">
                            <h4 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'} text-sm`}>{item.name}</h4>
                            <span className={`font-bold text-sm ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>{item.finalPrice || item.price} ден.</span>
                          </div>
                          <button 
                            onClick={() => removeFromCart(item.cartId)}
                            className={`${theme === 'dark' ? 'bg-slate-700 border-slate-600 text-slate-400 hover:text-red-400 hover:border-red-900/50' : 'bg-white border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200'} w-8 h-8 border rounded-lg flex items-center justify-center transition-colors shadow-sm`}
                          >
                            <Minus size={16} />
                          </button>
                        </div>
                        <div className={`text-[10px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} space-y-0.5`}>
                          {Object.entries(item.selectedModifiers || {}).map(([group, selection]) => {
                            if (Array.isArray(selection)) {
                              return selection.length > 0 ? <p key={group}><span className="font-medium">{group}:</span> {(selection as any[]).join(', ')}</p> : null;
                            }
                            return selection ? <p key={group}><span className="font-medium">{group}:</span> {selection as any}</p> : null;
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={`border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'} pt-4 mb-6`}>
                    <div className={`flex justify-between items-center text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                      <span>Вкупно:</span>
                      <span>{cartTotal} ден.</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate(`/customer?checkout=true&restaurantId=${restaurant.id}`)}
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
      {/* Item Customization Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`${theme === 'dark' ? 'bg-slate-900' : 'bg-white'} rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]`}
            >
              <div className="relative h-64 flex-shrink-0">
                <img src={selectedItem.image_url} alt={selectedItem.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-md transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 md:p-8 overflow-y-auto flex-1">
                <div className="mb-6">
                  <h3 className={`text-3xl font-extrabold ${theme === 'dark' ? 'text-white' : 'text-slate-800'} mb-2`}>{selectedItem.name}</h3>
                  <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} leading-relaxed`}>{selectedItem.description}</p>
                </div>

                {selectedItem.modifiers && selectedItem.modifiers.length > 0 && !selectedItem.isBundle && (
                  <div className="space-y-8">
                    {selectedItem.modifiers.map((group: any) => (
                      <div key={group.name} className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'} p-6 rounded-3xl border`}>
                        <div className="flex justify-between items-center mb-4">
                          <h4 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'} text-lg`}>{group.name}</h4>
                          <span className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-500 bg-slate-900 border-slate-700' : 'text-slate-400 bg-white border-slate-100'} px-2 py-1 rounded-lg border`}>
                            {group.type === 'single' ? 'Еден избор' : 'Повеќе избори'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {group.options.map((option: any) => {
                            const isSelected = group.type === 'single' 
                              ? selectedModifiers[group.name] === option.name
                              : (selectedModifiers[group.name] as string[])?.includes(option.name);
                            
                            return (
                              <button
                                key={option.name}
                                onClick={() => toggleModifier(group.name, option.name, group.type)}
                                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                                  isSelected 
                                    ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-md shadow-orange-200' 
                                    : `${theme === 'dark' ? 'border-slate-700 bg-slate-700 hover:border-orange-900/50 text-slate-300' : 'border-white bg-white hover:border-orange-200 text-slate-600'}`
                                }`}
                              >
                                <span className="font-bold">{option.name}</span>
                                {option.price > 0 && (
                                  <span className={`text-sm font-black ${isSelected ? 'text-orange-600' : 'text-slate-400'}`}>
                                    +{option.price} ден.
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedItem.isBundle && selectedItem.items && (
                  <div className="space-y-4">
                    <h4 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'} text-lg mb-4`}>Производи во пакетот:</h4>
                    <div className="grid grid-cols-1 gap-3">
                      {selectedItem.items.map((bi: any) => (
                        <div key={bi.id} className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'} p-4 rounded-2xl border flex flex-col gap-2`}>
                          <div className="flex justify-between items-center">
                            <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{bi.name}</span>
                            <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Количина: {bi.quantity}</span>
                          </div>
                          {bi.modifiers && bi.modifiers.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {bi.modifiers.map((group: any) => (
                                group.options.map((opt: any) => (
                                  <span key={opt.name} className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${theme === 'dark' ? 'bg-slate-900 text-slate-400 border border-slate-700' : 'bg-white text-slate-500 border border-slate-200'}`}>
                                    {opt.name}
                                  </span>
                                ))
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'} p-6 md:p-8 border-t flex items-center justify-between gap-6`}>
                <div className="flex flex-col">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Вкупна цена</span>
                  <span className={`text-3xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                    {selectedItem.isBundle ? selectedItem.price : calculateItemPrice(selectedItem, selectedModifiers)} <span className="text-lg font-bold text-slate-500">ден.</span>
                  </span>
                </div>
                <button 
                  onClick={handleAddToCart}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-2xl font-black text-lg transition-all shadow-lg shadow-orange-500/30 active:scale-95"
                >
                  Додади во кошничка
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
