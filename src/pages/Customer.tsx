import { RestaurantCard } from '../components/RestaurantCard';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Search, ShoppingBag, MapPin, Plus, X, Map, ChevronRight, ChevronLeft, CheckCircle, LogIn, LogOut, Award, ExternalLink, DollarSign, Facebook, Instagram, Twitter, Linkedin, Users, Sun, Moon, ArrowRight, Info, Sparkles, GraduationCap, Star, Bike, Store, Clock, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import LocationPickerMap from '../components/LocationPickerMap';
import { useTheme } from '../context/ThemeContext';
import { safeFetchJson } from '../utils/api';

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
  isBundle?: boolean;
  items?: any[];
  availability_days?: string;
  availability_times?: string;
}

interface CartItem extends MenuItem {
  cartId: string;
  selectedModifiers: Record<string, string | string[]>;
  finalPrice: number;
}

export default function Customer() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [step, setStep] = useState<'city' | 'location' | 'restaurants' | 'menu' | 'cart' | 'checkout' | 'success'>('city');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);
  const [selectedRestaurantUsername, setSelectedRestaurantUsername] = useState<string | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [availableRestaurants, setAvailableRestaurants] = useState<any[]>([]);
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [bundles, setBundles] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [orderType, setOrderType] = useState<'delivery' | 'takeaway'>('delivery');
  const [pickupTime, setPickupTime] = useState({ hour: '12', minute: '00' });
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  
  const validateAndSnapPickupTime = (h: string, m: string) => {
    const now = new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/Skopje"}));
    const minAllowedTime = new Date(now.getTime() + 30 * 60000);
    
    const selectedTime = new Date();
    selectedTime.setHours(Number(h));
    selectedTime.setMinutes(Number(m));
    selectedTime.setSeconds(0);
    selectedTime.setMilliseconds(0);
    
    if (selectedTime < minAllowedTime) {
      // Snap to valid time
      const snappedMinutes = Math.ceil(minAllowedTime.getMinutes() / 15) * 15;
      let newHour = minAllowedTime.getHours();
      let newMinute = snappedMinutes;
      
      if (newMinute >= 60) {
        newMinute = 0;
        newHour = (newHour + 1) % 24;
      }
      
      return { 
        hour: newHour.toString().padStart(2, '0'), 
        minute: newMinute.toString().padStart(2, '0')
      };
    }
    return { hour: h, minute: m };
  };

  const handlePickupTimeChange = (newTime: { hour: string, minute: string }) => {
    if (orderType === 'takeaway') {
      setPickupTime(validateAndSnapPickupTime(newTime.hour, newTime.minute));
    } else {
      setPickupTime(newTime);
    }
  };
  const [minOrderAmount, setMinOrderAmount] = useState<number>(0);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string | string[]>>({});
  const [globalSettings, setGlobalSettings] = useState<Record<string, string>>({});
  const [user, setUser] = useState<any>(null);
  const [lastOrderTrackingTokens, setLastOrderTrackingTokens] = useState<Record<number, string>>({});
  const [homeSlider, setHomeSlider] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [selectedFees, setSelectedFees] = useState<Record<number, string[]>>({}); // restaurantId -> feeNames[]
  const [trackCode, setTrackCode] = useState('');
  const [trackingError, setTrackingError] = useState('');
  
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [showOnlyOpen, setShowOnlyOpen] = useState(false);
  const [showFreeDelivery, setShowFreeDelivery] = useState(false);
  
  const [groupOrderCode, setGroupOrderCode] = useState<string | null>(null);
  const [groupOrderData, setGroupOrderData] = useState<any>(null);
  const [isGroupOrderCreator, setIsGroupOrderCreator] = useState(false);
  const [groupOrderUserName, setGroupOrderUserName] = useState('');
  const [joiningGroup, setJoiningGroup] = useState(false);
  const [isStartingGroup, setIsStartingGroup] = useState(false);
  const [groupCodeInput, setGroupCodeInput] = useState('');
  const [showFiltersModal, setShowFiltersModal] = useState(false);

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
    if (selectedRestaurantId) {
      const isAlreadyAvailable = availableRestaurants.some(r => r.id === selectedRestaurantId);
      if (!isAlreadyAvailable) {
        safeFetchJson(`/api/customer/restaurant-by-id/${selectedRestaurantId}`)
          .then(data => {
            if (data && data.restaurant && !data.error) {
              const rest = data.restaurant;
              setAvailableRestaurants(prev => {
                if (prev.some(r => r.id === rest.id)) return prev;
                return [...prev, rest];
              });
            }
          })
          .catch(err => console.error('Failed to fetch restaurant details on selection', err));
      }
    }
  }, [selectedRestaurantId]);

  useEffect(() => {
    fetchSettings();
    fetchHomeSlider();

    // Check for query parameters
    const params = new URLSearchParams(window.location.search);
    const checkoutParam = params.get('checkout');
    const restaurantIdParam = params.get('restaurantId');

    if (checkoutParam === 'true') {
      setStep('checkout');
    }
    if (restaurantIdParam) {
      const rid = Number(restaurantIdParam);
      setSelectedRestaurantId(rid);
      // Fetch restaurant details to get the city
      safeFetchJson(`/api/customer/restaurant-by-id/${rid}`)
        .then(data => {
          if (data.restaurant) {
            const rest = data.restaurant;
            if (rest.city) {
              setSelectedCity(rest.city);
            }
            if (rest.username) {
              setSelectedRestaurantUsername(rest.username);
            }
            // Also add to availableRestaurants if not there
            setAvailableRestaurants(prev => {
              if (prev.some(r => r.id === rest.id)) return prev;
              return [...prev, rest];
            });
          }
        })
        .catch(err => console.error('Failed to fetch restaurant details', err));
    }

    safeFetchJson('/api/customer/cities')
      .then(data => setCities(data))
      .catch(err => console.error('Failed to fetch cities', err));
      
    safeFetchJson('/api/customer/campaigns/active')
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
      })
      .catch(err => console.error('Failed to fetch active campaigns', err));

    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        if (parsedCart && parsedCart.length > 0) {
          setCart(parsedCart);
          const rid = parsedCart[0].restaurant_id;
          setSelectedRestaurantId(rid);
          
          // Fetch restaurant details to populate availableRestaurants for checkout logic
          safeFetchJson(`/api/customer/restaurant-by-id/${rid}`)
            .then(data => {
              if (data && data.restaurant && !data.error) {
                const rest = data.restaurant;
                setAvailableRestaurants(prev => {
                  if (prev.some(r => r.id === rest.id)) return prev;
                  return [...prev, rest];
                });
                if (rest.city && !selectedCity) {
                  setSelectedCity(rest.city);
                }
              }
            })
            .catch(err => console.error('Failed to fetch cart restaurant details', err));
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

  useEffect(() => {
    if (orderType === 'takeaway') {
      const activeId = selectedRestaurantId || (cart.length > 0 ? cart[0].restaurant_id : null);
      const restaurant = availableRestaurants.find(r => r.id === activeId);
      if (restaurant && restaurant.working_hours) {
        try {
          const workingHours = JSON.parse(restaurant.working_hours);
          const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const currentDay = days[new Date().getDay()];
          const dayConfig = workingHours[currentDay];

          if (dayConfig && dayConfig.active) {
            const [startH, startM] = dayConfig.start.split(':').map(Number);
            const [endH, endM] = dayConfig.end.split(':').map(Number);

            const now = new Date();
            const minTime = new Date(now.getTime() + 30 * 60000);
            const minH = minTime.getHours();
            const minM = minTime.getMinutes();

            let limitH = endH;
            let limitM = endM - 15;
            if (limitM < 0) {
              limitH -= 1;
              limitM += 60;
            }

            let effectiveStartH = startH;
            let effectiveStartM = startM;
            if (minH > startH || (minH === startH && minM > startM)) {
              effectiveStartH = minH;
              effectiveStartM = minM;
            }

            const currentH = Number(pickupTime.hour);
            const currentM = Number(pickupTime.minute);

            if (currentH < effectiveStartH || currentH > limitH) {
              setPickupTime({ hour: effectiveStartH.toString().padStart(2, '0'), minute: effectiveStartM.toString().padStart(2, '0') });
            } else if (currentH === effectiveStartH && currentM < effectiveStartM) {
              setPickupTime(prev => ({ ...prev, minute: effectiveStartM.toString().padStart(2, '0') }));
            } else if (currentH === limitH && currentM > limitM) {
              setPickupTime(prev => ({ ...prev, minute: '00' }));
            }
          }
        } catch (e) {}
      }
    }
  }, [orderType, selectedRestaurantId, cart.length, availableRestaurants.length]);

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

  const startGroupOrder = async (nameOverride?: string) => {
    const name = nameOverride || groupOrderUserName;
    if (!selectedRestaurantId || !name) return;
    try {
      const res = await fetch('/api/group-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: selectedRestaurantId,
          creator_name: name,
          creator_email: user?.email || ''
        })
      });
      const data = await res.json();
      setGroupOrderCode(data.code);
      setIsGroupOrderCreator(true);
      setIsStartingGroup(false);
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

  useEffect(() => {
    if (homeSlider.length > 1) {
      const timer = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % homeSlider.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [homeSlider.length]);

  useEffect(() => {
    const updateFees = async () => {
      // Get all unique restaurant IDs from the cart
      const cartRestaurantIds = Array.from(new Set(cart.map(item => item.restaurant_id)));
      
      // Also include selectedRestaurantId if it's not in the cart
      const allNeededIds = Array.from(new Set([...cartRestaurantIds, ...(selectedRestaurantId ? [selectedRestaurantId] : [])]));

      // Fetch any missing restaurants
      for (const rid of allNeededIds) {
        if (!availableRestaurants.find(r => r.id === rid)) {
          try {
            const data = await safeFetchJson(`/api/customer/restaurant-by-id/${rid}`);
            if (data && data.restaurant) {
              const rest = data.restaurant;
              setAvailableRestaurants(prev => {
                if (prev.some(r => r.id === rest.id)) return prev;
                return [...prev, rest];
              });
            }
          } catch (err) {
            console.error(`Failed to fetch restaurant ${rid} for fees:`, err);
          }
        }
      }

      // Update UI states for the "active" restaurant or first cart restaurant
      const activeId = selectedRestaurantId || (cart.length > 0 ? cart[0].restaurant_id : null);
      
      if (activeId) {
        const restaurant = availableRestaurants.find(r => r.id === activeId);
        if (restaurant) {
          console.log(`Setting fees for restaurant ${restaurant.id}: fee=${restaurant.delivery_fee}, min=${restaurant.min_order_amount}`);
          setDeliveryFee(Number(restaurant.delivery_fee || 0));
          setMinOrderAmount(Number(restaurant.min_order_amount || 0));
        }
      } else {
        // If no restaurant selected and cart empty, use global delivery fee
        if (globalSettings.delivery_fee) {
          setDeliveryFee(Number(globalSettings.delivery_fee));
        } else {
          setDeliveryFee(0);
        }
        setMinOrderAmount(0);
      }
    };

    updateFees();
  }, [selectedRestaurantId, availableRestaurants.length, globalSettings, cart.length]);

  const fetchSettings = async () => {
    try {
      const data = await safeFetchJson('/api/settings');
      if (data.delivery_fee) setDeliveryFee(Number(data.delivery_fee));
      setGlobalSettings(data);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const fetchHomeSlider = async () => {
    try {
      const data = await safeFetchJson('/api/customer/home-slider');
      setHomeSlider(data);
    } catch (e) {
      console.error('Failed to fetch home slider', e);
    }
  };

  const fetchUser = async () => {
    try {
      const data = await safeFetchJson('/api/auth/me', undefined, true);
      setUser(data);
      setCheckoutForm(prev => ({
        ...prev,
        firstName: data.name?.split(' ')[0] || '',
        lastName: data.name?.split(' ').slice(1).join(' ') || '',
        email: data.email || ''
      }));
    } catch (e) {
      setUser(null);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { url } = await safeFetchJson('/api/auth/google/url');
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
    
    try {
      const res = await fetch('/api/customer/available', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: selectedCity, lat: location[0], lng: location[1] })
      });
      
      let data;
      try {
        data = await res.json();
      } catch (e) {
        data = { error: 'Настана грешка при вчитување на податоците.' };
      }
      
      if (!res.ok) {
        setError(data.error || 'Настана грешка при проверка на достапноста.');
        return;
      }
      
      setAvailableRestaurants(data.restaurants);
      setBundles(data.bundles || []);
      
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
    } catch (err) {
      console.error('Location confirm error:', err);
      setError('Настана грешка при проверка на достапноста. Ве молиме обидете се повторно.');
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

  const addToCart = () => {
    if (!selectedItem) return;
    
    const finalPrice = selectedItem.isBundle ? selectedItem.price : calculateFinalPrice();

    if (groupOrderCode) {
      addGroupItem(selectedItem, selectedItem.isBundle ? {} : selectedModifiers, finalPrice);
      setSelectedItem(null);
      return;
    }
    
    const cartItem: CartItem = {
      ...selectedItem,
      cartId: Math.random().toString(36).substr(2, 9),
      selectedModifiers: selectedItem.isBundle ? {} : selectedModifiers,
      finalPrice: finalPrice
    };
    
    setCart([...cart, cartItem]);
    setSelectedItem(null);
  };

  const removeFromCart = (cartId: string) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.finalPrice, 0);
  
  // Calculate delivery fee per restaurant in cart
  const cartByRestaurant = cart.reduce((acc, item) => {
    if (!acc[item.restaurant_id]) acc[item.restaurant_id] = [];
    acc[item.restaurant_id].push(item);
    return acc;
  }, {} as Record<number, CartItem[]>);

  const currentDeliveryFee = orderType === 'takeaway' ? 0 : Object.entries(cartByRestaurant).reduce((total, [restId, items]) => {
    const restaurant = availableRestaurants.find(r => r.id === Number(restId));
    const restTotal = items.reduce((sum, item) => sum + item.finalPrice, 0);
    const fee = Number(restaurant?.delivery_fee || 0);
    const min = Number(restaurant?.min_order_amount || 0);
    
    // If min order met, fee is 0 for this restaurant
    const restFee = (min > 0 && restTotal >= min) ? 0 : fee;
    return total + restFee;
  }, 0);

  const takeawayDiscount = orderType === 'takeaway' ? Object.entries(cartByRestaurant).reduce((total, [restId, items]) => {
    const restaurant = availableRestaurants.find(r => r.id === Number(restId));
    if (!restaurant || !restaurant.allow_takeaway) return total;
    const restTotal = items.reduce((sum, item) => sum + item.finalPrice, 0);
    if (restaurant.takeaway_discount_type === 'percent') {
      return total + (restTotal * (Number(restaurant.takeaway_discount_value || 0) / 100));
    } else {
      return total + Number(restaurant.takeaway_discount_value || 0);
    }
  }, 0) : 0;

  // Check if all restaurants in cart meet their minimum order amount
  const isMinOrderMet = Object.entries(cartByRestaurant).every(([restId, items]) => {
    const restaurant = availableRestaurants.find(r => r.id === Number(restId));
    const restTotal = items.reduce((sum, item) => sum + item.finalPrice, 0);
    const min = Number(restaurant?.min_order_amount || 0);
    return min === 0 || restTotal >= min;
  });

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
  const finalTotal = Math.max(0, cartTotal - (selectedCampaign ? selectedCampaign.budget : 0) - takeawayDiscount + currentDeliveryFee + feesTotal);

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
    console.log("handleCheckoutSubmit triggered");
    
    if (orderType !== 'takeaway' && !isLocationValid()) {
      console.log("Location invalid, aborting checkout");
      setError("Ве молиме изберете валидна локација за достава во рамките на дозволените зони.");
      return;
    }
    
    try {
      if (groupOrderCode && isGroupOrderCreator) {
        console.log("Finalizing group order:", groupOrderCode);
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
          let data;
          try {
            data = await res.json();
          } catch (e) {
            data = { error: 'Настана грешка при финализирање на групната нарачка.' };
          }
          setError(data.error || data.message || 'Настана грешка при финализирање на групната нарачка.');
        }
        return;
      }

      if (orderType === 'takeaway') {
        const selectedTime = new Date();
        selectedTime.setHours(Number(pickupTime.hour));
        selectedTime.setMinutes(Number(pickupTime.minute));
        selectedTime.setSeconds(0);
        selectedTime.setMilliseconds(0);
        
        // Use current time in Europe/Skopje timezone for comparison
        const macedoniaNow = new Date(new Date().toLocaleString("en-US", {timeZone: "Europe/Skopje"}));
        
        // Add 30 minutes to current time
        const minAllowedTime = new Date(macedoniaNow.getTime() + 30 * 60000);
        
        if (selectedTime < minAllowedTime) {
          setError("Времето на подигнување треба да биде најмалку 30 минути од сега.");
          return;
        }
      }

      console.log("Creating regular order with payment method:", paymentMethod);
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: `${checkoutForm.firstName} ${checkoutForm.lastName}`,
          customer_email: checkoutForm.email,
          customer_phone: checkoutForm.phone,
          delivery_address: orderType === 'takeaway' ? 'Превземање од ресторан' : checkoutForm.address,
          delivery_lat: orderType === 'takeaway' ? 0 : location![0],
          delivery_lng: orderType === 'takeaway' ? 0 : location![1],
          items: cart,
          campaign_id: selectedCampaignId,
          user_id: user?.id,
          payment_method: paymentMethod,
          selected_fees: JSON.stringify(selectedFees),
          order_type: orderType,
          pickup_time: orderType === 'takeaway' ? `${pickupTime.hour}:${pickupTime.minute}` : null
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log("Order created successfully:", data);
        
        if (paymentMethod === 'card') {
          const orderId = data.orderIds[0];
          console.log("Initiating Payten payment for order:", orderId);
          try {
            const payRes = await fetch('/api/payment/payten/request', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId })
            });
            
            if (payRes.ok) {
              const payData = await payRes.json();
              console.log("Payten request data received, redirecting...");
              const form = document.createElement('form');
              form.method = 'POST';
              form.action = payData.url;
              
              Object.entries(payData.params).forEach(([key, value]) => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = value as string;
                form.appendChild(input);
              });
              
              document.body.appendChild(form);
              form.submit();
              return;
            } else {
              let payErr;
              try {
                payErr = await payRes.json();
              } catch (e) {
                payErr = { error: 'Грешка при иницијализација на плаќањето.' };
              }
              console.error("Payten request failed:", payErr);
              setError(payErr.error || payErr.message || 'Грешка при иницијализација на плаќањето.');
              return;
            }
          } catch (err) {
            console.error("Payten connection error:", err);
            setError('Настана грешка при поврзување со порталот за плаќање.');
            return;
          }
        }

        setLastOrderTrackingTokens(data.trackingTokens || {});
        setCart([]);
        setStep('success');
      } else {
        let data;
        try {
          data = await res.json();
        } catch (e) {
          data = { error: 'Настана грешка при комуникација со серверот.' };
        }
        console.error("Order creation failed:", data);
        setError(data.error || data.message || 'Настана грешка при процесирање на нарачката.');
      }
    } catch (err) {
      console.error("Checkout submit error:", err);
      setError("Настана неочекувана грешка. Ве молиме обидете се повторно.");
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [recommendedItems, setRecommendedItems] = useState<MenuItem[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (menuItems.length > 0) {
      const orderHistory = JSON.parse(localStorage.getItem('orderHistory') || '[]');
      let recommendations: MenuItem[] = [];
      
      if (orderHistory.length > 0) {
        const itemCounts: Record<number, number> = {};
        orderHistory.forEach((order: any) => {
          try {
            const items = JSON.parse(order.items || '[]');
            items.forEach((item: any) => {
              itemCounts[item.id] = (itemCounts[item.id] || 0) + 1;
            });
          } catch (e) {}
        });
        
        const sortedItemIds = Object.entries(itemCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 6)
          .map(([id]) => parseInt(id));
          
        recommendations = menuItems.filter(item => sortedItemIds.includes(item.id));
      }
      
      if (recommendations.length < 6) {
        const popular = menuItems
          .filter(item => !recommendations.find(r => r.id === item.id))
          .slice(0, 6 - recommendations.length);
        recommendations = [...recommendations, ...popular];
      }
      
      setRecommendedItems(recommendations);
    }
  }, [menuItems]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Group items by category and subcategory
  const restaurantItems = selectedRestaurantId 
    ? menuItems.filter(item => item.restaurant_id === selectedRestaurantId)
    : menuItems;

  const specialBadgeName = globalSettings.special_badge_name || 'Студент';
  const specialBadgeAmount = Number(globalSettings.special_badge_amount || '180');

  const restaurantBundles = selectedRestaurantId
    ? bundles.filter(b => b.restaurant_id === selectedRestaurantId && isBundleAvailable(b))
    : bundles.filter(isBundleAvailable);

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

  if (restaurantBundles.length > 0) {
    if (!groupedItems['Пакети']) groupedItems['Пакети'] = {};
    groupedItems['Пакети']['Промотивни пакети'] = restaurantBundles.map(b => ({ ...b, isBundle: true }));
  }

  const isRestaurantOpen = (rest: any) => {
    if (!rest.working_hours) return true;
    try {
      const workingHours = JSON.parse(rest.working_hours);
      const macedoniaTime = new Date().toLocaleString("en-US", {timeZone: "Europe/Skopje"});
      const now = new Date(macedoniaTime);
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = days[now.getDay()];
      const dayHours = workingHours[dayName];

      if (!dayHours || dayHours.active === false) return false;

      const openTime = dayHours.open || dayHours.start;
      const closeTime = dayHours.close || dayHours.end;

      if (openTime && closeTime) {
        const [openH, openM] = openTime.split(':').map(Number);
        const [closeH, closeM] = closeTime.split(':').map(Number);
        const currentH = now.getHours();
        const currentM = now.getMinutes();
        const openTotal = openH * 60 + openM;
        const closeTotal = closeH * 60 + closeM;
        const currentTotal = currentH * 60 + currentM;

        if (currentTotal < openTotal || currentTotal > closeTotal) return false;
      }
      return true;
    } catch (e) {
      return true;
    }
  };

  const getRestaurantCategories = (restId: number) => {
    const categories = new Set<string>();
    menuItems.filter(item => item.restaurant_id === restId).forEach(item => {
      if (item.category) categories.add(item.category);
    });
    return Array.from(categories);
  };

  const allAvailableCategories = Array.from(new Set(availableRestaurants.flatMap(r => getRestaurantCategories(r.id))));

  const filteredRestaurants = availableRestaurants.filter(rest => {
    const matchesCategory = activeFilter === 'all' || getRestaurantCategories(rest.id).includes(activeFilter);
    const matchesOpen = !showOnlyOpen || isRestaurantOpen(rest);
    const matchesFree = !showFreeDelivery || (rest.delivery_fee === 0);
    return matchesCategory && matchesOpen && matchesFree;
  });

  return (
    <div 
      className="min-h-screen bg-orange-50/50 dark:bg-slate-950 pb-20 bg-cover bg-center bg-fixed relative transition-colors duration-300"
      style={globalSettings.customer_background_url ? { backgroundImage: `url(${globalSettings.customer_background_url})` } : {}}
    >
      {globalSettings.customer_background_url && (
        <div className="absolute inset-0 bg-white/60 dark:bg-slate-950/80 backdrop-blur-sm z-0"></div>
      )}
      
      <div className="relative z-10">
        <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-orange-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-20 transition-colors duration-300">
          <div className="flex items-center gap-4">
            {globalSettings.company_logo_url ? (
              <img src={globalSettings.company_logo_url || null} alt="Logo" className="h-8 object-contain" />
            ) : (
              <h1 className="text-xl font-extrabold text-orange-600 dark:text-orange-500 tracking-tight">{globalSettings.company_name || 'PizzaTime'}</h1>
            )}
          </div>
          
          {step !== 'city' && step !== 'success' && (
            <div className="hidden md:flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 text-sm font-medium">
              <span className="text-orange-600 dark:text-orange-400 font-bold capitalize">
                {['Недела', 'Понеделник', 'Вторник', 'Среда', 'Четврток', 'Петок', 'Сабота'][currentTime.getDay()]}
              </span>
              <span>
                {new Intl.DateTimeFormat('mk-MK', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(currentTime)} • {new Intl.DateTimeFormat('mk-MK', { hour: '2-digit', minute: '2-digit', hour12: false }).format(currentTime)}
              </span>
            </div>
          )}

          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              title={theme === 'light' ? 'Префрли во темен режим' : 'Префрли во светол режим'}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            {step === 'menu' && !groupOrderCode && (
              <button 
                onClick={() => setJoiningGroup(true)}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
              >
                <Users size={18} />
                Приклучи се на група
              </button>
            )}
            {groupOrderCode && (
              <div className="hidden md:flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[10px] font-bold text-indigo-400 dark:text-indigo-500 uppercase tracking-wider">Групна нарачка</span>
                  <span className="text-sm font-black text-indigo-700 dark:text-indigo-300">{groupOrderCode}</span>
                </div>
                <Users size={18} className="text-indigo-500 dark:text-indigo-400" />
              </div>
            )}
            {step === 'menu' && (
              <button onClick={() => setStep('cart')} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full relative transition-colors">
                <ShoppingBag size={24} />
                {cart.length > 0 && (
                  <span className="absolute top-0 right-0 w-5 h-5 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
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
                className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-800 transition-colors"
              >
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">Приклучи се на група</h3>
                  <button onClick={() => setJoiningGroup(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Вашето име</label>
                    <input 
                      type="text" 
                      value={groupOrderUserName}
                      onChange={e => setGroupOrderUserName(e.target.value)}
                      placeholder="Внесете име..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Код за група</label>
                    <input 
                      type="text" 
                      value={groupCodeInput}
                      onChange={e => setGroupCodeInput(e.target.value.toUpperCase())}
                      placeholder="Внесете код (напр. ABC123)"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
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
                    className="bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 px-6 py-3 rounded-xl font-bold transition-colors shadow-lg"
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
          <div className="max-w-md mx-auto mt-12 bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-orange-100 dark:border-slate-800 text-center transition-colors duration-300">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <MapPin size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Изберете град</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8">За да ви ги прикажеме достапните ресторани во вашата околина, ве молиме изберете го вашиот град.</p>
            
            {cities.length === 0 ? (
              <div className="p-4 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl border border-slate-200 dark:border-slate-700">
                Моментално нема активни ресторани на платформата.
              </div>
            ) : (
              <div className="space-y-3">
                {cities.map(city => (
                  <button 
                    key={city}
                    onClick={() => handleCitySelect(city)}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-orange-500 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors text-left"
                  >
                    <span className="font-medium text-slate-800 dark:text-slate-200">{city}</span>
                    <ChevronRight size={20} className="text-slate-400 dark:text-slate-500" />
                  </button>
                ))}
              </div>
            )}

            {/* Tracking section removed as per user request */}
          </div>
        )}

        {step === 'location' && (
          <div className="max-w-2xl mx-auto mt-8 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-sm border border-orange-100 dark:border-slate-800 transition-colors duration-300">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setStep('city')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors">
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Точна локација</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Град: {selectedCity}</p>
              </div>
            </div>
            
            <p className="text-slate-600 dark:text-slate-300 mb-6">
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
            {/* Home Slider */}
            {homeSlider.length > 0 && (
              <div className="mb-6 md:mb-12 relative overflow-hidden rounded-2xl md:rounded-[2.5rem] shadow-xl shadow-orange-500/10 group">
                <div className="flex transition-transform duration-700 ease-in-out" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                  {homeSlider.map((slide, idx) => (
                    <div key={idx} className="min-w-full relative aspect-[16/9] md:aspect-[21/7]">
                      <img 
                        src={slide.image_url || null} 
                        alt={slide.cta_text} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent flex items-center p-4 md:p-16">
                        <div className="max-w-xl">
                          <motion.h2 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-lg md:text-5xl font-black text-white mb-3 md:mb-6 leading-tight drop-shadow-lg"
                            dangerouslySetInnerHTML={{ __html: slide.title }}
                          />
                          {slide.cta_link && (
                            <motion.a
                              href={slide.cta_link}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.4 }}
                              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 md:px-8 md:py-4 rounded-lg md:rounded-2xl font-black text-xs md:text-lg transition-all shadow-xl shadow-orange-500/30 hover:scale-105 active:scale-95 group/btn"
                            >
                              {slide.cta_text || 'Нарачај веднаш'}
                              <ArrowRight size={14} className="md:w-[18px] md:h-[18px] group-hover/btn:translate-x-1 transition-transform" />
                            </motion.a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {homeSlider.length > 1 && (
                  <>
                    <button 
                      onClick={() => setCurrentSlide(prev => (prev - 1 + homeSlider.length) % homeSlider.length)}
                      className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-8 h-8 md:w-12 md:h-12 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <ChevronLeft size={20} className="md:w-[24px] md:h-[24px]" />
                    </button>
                    <button 
                      onClick={() => setCurrentSlide(prev => (prev + 1) % homeSlider.length)}
                      className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-8 h-8 md:w-12 md:h-12 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <ChevronRight size={20} className="md:w-[24px] md:h-[24px]" />
                    </button>
                    <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 md:gap-2">
                      {homeSlider.map((_, idx) => (
                        <button 
                          key={idx}
                          onClick={() => setCurrentSlide(idx)}
                          className={`w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-full transition-all ${currentSlide === idx ? 'bg-orange-500 w-4 md:w-8' : 'bg-white/40 hover:bg-white/60'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="mb-4 md:mb-8 sticky top-20 z-10 scale-95 sm:scale-100 origin-top">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl md:rounded-3xl border border-orange-100 dark:border-slate-800 shadow-2xl shadow-orange-500/5 p-1.5 transition-all">
                  <div 
                    onClick={() => setStep('location')}
                    className="flex items-center gap-2 px-3 py-2 md:px-5 md:py-3 bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 rounded-xl md:rounded-2xl cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors flex-shrink-0"
                  >
                    <MapPin size={16} />
                    <span className="text-[10px] md:text-sm font-bold uppercase tracking-tight">{selectedCity}</span>
                  </div>
                  
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                    <input 
                      type="text" 
                      placeholder="Што ви се јаде денес?" 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 md:py-3 bg-transparent border-none focus:ring-0 text-slate-800 dark:text-white text-sm md:text-base font-medium placeholder:text-slate-400"
                    />
                  </div>
                  <button 
                    onClick={() => setShowFiltersModal(true)}
                    className={`p-2 md:p-3 rounded-xl md:rounded-2xl transition-colors flex-shrink-0 ${showOnlyOpen || showFreeDelivery ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-orange-50 dark:hover:bg-orange-900/30'}`}
                  >
                    <SlidersHorizontal size={18} />
                  </button>
                </div>

                {/* Categories Slider - Clean & Minimal */}
                <div className="overflow-x-auto flex items-center gap-2 pb-1 scrollbar-hide">
                  <button 
                    onClick={() => setActiveFilter('all')}
                    className={`px-4 py-2 rounded-xl text-[10px] md:text-sm font-bold whitespace-nowrap transition-all uppercase tracking-wider ${activeFilter === 'all' ? 'bg-slate-900 dark:bg-orange-500 text-white shadow-md' : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-100 dark:border-slate-800'}`}
                  >
                    Сите
                  </button>
                  {allAvailableCategories.slice(0, 12).map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setActiveFilter(cat)}
                      className={`px-4 py-2 rounded-xl text-[10px] md:text-sm font-bold whitespace-nowrap transition-all uppercase tracking-wider ${activeFilter === cat ? 'bg-slate-900 dark:bg-orange-500 text-white shadow-md' : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-100 dark:border-slate-800'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Compact Restaurant Selector */}
            {availableRestaurants.length > 0 && (
              <div className="mb-6 px-1">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Избери ресторан</h3>
                  <div className="text-[10px] font-bold text-orange-500 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/10 px-2 py-0.5 rounded-md">
                    {filteredRestaurants.length} достапни
                  </div>
                </div>
                
                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                  <div 
                    onClick={() => setSelectedRestaurantId(null)}
                    className={`flex-shrink-0 w-24 h-24 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all border-2 ${!selectedRestaurantId ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400'}`}
                  >
                    <div className={`p-2 rounded-xl ${!selectedRestaurantId ? 'bg-white/20' : 'bg-slate-50 dark:bg-slate-800'}`}>
                      <Store size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-tighter">Сите</span>
                  </div>
                  
                  {filteredRestaurants.map(rest => (
                    <RestaurantCard 
                      key={rest.id} 
                      restaurant={rest} 
                      selected={selectedRestaurantId === rest.id}
                      onClick={() => setSelectedRestaurantId(rest.id)}
                      category={getRestaurantCategories(rest.id).slice(0, 1).join(' ')}
                    />
                  ))}
                </div>
              </div>
            )}

                {selectedRestaurantId && !groupOrderCode && (
                  <div className="flex justify-center -mt-2 mb-4">
                    {!isStartingGroup ? (
                      <button 
                        onClick={() => {
                          if (user?.name) {
                            setGroupOrderUserName(user.name);
                            startGroupOrder(user.name);
                          } else {
                            setIsStartingGroup(true);
                          }
                        }}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all"
                      >
                        <Users size={14} />
                        Започни групна нарачка
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-indigo-100 dark:border-indigo-900/30 shadow-xl animate-in slide-in-from-bottom-2">
                        <input 
                          type="text"
                          placeholder="Вашето име..."
                          value={groupOrderUserName}
                          onChange={(e) => setGroupOrderUserName(e.target.value)}
                          className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border-none rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-xs font-medium dark:text-white"
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && startGroupOrder()}
                        />
                        <div className="flex gap-1">
                          <button 
                            onClick={() => startGroupOrder()}
                            disabled={!groupOrderUserName.trim()}
                            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                          >
                            OK
                          </button>
                          <button 
                            onClick={() => setIsStartingGroup(false)}
                            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg text-[10px] font-bold transition-colors"
                          >
                            X
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
            
            {availableRestaurants.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-orange-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin size={40} />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Нема достава</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
                  За жал, моментално нема ресторани кои вршат достава до вашата избрана локација.
                </p>
                <button onClick={() => setStep('location')} className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50 px-6 py-3 rounded-xl font-bold transition-colors">
                  Промени локација
                </button>
              </div>
            ) : (
              <>
                {/* AI Recommendations Section */}
                {!searchTerm && !selectedRestaurantId && globalSettings.show_recommendations !== 'false' && recommendedItems.length > 0 && (
                  <div className="mb-12">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                        <Sparkles className="text-orange-500" />
                        Препорачано за Вас
                      </h2>
                      <span className="text-xs font-bold text-orange-500 uppercase tracking-widest bg-orange-50 dark:bg-orange-900/20 px-3 py-1 rounded-full">AI Powered</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {recommendedItems.map(item => (
                        <div 
                          key={item.id} 
                          onClick={() => openItemModal(item)}
                          className="group cursor-pointer bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 hover:border-orange-200 dark:hover:border-orange-900/50 transition-all hover:shadow-xl hover:shadow-orange-500/10 flex flex-col"
                        >
                          <div className="h-32 overflow-hidden relative">
                            <img src={item.image_url || null} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            {item.price <= specialBadgeAmount && (
                              <div className="absolute top-2 left-2 bg-indigo-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter shadow-lg">
                                {specialBadgeName}
                              </div>
                            )}
                          </div>
                          <div className="p-3 flex-1 flex flex-col">
                            <h4 className="font-bold text-slate-800 dark:text-white text-xs line-clamp-1 mb-1 group-hover:text-orange-500 transition-colors">{item.name}</h4>
                            <div className="flex justify-between items-center mt-auto">
                              <span className="text-orange-600 dark:text-orange-400 font-black text-xs">{item.price} ден.</span>
                              <div className="w-6 h-6 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-orange-500 group-hover:text-white transition-all">
                                <Plus size={14} />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {Object.entries(groupedItems).map(([category, subcategories]) => (
                  <div key={category} className="mb-12">
                    <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-6 border-b-2 border-orange-200 dark:border-orange-900/50 pb-2 inline-block transition-colors">{category}</h2>
                    
                    {Object.entries(subcategories).map(([subcategory, items]) => (
                      <div key={subcategory} className="mb-8">
                        <h3 className="text-xl font-bold text-orange-600 dark:text-orange-500 mb-4 flex items-center gap-2 transition-colors">
                          <span className="w-2 h-2 rounded-full bg-orange-400 dark:bg-orange-500"></span>
                          {subcategory}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {items.map((item) => {
                            const restaurant = availableRestaurants.find(r => r.id === item.restaurant_id);
                            return (
                              <div 
                                key={item.id} 
                                className={`bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm border border-orange-100 dark:border-slate-800 hover:shadow-md transition-all group flex flex-col ${restaurant?.is_open ? 'cursor-pointer' : 'cursor-not-allowed grayscale-[0.5]'}`} 
                                onClick={() => restaurant?.is_open && openItemModal(item)}
                              >
                                <div className="h-48 overflow-hidden relative">
                                  <img src={item.image_url || null} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                  <div className="absolute top-3 left-3 flex flex-col gap-2">
                                    <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm flex items-center gap-1.5 transition-colors">
                                      <div className={`w-1.5 h-1.5 rounded-full ${restaurant?.is_open ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                      {restaurant?.name || 'Ресторан'}
                                    </div>
                                    {item.price <= specialBadgeAmount && (
                                      <div className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5">
                                        <GraduationCap size={12} />
                                        {specialBadgeName}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="p-5 flex-1 flex flex-col">
                                  <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-white transition-colors">{item.name}</h3>
                                  </div>
                                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 flex-1 line-clamp-2 transition-colors">{item.description}</p>
                                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-orange-50 dark:border-slate-800 transition-colors">
                                    <span className="font-extrabold text-xl text-slate-800 dark:text-white transition-colors">{item.price} <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">ден.</span></span>
                                    <button 
                                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${restaurant?.is_open ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-500 hover:text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'}`}
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
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <p>Избраните ресторани моментално немаат производи во менито.</p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {step === 'cart' && (
          <div className="max-w-3xl mx-auto mt-8 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-sm border border-orange-100 dark:border-slate-800 transition-colors duration-300">
            <div className="flex items-center gap-4 mb-8">
              <button 
                onClick={() => {
                  if (selectedRestaurantUsername) {
                    navigate(`/r/${selectedRestaurantUsername}`);
                  } else {
                    setStep('menu');
                  }
                }} 
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Вашата кошничка</h2>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                <p className="text-slate-500 dark:text-slate-400 text-lg">Кошничката е празна.</p>
                <button onClick={() => setStep('menu')} className="mt-6 text-orange-600 dark:text-orange-500 font-bold hover:underline">
                  Врати се кон менито
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-8">
                  {cart.map(item => (
                    <div key={item.cartId} className="flex flex-col sm:flex-row gap-4 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-800/50 transition-colors group">
                      <div className="w-full sm:w-24 h-48 sm:h-24 flex-shrink-0">
                        <img src={item.image_url || null} alt={item.name} className="w-full h-full object-cover rounded-xl shadow-sm group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-slate-800 dark:text-white">{item.name}</h3>
                          <button onClick={() => removeFromCart(item.cartId)} className="text-slate-400 hover:text-red-500 transition-colors">
                            <X size={20} />
                          </button>
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 space-y-1">
                          {Object.entries(item.selectedModifiers).map(([group, selection]) => {
                            if (Array.isArray(selection)) {
                              return selection.length > 0 ? <p key={group}><span className="font-medium">{group}:</span> {selection.join(', ')}</p> : null;
                            }
                            return selection ? <p key={group}><span className="font-medium">{group}:</span> {selection}</p> : null;
                          })}
                        </div>
                        <div className="mt-2 font-bold text-orange-600 dark:text-orange-500">{item.finalPrice} ден.</div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Loyalty & Login Section */}
                {globalSettings.enable_cart_login === 'true' && (
                  <div className="mb-8 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl border border-indigo-100 dark:border-indigo-900/30 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                          <Award size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 dark:text-white">Лојалност и Поени</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Поврзете се за да собирате поени</p>
                        </div>
                      </div>
                      {(!user && globalSettings.enable_cart_login === 'true') && (
                        <button 
                          onClick={handleGoogleLogin}
                          className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
                        >
                          <LogIn size={18} className="text-indigo-600 dark:text-indigo-400" />
                          Најави се со Google
                        </button>
                      )}
                      {user && (
                        <button 
                          onClick={handleLogout}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                          title="Одјави се"
                        >
                          <LogOut size={20} />
                        </button>
                      )}
                    </div>

                    {user && (
                      <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                            {user.name?.[0] || 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-white">{user.name}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">{user.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">Ваши Поени</p>
                          <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{user.loyalty_points || 0}</p>
                        </div>
                      </div>
                    )}
                    
                    {!user && (
                      <p className="text-xs text-indigo-600/70 italic mt-2">
                        * Со секоја нарачка добивате поени кои ќе можете да ги користите за попусти во иднина.
                      </p>
                    )}
                  </div>
                )}

                {activeCampaigns.filter(c => (c.is_visible !== 0 && c.is_visible !== false) && (!c.restaurant_id || (cart.length > 0 ? cart.some(item => item.restaurant_id === c.restaurant_id) : c.restaurant_id === selectedRestaurantId))).length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3">Активни кампањи</h3>
                    <div className="space-y-3">
                      {activeCampaigns.filter(c => (c.is_visible !== 0 && c.is_visible !== false) && (!c.restaurant_id || (cart.length > 0 ? cart.some(item => item.restaurant_id === c.restaurant_id) : c.restaurant_id === selectedRestaurantId))).map(camp => (
                        <label key={camp.id} className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedCampaignId === camp.id ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-orange-200 dark:hover:border-orange-700'}`}>
                          <div className="pt-1">
                            <input 
                              type="checkbox" 
                              checked={selectedCampaignId === camp.id}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedCampaignId(camp.id);
                                else setSelectedCampaignId(null);
                              }}
                              className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-orange-600 focus:ring-orange-500"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-slate-800 dark:text-white">{camp.name}</span>
                              <span className="font-bold text-orange-600 dark:text-orange-500">
                                {camp.budget > 0 ? `-${camp.budget}` : `+${Math.abs(camp.budget)}`} ден.
                              </span>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{camp.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-500 dark:text-slate-400">Вкупно продукти:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{cartTotal} ден.</span>
                  </div>
                  {currentDeliveryFee > 0 && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-500 dark:text-slate-400">Достава:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{currentDeliveryFee} ден.</span>
                    </div>
                  )}
                  {isMinOrderMet && Object.values(cartByRestaurant).some(items => {
                    const r = availableRestaurants.find(res => res.id === items[0].restaurant_id);
                    const total = items.reduce((s, i) => s + i.finalPrice, 0);
                    return Number(r?.min_order_amount || 0) > 0 && total >= Number(r?.min_order_amount || 0) && Number(r?.delivery_fee || 0) > 0;
                  }) && (
                    <div className="flex justify-between items-center mb-2 text-emerald-600 dark:text-emerald-400 font-bold">
                      <span>Достава:</span>
                      <span>БЕСПЛАТНА</span>
                    </div>
                  )}
                  {takeawayDiscount > 0 && (
                    <div className="flex justify-between items-center mb-2 text-emerald-600 dark:text-emerald-400 font-bold">
                      <span>Попуст за превземање:</span>
                      <span>-{takeawayDiscount} ден.</span>
                    </div>
                  )}
                  {selectedCampaign && selectedCampaign.is_visible !== 0 && selectedCampaign.is_visible !== false && (
                    <div className="flex justify-between items-center mb-4 text-orange-600 dark:text-orange-400">
                      <span>{selectedCampaign.name}:</span>
                      <span className="font-bold">
                        {selectedCampaign.budget > 0 ? `-${selectedCampaign.budget}` : `+${Math.abs(selectedCampaign.budget)}`} ден.
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center mb-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-lg text-slate-600 dark:text-slate-400">Вкупно за наплата:</span>
                    <span className="text-3xl font-extrabold text-slate-800 dark:text-white">{finalTotal} ден.</span>
                  </div>
                  {feesTotal > 0 && (
                    <div className="flex justify-between items-center mb-2 text-blue-600 dark:text-blue-400 px-1">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Дополнителни опции:</span>
                      <span className="font-bold">+{feesTotal} ден.</span>
                    </div>
                  )}
                  <button 
                    onClick={() => {
                      if (!isMinOrderMet) {
                        const failedRest = Object.entries(cartByRestaurant).find(([restId, items]) => {
                          const restaurant = availableRestaurants.find(r => r.id === Number(restId));
                          const restTotal = items.reduce((sum, item) => sum + item.finalPrice, 0);
                          const min = Number(restaurant?.min_order_amount || 0);
                          return min > 0 && restTotal < min;
                        });
                        
                        if (failedRest) {
                          const restaurant = availableRestaurants.find(r => r.id === Number(failedRest[0]));
                          const restTotal = failedRest[1].reduce((sum, item) => sum + item.finalPrice, 0);
                          const min = Number(restaurant?.min_order_amount || 0);
                          toast.error(`Минимална нарачка за ${restaurant?.name || 'ресторанот'} е ${min} ден. Ви недостигаат уште ${min - restTotal} ден.`);
                        }
                        return;
                      }
                      setStep('checkout');
                    }}
                    disabled={!isMinOrderMet}
                    className={`w-full font-bold py-4 rounded-2xl transition-colors shadow-lg text-lg ${
                      !isMinOrderMet
                        ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                        : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/30'
                    }`}
                  >
                    {!isMinOrderMet ? (
                      (() => {
                        const failedRest = Object.entries(cartByRestaurant).find(([restId, items]) => {
                          const restaurant = availableRestaurants.find(r => r.id === Number(restId));
                          const restTotal = items.reduce((sum, item) => sum + item.finalPrice, 0);
                          const min = Number(restaurant?.min_order_amount || 0);
                          return min > 0 && restTotal < min;
                        });
                        if (failedRest) {
                          const restaurant = availableRestaurants.find(r => r.id === Number(failedRest[0]));
                          const restTotal = failedRest[1].reduce((sum, item) => sum + item.finalPrice, 0);
                          const min = Number(restaurant?.min_order_amount || 0);
                          return `Минимум ${min} ден. (фалат ${min - restTotal})`;
                        }
                        return 'Минимум за достава';
                      })()
                    ) : (
                      'Продолжи кон наплата'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {step === 'checkout' && (
          <div className="max-w-4xl mx-auto mt-8">
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setStep('cart')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors bg-white dark:bg-slate-900 shadow-sm">
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Детали за достава</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <form onSubmit={handleCheckoutSubmit} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-sm border border-orange-100 dark:border-slate-800 space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Име</label>
                    <input required type="text" value={checkoutForm.firstName} onChange={e => setCheckoutForm({...checkoutForm, firstName: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Презиме</label>
                    <input required type="text" value={checkoutForm.lastName} onChange={e => setCheckoutForm({...checkoutForm, lastName: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all dark:text-white" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Е-маил</label>
                  <input required type="email" value={checkoutForm.email} onChange={e => setCheckoutForm({...checkoutForm, email: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all dark:text-white" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Телефонски број</label>
                  <input required type="tel" value={checkoutForm.phone} onChange={e => setCheckoutForm({...checkoutForm, phone: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all dark:text-white" />
                </div>

                {/* Order Type Toggle */}
                {(() => {
                  const cartRestaurantIds = Array.from(new Set(cart.map(item => item.restaurant_id)));
                  const allAllowTakeaway = cartRestaurantIds.length > 0 && cartRestaurantIds.every(id => {
                    const r = availableRestaurants.find(res => res.id === id);
                    // If we found the restaurant in availableRestaurants, check its flag
                    if (r) return r.allow_takeaway === 1;
                    // Fallback: if it's the currently selected restaurant, we might have its data elsewhere
                    // but for now, if it's not in availableRestaurants, we assume we don't know yet
                    return false;
                  });

                  if (!allAllowTakeaway) return null;

                  return (
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                      <button 
                        type="button"
                        onClick={() => setOrderType('delivery')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${orderType === 'delivery' ? 'bg-white dark:bg-slate-700 text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                      >
                        <Bike size={18} />
                        Достава
                      </button>
                      <button 
                        type="button"
                        onClick={() => setOrderType('takeaway')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${orderType === 'takeaway' ? 'bg-white dark:bg-slate-700 text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                      >
                        <Store size={18} />
                        Превземи
                      </button>
                    </div>
                  );
                })()}
                
                {orderType === 'delivery' ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key="delivery-fields"
                  >
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Адреса за достава</label>
                    <input required type="text" value={checkoutForm.address} onChange={e => setCheckoutForm({...checkoutForm, address: e.target.value})} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all dark:text-white" />
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key="takeaway-fields"
                    className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-2xl border border-orange-100 dark:border-orange-900/30 space-y-4"
                  >
                    <div className="flex items-center gap-3 text-orange-800 dark:text-orange-300 mb-2">
                      <Clock size={20} />
                      <h3 className="font-bold">Време на подигнување</h3>
                    </div>
                    <p className="text-sm text-orange-700/70 dark:text-orange-400/70 mb-4">
                      Изберете приближно време кога планирате да ја подигнете вашата нарачка од ресторанот.
                    </p>
                    <div className="flex items-center gap-4">
                      {(() => {
                        const activeId = selectedRestaurantId || (cart.length > 0 ? cart[0].restaurant_id : null);
                        const restaurant = availableRestaurants.find(r => r.id === activeId);
                        let allowedHours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
                        let allowedMinutes = ['00', '15', '30', '45'];

                        if (restaurant && restaurant.working_hours) {
                          try {
                            const workingHours = JSON.parse(restaurant.working_hours);
                            const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                            const now = new Date();
                            const currentDay = days[now.getDay()];
                            const dayConfig = workingHours[currentDay];

                            if (dayConfig && dayConfig.active) {
                              const [startH, startM] = dayConfig.start.split(':').map(Number);
                              const [endH, endM] = dayConfig.end.split(':').map(Number);

                              // Earliest time: now + 30 minutes
                              const minTime = new Date(now.getTime() + 30 * 60000);
                              const minH = minTime.getHours();
                              const minM = minTime.getMinutes();

                              // Latest time: closing - 15 minutes
                              let limitH = endH;
                              let limitM = endM - 15;
                              if (limitM < 0) {
                                limitH -= 1;
                                limitM += 60;
                              }

                              // Effective start time is max(restaurant_start, now + 30m)
                              let effectiveStartH = startH;
                              let effectiveStartM = startM;

                              if (minH > startH || (minH === startH && minM > startM)) {
                                effectiveStartH = minH;
                                effectiveStartM = minM;
                              }

                              allowedHours = allowedHours.filter(h => {
                                const hour = Number(h);
                                return hour >= effectiveStartH && hour <= limitH;
                              });

                              // Filter minutes for the selected hour
                              const selectedHour = Number(pickupTime.hour);
                              if (selectedHour === effectiveStartH) {
                                allowedMinutes = allowedMinutes.filter(m => Number(m) >= effectiveStartM);
                              }
                              if (selectedHour === limitH) {
                                allowedMinutes = allowedMinutes.filter(m => Number(m) <= limitM);
                              }
                            }
                          } catch (e) {
                            console.error("Error parsing working hours", e);
                          }
                        }

                        return (
                          <>
                            <div className="flex-1">
                              <label className="block text-[10px] uppercase font-bold text-orange-600 dark:text-orange-500 mb-1 ml-1">Час</label>
                              <select 
                                value={pickupTime.hour}
                                onChange={e => handlePickupTimeChange({...pickupTime, hour: e.target.value})}
                                className="w-full p-3 bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-900/50 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none dark:text-white"
                              >
                                {allowedHours.map(h => (
                                  <option key={h} value={h}>{h}</option>
                                ))}
                              </select>
                            </div>
                            <div className="text-2xl font-bold text-orange-300 pt-6">:</div>
                            <div className="flex-1">
                              <label className="block text-[10px] uppercase font-bold text-orange-600 dark:text-orange-500 mb-1 ml-1">Минути</label>
                              <select 
                                value={pickupTime.minute}
                                onChange={e => handlePickupTimeChange({...pickupTime, minute: e.target.value})}
                                className="w-full p-3 bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-900/50 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none dark:text-white"
                              >
                                {allowedMinutes.map(m => (
                                  <option key={m} value={m}>{m}</option>
                                ))}
                              </select>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </motion.div>
                )}

                {/* Payment & Extras Section */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-6">
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
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

                        const methods: string[] = (allowedMethods as string[]).length > 0 ? [...(allowedMethods as string[])] : ['cash'];
                        
                        // Add card if Payten is enabled globally
                        if (globalSettings.payten_enabled === 'true' && !methods.includes('card')) {
                          methods.push('card');
                        }

                        return (methods as string[]).map(method => (
                          <label key={method} className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === method ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                            <div className="flex items-center gap-3">
                              <input 
                                type="radio" 
                                name="paymentMethod" 
                                value={method} 
                                checked={paymentMethod === method} 
                                onChange={() => setPaymentMethod(method)}
                                className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                              />
                              <span className="font-bold text-slate-700 dark:text-slate-200">
                                {method === 'cash' ? 'Готовина' : method === 'card' ? 'Картичка' : 'Поени'}
                              </span>
                            </div>
                            {method === 'points' && user && (
                              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-lg">
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
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                          <Plus size={18} className="text-orange-500" />
                          Дополнителни опции
                        </h3>
                        <div className="space-y-4">
                          {restaurantsWithFees.map(restId => {
                            const rest = availableRestaurants.find(r => r.id === restId);
                            const config = JSON.parse(rest.payment_config);
                            return (
                              <div key={restId} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
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
                                          className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-orange-500 focus:ring-orange-500"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{fee.name}</span>
                                      </div>
                                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400">+{fee.amount} ден.</span>
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

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-500 dark:text-slate-400">Вкупно продукти:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{cartTotal} ден.</span>
                  </div>
                  {currentDeliveryFee > 0 && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-500 dark:text-slate-400">Достава:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{currentDeliveryFee} ден.</span>
                    </div>
                  )}
                  {isMinOrderMet && Object.values(cartByRestaurant).some(items => {
                    const r = availableRestaurants.find(res => res.id === items[0].restaurant_id);
                    const total = items.reduce((s, i) => s + i.finalPrice, 0);
                    return Number(r?.min_order_amount || 0) > 0 && total >= Number(r?.min_order_amount || 0) && Number(r?.delivery_fee || 0) > 0;
                  }) && (
                    <div className="flex justify-between items-center mb-2 text-emerald-600 dark:text-emerald-400 font-bold">
                      <span>Достава:</span>
                      <span>БЕСПЛАТНА</span>
                    </div>
                  )}
                  {takeawayDiscount > 0 && (
                    <div className="flex justify-between items-center mb-2 text-emerald-600 dark:text-emerald-400 font-bold">
                      <span>Попуст за превземање:</span>
                      <span>-{takeawayDiscount} ден.</span>
                    </div>
                  )}
                  {selectedCampaign && selectedCampaign.is_visible !== 0 && selectedCampaign.is_visible !== false && (
                    <div className="flex justify-between items-center mb-4 text-orange-600 dark:text-orange-400">
                      <span>{selectedCampaign.name}:</span>
                      <span className="font-bold">
                        {selectedCampaign.budget > 0 ? `-${selectedCampaign.budget}` : `+${Math.abs(selectedCampaign.budget)}`} ден.
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center mb-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-lg text-slate-600 dark:text-slate-400">Вкупно за наплата:</span>
                    <span className="text-2xl font-extrabold text-slate-800 dark:text-white">{finalTotal} ден.</span>
                  </div>
                  {feesTotal > 0 && (
                    <div className="flex justify-between items-center mb-2 text-blue-600 dark:text-blue-400 px-1">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Дополнителни опции:</span>
                      <span className="font-bold">+{feesTotal} ден.</span>
                    </div>
                  )}
                  
                  {orderType !== 'takeaway' && !isLocationValid() && (
                    <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800 text-sm font-medium">
                      Доставата се врши согласно избраната локација за пребарување. Ве молиме поместете го пинот во дозволената зона на ресторанот.
                    </div>
                  )}
                  
                  <button 
                    type="submit"
                    disabled={orderType !== 'takeaway' && !isLocationValid()}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-colors shadow-lg shadow-orange-500/30 text-lg"
                  >
                    Потврди нарачка
                  </button>
                </div>
              </form>

              {orderType !== 'takeaway' && (
                <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-sm border border-orange-100 dark:border-slate-800 h-fit">
                  <h3 className="font-bold text-slate-800 dark:text-white mb-4">Локација за достава</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Можете да го поместите пинот за попрецизна локација. Пинот мора да биде во рамките на обоените зони (зони на достава на избраните ресторани).
                  </p>
                  <LocationPickerMap 
                    location={location} 
                    setLocation={setLocation} 
                    city={selectedCity} 
                    allowedZones={getCartAllowedZones()} 
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="max-w-md mx-auto mt-20 bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-orange-100 dark:border-slate-800 text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-500 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-4">Успешно ја поставивте вашата нарачка!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Вашата нарачка е успешно испратена до ресторанот. Наскоро ќе биде доставена на вашата адреса.
            </p>

            {Object.entries(lastOrderTrackingTokens).length > 0 && (
              <div className="mb-8 space-y-3">
                <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Следете ги вашите нарачки:</p>
                {Object.entries(lastOrderTrackingTokens).map(([orderId, token]) => (
                  <Link 
                    key={orderId} 
                    to={`/track/${token}`}
                    className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 rounded-2xl text-orange-700 dark:text-orange-400 font-bold hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
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
              className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50 px-8 py-4 rounded-xl font-bold transition-colors w-full"
            >
              Нова нарачка
            </button>
          </div>
        )}
      </main>
      <footer className="mt-12 pt-12 border-t border-orange-100 dark:border-slate-800 relative z-10 pb-12">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">
          <div className="space-y-4">
            {globalSettings.company_logo_url ? (
              <img src={globalSettings.company_logo_url || null} alt="Logo" className="h-10 object-contain mb-4" />
            ) : (
              <h2 className="font-black text-xl text-slate-900 dark:text-white tracking-tight mb-4">{globalSettings.company_name || 'PIZZA TIME'}</h2>
            )}
            <div className="space-y-1 text-sm text-slate-500 dark:text-slate-400">
              <p className="font-bold text-slate-700 dark:text-slate-300">{globalSettings.company_name}</p>
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
            <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-xs tracking-widest">Информации</h4>
            <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <Link to="/privacy-policy" className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors block">Политика за приватност</Link>
              <Link to="/payment-terms" className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors block">Услови за плаќање</Link>
              <Link to="/delivery-terms" className="hover:text-orange-500 dark:hover:text-orange-400 transition-colors block">Начини на достава и враќање на средствата</Link>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-xs tracking-widest">Следете не</h4>
            <div className="flex gap-4">
              {globalSettings.company_facebook && (
                <a href={globalSettings.company_facebook} target="_blank" rel="noopener noreferrer" className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-orange-50 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  <Facebook size={18} />
                </a>
              )}
              {globalSettings.company_instagram && (
                <a href={globalSettings.company_instagram} target="_blank" rel="noopener noreferrer" className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-orange-50 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors">
                  <Instagram size={18} />
                </a>
              )}
              {globalSettings.company_twitter && (
                <a href={globalSettings.company_twitter} target="_blank" rel="noopener noreferrer" className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-orange-50 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-blue-400 dark:hover:text-blue-300 transition-colors">
                  <Twitter size={18} />
                </a>
              )}
              {globalSettings.company_linkedin && (
                <a href={globalSettings.company_linkedin} target="_blank" rel="noopener noreferrer" className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-orange-50 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-500 transition-colors">
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

        <div className="max-w-6xl mx-auto px-6 mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            © {new Date().getFullYear()} Сите права се задржани.
          </p>
          <Link to="/portal" className="text-[10px] text-slate-300 dark:text-slate-600 hover:text-orange-300 dark:hover:text-orange-500 transition-colors uppercase font-bold tracking-widest">
            Портал за соработници
          </Link>
        </div>
      </footer>

      {/* Modern Filters Modal */}
      <AnimatePresence>
        {showFiltersModal && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-6 md:p-8 overflow-y-auto">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Филтри</h3>
                  <button onClick={() => setShowFiltersModal(false)} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400">
                    <ArrowLeft size={20} className="rotate-90 sm:rotate-0" />
                  </button>
                </div>

                <div className="space-y-8">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Статус на ресторан</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setShowOnlyOpen(!showOnlyOpen)}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${showOnlyOpen ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500'}`}
                      >
                        <div className={`w-3 h-3 rounded-full ${showOnlyOpen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                        <span className="text-xs font-black uppercase tracking-widest">Отворено сега</span>
                      </button>
                      <button 
                        onClick={() => setShowFreeDelivery(!showFreeDelivery)}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${showFreeDelivery ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500'}`}
                      >
                        <DollarSign size={20} className={showFreeDelivery ? 'text-orange-500' : 'text-slate-300'} />
                        <span className="text-xs font-black uppercase tracking-widest">Бесплатна достава</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Брзи категории</h4>
                    <div className="flex flex-wrap gap-2">
                      {allAvailableCategories.map(cat => (
                        <button 
                          key={cat}
                          onClick={() => {
                            setActiveFilter(cat);
                            setShowFiltersModal(false);
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${activeFilter === cat ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-transparent'}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-10">
                  <button 
                    onClick={() => setShowFiltersModal(false)}
                    className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-orange-500/30"
                  >
                    Примени филтри
                  </button>
                  <button 
                    onClick={() => {
                        setShowOnlyOpen(false);
                        setShowFreeDelivery(false);
                        setActiveFilter('all');
                    }}
                    className="w-full mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-orange-500 transition-colors"
                  >
                    Ресетирај сè
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>

      {/* Item Customization Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <div className="relative h-48 sm:h-64 flex-shrink-0">
              <img src={selectedItem.image_url || null} alt={selectedItem.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-2 rounded-full text-slate-800 dark:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{selectedItem.name}</h2>
                <span className="text-xl font-bold text-orange-600 dark:text-orange-400">{selectedItem.price} ден.</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 mb-6">{selectedItem.description}</p>

              {selectedItem.modifiers && selectedItem.modifiers.length > 0 && !selectedItem.isBundle && (
                <div className="space-y-6">
                  {selectedItem.modifiers.map((group, gIndex) => (
                    <div key={gIndex}>
                      <div className="flex justify-between items-end mb-3">
                        <h3 className="font-bold text-slate-800 dark:text-white">{group.name}</h3>
                        <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded">
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
                              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${isSelected ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-orange-300 dark:hover:border-orange-700'}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`flex items-center justify-center ${group.type === 'single' ? 'w-5 h-5 rounded-full border' : 'w-5 h-5 rounded border'} ${isSelected ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                                  {isSelected && group.type === 'single' && <div className="w-2 h-2 bg-white rounded-full" />}
                                  {isSelected && group.type === 'multiple' && <CheckCircle size={14} />}
                                </div>
                                <span className={`font-medium ${isSelected ? 'text-orange-900 dark:text-orange-100' : 'text-slate-700 dark:text-slate-300'}`}>{opt.name}</span>
                              </div>
                              {opt.price > 0 && (
                                <span className="text-sm text-slate-500 dark:text-slate-400">+{opt.price} ден.</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedItem.isBundle && selectedItem.items && (
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 dark:text-white mb-4">Производи во пакетот:</h3>
                  <div className="space-y-2">
                    {selectedItem.items.map((bi: any) => (
                      <div key={bi.id} className="flex flex-col gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-slate-700 dark:text-slate-300">{bi.name}</span>
                          <span className="text-sm text-slate-500 dark:text-slate-400">x{bi.quantity}</span>
                        </div>
                        {bi.modifiers && bi.modifiers.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {bi.modifiers.map((group: any) => (
                              group.options.map((opt: any) => (
                                <span key={opt.name} className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
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
            
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
              <button onClick={addToCart} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl flex items-center justify-between px-6 transition-colors shadow-lg shadow-orange-500/30">
                <span>Додади во кошничка</span>
                <span>{selectedItem.isBundle ? selectedItem.price : calculateFinalPrice()} ден.</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {error && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <X size={40} strokeWidth={3} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">Известување</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
                {error}
              </p>
              <button 
                onClick={() => setError(null)}
                className="w-full bg-slate-900 dark:bg-orange-500 hover:bg-slate-800 dark:hover:bg-orange-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-slate-900/20 dark:shadow-orange-500/20"
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
