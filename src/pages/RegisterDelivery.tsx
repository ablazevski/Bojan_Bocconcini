import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, CheckCircle2, Clock, Store, Package, Bike } from 'lucide-react';

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Понеделник' },
  { id: 'tuesday', label: 'Вторник' },
  { id: 'wednesday', label: 'Среда' },
  { id: 'thursday', label: 'Четврток' },
  { id: 'friday', label: 'Петок' },
  { id: 'saturday', label: 'Сабота' },
  { id: 'sunday', label: 'Недела' },
];

interface Restaurant {
  id: number;
  name: string;
  address: string;
}

export default function RegisterDelivery() {
  const navigate = useNavigate();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [availableRestaurants, setAvailableRestaurants] = useState<Restaurant[]>([]);
  
  const initialWorkingHours = DAYS_OF_WEEK.reduce((acc, day) => {
    acc[day.id] = { active: true, start: '10:00', end: '23:00' };
    return acc;
  }, {} as Record<string, { active: boolean; start: string; end: string }>);

  const [workingHours, setWorkingHours] = useState(initialWorkingHours);
  const [selectedRestaurants, setSelectedRestaurants] = useState<number[]>([]);
  const [deliveryMethods, setDeliveryMethods] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    city: '',
    address: '',
    email: '',
    phone: '',
    bank_account: '',
  });

  useEffect(() => {
    fetch('/api/customer/cities')
      .then(res => res.json())
      .then(data => setCities(data));
  }, []);

  useEffect(() => {
    if (formData.city) {
      fetch(`/api/restaurants/by-city/${formData.city}`)
        .then(res => res.json())
        .then(data => {
          setAvailableRestaurants(data);
          setSelectedRestaurants([]); // Reset selection when city changes
        });
    } else {
      setAvailableRestaurants([]);
    }
  }, [formData.city]);

  const handleWorkingHourChange = (dayId: string, field: 'active' | 'start' | 'end', value: any) => {
    setWorkingHours(prev => ({
      ...prev,
      [dayId]: { ...prev[dayId], [field]: value }
    }));
  };

  const toggleRestaurant = (id: number) => {
    setSelectedRestaurants(prev => 
      prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]
    );
  };

  const toggleDeliveryMethod = (method: string) => {
    setDeliveryMethods(prev => 
      prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/delivery/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...formData, 
          working_hours: workingHours,
          preferred_restaurants: selectedRestaurants,
          delivery_methods: deliveryMethods
        })
      });
      
      if (res.ok) {
        setIsSubmitted(true);
      } else {
        const data = await res.json();
        alert(data.error || 'Грешка при регистрација');
      }
    } catch (err) {
      console.error('Registration error:', err);
      alert('Настана грешка при поврзување со серверот. Ве молиме обидете се повторно.');
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-slate-100">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Успешна регистрација!</h1>
          <p className="text-slate-600 mb-8">
            Вашето барање за доставувач е испратено до администраторот. Доколку биде одобрено, ќе добиете е-маил со вашето корисничко име и лозинка.
          </p>
          <Link to="/" className="inline-block bg-slate-800 text-white px-6 py-3 rounded-xl font-medium hover:bg-slate-900 transition-colors">
            Врати се кон почетна
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <Link to="/" className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-slate-800">Стани Доставувач</h1>
      </header>

      <main className="max-w-3xl mx-auto p-6 py-10">
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Лични информации</h2>
            <p className="text-slate-500">Пополнете ги податоците за да аплицирате како наш партнер за достава.</p>
          </div>
          
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Име и презиме *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Пр. Петар Петровски" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Град *</label>
                <select 
                  required 
                  value={formData.city} 
                  onChange={e => setFormData({...formData, city: e.target.value})} 
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                >
                  <option value="">Избери град</option>
                  {cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Адреса на живеење *</label>
                <input required type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Пр. Ул. Партизанска бр. 10" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Е-маил адреса *</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="petar@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Телефонски број *</label>
                <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="07X XXX XXX" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Жиро сметка *</label>
                <input required type="text" value={formData.bank_account} onChange={e => setFormData({...formData, bank_account: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="XXXX XXXX XXXX XXX" />
              </div>
            </div>

            {/* Delivery Methods */}
            <div className="py-6 border-t border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Bike className="text-emerald-500" />
                Начин на достава
              </h3>
              <p className="text-sm text-slate-500 mb-6">Изберете со кои превозни средства располагате за достава.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { id: 'bicycle', label: 'Велосипед' },
                  { id: 'motorcycle', label: 'Мотор' },
                  { id: 'car', label: 'Автомобил' }
                ].map(method => (
                  <label 
                    key={method.id} 
                    className={`flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                      deliveryMethods.includes(method.id) 
                        ? 'bg-emerald-50 border-emerald-200 shadow-sm' 
                        : 'bg-white border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      checked={deliveryMethods.includes(method.id)} 
                      onChange={() => toggleDeliveryMethod(method.id)}
                      className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500" 
                    />
                    <span className="font-bold text-slate-800">{method.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Restaurant Selection */}
            <div className="py-6 border-t border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Store className="text-emerald-500" />
                Избор на ресторани
              </h3>
              <p className="text-sm text-slate-500 mb-6">Изберете со кои ресторани во вашиот град сакате да соработувате.</p>
              
              {!formData.city ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                  Прво изберете град за да се појават достапните ресторани.
                </div>
              ) : availableRestaurants.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                  Нема пронајдено активни ресторани во овој град.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {availableRestaurants.map(rest => (
                    <label 
                      key={rest.id} 
                      className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                        selectedRestaurants.includes(rest.id) 
                          ? 'bg-emerald-50 border-emerald-200 shadow-sm' 
                          : 'bg-white border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        checked={selectedRestaurants.includes(rest.id)} 
                        onChange={() => toggleRestaurant(rest.id)}
                        className="mt-1 w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500" 
                      />
                      <div>
                        <p className="font-bold text-slate-800">{rest.name}</p>
                        <p className="text-xs text-slate-500">{rest.address}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Working Hours */}
            <div className="py-6 border-t border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Clock className="text-emerald-500" />
                Работно време
              </h3>
              <p className="text-sm text-slate-500 mb-6">Означете во кои денови и во кое време сте достапни за достава.</p>
              
              <div className="space-y-3">
                {DAYS_OF_WEEK.map(day => (
                  <div key={day.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <label className="flex items-center gap-3 cursor-pointer min-w-[150px]">
                      <input 
                        type="checkbox" 
                        checked={workingHours[day.id].active} 
                        onChange={e => handleWorkingHourChange(day.id, 'active', e.target.checked)} 
                        className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500" 
                      />
                      <span className={`font-medium ${workingHours[day.id].active ? 'text-slate-800' : 'text-slate-400'}`}>
                        {day.label}
                      </span>
                    </label>
                    
                    {workingHours[day.id].active ? (
                      <div className="flex items-center gap-2">
                        <input 
                          type="time" 
                          value={workingHours[day.id].start} 
                          onChange={e => handleWorkingHourChange(day.id, 'start', e.target.value)}
                          className="p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                        />
                        <span className="text-slate-500">-</span>
                        <input 
                          type="time" 
                          value={workingHours[day.id].end} 
                          onChange={e => handleWorkingHourChange(day.id, 'end', e.target.value)}
                          className="p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400 italic">Не работи</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-emerald-600/20 flex items-center gap-2">
              <Package size={20} />
              Испрати апликација
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
