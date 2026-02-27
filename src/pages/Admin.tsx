import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Store, Activity, Check, X, MapPin, Clock, FileText, Percent, CheckCircle, LogIn, Database, Download, Upload } from 'lucide-react';
import DeliveryZoneMap from '../components/DeliveryZoneMap';

interface PendingRestaurant {
  id: number;
  name: string;
  city: string;
  address: string;
  email: string;
  phone: string;
  bank_account: string;
  has_own_delivery: number;
  status: string;
  working_hours: string;
  delivery_zones: string;
  spare_1: string;
  spare_2: string;
  spare_3: string;
  username?: string;
}

const DAYS_MAP: Record<string, string> = {
  monday: 'Понеделник', tuesday: 'Вторник', wednesday: 'Среда',
  thursday: 'Четврток', friday: 'Петок', saturday: 'Сабота', sunday: 'Недела'
};

export default function Admin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'database'>('dashboard');
  const [pendingRestaurants, setPendingRestaurants] = useState<PendingRestaurant[]>([]);
  const [approvedRestaurants, setApprovedRestaurants] = useState<PendingRestaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<PendingRestaurant | null>(null);
  const [contractPercentage, setContractPercentage] = useState<number>(15);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    const resPending = await fetch('/api/admin/restaurants/pending');
    setPendingRestaurants(await resPending.json());
    
    const resApproved = await fetch('/api/admin/restaurants/approved');
    setApprovedRestaurants(await resApproved.json());
  };

  const openApprovalModal = (rest: PendingRestaurant) => {
    setSelectedRestaurant(rest);
    setContractPercentage(15);
    setCredentials({
      username: `rest_${rest.id}_${Math.random().toString(36).substring(2, 6)}`,
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
      fetchRestaurants();
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm('Дали сте сигурни дека сакате да го одбиете ресторанот?')) return;
    const res = await fetch(`/api/admin/restaurants/${id}/reject`, { method: 'POST' });
    if (res.ok) {
      if (selectedRestaurant?.id === id) setSelectedRestaurant(null);
      fetchRestaurants();
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
          fetchRestaurants();
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
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Дашборд
            </button>
            <button 
              onClick={() => setActiveTab('database')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'database' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Database size={16} />
              База на податоци
            </button>
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
    </div>
  );
}
