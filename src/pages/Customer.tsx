import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, ShoppingBag, MapPin, Plus, X, Map, ChevronRight, CheckCircle } from 'lucide-react';
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
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string | string[]>>({});
  
  const [checkoutForm, setCheckoutForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: ''
  });
  
  useEffect(() => {
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
  }, []);

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
    setStep('menu');
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
    
    const cartItem: CartItem = {
      ...selectedItem,
      cartId: Math.random().toString(36).substr(2, 9),
      selectedModifiers,
      finalPrice: calculateFinalPrice()
    };
    
    setCart([...cart, cartItem]);
    setSelectedItem(null);
  };

  const removeFromCart = (cartId: string) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.finalPrice, 0);
  
  const selectedCampaign = activeCampaigns.find(c => c.id === selectedCampaignId);
  const finalTotal = Math.max(0, cartTotal + (selectedCampaign ? selectedCampaign.budget : 0));

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
        campaign_id: selectedCampaignId
      })
    });
    
    if (res.ok) {
      setCart([]);
      setStep('success');
    } else {
      const data = await res.json();
      alert(data.error || 'Настана грешка при процесирање на нарачката.');
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
    <div className="min-h-screen bg-orange-50/50 pb-20">
      <header className="bg-white border-b border-orange-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-orange-50 rounded-full text-orange-500 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-extrabold text-orange-600 tracking-tight">PizzaTime</h1>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2 text-slate-600 bg-white p-3 rounded-xl border border-orange-100 shadow-sm inline-flex cursor-pointer hover:bg-orange-50 transition-colors" onClick={() => setStep('location')}>
                  <MapPin size={18} className="text-orange-500" />
                  <span className="text-sm font-medium">Локација: {selectedCity} (Промени)</span>
                </div>
                
                <div className="text-sm text-slate-500 bg-slate-100 px-4 py-2 rounded-lg">
                  Достапни ресторани: <span className="font-bold text-slate-800">{availableRestaurants.length}</span>
                </div>
              </div>
              
              <div className="relative max-w-2xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Пребарај пица, паста, салата..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white border border-orange-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-slate-800 text-lg"
                />
              </div>
            </div>

            {availableRestaurants.length > 0 && (
              <div className="mb-8 overflow-x-auto pb-2 flex gap-4 no-scrollbar">
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
                    className={`px-6 py-3 rounded-2xl font-bold whitespace-nowrap transition-all ${selectedRestaurantId === rest.id ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-white text-slate-600 border border-orange-100 hover:bg-orange-50'}`}
                  >
                    {rest.name}
                  </button>
                ))}
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
                              <div key={item.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-orange-100 hover:shadow-md transition-all group flex flex-col cursor-pointer" onClick={() => openItemModal(item)}>
                                <div className="h-48 overflow-hidden relative">
                                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-bold text-slate-700 shadow-sm">
                                    {restaurant?.name || 'Ресторан'}
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
                                      className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-xl text-sm font-bold hover:bg-orange-500 hover:text-white transition-colors"
                                    >
                                      <Plus size={18} />
                                      Додади
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
                
                {activeCampaigns.filter(c => c.is_visible !== 0 && c.is_visible !== false).length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-3">Активни кампањи</h3>
                    <div className="space-y-3">
                      {activeCampaigns.filter(c => c.is_visible !== 0 && c.is_visible !== false).map(camp => (
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

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-500">Вкупно продукти:</span>
                    <span className="font-bold text-slate-700">{cartTotal} ден.</span>
                  </div>
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
            <p className="text-slate-500 mb-8">
              Вашата нарачка е успешно испратена до ресторанот. Наскоро ќе биде доставена на вашата адреса.
            </p>
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
    </div>
  );
}
