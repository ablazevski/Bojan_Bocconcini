import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, ShoppingBag, MapPin, Plus, X, Map, ChevronRight, ChevronLeft, CheckCircle, LogIn, LogOut, Award, ExternalLink, DollarSign, Facebook, Instagram, Twitter, Linkedin, Users } from 'lucide-react';
import { motion } from 'motion/react';
import LocationPickerMap from '../components/LocationPickerMap';

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
  restaurant_id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  subcategory: string;
  modifiers: ModifierGroup[];
}

interface CartItem extends MenuItem {
  cartId: string;
  selectedModifiers: Record<string, string | string[]>;
  finalPrice: number;
}

export default function Customer() {
  const [step, setStep] = useState<'city' | 'location' | 'restaurants' | 'menu' | 'cart' | 'checkout' | 'success'>('city');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [availableRestaurants, setAvailableRestaurants] = useState<any[]>([]);
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string | string[]>>({});
  const [globalSettings, setGlobalSettings] = useState<Record<string, string>>({});
  const [user, setUser] = useState<any>(null);
  const [lastOrderTrackingTokens, setLastOrderTrackingTokens] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [selectedFees, setSelectedFees] = useState<Record<number, string[]>>({}); // restaurantId -> feeNames[]
  const [trackCode, setTrackCode] = useState('');
  const [trackingError, setTrackingError] = useState('');
  
  const [groupOrderCode, setGroupOrderCode] = useState<string | null>(null);
  const [groupOrderData, setGroupOrderData] = useState<any>(null);
  const [isGroupOrderCreator, setIsGroupOrderCreator] = useState(false);
  const [groupOrderUserName, setGroupOrderUserName] = useState('');
  const [joiningGroup, setJoiningGroup] = useState(false);
  const [groupCodeInput, setGroupCodeInput] = useState('');

  const [checkoutForm, setCheckoutForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: ''
  });

  const sliderRef = useRef<HTMLDivElement>(null);

  const scrollSlider = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const scrollAmount = 200;
      sliderRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };
  
  useEffect(() => {
    fetchSettings();

    fetch('/api/customer/cities')
      .then(res => res.json())
      .then(data => setCities(data));
      
    fetch('/api/customer/campaigns/active')
      .then(res => res.json())
      .then(data => {
        setActiveCampaigns(data);
        if (data.length > 0) {
          // Auto-select the first invisible campaign if it exists, otherwise the first visible one
          const invisibleCampaign = data.find((c: any) => !c.is_visible);
          if (invisibleCampaign) {
            setSelectedCampaignId(invisibleCampaign.id);
          } else {
            setSelectedCampaignId(data[0].id);
          }
        }
      });

    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        if (parsedCart && parsedCart.length > 0) {
          setCart(parsedCart);
          setSelectedRestaurantId(parsedCart[0].restaurant_id);
        }
      } catch (e) {
        console.error('Failed to parse cart', e);
      }
    }

    fetchUser();

    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        fetchUser();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleTrackByCode = async () => {
    if (!trackCode || trackCode.length < 4) {
      setTrackingError('Внесете барем 4 карактери');
      return;
    }
    setTrackingError('');
    try {
      const res = await fetch(`/api/orders/track-by-code/${trackCode}`);
      const data = await res.json();
      if (res.ok) {
        window.location.href = `/track/${data.token}`;
      } else {
        setTrackingError(data.error || 'Нарачката не е пронајдена');
      }
    } catch (err) {
      setTrackingError('Грешка при пребарување');
    }
  };

  useEffect(() => {
    if (groupOrderCode) {
      fetchGroupOrder();
      const interval = setInterval(fetchGroupOrder, 5000);
      return () => clearInterval(interval);
    }
  }, [groupOrderCode]);

  const fetchGroupOrder = async () => {
    if (!groupOrderCode) return;
    try {
      const res = await fetch(`/api/group-orders/${groupOrderCode}`);
      const data = await res.json();
      if (data.error) {
        setGroupOrderCode(null);
        setError(data.error);
      } else {
        setGroupOrderData(data);
        if (data.status === 'placed' && data.trackingToken) {
          // Redirect to success or tracking
          window.location.href = `/track/${data.trackingToken}`;
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startGroupOrder = async () => {
    if (!selectedRestaurantId || !groupOrderUserName) return;
    try {
      const res = await fetch('/api/group-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: selectedRestaurantId,
          creator_name: groupOrderUserName,
          creator_email: user?.email || ''
        })
      });
      const data = await res.json();
      setGroupOrderCode(data.code);
      setIsGroupOrderCreator(true);
      setStep('menu');
    } catch (e) {
      setError('Failed to start group order');
    }
  };

  const joinGroupOrder = async () => {
    if (!groupCodeInput || !groupOrderUserName) return;
    try {
      const res = await fetch(`/api/group-orders/${groupCodeInput}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setGroupOrderCode(data.code);
        setSelectedRestaurantId(data.restaurant_id);
        setIsGroupOrderCreator(false);
        setStep('menu');
        setJoiningGroup(false);
      }
    } catch (e) {
      setError('Failed to join group order');
    }
  };

  const addGroupItem = async (item: MenuItem, modifiers: any, price: number) => {
    if (!groupOrderCode || !groupOrderUserName) return;
    try {
      await fetch(`/api/group-orders/${groupOrderCode}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: groupOrderUserName,
          item_id: item.id,
          item_name: item.name,
          price: price,
          quantity: 1,
          modifiers
        })
      });
      fetchGroupOrder();
    } catch (e) {
      setError('Failed to add item to group order');
    }
  };

  const removeGroupItem = async (itemId: number) => {
    if (!groupOrderCode) return;
    try {
      await fetch(`/api/group-orders/${groupOrderCode}/items/${itemId}`, {
        method: 'DELETE'
      });
      fetchGroupOrder();
    } catch (e) {
      setError('Failed to remove item');
    }
  };

  const finalizeGroupOrder = async () => {
    if (!groupOrderCode || !isGroupOrderCreator) return;
    setStep('checkout');
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (data.delivery_fee) setDeliveryFee(Number(data.delivery_fee));
      setGlobalSettings(data);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setCheckoutForm(prev => ({
          ...prev,
          firstName: data.name?.split(' ')[0] || '',
          lastName: data.name?.split(' ').slice(1).join(' ') || '',
          email: data.email || ''
        }));
      } else {
        setUser(null);
      }
    } catch (e) {
      setUser(null);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      const { url } = await res.json();
      window.open(url, 'google_oauth', 'width=600,height=700');
    } catch (e) {
      console.error('Failed to get Google Auth URL', e);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  useEffect(() => {
    if (location) {
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${location[0]}&lon=${location[1]}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.address) {
            const road = data.address.road || data.address.pedestrian || data.address.suburb || '';
            const houseNumber = data.address.house_number || '';
            const newAddress = `${road} ${houseNumber}`.trim();
            if (newAddress) {
              setCheckoutForm(prev => ({ ...prev, address: newAddress }));
            }
          }
        })
        .catch(err => console.error('Error fetching address:', err));
    }
  }, [location]);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    setStep('location');
  };

  const handleLocationConfirm = async () => {
    if (!location || !selectedCity) return;
    
    const res = await fetch('/api/customer/available', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: selectedCity, lat: location[0], lng: location[1] })
    });
    const data = await res.json();
    
    setAvailableRestaurants(data.restaurants);
    
    // Parse modifiers from JSON string
    const parsedItems = data.items.map((item: any) => ({
      ...item,
      modifiers: typeof item.modifiers === 'string' ? JSON.parse(item.modifiers) : item.modifiers
    }));
    
    setMenuItems(parsedItems);

    if (cart.length > 0) {
      const isRestaurantAvailable = data.restaurants.some((r: any) => r.id === selectedRestaurantId);
      if (isRestaurantAvailable) {
        setStep('cart');
      } else {
        setError('Избраниот ресторан не доставува до вашата локација. Вашата кошничка ќе биде испразнета.');
        setCart([]);
        setSelectedRestaurantId(null);
        setStep('menu');
      }
    } else {
      setStep('menu');
    }
  };

  const openItemModal = (item: MenuItem) => {
    setSelectedItem(item);
    // Initialize default selections for single choice modifiers
    const initialModifiers: Record<string, string | string[]> = {};
    if (item.modifiers) {
      item.modifiers.forEach(group => {
        if (group.type === 'single' && group.options.length > 0) {
          initialModifiers[group.name] = group.options[0].name; // Select first by default
        } else if (group.type === 'multiple') {
          initialModifiers[group.name] = [];
        }
      });
    }
    setSelectedModifiers(initialModifiers);
  };

  const handleModifierChange = (groupName: string, optionName: string, type: 'single' | 'multiple') => {
    setSelectedModifiers(prev => {
      if (type === 'single') {
        return { ...prev, [groupName]: optionName };
      } else {
        const current = (prev[groupName] as string[]) || [];
        if (current.includes(optionName)) {
          return { ...prev, [groupName]: current.filter(n => n !== optionName) };
        } else {
          return { ...prev, [groupName]: [...current, optionName] };
        }
      }
    });
  };

  const calculateFinalPrice = () => {
    if (!selectedItem) return 0;
    let total = selectedItem.price;
    
    if (selectedItem.modifiers) {
      selectedItem.modifiers.forEach(group => {
        const selection = selectedModifiers[group.name];
        if (!selection) return;
        
        if (group.type === 'single') {
          const opt = group.options.find(o => o.name === selection);
          if (opt) total += opt.price;
        } else if (group.type === 'multiple' && Array.isArray(selection)) {
          selection.forEach(selName => {
            const opt = group.options.find(o => o.name === selName);
            if (opt) total += opt.price;
          });
        }
      });
    }
    return total;
  };

  const addToCart = () => {
    if (!selectedItem) return;
    
    const finalPrice = calculateFinalPrice();

    if (groupOrderCode) {
      addGroupItem(selectedItem, selectedModifiers, finalPrice);
      setSelectedItem(null);
      return;
    }
    
    const cartItem: CartItem = {
      ...selectedItem,
      cartId: Math.random().toString(36).substr(2, 9),
      selectedModifiers,
      finalPrice: finalPrice
    };
    
    setCart([...cart, cartItem]);
    setSelectedItem(null);
  };

  const removeFromCart = (cartId: string) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.finalPrice, 0);
  const feesTotal = Object.entries(selectedFees).reduce((total, [restId, feeNames]) => {
    const restaurant = availableRestaurants.find(r => r.id === Number(restId));
    if (!restaurant || !restaurant.payment_config) return total;
    try {
      const config = JSON.parse(restaurant.payment_config);
      const fees = config.fees || [];
      const selectedAmount = fees
        .filter((f: any) => (feeNames as string[]).includes(f.name))
        .reduce((sum: number, f: any) => sum + f.amount, 0);
      return total + selectedAmount;
    } catch (e) {
      return total;
    }
  }, 0);
  
  const selectedCampaign = activeCampaigns.find(c => c.id === selectedCampaignId);
  const finalTotal = Math.max(0, cartTotal + (selectedCampaign ? selectedCampaign.budget : 0) + deliveryFee + feesTotal);

  const isPointInPolygon = (point: [number, number], vs: [number, number][]) => {
    let x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      let xi = vs[i][0], yi = vs[i][1];
      let xj = vs[j][0], yj = vs[j][1];
      let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const getCartAllowedZones = () => {
    const cartRestaurantIds = [...new Set(cart.map(item => item.restaurant_id))];
    const cartRestaurants = availableRestaurants.filter(r => cartRestaurantIds.includes(r.id));
    return cartRestaurants.flatMap(r => {
      try {
        return JSON.parse(r.delivery_zones || '[]');
      } catch (e) {
        return [];
      }
    });
  };

  const isLocationValid = () => {
    if (!location) return false;
    const allowedZones = getCartAllowedZones();
    if (allowedZones.length === 0) return true; // If no zones defined, assume valid
    for (const zone of allowedZones) {
      if (isPointInPolygon(location, zone)) return true;
    }
    return false;
  };

  const handleCheckoutSubmit = async (e: any) => {
    e.preventDefault();
    if (!isLocationValid()) return;
    
    if (groupOrderCode && isGroupOrderCreator) {
      const res = await fetch(`/api/group-orders/${groupOrderCode}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_phone: checkoutForm.phone,
          delivery_address: checkoutForm.address,
          delivery_lat: location![0],
          delivery_lng: location![1]
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setLastOrderTrackingTokens(data.trackingTokens || {});
        setCart([]);
        setGroupOrderCode(null);
        setGroupOrderData(null);
        setStep('success');
      } else {
        const data = await res.json();
        setError(data.error || 'Настана грешка при финализирање на групната нарачка.');
      }
      return;
    }

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: `${checkoutForm.firstName} ${checkoutForm.lastName}`,
        customer_email: checkoutForm.email,
        customer_phone: checkoutForm.phone,
        delivery_address: checkoutForm.address,
        delivery_lat: location![0],
        delivery_lng: location![1],
        items: cart,
        campaign_id: selectedCampaignId,
        user_id: user?.id,
        payment_method: paymentMethod,
        selected_fees: JSON.stringify(selectedFees)
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      setLastOrderTrackingTokens(data.trackingTokens || {});
      setCart([]);
      setStep('success');
    } else {
      const data = await res.json();
      setError(data.error || 'Настана грешка при процесирање на нарачката.');
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Group items by category and subcategory
  const restaurantItems = selectedRestaurantId 
    ? menuItems.filter(item => item.restaurant_id === selectedRestaurantId)
    : menuItems;

  const filteredItems = restaurantItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );
    
  const groupedItems = filteredItems.reduce((acc, item) => {
    const cat = item.category || 'Општо';
    const sub = item.subcategory || 'Останато';
    if (!acc[cat]) acc[cat] = {};
    if (!acc[cat][sub]) acc[cat][sub] = [];
    acc[cat][sub].push(item);
    return acc;
  }, {} as Record<string, Record<string, MenuItem[]>>);

  return (
    <div 
      className="min-h-screen bg-orange-50/50 pb-20 bg-cover bg-center bg-fixed relative"
      style={globalSettings.customer_background_url ? { backgroundImage: `url(${globalSettings.customer_background_url})` } : {}}
    >
      {globalSettings.customer_background_url && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-0"></div>
      )}
      
      <div className="relative z-10">
        <header className="bg-white/90 backdrop-blur-md border-b border-orange-100 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            {globalSettings.company_logo_url ? (
              <img src={globalSettings.company_logo_url} alt="Logo" className="h-8 object-contain" />
            ) : (
              <h1 className="text-xl font-extrabold text-orange-600 tracking-tight">{globalSettings.company_name || 'PizzaTime'}</h1>
            )}
          </div>
          
          {step !== 'city' && step !== 'success' && (
            <div className="hidden md:flex flex-col items-center justify-center text-slate-500 text-sm font-medium">
              <span className="text-orange-600 font-bold capitalize">
                {currentTime.toLocaleDateString('mk-MK', { weekday: 'long' })}
              </span>
              <span>
                {currentTime.toLocaleDateString('mk-MK', { day: '2-digit', month: '2-digit', year: 'numeric' })} • {currentTime.toLocaleTimeString('mk-MK', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}

          <div className="flex items-center gap-4">
            {step === 'menu' && !groupOrderCode && (
              <button 
                onClick={() => setJoiningGroup(true)}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors"
              >
                <Users size={18} />
                Приклучи се на група
              </button>
            )}
            {groupOrderCode && (
              <div className="hidden md:flex items-center gap-3 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Групна нарачка</span>
                  <span className="text-sm font-black text-indigo-700">{groupOrderCode}</span>
                </div>
                <Users size={18} className="text-indigo-500" />
              </div>
            )}
            {step === 'menu' && (
              <button onClick={() => setStep('cart')} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full relative">
                <ShoppingBag size={24} />
                {cart.length > 0 && (
                  <span className="absolute top-0 right-0 w-5 h-5 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {cart.length}
                  </span>
                )}
              </button>
            )}
          </div>
        </header>
        
        <main className="max-w-5xl mx-auto p-6">
          {joiningGroup && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-800">Приклучи се на група</h3>
                  <button onClick={() => setJoiningGroup(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Вашето име</label>
                    <input 
                      type="text" 
                      value={groupOrderUserName}
                      onChange={e => setGroupOrderUserName(e.target.value)}
                      placeholder="Внесете име..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Код за група</label>
                    <input 
                      type="text" 
                      value={groupCodeInput}
                      onChange={e => setGroupCodeInput(e.target.value.toUpperCase())}
                      placeholder="Внесете код (напр. ABC123)"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <button 
                    onClick={joinGroupOrder}
                    disabled={!groupOrderUserName || !groupCodeInput}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
                  >
                    Приклучи се
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {groupOrderCode && groupOrderData && (
            <div className="mb-8 bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-600/20">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Users size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Групна нарачка во {availableRestaurants.find(r => r.id === groupOrderData.restaurant_id)?.name}</h3>
                    <p className="text-indigo-100 text-sm">Споделете го кодот <span className="font-black text-white">{groupOrderCode}</span> со вашите пријатели</p>
                  </div>
                </div>
                {isGroupOrderCreator && (
                  <button 
                    onClick={finalizeGroupOrder}
                    className="bg-white text-indigo-600 hover:bg-indigo-50 px-6 py-3 rounded-xl font-bold transition-colors shadow-lg"
                  >
                    Финализирај нарачка ({groupOrderData.items?.length || 0} производи)
                  </button>
                )}
              </div>
              
              {groupOrderData.items?.length > 0 && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-indigo-200 mb-4">Кој што нарача:</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(
                      groupOrderData.items.reduce((acc: any, item: any) => {
                        if (!acc[item.user_name]) acc[item.user_name] = 0;
                        acc[item.user_name]++;
                        return acc;
                      }, {})
                    ).map(([name, count]: [any, any]) => (
                      <div key={name} className="bg-white/10 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        {name} ({count})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        {step === 'city' && (
          <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-3xl shadow-sm border border-orange-100 text-center">
            <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <MapPin size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Изберете град</h2>
            <p className="text-slate-500 mb-8">За да ви ги прикажеме достапните ресторани во вашата околина, ве молиме изберете го вашиот град.</p>
            
            {cities.length === 0 ? (
              <div className="p-4 bg-slate-50 text-slate-500 rounded-xl border border-slate-200">
                Моментално нема активни ресторани на платформата.
              </div>
            ) : (
              <div className="space-y-3">
                {cities.map(city => (
                  <button 
                    key={city}
                    onClick={() => handleCitySelect(city)}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50 transition-colors text-left"
                  >
                    <span className="font-medium text-slate-800">{city}</span>
                    <ChevronRight size={20} className="text-slate-400" />
                  </button>
                ))}
              </div>
            )}

            <div className="mt-12 pt-8 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Следи нарачка преку код</h3>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Внесете ги последните 4 знаци..." 
                  className="flex-1 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none uppercase text-center font-mono tracking-widest"
                  value={trackCode}
                  onChange={e => setTrackCode(e.target.value.toUpperCase())}
                  onKeyPress={e => e.key === 'Enter' && handleTrackByCode()}
                />
                <button 
                  onClick={handleTrackByCode}
                  className="bg-orange-500 text-white px-6 rounded-xl hover:bg-orange-600 transition-colors font-bold"
                >
                  Следи
                </button>
              </div>
              {trackingError && <p className="text-red-500 text-xs mt-2 font-bold">{trackingError}</p>}
              <p className="text-[10px] text-slate-400 mt-4 italic">
                * Кодот се наоѓа на вашата сметка или во потврдата за нарачка.
              </p>
            </div>
          </div>
        )}

        {step === 'location' && (
          <div className="max-w-2xl mx-auto mt-8 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-orange-100">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setStep('city')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Точна локација</h2>
                <p className="text-slate-500 text-sm">Град: {selectedCity}</p>
              </div>
            </div>
            
            <p className="text-slate-600 mb-6">
              Кликнете на мапата за да ја одредите вашата точна локација. Ова ни помага да ви ги прикажеме рестораните кои доставуваат до вас.
            </p>
            
            <div className="mb-6">
              <LocationPickerMap location={location} setLocation={setLocation} city={selectedCity} />
            </div>
            
            <button 
              onClick={handleLocationConfirm}
              disabled={!location}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-colors shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2"
            >
              <Map size={20} />
              Потврди локација и види мени
            </button>
          </div>
        )}

        {step === 'menu' && (
          <>
            <div className="mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div className="flex items-center justify-center gap-2 text-slate-600 bg-white p-3 rounded-xl border border-orange-100 shadow-sm cursor-pointer hover:bg-orange-50 transition-colors whitespace-nowrap" onClick={() => setStep('location')}>
                  <MapPin size={18} className="text-orange-500" />
                  <span className="text-sm font-medium">Локација: {selectedCity} (Промени)</span>
                </div>
                
                <div className="relative flex-1 max-w-2xl mx-auto w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="text" 
                    placeholder="Пребарај пица, паста, салата..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-orange-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-slate-800 text-base"
                  />
                </div>

                <div className="text-sm text-slate-500 bg-white border border-orange-100 shadow-sm px-4 py-3 rounded-xl whitespace-nowrap text-center">
                  Достапни ресторани: <span className="font-bold text-slate-800">{availableRestaurants.length}</span>
                </div>
              </div>
            </div>

            {availableRestaurants.length > 0 && (
              <div className="mb-8 relative group">
                <button 
                  onClick={() => scrollSlider('left')}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -ml-4 z-10 bg-white text-orange-500 p-2 rounded-full shadow-md border border-orange-100 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                >
                  <ChevronLeft size={20} />
                </button>
                
                <div 
                  ref={sliderRef}
                  className="overflow-x-auto pb-2 flex gap-4 scrollbar-hide scroll-smooth"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  <button 
                    onClick={() => setSelectedRestaurantId(null)}
                    className={`px-6 py-3 rounded-2xl font-bold whitespace-nowrap transition-all ${!selectedRestaurantId ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-white text-slate-600 border border-orange-100 hover:bg-orange-50'}`}
                  >
                    Сите ресторани
                  </button>
                  {availableRestaurants.map(rest => (
                    <button 
                      key={rest.id}
                      onClick={() => setSelectedRestaurantId(rest.id)}
                      className={`px-6 py-3 rounded-2xl font-bold whitespace-nowrap transition-all flex items-center gap-3 ${selectedRestaurantId === rest.id ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-white text-slate-600 border border-orange-100 hover:bg-orange-50'}`}
                    >
                      <div className="flex flex-col items-start leading-tight">
                        <div className="flex items-center gap-2">
                          {rest.name}
                          {!rest.is_open && (
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Затворено"></span>
                          )}
                          {rest.is_open && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Отворено"></span>
                          )}
                          {rest.is_open && rest.delivery_delay > 0 && (
                            <span className={`text-[10px] font-bold ${selectedRestaurantId === rest.id ? 'text-white' : 'text-red-500'}`}>
                              +{rest.delivery_delay} мин.
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {rest.is_open ? (
                            <span className={`text-[10px] font-medium ${selectedRestaurantId === rest.id ? 'text-white/80' : 'opacity-70'}`}>
                              {rest.active_orders} нарачки
                            </span>
                          ) : (
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${selectedRestaurantId === rest.id ? 'text-white/90' : 'text-red-400'}`}>
                              Затворено
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {selectedRestaurantId && !groupOrderCode && (
                  <div className="mt-4 flex justify-center">
                    <button 
                      onClick={() => {
                        const name = prompt('Внесете го вашето име за групната нарачка:');
                        if (name) {
                          setGroupOrderUserName(name);
                          startGroupOrder();
                        }
                      }}
                      className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                    >
                      <Users size={20} />
                      Започни групна нарачка
                    </button>
                  </div>
                )}

                <button 
                  onClick={() => scrollSlider('right')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 -mr-4 z-10 bg-white text-orange-500 p-2 rounded-full shadow-md border border-orange-100 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}

            {availableRestaurants.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-orange-100 shadow-sm">
                <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin size={40} />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Нема достава</h3>
                <p className="text-slate-500 max-w-md mx-auto mb-6">
                  За жал, моментално нема ресторани кои вршат достава до вашата избрана локација.
                </p>
                <button onClick={() => setStep('location')} className="bg-orange-100 text-orange-700 hover:bg-orange-200 px-6 py-3 rounded-xl font-bold transition-colors">
                  Промени локација
                </button>
              </div>
            ) : (
              <>
                {Object.entries(groupedItems).map(([category, subcategories]) => (
                  <div key={category} className="mb-12">
                    <h2 className="text-3xl font-extrabold text-slate-800 mb-6 border-b-2 border-orange-200 pb-2 inline-block">{category}</h2>
                    
                    {Object.entries(subcategories).map(([subcategory, items]) => (
                      <div key={subcategory} className="mb-8">
                        <h3 className="text-xl font-bold text-orange-600 mb-4 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                          {subcategory}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {items.map((item) => {
                            const restaurant = availableRestaurants.find(r => r.id === item.restaurant_id);
                            return (
                              <div 
                                key={item.id} 
                                className={`bg-white rounded-3xl overflow-hidden shadow-sm border border-orange-100 hover:shadow-md transition-all group flex flex-col ${restaurant?.is_open ? 'cursor-pointer' : 'cursor-not-allowed grayscale-[0.5]'}`} 
                                onClick={() => restaurant?.is_open && openItemModal(item)}
                              >
                                <div className="h-48 overflow-hidden relative">
                                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                  <div className="absolute top-3 left-3 flex flex-col gap-2">
                                    <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-bold text-slate-700 shadow-sm flex items-center gap-1.5">
                                      <div className={`w-1.5 h-1.5 rounded-full ${restaurant?.is_open ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                      {restaurant?.name || 'Ресторан'}
                                    </div>
                                  </div>
                                </div>
                                <div className="p-5 flex-1 flex flex-col">
                                  <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg text-slate-800">{item.name}</h3>
                                  </div>
                                  <p className="text-sm text-slate-500 mb-4 flex-1 line-clamp-2">{item.description}</p>
                                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-orange-50">
                                    <span className="font-extrabold text-xl text-slate-800">{item.price} <span className="text-sm text-slate-500 font-medium">ден.</span></span>
                                    <button 
                                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${restaurant?.is_open ? 'bg-orange-100 text-orange-700 hover:bg-orange-500 hover:text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                                      disabled={!restaurant?.is_open}
                                    >
                                      {restaurant?.is_open ? (
                                        <>
                                          <Plus size={18} />
                                          Додади
                                        </>
                                      ) : (
                                        'Затворено'
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
                
                {menuItems.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <p>Избраните ресторани моментално немаат производи во менито.</p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {step === 'cart' && (
          <div className="max-w-3xl mx-auto mt-8 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-orange-100">
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setStep('menu')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-2xl font-bold text-slate-800">Вашата кошничка</h2>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 text-lg">Кошничката е празна.</p>
                <button onClick={() => setStep('menu')} className="mt-6 text-orange-600 font-bold hover:underline">
                  Врати се кон менито
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-8">
                  {cart.map(item => (
                    <div key={item.cartId} className="flex gap-4 p-4 border border-slate-100 rounded-2xl bg-slate-50">
                      <img src={item.image_url} alt={item.name} className="w-20 h-20 object-cover rounded-xl" referrerPolicy="no-referrer" />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-slate-800">{item.name}</h3>
                          <button onClick={() => removeFromCart(item.cartId)} className="text-slate-400 hover:text-red-500 transition-colors">
                            <X size={20} />
                          </button>
                        </div>
                        <div className="text-sm text-slate-500 mt-1 space-y-1">
                          {Object.entries(item.selectedModifiers).map(([group, selection]) => {
                            if (Array.isArray(selection)) {
                              return selection.length > 0 ? <p key={group}><span className="font-medium">{group}:</span> {selection.join(', ')}</p> : null;
                            }
                            return selection ? <p key={group}><span className="font-medium">{group}:</span> {selection}</p> : null;
                          })}
                        </div>
                        <div className="mt-2 font-bold text-orange-600">{item.finalPrice} ден.</div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Loyalty & Login Section */}
                <div className="mb-8 p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                        <Award size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">Лојалност и Поени</h3>
                        <p className="text-xs text-slate-500">Поврзете се за да собирате поени</p>
                      </div>
                    </div>
                    {user ? (
                      <button 
                        onClick={handleLogout}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        title="Одјави се"
                      >
                        <LogOut size={20} />
                      </button>
                    ) : (
                      <button 
                        onClick={handleGoogleLogin}
                        className="flex items-center gap-2 bg-white text-slate-700 px-4 py-2 rounded-xl border border-slate-200 font-bold text-sm hover:bg-slate-50 transition-all shadow-sm"
                      >
                        <LogIn size={18} className="text-indigo-600" />
                        Најави се со Google
                      </button>
                    )}
                  </div>

                  {user && (
                    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-indigo-100 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                          {user.name?.[0] || 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{user.name}</p>
                          <p className="text-[10px] text-slate-500">{user.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Ваши Поени</p>
                        <p className="text-xl font-black text-indigo-600">{user.loyalty_points || 0}</p>
                      </div>
                    </div>
                  )}
                  
                  {!user && (
                    <p className="text-xs text-indigo-600/70 italic mt-2">
                      * Со секоја нарачка добивате поени кои ќе можете да ги користите за попусти во иднина.
                    </p>
                  )}
                </div>

                {activeCampaigns.filter(c => (c.is_visible !== 0 && c.is_visible !== false) && (!c.restaurant_id || (cart.length > 0 ? cart.some(item => item.restaurant_id === c.restaurant_id) : c.restaurant_id === selectedRestaurantId))).length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-3">Активни кампањи</h3>
                    <div className="space-y-3">
                      {activeCampaigns.filter(c => (c.is_visible !== 0 && c.is_visible !== false) && (!c.restaurant_id || (cart.length > 0 ? cart.some(item => item.restaurant_id === c.restaurant_id) : c.restaurant_id === selectedRestaurantId))).map(camp => (
                        <label key={camp.id} className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedCampaignId === camp.id ? 'border-orange-500 bg-orange-50' : 'border-slate-100 bg-white hover:border-orange-200'}`}>
                          <div className="pt-1">
                            <input 
                              type="checkbox" 
                              checked={selectedCampaignId === camp.id}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedCampaignId(camp.id);
                                else setSelectedCampaignId(null);
                              }}
                              className="w-5 h-5 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-slate-800">{camp.name}</span>
                              <span className="font-bold text-orange-600">{camp.budget > 0 ? '+' : ''}{camp.budget} ден.</span>
                            </div>
                            <p className="text-sm text-slate-500 mt-1">{camp.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-200 pt-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-500">Вкупно продукти:</span>
                    <span className="font-bold text-slate-700">{cartTotal} ден.</span>
                  </div>
                  {deliveryFee > 0 && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-500">Достава:</span>
                      <span className="font-bold text-slate-700">{deliveryFee} ден.</span>
                    </div>
                  )}
                  {selectedCampaign && selectedCampaign.is_visible !== 0 && selectedCampaign.is_visible !== false && (
                    <div className="flex justify-between items-center mb-4 text-orange-600">
                      <span>{selectedCampaign.name}:</span>
                      <span className="font-bold">{selectedCampaign.budget > 0 ? '+' : ''}{selectedCampaign.budget} ден.</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center mb-6 pt-4 border-t border-slate-100">
                    <span className="text-lg text-slate-600">Вкупно за наплата:</span>
                    <span className="text-3xl font-extrabold text-slate-800">{finalTotal} ден.</span>
                  </div>
                  {feesTotal > 0 && (
                    <div className="flex justify-between items-center mb-2 text-blue-600 px-1">
                      <span className="text-sm text-slate-500">Дополнителни опции:</span>
                      <span className="font-bold">+{feesTotal} ден.</span>
                    </div>
                  )}
                  <button 
                    onClick={() => setStep('checkout')}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl transition-colors shadow-lg shadow-orange-500/30 text-lg"
                  >
                    Продолжи кон наплата
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {step === 'checkout' && (
          <div className="max-w-4xl mx-auto mt-8">
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setStep('cart')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors bg-white shadow-sm">
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-2xl font-bold text-slate-800">Детали за достава</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <form onSubmit={handleCheckoutSubmit} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-orange-100 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Име</label>
                    <input required type="text" value={checkoutForm.firstName} onChange={e => setCheckoutForm({...checkoutForm, firstName: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Презиме</label>
                    <input required type="text" value={checkoutForm.lastName} onChange={e => setCheckoutForm({...checkoutForm, lastName: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Е-маил</label>
                  <input required type="email" value={checkoutForm.email} onChange={e => setCheckoutForm({...checkoutForm, email: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Телефонски број</label>
                  <input required type="tel" value={checkoutForm.phone} onChange={e => setCheckoutForm({...checkoutForm, phone: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Адреса за достава</label>
                  <input required type="text" value={checkoutForm.address} onChange={e => setCheckoutForm({...checkoutForm, address: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all" />
                </div>

                {/* Payment & Extras Section */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-6">
                  <div>
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <DollarSign size={18} className="text-orange-500" />
                      Начин на плаќање
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Get unique payment methods from all restaurants in cart */}
                      {(() => {
                        const cartRestaurantIds = Array.from(new Set(cart.map(item => item.restaurant_id)));
                        const allowedMethods = cartRestaurantIds.reduce((acc: string[], restId) => {
                          const rest = availableRestaurants.find(r => r.id === restId);
                          if (rest && rest.payment_config) {
                            try {
                              const config = JSON.parse(rest.payment_config);
                              if (config.methods) {
                                if (acc.length === 0) return config.methods;
                                return acc.filter(m => config.methods.includes(m));
                              }
                            } catch (e) {}
                          }
                          return acc.length === 0 ? ['cash'] : acc;
                        }, [] as string[]);

                        const methods = (allowedMethods as string[]).length > 0 ? allowedMethods : ['cash'];

                        return (methods as string[]).map(method => (
                          <label key={method} className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === method ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                            <div className="flex items-center gap-3">
                              <input 
                                type="radio" 
                                name="paymentMethod" 
                                value={method} 
                                checked={paymentMethod === method} 
                                onChange={() => setPaymentMethod(method)}
                                className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                              />
                              <span className="font-bold text-slate-700">
                                {method === 'cash' ? 'Готовина' : method === 'card' ? 'Картичка' : 'Поени'}
                              </span>
                            </div>
                            {method === 'points' && user && (
                              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                                {user.loyalty_points || 0} поени
                              </span>
                            )}
                          </label>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* Restaurant Extras (Fees) */}
                  {(() => {
                    const cartRestaurantIds = Array.from(new Set(cart.map(item => item.restaurant_id)));
                    const restaurantsWithFees = cartRestaurantIds.filter(restId => {
                      const rest = availableRestaurants.find(r => r.id === restId);
                      if (rest && rest.payment_config) {
                        try {
                          const config = JSON.parse(rest.payment_config);
                          return config.fees && config.fees.length > 0;
                        } catch (e) {}
                      }
                      return false;
                    });

                    if (restaurantsWithFees.length === 0) return null;

                    return (
                      <div>
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                          <Plus size={18} className="text-orange-500" />
                          Дополнителни опции
                        </h3>
                        <div className="space-y-4">
                          {restaurantsWithFees.map(restId => {
                            const rest = availableRestaurants.find(r => r.id === restId);
                            const config = JSON.parse(rest.payment_config);
                            return (
                              <div key={restId} className="bg-white p-4 rounded-xl border border-slate-200">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-3">{rest.name}</p>
                                <div className="space-y-2">
                                  {config.fees.map((fee: any) => (
                                    <label key={fee.name} className="flex items-center justify-between cursor-pointer group">
                                      <div className="flex items-center gap-3">
                                        <input 
                                          type="checkbox" 
                                          checked={(selectedFees[restId] || []).includes(fee.name)}
                                          onChange={(e) => {
                                            const current = selectedFees[restId] || [];
                                            if (e.target.checked) {
                                              setSelectedFees(prev => ({...prev, [restId as any]: [...current, fee.name]}));
                                            } else {
                                              setSelectedFees(prev => ({...prev, [restId as any]: current.filter(n => n !== fee.name)}));
                                            }
                                          }}
                                          className="w-5 h-5 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                                        />
                                        <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors">{fee.name}</span>
                                      </div>
                                      <span className="text-sm font-bold text-slate-600">+{fee.amount} ден.</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-500">Вкупно продукти:</span>
                    <span className="font-bold text-slate-700">{cartTotal} ден.</span>
                  </div>
                  {deliveryFee > 0 && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-500">Достава:</span>
                      <span className="font-bold text-slate-700">{deliveryFee} ден.</span>
                    </div>
                  )}
                  {selectedCampaign && selectedCampaign.is_visible !== 0 && selectedCampaign.is_visible !== false && (
                    <div className="flex justify-between items-center mb-4 text-orange-600">
                      <span>{selectedCampaign.name}:</span>
                      <span className="font-bold">{selectedCampaign.budget > 0 ? '+' : ''}{selectedCampaign.budget} ден.</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center mb-6 pt-4 border-t border-slate-100">
                    <span className="text-lg text-slate-600">Вкупно за наплата:</span>
                    <span className="text-2xl font-extrabold text-slate-800">{finalTotal} ден.</span>
                  </div>
                  {feesTotal > 0 && (
                    <div className="flex justify-between items-center mb-2 text-blue-600 px-1">
                      <span className="text-sm text-slate-500">Дополнителни опции:</span>
                      <span className="font-bold">+{feesTotal} ден.</span>
                    </div>
                  )}
                  
                  {!isLocationValid() && (
                    <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-xl border border-red-200 text-sm font-medium">
                      Доставата се врши согласно избраната локација за пребарување. Ве молиме поместете го пинот во дозволената зона на ресторанот.
                    </div>
                  )}
                  
                  <button 
                    type="submit"
                    disabled={!isLocationValid()}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-colors shadow-lg shadow-orange-500/30 text-lg"
                  >
                    Потврди нарачка
                  </button>
                </div>
              </form>

              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-orange-100 h-fit">
                <h3 className="font-bold text-slate-800 mb-4">Локација за достава</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Можете да го поместите пинот за попрецизна локација. Пинот мора да биде во рамките на обоените зони (зони на достава на избраните ресторани).
                </p>
                <LocationPickerMap 
                  location={location} 
                  setLocation={setLocation} 
                  city={selectedCity} 
                  allowedZones={getCartAllowedZones()} 
                />
              </div>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="max-w-md mx-auto mt-20 bg-white p-8 rounded-3xl shadow-sm border border-orange-100 text-center">
            <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-4">Успешно ја поставивте вашата нарачка!</h2>
            <p className="text-slate-500 mb-6">
              Вашата нарачка е успешно испратена до ресторанот. Наскоро ќе биде доставена на вашата адреса.
            </p>

            {Object.entries(lastOrderTrackingTokens).length > 0 && (
              <div className="mb-8 space-y-3">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Следете ги вашите нарачки:</p>
                {Object.entries(lastOrderTrackingTokens).map(([orderId, token]) => (
                  <Link 
                    key={orderId} 
                    to={`/track/${token}`}
                    className="flex items-center justify-between p-4 bg-orange-50 border border-orange-100 rounded-2xl text-orange-700 font-bold hover:bg-orange-100 transition-colors"
                  >
                    <span>Нарачка #{orderId}</span>
                    <ExternalLink size={18} />
                  </Link>
                ))}
              </div>
            )}

            <button 
              onClick={() => {
                setStep('city');
                setLocation(null);
                setAvailableRestaurants([]);
                setMenuItems([]);
              }}
              className="bg-orange-100 text-orange-700 hover:bg-orange-200 px-8 py-4 rounded-xl font-bold transition-colors w-full"
            >
              Нова нарачка
            </button>
          </div>
        )}
      </main>
      <footer className="mt-12 pt-12 border-t border-orange-100 relative z-10 pb-12">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="space-y-4">
            {globalSettings.company_logo_url ? (
              <img src={globalSettings.company_logo_url} alt="Logo" className="h-10 object-contain" />
            ) : (
              <h2 className="font-black text-xl text-slate-900 tracking-tight">{globalSettings.company_name || 'PIZZA TIME'}</h2>
            )}
            <p className="text-slate-500 text-sm max-w-xs">
              {globalSettings.company_address || 'Вашиот омилен сервис за нарачка на храна.'}
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-slate-800 uppercase text-xs tracking-widest">Контакт</h4>
            <div className="space-y-2 text-sm text-slate-500">
              {globalSettings.company_phone && <p>Тел: {globalSettings.company_phone}</p>}
              {globalSettings.company_website && (
                <a href={globalSettings.company_website} target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition-colors block">
                  {globalSettings.company_website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          </div>

          <div className="space-y-4 md:text-right">
            <h4 className="font-bold text-slate-800 uppercase text-xs tracking-widest">Следете не</h4>
            <div className="flex gap-4 md:justify-end">
              {globalSettings.company_facebook && (
                <a href={globalSettings.company_facebook} target="_blank" rel="noopener noreferrer" className="p-2 bg-white rounded-full shadow-sm border border-orange-50 text-slate-600 hover:text-blue-600 transition-colors">
                  <Facebook size={18} />
                </a>
              )}
              {globalSettings.company_instagram && (
                <a href={globalSettings.company_instagram} target="_blank" rel="noopener noreferrer" className="p-2 bg-white rounded-full shadow-sm border border-orange-50 text-slate-600 hover:text-pink-600 transition-colors">
                  <Instagram size={18} />
                </a>
              )}
              {globalSettings.company_twitter && (
                <a href={globalSettings.company_twitter} target="_blank" rel="noopener noreferrer" className="p-2 bg-white rounded-full shadow-sm border border-orange-50 text-slate-600 hover:text-blue-400 transition-colors">
                  <Twitter size={18} />
                </a>
              )}
              {globalSettings.company_linkedin && (
                <a href={globalSettings.company_linkedin} target="_blank" rel="noopener noreferrer" className="p-2 bg-white rounded-full shadow-sm border border-orange-50 text-slate-600 hover:text-blue-700 transition-colors">
                  <Linkedin size={18} />
                </a>
              )}
            </div>
            <div className="pt-4">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">
                © {new Date().getFullYear()} {globalSettings.company_name || 'PizzaTime'}. Сите права се задржани.
              </p>
              <Link to="/portal" className="text-[10px] text-slate-300 hover:text-orange-300 transition-colors uppercase font-bold tracking-widest">
                Портал за соработници
              </Link>
            </div>
          </div>
        </div>
      </footer>
      </div>

      {/* Item Customization Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <div className="relative h-48 sm:h-64 flex-shrink-0">
              <img src={selectedItem.image_url} alt={selectedItem.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 bg-white/80 backdrop-blur-md p-2 rounded-full text-slate-800 hover:bg-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-2xl font-bold text-slate-800">{selectedItem.name}</h2>
                <span className="text-xl font-bold text-orange-600">{selectedItem.price} ден.</span>
              </div>
              <p className="text-slate-500 mb-6">{selectedItem.description}</p>

              {selectedItem.modifiers && selectedItem.modifiers.length > 0 && (
                <div className="space-y-6">
                  {selectedItem.modifiers.map((group, gIndex) => (
                    <div key={gIndex}>
                      <div className="flex justify-between items-end mb-3">
                        <h3 className="font-bold text-slate-800">{group.name}</h3>
                        <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-1 rounded">
                          {group.type === 'single' ? 'Изберете 1' : 'Изберете повеќе'}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {group.options.map((opt, oIndex) => {
                          const isSelected = group.type === 'single' 
                            ? selectedModifiers[group.name] === opt.name
                            : (selectedModifiers[group.name] as string[])?.includes(opt.name);
                            
                          return (
                            <div 
                              key={oIndex} 
                              onClick={() => handleModifierChange(group.name, opt.name, group.type)}
                              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${isSelected ? 'border-orange-500 bg-orange-50/50' : 'border-slate-200 hover:border-orange-300'}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`flex items-center justify-center ${group.type === 'single' ? 'w-5 h-5 rounded-full border' : 'w-5 h-5 rounded border'} ${isSelected ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-300'}`}>
                                  {isSelected && group.type === 'single' && <div className="w-2 h-2 bg-white rounded-full" />}
                                  {isSelected && group.type === 'multiple' && <CheckCircle size={14} />}
                                </div>
                                <span className={`font-medium ${isSelected ? 'text-orange-900' : 'text-slate-700'}`}>{opt.name}</span>
                              </div>
                              {opt.price > 0 && (
                                <span className="text-sm text-slate-500">+{opt.price} ден.</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-white flex-shrink-0">
              <button onClick={addToCart} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl flex items-center justify-between px-6 transition-colors shadow-lg shadow-orange-500/30">
                <span>Додади во кошничка</span>
                <span>{calculateFinalPrice()} ден.</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {error && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <X size={40} strokeWidth={3} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-4">Известување</h3>
              <p className="text-slate-600 leading-relaxed mb-8">
                {error}
              </p>
              <button 
                onClick={() => setError(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-slate-900/20"
              >
                Разбрав
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
