import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Store, Activity, Check, X, MapPin, Clock, FileText, Percent, CheckCircle, LogIn, Database, Download, Upload, Bike, Target, ChevronRight, Bell, DollarSign, Settings, Save, Plus } from 'lucide-react';
import DeliveryZoneMap from '../components/DeliveryZoneMap';

interface PendingRestaurant {
  id: number;
  name: string;
  city: string;
  address: string;
  email: string;
  phone: string;
  bank_account: string;
  logo_url?: string;
  has_own_delivery: number;
  status: string;
  working_hours: string;
  delivery_zones: string;
  spare_1: string;
  spare_2: string;
  spare_3: string;
  spare_4: string;
  username?: string;
}

interface DeliveryPartner {
  id: number;
  name: string;
  city: string;
  address: string;
  email: string;
  phone: string;
  bank_account: string;
  working_hours: string;
  preferred_restaurants: string;
  status: string;
  username?: string;
}

interface MarketingAssociate {
  id: number;
  username: string;
  company_name: string;
  contact_person: string;
  phone: string;
  bank_account: string;
  address: string;
  city: string;
  created_at: string;
}

const DAYS_MAP: Record<string, string> = {
  monday: 'Понеделник', tuesday: 'Вторник', wednesday: 'Среда',
  thursday: 'Четврток', friday: 'Петок', saturday: 'Сабота', sunday: 'Недела'
};

export default function Admin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'database' | 'orders' | 'delivery' | 'marketing' | 'campaigns' | 'billing' | 'settings' | 'users'>('dashboard');
  const [pendingRestaurants, setPendingRestaurants] = useState<PendingRestaurant[]>([]);
  const [approvedRestaurants, setApprovedRestaurants] = useState<PendingRestaurant[]>([]);
  const [pendingDelivery, setPendingDelivery] = useState<DeliveryPartner[]>([]);
  const [approvedDelivery, setApprovedDelivery] = useState<DeliveryPartner[]>([]);
  const [inactiveDelivery, setInactiveDelivery] = useState<DeliveryPartner[]>([]);
  const [deliveryView, setDeliveryView] = useState<'active' | 'inactive' | 'pending'>('active');
  const [marketingAssociates, setMarketingAssociates] = useState<MarketingAssociate[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [campaignFilterDate, setCampaignFilterDate] = useState('');
  const [campaignFilterLocation, setCampaignFilterLocation] = useState('');
  const [isCreateCampaignModalOpen, setIsCreateCampaignModalOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    budget: '',
    quantity: '',
    start_date: '',
    end_date: '',
    location_type: 'all_mk',
    selected_cities: [] as string[],
    restaurant_id: ''
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [billingData, setBillingData] = useState<{restaurants: any[], deliveryPartners: any[]}>({restaurants: [], deliveryPartners: []});
  const [billingStartDate, setBillingStartDate] = useState('');
  const [billingEndDate, setBillingEndDate] = useState('');
  const [orderFilterRestaurant, setOrderFilterRestaurant] = useState('');
  const [orderFilterDelivery, setOrderFilterDelivery] = useState('');
  const [orderFilterStartDate, setOrderFilterStartDate] = useState('');
  const [orderFilterEndDate, setOrderFilterEndDate] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<PendingRestaurant | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryPartner | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
  const [codeFormat, setCodeFormat] = useState('--- -- ---');
  const [contractPercentage, setContractPercentage] = useState<number>(15);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [isImporting, setIsImporting] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<Record<string, string>>({});
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [showMarketingModal, setShowMarketingModal] = useState(false);
  const [selectedCampaignForDetails, setSelectedCampaignForDetails] = useState<any>(null);
  const [usedCodes, setUsedCodes] = useState<any[]>([]);
  const [newAssociate, setNewAssociate] = useState({
    username: '',
    password: '',
    company_name: '',
    contact_person: '',
    phone: '',
    bank_account: '',
    address: '',
    city: ''
  });

  useEffect(() => {
    fetchData();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        setGlobalSettings(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch settings', e);
    }
  };

  const saveGlobalSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(globalSettings)
      });
      if (res.ok) {
        alert('Поставките се успешно зачувани!');
      } else {
        alert('Грешка при зачувување на поставките.');
      }
    } catch (e) {
      console.error(e);
      alert('Грешка при зачувување на поставките.');
    }
    setIsSavingSettings(false);
  };

  const handleGlobalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setGlobalSettings(prev => ({ ...prev, [field]: data.url }));
    } catch (err) {
      console.error(err);
      alert('Грешка при прикачување на сликата.');
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [orderFilterRestaurant, orderFilterDelivery, orderFilterStartDate, orderFilterEndDate]);

  useEffect(() => {
    fetchBilling();
  }, [billingStartDate, billingEndDate]);

  const fetchBilling = async () => {
    const params = new URLSearchParams();
    if (billingStartDate) params.append('startDate', billingStartDate);
    if (billingEndDate) params.append('endDate', billingEndDate);
    
    const res = await fetch(`/api/admin/billing?${params.toString()}`);
    setBillingData(await res.json());
  };

  const fetchOrders = async () => {
    const params = new URLSearchParams();
    if (orderFilterRestaurant) params.append('restaurantId', orderFilterRestaurant);
    if (orderFilterDelivery) params.append('deliveryPartnerId', orderFilterDelivery);
    if (orderFilterStartDate) params.append('startDate', orderFilterStartDate);
    if (orderFilterEndDate) params.append('endDate', orderFilterEndDate);
    
    const resOrders = await fetch(`/api/admin/orders?${params.toString()}`);
    setOrders(await resOrders.json());
  };

  const fetchData = async () => {
    const resPending = await fetch('/api/admin/restaurants/pending');
    setPendingRestaurants(await resPending.json());
    
    const resApproved = await fetch('/api/admin/restaurants/approved');
    setApprovedRestaurants(await resApproved.json());

    fetchOrders();
    fetchBilling();

    const resPendingDel = await fetch('/api/admin/delivery/pending');
    setPendingDelivery(await resPendingDel.json());

    const resApprovedDel = await fetch('/api/admin/delivery/approved');
    setApprovedDelivery(await resApprovedDel.json());

    const resInactiveDel = await fetch('/api/admin/delivery/inactive');
    setInactiveDelivery(await resInactiveDel.json());

    const resMarketing = await fetch('/api/admin/marketing-associates');
    setMarketingAssociates(await resMarketing.json());

    const resCampaigns = await fetch('/api/admin/campaigns');
    setCampaigns(await resCampaigns.json());

    const resUsers = await fetch('/api/admin/users');
    setUsers(await resUsers.json());
  };

  const fetchUsedCodes = async (campaignId: number) => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/used-codes`);
      const data = await res.json();
      setUsedCodes(data);
    } catch (err) {
      console.error(err);
    }
  };

  const openApprovalModal = (rest: PendingRestaurant) => {
    setSelectedRestaurant(rest);
    setContractPercentage(15);
    setCredentials({
      username: `rest_${rest.id}_${Math.random().toString(36).substring(2, 6)}`,
      password: Math.random().toString(36).substring(2, 8)
    });
  };

  const openDeliveryApprovalModal = (partner: DeliveryPartner) => {
    setSelectedDelivery(partner);
    setCredentials({
      username: `del_${partner.id}_${Math.random().toString(36).substring(2, 6)}`,
      password: Math.random().toString(36).substring(2, 8)
    });
  };

  const handleApprove = async () => {
    if (!selectedRestaurant) return;
    if (!credentials.username || !credentials.password) {
      alert('Внесете корисничко име и лозинка!');
      return;
    }
    
    const res = await fetch(`/api/admin/restaurants/${selectedRestaurant.id}/approve`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contract_percentage: contractPercentage,
        username: credentials.username,
        password: credentials.password
      })
    });
    
    if (res.ok) {
      alert('Ресторанот е успешно одобрен!');
      setSelectedRestaurant(null);
      fetchData();
    }
  };

  const handleApproveDelivery = async () => {
    if (!selectedDelivery) return;
    if (!credentials.username || !credentials.password) {
      alert('Внесете корисничко име и лозинка!');
      return;
    }
    
    const res = await fetch(`/api/admin/delivery/${selectedDelivery.id}/approve`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: credentials.username,
        password: credentials.password
      })
    });
    
    if (res.ok) {
      alert('Доставувачот е успешно одобрен!');
      setSelectedDelivery(null);
      fetchData();
    }
  };

  const toggleDeliveryStatus = async (id: number) => {
    const res = await fetch(`/api/admin/delivery/${id}/toggle-status`, { method: 'POST' });
    if (res.ok) {
      fetchData();
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm('Дали сте сигурни дека сакате да го одбиете ресторанот?')) return;
    const res = await fetch(`/api/admin/restaurants/${id}/reject`, { method: 'POST' });
    if (res.ok) {
      if (selectedRestaurant?.id === id) setSelectedRestaurant(null);
      fetchData();
    }
  };

  const handleRejectDelivery = async (id: number) => {
    if (!confirm('Дали сте сигурни дека сакате да го одбиете доставувачот?')) return;
    const res = await fetch(`/api/admin/delivery/${id}/reject`, { method: 'POST' });
    if (res.ok) {
      if (selectedDelivery?.id === id) setSelectedDelivery(null);
      fetchData();
    }
  };

  const handleCreateMarketing = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/marketing-associates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAssociate)
    });
    if (res.ok) {
      alert('Маркетинг соработникот е успешно креиран!');
      setShowMarketingModal(false);
      setNewAssociate({
        username: '',
        password: '',
        company_name: '',
        contact_person: '',
        phone: '',
        bank_account: '',
        address: '',
        city: ''
      });
      fetchData();
    } else {
      const data = await res.json();
      alert(data.error || 'Грешка при креирање');
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaign.name || !newCampaign.budget || !newCampaign.quantity || !newCampaign.start_date || !newCampaign.end_date) {
      alert("Ве молиме пополнете ги сите задолжителни полиња.");
      return;
    }

    try {
      const res = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCampaign)
      });
      if (res.ok) {
        alert('Кампањата е успешно креирана!');
        setIsCreateCampaignModalOpen(false);
        setNewCampaign({
          name: '',
          description: '',
          budget: '',
          quantity: '',
          start_date: '',
          end_date: '',
          location_type: 'all_mk',
          selected_cities: [],
          restaurant_id: ''
        });
        fetchData();
      } else {
        alert('Грешка при креирање на кампањата.');
      }
    } catch (e) {
      alert('Грешка при комуникација со серверот.');
    }
  };

  const handleApproveCampaign = async () => {
    if (!selectedCampaign) return;
    const res = await fetch(`/api/admin/campaigns/${selectedCampaign.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code_format: codeFormat })
    });
    if (res.ok) {
      const data = await res.json();
      alert(`Кампањата е одобрена! Генерирани се ${data.generated} кодови.`);
      setSelectedCampaign(null);
      fetchData();
    } else {
      alert('Грешка при одобрување');
    }
  };

  const handleRejectCampaign = async (id: number) => {
    const res = await fetch(`/api/admin/campaigns/${id}/reject`, { method: 'POST' });
    if (res.ok) {
      alert('Кампањата е одбиена.');
      setSelectedCampaign(null);
      fetchData();
    } else {
      alert('Грешка при одбивање на кампањата.');
    }
  };

  const loginAsOwner = (rest: PendingRestaurant) => {
    localStorage.setItem('restaurant_auth', JSON.stringify(rest));
    navigate('/restaurant');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const res = await fetch('/api/admin/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (res.ok) {
          alert('Податоците се успешно импортирани!');
          fetchData();
        } else {
          const errData = await res.json();
          alert(`Грешка при импортирање: ${errData.error || 'Непозната грешка'}`);
        }
      } catch (err) {
        alert('Невалиден JSON фајл.');
      } finally {
        setIsImporting(false);
        if (e.target) e.target.value = ''; // Reset input
      }
    };
    reader.readAsText(file);
  };

  const renderWorkingHours = (hoursStr: string) => {
    try {
      const hours = JSON.parse(hoursStr);
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          {Object.entries(hours).map(([day, data]: [string, any]) => (
            <div key={day} className="flex justify-between text-sm p-2 bg-slate-50 rounded-lg border border-slate-100">
              <span className="font-medium text-slate-700">{DAYS_MAP[day] || day}</span>
              {data.active ? (
                <span className="text-emerald-600 font-medium">{data.start} - {data.end}</span>
              ) : (
                <span className="text-slate-400 italic">Не работи</span>
              )}
            </div>
          ))}
        </div>
      );
    } catch (e) {
      return <span className="text-slate-400">Нема податоци</span>;
    }
  };

  const filteredCampaigns = campaigns.map(camp => {
    // Determine if campaign is ended
    const isEnded = camp.used_codes_count >= camp.quantity;
    return {
      ...camp,
      displayStatus: isEnded ? 'ended' : camp.status
    };
  }).filter(camp => {
    let match = true;
    if (campaignFilterDate) {
      const campStart = new Date(camp.start_date).getTime();
      const campEnd = new Date(camp.end_date).getTime();
      const filterTime = new Date(campaignFilterDate).getTime();
      if (filterTime < campStart || filterTime > campEnd) match = false;
    }
    if (campaignFilterLocation) {
      if (camp.location_type === 'all_mk' && campaignFilterLocation !== 'all_mk') match = false;
      if (camp.location_type === 'cities' && !camp.selected_cities.includes(campaignFilterLocation)) match = false;
    }
    return match;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold text-slate-800">Админ Панел</h1>
          <div className="flex bg-slate-100 p-1 rounded-lg ml-8">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`relative px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Дашборд
              {pendingRestaurants.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-slate-50">
                  {pendingRestaurants.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('database')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'database' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Database size={16} />
              База на податоци
            </button>
            <button 
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'orders' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <FileText size={16} />
              Нарачки
            </button>
            <button 
              onClick={() => setActiveTab('delivery')}
              className={`relative px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'delivery' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Bike size={16} />
              Доставувачи
              {pendingDelivery.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-slate-50">
                  {pendingDelivery.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('marketing')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'marketing' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Users size={16} />
              Маркетинг
            </button>
            <button 
              onClick={() => setActiveTab('campaigns')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'campaigns' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Target size={16} />
              Кампањи
            </button>
            <button 
              onClick={() => setActiveTab('billing')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'billing' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <DollarSign size={16} />
              Исплати
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'users' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Users size={16} />
              Корисници
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'settings' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Settings size={16} />
              Поставки
            </button>
            <Link 
              to="/marketing"
              className="px-4 py-2 rounded-md text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center gap-2 border border-indigo-100 ml-2"
            >
              <LogIn size={16} />
              Најави се како Маркетинг
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-800 text-white rounded-full flex items-center justify-center text-sm font-medium">A</div>
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto p-6">
        {activeTab === 'database' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-2xl mx-auto mt-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Database size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Управување со податоци</h2>
              <p className="text-slate-500">
                Експортирајте ја целата база на податоци (ресторани, мени, зони, нарачки) како бекап, или импортирајте претходно зачуван фајл за да ги вратите податоците.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-slate-200 rounded-xl p-6 text-center hover:border-blue-300 transition-colors">
                <Download size={32} className="mx-auto text-slate-400 mb-4" />
                <h3 className="font-bold text-slate-800 mb-2">Експортирај (Бекап)</h3>
                <p className="text-sm text-slate-500 mb-6">Симнете ги сите податоци во JSON формат на вашиот компјутер.</p>
                <a 
                  href="/api/admin/export"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Download size={18} /> Експортирај
                </a>
              </div>

              <div className="border border-slate-200 rounded-xl p-6 text-center hover:border-blue-300 transition-colors relative">
                <Upload size={32} className="mx-auto text-slate-400 mb-4" />
                <h3 className="font-bold text-slate-800 mb-2">Импортирај (Врати)</h3>
                <p className="text-sm text-slate-500 mb-6">Вратете ги податоците од претходно зачуван JSON фајл.</p>
                
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleImport} 
                  disabled={isImporting}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                />
                <button 
                  disabled={isImporting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 pointer-events-none"
                >
                  {isImporting ? 'Се вчитува...' : <><Upload size={18} /> Импортирај</>}
                </button>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
              <strong>Внимание:</strong> Импортирањето на нов фајл целосно ќе ги избрише моменталните податоци во системот и ќе ги замени со тие од фајлот.
            </div>
          </div>
        ) : activeTab === 'orders' ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <FileText className="text-blue-500" />
              Сите нарачки
            </h2>
            
            <div className="flex flex-wrap gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ресторан</label>
                <select 
                  value={orderFilterRestaurant}
                  onChange={(e) => setOrderFilterRestaurant(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Сите ресторани</option>
                  {approvedRestaurants.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Доставувач</label>
                <select 
                  value={orderFilterDelivery}
                  onChange={(e) => setOrderFilterDelivery(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Сите доставувачи</option>
                  {approvedDelivery.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Од датум</label>
                <input 
                  type="date"
                  value={orderFilterStartDate}
                  onChange={(e) => setOrderFilterStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">До датум</label>
                <input 
                  type="date"
                  value={orderFilterEndDate}
                  onChange={(e) => setOrderFilterEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">ID</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Клиент</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Ресторан</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Доставувач</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Статус</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Вкупно</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Код</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Следење</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {orders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 text-sm font-bold text-slate-800">#{order.id}</td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-slate-800">{order.customer_name}</p>
                        <p className="text-xs text-slate-500">{order.delivery_address}</p>
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        {approvedRestaurants.find(r => r.id === order.restaurant_id)?.name || `ID: ${order.restaurant_id}`}
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        {order.delivery_partner_name || <span className="text-slate-300">-</span>}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          order.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                          order.status === 'delivering' ? 'bg-purple-100 text-purple-700' :
                          order.status === 'completed' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="p-4 text-sm font-bold text-slate-800">{order.total_price} ден.</td>
                      <td className="p-4">
                        {order.delivery_code ? (
                          <div className="text-[10px] font-mono bg-slate-100 p-1 rounded max-w-[150px] truncate" title={order.delivery_code}>
                            {order.delivery_code}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        {order.tracking_token ? (
                          <Link 
                            to={`/track/${order.tracking_token}`} 
                            target="_blank"
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            <Target size={18} />
                          </Link>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {orders.length === 0 && (
                <div className="p-12 text-center text-slate-400">Нема пронајдено нарачки.</div>
              )}
            </div>
          </div>
        ) : activeTab === 'marketing' ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Users className="text-indigo-500" />
                Маркетинг Соработници
              </h2>
              <button 
                onClick={() => setShowMarketingModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
              >
                <LogIn size={18} />
                Креирај Соработник
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Компанија</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Контакт</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Град</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Корисничко име</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Датум</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {marketingAssociates.map(assoc => (
                    <tr key={assoc.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <p className="text-sm font-bold text-slate-800">{assoc.company_name}</p>
                        <p className="text-xs text-slate-500">{assoc.address}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-slate-800">{assoc.contact_person}</p>
                        <p className="text-xs text-slate-500">{assoc.phone}</p>
                      </td>
                      <td className="p-4 text-sm text-slate-600">{assoc.city}</td>
                      <td className="p-4 text-sm font-mono text-indigo-600">{assoc.username}</td>
                      <td className="p-4 text-xs text-slate-400">{new Date(assoc.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {marketingAssociates.length === 0 && (
                <div className="p-12 text-center text-slate-400">Нема креирано маркетинг соработници.</div>
              )}
            </div>
          </div>
        ) : activeTab === 'campaigns' ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Target className="text-indigo-500" />
                Маркетинг Кампањи
              </h2>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsCreateCampaignModalOpen(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <Plus size={16} />
                  Нова Кампања
                </button>
                <input 
                  type="date" 
                  value={campaignFilterDate}
                  onChange={e => setCampaignFilterDate(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  value={campaignFilterLocation}
                  onChange={e => setCampaignFilterLocation(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Сите локации</option>
                  <option value="all_mk">Цела МК</option>
                  <option value="Скопје">Скопје</option>
                  <option value="Битола">Битола</option>
                  <option value="Охрид">Охрид</option>
                  <option value="Тетово">Тетово</option>
                  <option value="Куманово">Куманово</option>
                </select>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Кампања</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Соработник</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Буџет</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Период</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Локација</th>
                    <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredCampaigns.map(camp => (
                    <tr key={camp.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => camp.displayStatus === 'pending' && setSelectedCampaign(camp)}>
                      <td className="p-4">
                        <p className="text-sm font-bold text-slate-800">{camp.name}</p>
                        <p className="text-xs text-slate-500 line-clamp-1">{camp.description}</p>
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        {camp.restaurant_name ? (
                          <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {camp.restaurant_name}
                          </span>
                        ) : (
                          camp.associate_name || 'Админ'
                        )}
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-slate-800">{camp.budget} ден.</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{camp.quantity} кодови</p>
                      </td>
                      <td className="p-4 text-xs text-slate-500">
                        {new Date(camp.start_date).toLocaleDateString()} - {new Date(camp.end_date).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-xs text-slate-600">
                        {camp.location_type === 'all_mk' ? 'Цела МК' :
                         camp.location_type === 'cities' ? `${JSON.parse(camp.selected_cities).length} градови` :
                         'Мапирани зони'}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                            camp.displayStatus === 'pending' ? 'bg-orange-100 text-orange-700' :
                            camp.displayStatus === 'active' ? 'bg-emerald-100 text-emerald-700' :
                            camp.displayStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                            camp.displayStatus === 'ended' ? 'bg-slate-200 text-slate-600' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {camp.displayStatus === 'pending' ? 'Pending' : camp.displayStatus}
                          </span>
                          {camp.displayStatus === 'pending' && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRejectCampaign(camp.id);
                              }}
                              className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                              title="Одбиј кампања"
                            >
                              <X size={14} />
                            </button>
                          )}
                          {camp.status === 'active' && (
                            <>
                              <a 
                                href={`/api/campaigns/${camp.id}/export`}
                                download
                                onClick={e => e.stopPropagation()}
                                className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                                title="Превземи кодови"
                              >
                                <Download size={14} />
                              </a>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCampaignForDetails(camp);
                                  fetchUsedCodes(camp.id);
                                }}
                                className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                                title="Детали за искористени кодови"
                              >
                                <ChevronRight size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {campaigns.length === 0 && (
                <div className="p-12 text-center text-slate-400">Нема активни кампањи.</div>
              )}
            </div>
          </div>
        ) : activeTab === 'billing' ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <DollarSign className="text-emerald-500" />
              Исплати и Пресметки
            </h2>
            
            <div className="flex flex-wrap gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Од датум</label>
                <input 
                  type="date" 
                  value={billingStartDate}
                  onChange={(e) => setBillingStartDate(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">До датум</label>
                <input 
                  type="date" 
                  value={billingEndDate}
                  onChange={(e) => setBillingEndDate(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Restaurants Billing */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Store size={18} className="text-blue-500" />
                    Ресторани
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Ресторан</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Нарачки</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Промет</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Провизија</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">За исплата</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {billingData.restaurants.map((r: any) => (
                        <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-medium text-slate-800">{r.name}</td>
                          <td className="p-4 text-slate-600">{r.totalOrders}</td>
                          <td className="p-4 text-slate-600">{r.totalRevenue.toLocaleString()} ден.</td>
                          <td className="p-4 text-red-600">{r.platformFee.toLocaleString()} ден. ({r.contract_percentage}%)</td>
                          <td className="p-4 font-bold text-emerald-600">{r.netPayout.toLocaleString()} ден.</td>
                        </tr>
                      ))}
                      {billingData.restaurants.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500">Нема податоци за избраниот период</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Delivery Partners Billing */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Bike size={18} className="text-orange-500" />
                    Доставувачи
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Доставувач</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Достави</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Цена по достава</th>
                        <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">За исплата</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {billingData.deliveryPartners.map((dp: any) => (
                        <tr key={dp.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-medium text-slate-800">{dp.name}</td>
                          <td className="p-4 text-slate-600">{dp.totalDeliveries}</td>
                          <td className="p-4 text-slate-600">{dp.feePerDelivery} ден.</td>
                          <td className="p-4 font-bold text-emerald-600">{dp.netPayout.toLocaleString()} ден.</td>
                        </tr>
                      ))}
                      {billingData.deliveryPartners.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-slate-500">Нема податоци за избраниот период</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'delivery' ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setDeliveryView('active')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${deliveryView === 'active' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Активни
                </button>
                <button
                  onClick={() => setDeliveryView('inactive')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${deliveryView === 'inactive' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Неактивни
                </button>
              </div>
              <button
                onClick={() => setDeliveryView('pending')}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${deliveryView === 'pending' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                <Bell size={18} className={pendingDelivery.length > 0 ? 'text-emerald-500' : 'text-slate-400'} />
                Барања
                {pendingDelivery.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white">
                    {pendingDelivery.length}
                  </span>
                )}
              </button>
            </div>

            {deliveryView === 'pending' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-in fade-in duration-200">
                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Bike className="text-emerald-500" />
                  Барања за нови доставувачи
                </h2>
                
                {pendingDelivery.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p>Нема нови барања за доставувачи.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingDelivery.map(partner => (
                      <div key={partner.id} className="border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:border-emerald-300 transition-colors cursor-pointer" onClick={() => openDeliveryApprovalModal(partner)}>
                        <div>
                          <h3 className="font-bold text-lg text-slate-800 mb-1">{partner.name}</h3>
                          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1"><MapPin size={14} /> {partner.address}, {partner.city}</span>
                            <span>📧 {partner.email}</span>
                            <span>📞 {partner.phone}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                          <button onClick={() => openDeliveryApprovalModal(partner)} className="flex-1 md:flex-none bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
                            <FileText size={18} /> Прегледај
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {deliveryView === 'active' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-in fade-in duration-200">
                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <CheckCircle className="text-emerald-500" />
                  Активни доставувачи
                  <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-bold ml-2">
                    {approvedDelivery.length}
                  </span>
                </h2>
                
                {approvedDelivery.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p>Нема активни доставувачи.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {approvedDelivery.map(partner => (
                      <div key={partner.id} className="border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:border-emerald-300 transition-colors">
                        <div>
                          <h3 className="font-bold text-lg text-slate-800 mb-1">{partner.name}</h3>
                          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1"><MapPin size={14} /> {partner.address}, {partner.city}</span>
                            <span>👤 {partner.username}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => toggleDeliveryStatus(partner.id)}
                          className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          Деактивирај
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {deliveryView === 'inactive' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-in fade-in duration-200">
                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <X className="text-red-500" />
                  Неактивни доставувачи
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold ml-2">
                    {inactiveDelivery.length}
                  </span>
                </h2>
                
                {inactiveDelivery.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p>Нема неактивни доставувачи.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {inactiveDelivery.map(partner => (
                      <div key={partner.id} className="border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:border-red-300 transition-colors">
                        <div>
                          <h3 className="font-bold text-lg text-slate-800 mb-1">{partner.name}</h3>
                          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1"><MapPin size={14} /> {partner.address}, {partner.city}</span>
                            <span>👤 {partner.username}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => toggleDeliveryStatus(partner.id)}
                          className="px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                        >
                          Активирај
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : activeTab === 'users' ? (
          <div className="p-8">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Регистрирани Корисници</h2>
                <div className="text-sm text-slate-500">Вкупно: {users.length}</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Корисник</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Email</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Лојалност Поени</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Регистриран</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map(user => (
                      <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                              {user.name?.[0] || 'U'}
                            </div>
                            <span className="font-bold text-slate-800">{user.name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-slate-600">{user.email}</td>
                        <td className="p-4">
                          <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-bold text-sm">
                            {user.loyalty_points || 0} поени
                          </span>
                        </td>
                        <td className="p-4 text-xs text-slate-400">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeTab === 'settings' ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Settings className="text-slate-500" />
              Глобални поставки
            </h2>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Изглед на апликацијата</h3>
              <div className="space-y-4 max-w-2xl">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Позадинска слика (Background) за нарачатели</label>
                  <p className="text-xs text-slate-500 mb-2">Оваа слика ќе се прикажува како позадина кога клиентите пребаруваат продукти.</p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={globalSettings.customer_background_url || ''} 
                      onChange={e => setGlobalSettings({...globalSettings, customer_background_url: e.target.value})} 
                      className="flex-1 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                      placeholder="https://..." 
                    />
                    <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-3 rounded-xl font-bold transition-colors flex items-center gap-2">
                      <Upload size={18} />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleGlobalFileUpload(e, 'customer_background_url')} />
                    </label>
                  </div>
                  {globalSettings.customer_background_url && (
                    <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 h-48 relative">
                      <img src={globalSettings.customer_background_url} alt="Background preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                          <p className="font-bold text-slate-800">Приказ на содржината</p>
                          <p className="text-sm text-slate-500">Вака ќе изгледа содржината врз позадината</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={saveGlobalSettings}
                  disabled={isSavingSettings}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center gap-2"
                >
                  <Save size={18} />
                  {isSavingSettings ? 'Се зачувува...' : 'Зачувај поставки'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Users size={24} /></div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Корисници</p>
                <p className="text-2xl font-bold text-slate-800">1,248</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><Store size={24} /></div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Ресторани</p>
                <p className="text-2xl font-bold text-slate-800">24</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Activity size={24} /></div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Денешни Нарачки</p>
                <p className="text-2xl font-bold text-slate-800">156</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Store className="text-orange-500" />
            Барања за нови ресторани
            {pendingRestaurants.length > 0 && (
              <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-bold ml-2">
                {pendingRestaurants.length}
              </span>
            )}
          </h2>
          
          {pendingRestaurants.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p>Нема нови барања за регистрација.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRestaurants.map(rest => (
                <div key={rest.id} className="border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:border-orange-300 transition-colors cursor-pointer" onClick={() => openApprovalModal(rest)}>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 mb-1">{rest.name}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><MapPin size={14} /> {rest.address}, {rest.city}</span>
                      <span>📧 {rest.email}</span>
                      <span>📞 {rest.phone}</span>
                      {rest.has_own_delivery === 1 && <span className="text-emerald-600 font-medium">✓ Сопствена достава</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <button onClick={() => openApprovalModal(rest)} className="flex-1 md:flex-none bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
                      <FileText size={18} /> Прегледај
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <CheckCircle className="text-emerald-500" />
            Активни ресторани
            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-bold ml-2">
              {approvedRestaurants.length}
            </span>
          </h2>
          
          {approvedRestaurants.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p>Нема активни ресторани.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {approvedRestaurants.map(rest => (
                <div key={rest.id} className="border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:border-emerald-300 transition-colors">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 mb-1">{rest.name}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><MapPin size={14} /> {rest.address}, {rest.city}</span>
                      <span>👤 {rest.username}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <button onClick={() => loginAsOwner(rest)} className="flex-1 md:flex-none bg-slate-800 text-white hover:bg-slate-900 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
                      <LogIn size={18} /> Најави се како сопственик
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </>
      )}
    </main>

      {/* Review Modal */}
      {selectedRestaurant && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 p-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-slate-800">Преглед на ресторан</h2>
              <button onClick={() => setSelectedRestaurant(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Store className="text-orange-500" /> Основни податоци</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div><span className="text-slate-500 text-sm block">Назив</span><span className="font-medium">{selectedRestaurant.name}</span></div>
                  <div><span className="text-slate-500 text-sm block">Град</span><span className="font-medium">{selectedRestaurant.city}</span></div>
                  <div><span className="text-slate-500 text-sm block">Поштенски број</span><span className="font-medium">{selectedRestaurant.spare_3 || 'Нема'}</span></div>
                  <div className="md:col-span-2"><span className="text-slate-500 text-sm block">Адреса</span><span className="font-medium">{selectedRestaurant.address}</span></div>
                  <div><span className="text-slate-500 text-sm block">Е-маил</span><span className="font-medium">{selectedRestaurant.email}</span></div>
                  <div><span className="text-slate-500 text-sm block">Телефон</span><span className="font-medium">{selectedRestaurant.phone}</span></div>
                  <div className="md:col-span-2"><span className="text-slate-500 text-sm block">Жиро сметка</span><span className="font-medium font-mono">{selectedRestaurant.bank_account}</span></div>
                </div>
              </div>

              {/* Working Hours */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Clock className="text-orange-500" /> Работно време за достава</h3>
                {renderWorkingHours(selectedRestaurant.working_hours)}
              </div>

              {/* Delivery Zones */}
              {selectedRestaurant.has_own_delivery === 1 && (
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><MapPin className="text-orange-500" /> Зони на достава</h3>
                  <DeliveryZoneMap 
                    zones={JSON.parse(selectedRestaurant.delivery_zones || '[]')} 
                    readOnly={true} 
                  />
                </div>
              )}

              {/* Spare Fields */}
              {(selectedRestaurant.spare_1 || selectedRestaurant.spare_2 || selectedRestaurant.spare_3) && (
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><FileText className="text-orange-500" /> Дополнителни информации</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {selectedRestaurant.spare_1 && <div><span className="text-slate-500 text-sm block">Резервно поле 1</span><span className="font-medium">{selectedRestaurant.spare_1}</span></div>}
                    {selectedRestaurant.spare_2 && <div><span className="text-slate-500 text-sm block">Резервно поле 2</span><span className="font-medium">{selectedRestaurant.spare_2}</span></div>}
                    {selectedRestaurant.spare_3 && <div><span className="text-slate-500 text-sm block">Резервно поле 3</span><span className="font-medium">{selectedRestaurant.spare_3}</span></div>}
                  </div>
                </div>
              )}

              {/* Approval Section */}
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-orange-900 mb-4 flex items-center gap-2"><Percent className="text-orange-600" /> Договор и Одобрување</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-orange-900 mb-2">Корисничко име</label>
                    <input 
                      type="text" 
                      value={credentials.username} 
                      onChange={e => setCredentials({...credentials, username: e.target.value})}
                      className="w-full p-3 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-orange-900 mb-2">Лозинка</label>
                    <input 
                      type="text" 
                      value={credentials.password} 
                      onChange={e => setCredentials({...credentials, password: e.target.value})}
                      className="w-full p-3 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-orange-900 mb-2">Провизија (%)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100" 
                      value={contractPercentage} 
                      onChange={e => setContractPercentage(Number(e.target.value))}
                      className="w-full p-3 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button onClick={() => handleReject(selectedRestaurant.id)} className="bg-white text-red-600 border border-red-200 hover:bg-red-50 px-6 py-3 rounded-xl font-bold transition-colors">
                    Одбиј
                  </button>
                  <button onClick={handleApprove} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-emerald-600/20">
                    Одобри Ресторан
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Approval Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="bg-indigo-600 p-6 text-white flex items-center justify-between">
              <h2 className="text-xl font-bold">Одобрување на Кампања</h2>
              <button onClick={() => setSelectedCampaign(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-2">{selectedCampaign.name}</h3>
                <p className="text-sm text-slate-600 mb-4">{selectedCampaign.description}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-slate-400 block">Буџет</span><span className="font-bold">{selectedCampaign.budget} ден.</span></div>
                  <div><span className="text-slate-400 block">Количина кодови</span><span className="font-bold">{selectedCampaign.quantity}</span></div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-700">Изберете формат на кодови</label>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    '--- -- ---',
                    '-- -- ----',
                    '---- ----',
                    '------',
                    '--- --- ---'
                  ].map(format => (
                    <label key={format} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                      codeFormat === format ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/20' : 'bg-white border-slate-200 hover:border-indigo-200'
                    }`}>
                      <div className="flex items-center gap-3">
                        <input 
                          type="radio" 
                          name="codeFormat" 
                          checked={codeFormat === format}
                          onChange={() => setCodeFormat(format)}
                          className="w-4 h-4 text-indigo-600"
                        />
                        <span className="font-mono font-bold text-slate-700">{format}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Пример: {format.replace(/-/g, 'X')}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => handleRejectCampaign(selectedCampaign.id)}
                  className="flex-1 bg-white text-red-600 border border-red-200 hover:bg-red-50 font-bold py-4 rounded-2xl transition-all"
                >
                  Одбиј
                </button>
                <button 
                  onClick={handleApproveCampaign}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all"
                >
                  Одобри и Генерирај
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      {isCreateCampaignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-indigo-600 p-6 text-white flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold">Креирај Нова Кампања</h2>
              <button onClick={() => setIsCreateCampaignModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateCampaign} className="p-8 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Име на кампања *</label>
                  <input 
                    type="text"
                    required
                    value={newCampaign.name}
                    onChange={e => setNewCampaign({...newCampaign, name: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="пр. Летен Попуст 2024"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Ресторан (Опционално)</label>
                  <select 
                    value={newCampaign.restaurant_id}
                    onChange={e => setNewCampaign({...newCampaign, restaurant_id: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Сите ресторани (Маркетинг кампања)</option>
                    {approvedRestaurants.map(rest => (
                      <option key={rest.id} value={rest.id}>{rest.name} ({rest.city})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">Опис</label>
                <textarea 
                  value={newCampaign.description}
                  onChange={e => setNewCampaign({...newCampaign, description: e.target.value})}
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                  placeholder="Краток опис на кампањата..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Буџет (ден.) *</label>
                  <input 
                    type="number"
                    required
                    value={newCampaign.budget}
                    onChange={e => setNewCampaign({...newCampaign, budget: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Број на кодови *</label>
                  <input 
                    type="number"
                    required
                    value={newCampaign.quantity}
                    onChange={e => setNewCampaign({...newCampaign, quantity: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Почеток *</label>
                  <input 
                    type="date"
                    required
                    value={newCampaign.start_date}
                    onChange={e => setNewCampaign({...newCampaign, start_date: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700">Крај *</label>
                  <input 
                    type="date"
                    required
                    value={newCampaign.end_date}
                    onChange={e => setNewCampaign({...newCampaign, end_date: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4 shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsCreateCampaignModalOpen(false)}
                  className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Откажи
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all"
                >
                  Креирај Кампања
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delivery Review Modal */}
      {selectedDelivery && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 p-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-slate-800">Преглед на доставувач</h2>
              <button onClick={() => setSelectedDelivery(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Bike className="text-emerald-500" /> Лични податоци</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div><span className="text-slate-500 text-sm block">Име</span><span className="font-medium">{selectedDelivery.name}</span></div>
                  <div><span className="text-slate-500 text-sm block">Град</span><span className="font-medium">{selectedDelivery.city}</span></div>
                  <div className="md:col-span-2"><span className="text-slate-500 text-sm block">Адреса</span><span className="font-medium">{selectedDelivery.address}</span></div>
                  <div><span className="text-slate-500 text-sm block">Е-маил</span><span className="font-medium">{selectedDelivery.email}</span></div>
                  <div><span className="text-slate-500 text-sm block">Телефон</span><span className="font-medium">{selectedDelivery.phone}</span></div>
                  <div className="md:col-span-2"><span className="text-slate-500 text-sm block">Жиро сметка</span><span className="font-medium font-mono">{selectedDelivery.bank_account}</span></div>
                </div>
              </div>

              {/* Working Hours */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Clock className="text-emerald-500" /> Работно време</h3>
                {renderWorkingHours(selectedDelivery.working_hours)}
              </div>

              {/* Preferred Restaurants */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Store className="text-emerald-500" /> Избрани ресторани за соработка</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {JSON.parse(selectedDelivery.preferred_restaurants || '[]').map((restId: number) => {
                    const rest = approvedRestaurants.find(r => r.id === restId);
                    return (
                      <div key={restId} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 border border-slate-100">
                          <Store size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{rest?.name || `Ресторан ID: ${restId}`}</p>
                          <p className="text-[10px] text-slate-500">{rest?.address}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Approval Section */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-emerald-900 mb-4 flex items-center gap-2"><LogIn className="text-emerald-600" /> Кредиенцијали и Одобрување</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-emerald-900 mb-2">Корисничко име</label>
                    <input 
                      type="text" 
                      value={credentials.username} 
                      onChange={e => setCredentials({...credentials, username: e.target.value})}
                      className="w-full p-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-emerald-900 mb-2">Лозинка</label>
                    <input 
                      type="text" 
                      value={credentials.password} 
                      onChange={e => setCredentials({...credentials, password: e.target.value})}
                      className="w-full p-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button onClick={() => handleRejectDelivery(selectedDelivery.id)} className="bg-white text-red-600 border border-red-200 hover:bg-red-50 px-6 py-3 rounded-xl font-bold transition-colors">
                    Одбиј
                  </button>
                  <button onClick={handleApproveDelivery} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-emerald-600/20">
                    Одобри Доставувач
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Marketing Associate Modal */}
      {showMarketingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Креирај Маркетинг Соработник</h3>
                <p className="text-indigo-100 text-sm">Внесете ги податоците за новиот соработник</p>
              </div>
              <button onClick={() => setShowMarketingModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateMarketing} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Назив на компанија</label>
                  <input 
                    type="text" 
                    required
                    value={newAssociate.company_name}
                    onChange={e => setNewAssociate({...newAssociate, company_name: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Контакт лице</label>
                  <input 
                    type="text" 
                    required
                    value={newAssociate.contact_person}
                    onChange={e => setNewAssociate({...newAssociate, contact_person: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Телефонски број</label>
                  <input 
                    type="text" 
                    required
                    value={newAssociate.phone}
                    onChange={e => setNewAssociate({...newAssociate, phone: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Жиро сметка</label>
                  <input 
                    type="text" 
                    required
                    value={newAssociate.bank_account}
                    onChange={e => setNewAssociate({...newAssociate, bank_account: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Адреса</label>
                  <input 
                    type="text" 
                    required
                    value={newAssociate.address}
                    onChange={e => setNewAssociate({...newAssociate, address: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Град</label>
                  <input 
                    type="text" 
                    required
                    value={newAssociate.city}
                    onChange={e => setNewAssociate({...newAssociate, city: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Корисничко име</label>
                  <input 
                    type="text" 
                    required
                    value={newAssociate.username}
                    onChange={e => setNewAssociate({...newAssociate, username: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Лозинка</label>
                  <input 
                    type="password" 
                    required
                    value={newAssociate.password}
                    onChange={e => setNewAssociate({...newAssociate, password: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowMarketingModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 rounded-2xl transition-all"
                >
                  Откажи
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all"
                >
                  Креирај
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Used Codes Modal */}
      {selectedCampaignForDetails && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Детали за кампања: {selectedCampaignForDetails.name}</h2>
                <div className="flex gap-4 mt-2 text-sm text-slate-500">
                  <span>Вкупно кодови: <strong className="text-slate-800">{selectedCampaignForDetails.quantity || 0}</strong></span>
                  <span>Искористени: <strong className="text-emerald-600">{usedCodes.length}</strong></span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCampaignForDetails(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={24} className="text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto flex-1">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Искористени кодови</h3>
              {usedCodes.length === 0 ? (
                <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p>Сеуште нема искористени кодови за оваа кампања.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-100 text-slate-500 text-sm">
                        <th className="pb-3 font-medium">Код</th>
                        <th className="pb-3 font-medium">Време на користење</th>
                        <th className="pb-3 font-medium">Локација</th>
                        <th className="pb-3 font-medium">Ресторан</th>
                        <th className="pb-3 font-medium">Нарачка #</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {usedCodes.map((code, idx) => (
                        <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="py-4 font-mono font-bold text-indigo-600">{code.code}</td>
                          <td className="py-4 text-slate-600">{new Date(code.used_at).toLocaleString()}</td>
                          <td className="py-4 text-slate-600">{code.delivery_address}</td>
                          <td className="py-4 text-slate-800 font-medium">{code.restaurant_name}</td>
                          <td className="py-4 text-slate-500">#{code.order_id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Used Codes Modal */}
      {selectedCampaignForDetails && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Детали за кампања: {selectedCampaignForDetails.name}</h2>
                <div className="flex gap-4 mt-2 text-sm text-slate-500">
                  <span>Вкупно кодови: <strong className="text-slate-800">{selectedCampaignForDetails.quantity || 0}</strong></span>
                  <span>Искористени: <strong className="text-emerald-600">{usedCodes.length}</strong></span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCampaignForDetails(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={24} className="text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto flex-1">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Искористени кодови</h3>
              {usedCodes.length === 0 ? (
                <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p>Сеуште нема искористени кодови за оваа кампања.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-100 text-slate-500 text-sm">
                        <th className="pb-3 font-medium">Код</th>
                        <th className="pb-3 font-medium">Време на користење</th>
                        <th className="pb-3 font-medium">Локација</th>
                        <th className="pb-3 font-medium">Ресторан</th>
                        <th className="pb-3 font-medium">Нарачка #</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {usedCodes.map((code, idx) => (
                        <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="py-4 font-mono font-bold text-indigo-600">{code.code}</td>
                          <td className="py-4 text-slate-600">{new Date(code.used_at).toLocaleString()}</td>
                          <td className="py-4 text-slate-600">{code.delivery_address}</td>
                          <td className="py-4 text-slate-800 font-medium">{code.restaurant_name}</td>
                          <td className="py-4 text-slate-500">#{code.order_id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
