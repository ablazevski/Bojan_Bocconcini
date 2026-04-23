import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, Building, User, Phone, CreditCard, MapPin, LogOut, Loader2, Plus, Calendar, Target, Globe, Map as MapIcon, ChevronRight, CheckCircle2, Clock, FileText, Save, X, Download } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';
import DeliveryZoneMap from '../components/DeliveryZoneMap';

interface Campaign {
  id: number;
  name: string;
  description: string;
  budget: number;
  start_date: string;
  end_date: string;
  location_type: 'all_mk' | 'cities' | 'map_zones';
  selected_cities: string;
  map_zones: string;
  status: string;
  created_at: string;
}

export default function Marketing() {
  const [associate, setAssociate] = useState<any>(null);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'campaigns'>('profile');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [selectedCampaignForDetails, setSelectedCampaignForDetails] = useState<any>(null);
  const [usedCodes, setUsedCodes] = useState<any[]>([]);
  
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    budget: 0,
    quantity: 100,
    start_date: '',
    end_date: '',
    location_type: 'all_mk' as 'all_mk' | 'cities' | 'map_zones',
    selected_cities: [] as string[],
    map_zones: [] as [number, number][][],
    is_visible: true
  });

  useEffect(() => {
    const saved = localStorage.getItem('marketing_auth');
    if (saved) {
      setAssociate(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (associate) {
      fetchCampaigns();
      fetchCities();
    }
  }, [associate]);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch(`/api/marketing/campaigns?associateId=${associate.id}`);
      const data = await res.json();
      setCampaigns(data);
    } catch (e) {
      console.error(e);
    }
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

  const fetchCities = async () => {
    try {
      const res = await fetch('/api/customer/cities');
      const data = await res.json();
      setAvailableCities(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCampaign,
          associate_id: associate.id
        })
      });
      if (res.ok) {
        alert('Кампањата е успешно креирана и испратена до администраторот!');
        setShowCreateModal(false);
        setNewCampaign({
          name: '',
          description: '',
          budget: 0,
          quantity: 100,
          start_date: '',
          end_date: '',
          location_type: 'all_mk',
          selected_cities: [],
          map_zones: [],
          is_visible: true
        });
        fetchCampaigns();
      } else {
        alert('Грешка при креирање на кампања');
      }
    } catch (e) {
      alert('Грешка при поврзување со серверот');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/marketing/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...credentials, turnstileToken })
      });
      const data = await res.json();
      if (res.ok) {
        setAssociate(data.associate);
        localStorage.setItem('marketing_auth', JSON.stringify(data.associate));
      } else {
        setError(data.error || 'Грешка при најава');
      }
    } catch (e) {
      setError('Грешка при поврзување со серверот');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setAssociate(null);
    localStorage.removeItem('marketing_auth');
  };

  if (!associate) {
    return (
      <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-indigo-100 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Маркетинг Соработник</h1>
            <p className="text-slate-500">Најавете се на вашиот профил</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Корисничко име</label>
              <input 
                type="text" 
                required
                value={credentials.username}
                onChange={e => setCredentials({...credentials, username: e.target.value})}
                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Внесете корисничко име"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Лозинка</label>
              <input 
                type="password" 
                required
                value={credentials.password}
                onChange={e => setCredentials({...credentials, password: e.target.value})}
                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Внесете лозинка"
              />
            </div>
            <div className="flex justify-center my-4">
              <Turnstile 
                siteKey={(import.meta as any).env.VITE_TURNSTILE_SITE_KEY || ''} 
                onSuccess={(token) => setTurnstileToken(token)}
                onExpire={() => setTurnstileToken(null)}
                onError={() => setTurnstileToken(null)}
              />
            </div>
            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            <button 
              type="submit" 
              disabled={loading || !turnstileToken}
              className={`w-full font-bold py-3 rounded-xl transition-all shadow-lg disabled:opacity-50 ${loading || !turnstileToken ? 'bg-slate-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'}`}
            >
              {loading ? 'Се најавува...' : 'Најави се'}
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <Link to="/" className="text-slate-500 hover:text-slate-700 text-sm font-medium inline-flex items-center gap-2">
              <ArrowLeft size={16} /> Назад кон почетна
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-indigo-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-indigo-50 rounded-full text-indigo-500 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Маркетинг Портал</h1>
            <p className="text-xs text-indigo-600 font-medium">{associate.company_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg mr-4">
            <button 
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'profile' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Профил
            </button>
            <button 
              onClick={() => setActiveTab('campaigns')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'campaigns' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Кампањи
            </button>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            Одјави се
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-8">
        {activeTab === 'profile' ? (
          <div className="bg-white rounded-3xl shadow-xl border border-indigo-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-indigo-600 p-8 text-white">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Building size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{associate.company_name}</h2>
                  <p className="text-indigo-100">Маркетинг Соработник</p>
                </div>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Основни информации</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <User className="text-indigo-500" size={20} />
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase">Контакт лице</p>
                      <p className="text-slate-800 font-medium">{associate.contact_person}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <Phone className="text-indigo-500" size={20} />
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase">Телефон</p>
                      <p className="text-slate-800 font-medium">{associate.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <CreditCard className="text-indigo-500" size={20} />
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase">Жиро сметка</p>
                      <p className="text-slate-800 font-medium font-mono">{associate.bank_account}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Локација</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <MapPin className="text-indigo-500" size={20} />
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase">Адреса</p>
                      <p className="text-slate-800 font-medium">{associate.address}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <Building className="text-indigo-500" size={20} />
                    <div>
                      <p className="text-xs text-slate-400 font-bold uppercase">Град</p>
                      <p className="text-slate-800 font-medium">{associate.city}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Ваши Кампањи</h2>
                <p className="text-slate-500">Управувајте со вашите маркетинг активности</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
              >
                <Plus size={20} />
                Нова Кампања
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {campaigns.map(camp => (
                <div key={camp.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                        <Target size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">{camp.name}</h3>
                        <p className="text-sm text-slate-500 line-clamp-1">{camp.description}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      camp.status === 'pending' ? 'bg-orange-100 text-orange-600' :
                      camp.status === 'active' ? 'bg-emerald-100 text-emerald-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {camp.status === 'pending' ? 'Во чекање' : camp.status === 'active' ? 'Активна' : 'Завршена'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar size={16} className="text-indigo-400" />
                      <span className="text-xs font-medium">{new Date(camp.start_date).toLocaleDateString()} - {new Date(camp.end_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <CreditCard size={16} className="text-indigo-400" />
                      <span className="text-xs font-medium">{camp.budget} ден.</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Globe size={16} className="text-indigo-400" />
                      <span className="text-xs font-medium">
                        {camp.location_type === 'all_mk' ? 'Цела Македонија' :
                         camp.location_type === 'cities' ? `${JSON.parse(camp.selected_cities).length} градови` :
                         'Мапирани зони'}
                      </span>
                    </div>
                    <div className="flex justify-end gap-2">
                      {camp.status === 'active' && (
                        <a 
                          href={`/api/campaigns/${camp.id}/export`}
                          download
                          className="text-emerald-600 hover:text-emerald-700 text-xs font-bold flex items-center gap-1 transition-colors"
                        >
                          <Download size={14} /> Превземи кодови
                        </a>
                      )}
                      <button 
                        onClick={() => {
                          setSelectedCampaignForDetails(camp);
                          fetchUsedCodes(camp.id);
                        }}
                        className="text-indigo-600 hover:text-indigo-700 text-xs font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                      >
                        Детали <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {campaigns.length === 0 && (
                <div className="bg-white p-12 text-center rounded-3xl border border-dashed border-slate-200 text-slate-400">
                  <Target size={48} className="mx-auto mb-4 opacity-20" />
                  <p>Сеуште немате креирано кампањи.</p>
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 text-indigo-600 font-bold hover:underline"
                  >
                    Креирајте ја вашата прва кампања
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 p-6 text-white flex justify-between items-center sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-bold">Креирај Нова Кампања</h3>
                <p className="text-indigo-100 text-sm">Поставете ги параметрите за вашата маркетинг активност</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateCampaign} className="p-8 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Basic Info */}
                <div className="space-y-6">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <FileText size={18} className="text-indigo-500" />
                    Основни информации
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Назив на кампања</label>
                      <input 
                        type="text" 
                        required
                        value={newCampaign.name}
                        onChange={e => setNewCampaign({...newCampaign, name: e.target.value})}
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Пр: Летна Промоција 2026"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Краток опис</label>
                      <textarea 
                        required
                        value={newCampaign.description}
                        onChange={e => setNewCampaign({...newCampaign, description: e.target.value})}
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                        placeholder="Опишете ја целта на кампањата..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Попуст по нарачка (ден.)</label>
                      <input 
                        type="number" 
                        required
                        step="any"
                        value={newCampaign.budget}
                        onChange={e => setNewCampaign({...newCampaign, budget: Number(e.target.value)})}
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="пр. 100 или -20 за доплата"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Количина на кодови</label>
                      <input 
                        type="number" 
                        required
                        min="1"
                        max="10000"
                        value={newCampaign.quantity}
                        onChange={e => setNewCampaign({...newCampaign, quantity: Number(e.target.value)})}
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Пр: 500"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all bg-white border-slate-100 hover:bg-slate-50">
                      <input 
                        type="checkbox"
                        checked={newCampaign.is_visible}
                        onChange={e => setNewCampaign({...newCampaign, is_visible: e.target.checked})}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium">Видлива во кошничката</span>
                    </label>
                  </div>
                </div>

                {/* Duration */}
                <div className="space-y-6">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Calendar size={18} className="text-indigo-500" />
                    Времетраење
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Од датум</label>
                      <input 
                        type="date" 
                        required
                        value={newCampaign.start_date}
                        onChange={e => setNewCampaign({...newCampaign, start_date: e.target.value})}
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">До датум</label>
                      <input 
                        type="date" 
                        required
                        value={newCampaign.end_date}
                        onChange={e => setNewCampaign({...newCampaign, end_date: e.target.value})}
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Location Selection */}
              <div className="space-y-6 pt-6 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <MapPin size={18} className="text-indigo-500" />
                  Локации на кампањата
                </h4>
                
                <div className="flex flex-wrap gap-4 mb-6">
                  <button 
                    type="button"
                    onClick={() => setNewCampaign({...newCampaign, location_type: 'all_mk'})}
                    className={`px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 border ${
                      newCampaign.location_type === 'all_mk' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <Globe size={18} />
                    Цела Македонија
                  </button>
                  <button 
                    type="button"
                    onClick={() => setNewCampaign({...newCampaign, location_type: 'cities'})}
                    className={`px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 border ${
                      newCampaign.location_type === 'cities' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <Building size={18} />
                    Локално - Градови
                  </button>
                  <button 
                    type="button"
                    onClick={() => setNewCampaign({...newCampaign, location_type: 'map_zones'})}
                    className={`px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 border ${
                      newCampaign.location_type === 'map_zones' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <MapIcon size={18} />
                    Локално - Мапа
                  </button>
                </div>

                {newCampaign.location_type === 'cities' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-2">
                    {availableCities.map(city => (
                      <label key={city} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        newCampaign.selected_cities.includes(city) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-100 hover:bg-slate-50'
                      }`}>
                        <input 
                          type="checkbox"
                          checked={newCampaign.selected_cities.includes(city)}
                          onChange={e => {
                            if (e.target.checked) setNewCampaign({...newCampaign, selected_cities: [...newCampaign.selected_cities, city]});
                            else setNewCampaign({...newCampaign, selected_cities: newCampaign.selected_cities.filter(c => c !== city)});
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium">{city}</span>
                      </label>
                    ))}
                  </div>
                )}

                {newCampaign.location_type === 'map_zones' && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <p className="text-sm text-slate-500 mb-4">Нацртајте ги зоните на мапата каде сакате да се прикажува кампањата.</p>
                    <DeliveryZoneMap 
                      zones={newCampaign.map_zones}
                      setZones={(zones) => setNewCampaign({...newCampaign, map_zones: zones})}
                    />
                  </div>
                )}

                {newCampaign.location_type === 'all_mk' && (
                  <div className="p-8 text-center bg-indigo-50 rounded-3xl border border-indigo-100 animate-in fade-in slide-in-from-top-2">
                    <Globe size={48} className="mx-auto mb-4 text-indigo-300" />
                    <p className="text-indigo-900 font-medium">Кампањата ќе биде видлива за сите корисници низ цела Македонија.</p>
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-8 border-t border-slate-100 sticky bottom-0 bg-white pb-4">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 rounded-2xl transition-all"
                >
                  Откажи
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                  Креирај Кампања
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
                  <span>Вкупно кодови: <strong className="text-slate-800">{selectedCampaignForDetails.total_codes || 0}</strong></span>
                  <span>Искористени: <strong className="text-emerald-600">{selectedCampaignForDetails.used_codes || 0}</strong></span>
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
