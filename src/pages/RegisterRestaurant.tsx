import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, CheckCircle2, Clock } from 'lucide-react';
import DeliveryZoneMap from '../components/DeliveryZoneMap';

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Понеделник' },
  { id: 'tuesday', label: 'Вторник' },
  { id: 'wednesday', label: 'Среда' },
  { id: 'thursday', label: 'Четврток' },
  { id: 'friday', label: 'Петок' },
  { id: 'saturday', label: 'Сабота' },
  { id: 'sunday', label: 'Недела' },
];

const MACEDONIAN_CITIES = [
  { name: 'Скопје', zip: '1000' },
  { name: 'Битола', zip: '7000' },
  { name: 'Куманово', zip: '1300' },
  { name: 'Прилеп', zip: '7500' },
  { name: 'Тетово', zip: '1200' },
  { name: 'Велес', zip: '1400' },
  { name: 'Штип', zip: '2000' },
  { name: 'Охрид', zip: '6000' },
  { name: 'Гостивар', zip: '1230' },
  { name: 'Струмица', zip: '2400' },
  { name: 'Кавадарци', zip: '1430' },
  { name: 'Кочани', zip: '2300' },
  { name: 'Кичево', zip: '6250' },
  { name: 'Струга', zip: '6330' },
  { name: 'Радовиш', zip: '2420' },
  { name: 'Гевгелија', zip: '1480' },
  { name: 'Дебар', zip: '1250' },
  { name: 'Крива Паланка', zip: '1330' },
  { name: 'Свети Николе', zip: '2080' },
  { name: 'Неготино', zip: '1440' },
  { name: 'Делчево', zip: '2320' },
  { name: 'Виница', zip: '2310' },
  { name: 'Ресен', zip: '7310' },
  { name: 'Пробиштип', zip: '2210' },
  { name: 'Берово', zip: '2330' },
  { name: 'Кратово', zip: '1360' },
  { name: 'Крушево', zip: '7430' },
  { name: 'Македонски Брод', zip: '6530' },
  { name: 'Валандово', zip: '2460' },
  { name: 'Демир Хисар', zip: '7240' }
].sort((a, b) => a.name.localeCompare(b.name));

export default function RegisterRestaurant() {
  const navigate = useNavigate();
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const initialWorkingHours = DAYS_OF_WEEK.reduce((acc, day) => {
    acc[day.id] = { active: true, start: '10:00', end: '23:00' };
    return acc;
  }, {} as Record<string, { active: boolean; start: string; end: string }>);

  const [workingHours, setWorkingHours] = useState(initialWorkingHours);

  const [formData, setFormData] = useState({
    name: '',
    city: '',
    address: '',
    email: '',
    phone: '',
    bank_account: '',
    has_own_delivery: false,
    spare_1: '',
    spare_2: '',
    spare_3: '',
    delivery_zones: [] as [number, number][][]
  });

  const handleWorkingHourChange = (dayId: string, field: 'active' | 'start' | 'end', value: any) => {
    setWorkingHours(prev => ({
      ...prev,
      [dayId]: { ...prev[dayId], [field]: value }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/restaurants/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, working_hours: workingHours })
    });
    
    if (res.ok) {
      setIsSubmitted(true);
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
            Вашето барање е испратено до администраторот. Доколку биде одобрено, ќе добиете е-маил со вашето корисничко име и лозинка.
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
        <h1 className="text-xl font-bold text-slate-800">Регистрирај Ресторан</h1>
      </header>

      <main className="max-w-3xl mx-auto p-6 py-10">
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Основни информации</h2>
            <p className="text-slate-500">Пополнете ги податоците за вашиот ресторан за да станете дел од PizzaTime.</p>
          </div>
          
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Назив на ресторанот *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Пр. Пицерија Наполи" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Град *</label>
                <select 
                  required 
                  value={formData.city} 
                  onChange={e => {
                    const selectedCity = MACEDONIAN_CITIES.find(c => c.name === e.target.value);
                    setFormData({
                      ...formData, 
                      city: e.target.value,
                      spare_3: selectedCity ? selectedCity.zip : formData.spare_3
                    });
                  }} 
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                >
                  <option value="" disabled>Изберете град</option>
                  {MACEDONIAN_CITIES.map(city => (
                    <option key={city.name} value={city.name}>{city.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Адреса *</label>
                <input required type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Пр. Ул. Партизанска бр. 10" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Поштенски број *</label>
                <input required type="text" value={formData.spare_3} onChange={e => setFormData({...formData, spare_3: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Пр. 1000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Е-маил адреса *</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" placeholder="info@napoli.mk" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Телефонски број *</label>
                <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" placeholder="07X XXX XXX" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Жиро сметка *</label>
                <input required type="text" value={formData.bank_account} onChange={e => setFormData({...formData, bank_account: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" placeholder="XXXX XXXX XXXX XXX" />
              </div>
            </div>

            <div className="py-4 border-y border-slate-100">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={formData.has_own_delivery} onChange={e => setFormData({...formData, has_own_delivery: e.target.checked})} className="w-5 h-5 text-orange-600 rounded border-slate-300 focus:ring-orange-500" />
                <span className="text-slate-800 font-medium">Имаме сопствена достава (Delivery)</span>
              </label>
            </div>

            <div className="py-4">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Clock className="text-orange-500" />
                Работно време за достава
              </h3>
              <p className="text-sm text-slate-500 mb-4">Означете во кои денови и во кое време ресторанот врши достава.</p>
              
              <div className="space-y-3">
                {DAYS_OF_WEEK.map(day => (
                  <div key={day.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <label className="flex items-center gap-3 cursor-pointer min-w-[150px]">
                      <input 
                        type="checkbox" 
                        checked={workingHours[day.id].active} 
                        onChange={e => handleWorkingHourChange(day.id, 'active', e.target.checked)} 
                        className="w-5 h-5 text-orange-600 rounded border-slate-300 focus:ring-orange-500" 
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
                          className="p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                        />
                        <span className="text-slate-500">-</span>
                        <input 
                          type="time" 
                          value={workingHours[day.id].end} 
                          onChange={e => handleWorkingHourChange(day.id, 'end', e.target.value)}
                          className="p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400 italic">Не работи</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Зони на достава (Нацртајте на мапа)</label>
              <DeliveryZoneMap 
                zones={formData.delivery_zones} 
                setZones={(zones) => setFormData({...formData, delivery_zones: zones})} 
              />
              <p className="text-xs text-slate-500 mt-2">
                * Кликнете на мапата за да додадете точки. Потребни се барем 3 точки за да се формира зона.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Резервно поле 1</label>
                <input type="text" value={formData.spare_1} onChange={e => setFormData({...formData, spare_1: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Резервно поле 2</label>
                <input type="text" value={formData.spare_2} onChange={e => setFormData({...formData, spare_2: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Резервно поле 3</label>
                <input type="text" value={formData.spare_3} onChange={e => setFormData({...formData, spare_3: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
            </div>
          </div>

          <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-orange-600/20">
              Испрати барање
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
