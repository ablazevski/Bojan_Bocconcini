import { Link } from 'react-router-dom';
import { Shield, Store, User, Bike, PlusCircle, Users, Bell } from 'lucide-react';
import SEO from '../components/SEO';
import { useState, useEffect } from 'react';

export default function Portal() {
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const requestPermission = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Вашиот прелистувач не поддржува известувања.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationStatus(permission);
      
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        const res = await fetch('/api/push/key');
        const { publicKey } = await res.json();
        
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });
        
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription })
        });
        
        alert('Успешно се претплативте на известувања!');
      }
    } catch (error) {
      console.error('Error subscribing to push:', error);
      alert('Грешка при претплата на известувања. Обидете се повторно.');
    }
  };

  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
  return (
    <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6">
      <SEO 
        title="PizzaTime - Најбрза достава на храна во Македонија"
        description="Нарачајте ја вашата омилена храна од најдобрите ресторани во вашиот град. Брза и сигурна достава до вашата врата."
      />
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-orange-600 mb-4 tracking-tight">PizzaTime</h1>
          <p className="text-xl text-orange-900/70">Изберете го вашиот профил за најава</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
          {/* Admin Portal */}
          <Link 
            to="/admin" 
            className="group bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-orange-100 flex flex-col items-center text-center hover:-translate-y-1"
          >
            <div className="w-14 h-14 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-slate-600 group-hover:text-white transition-colors">
              <Shield size={28} />
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Администратор</h2>
            <p className="text-xs text-slate-500">Управување со системот</p>
          </Link>

          {/* Restaurant Portal */}
          <Link 
            to="/restaurant" 
            className="group bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-orange-100 flex flex-col items-center text-center hover:-translate-y-1"
          >
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-red-600 group-hover:text-white transition-colors">
              <Store size={28} />
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Ресторан</h2>
            <p className="text-xs text-slate-500">Примање нарачки</p>
          </Link>

          {/* Customer Portal */}
          <Link 
            to="/customer" 
            className="group bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-orange-100 flex flex-col items-center text-center hover:-translate-y-1"
          >
            <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-orange-600 group-hover:text-white transition-colors">
              <User size={28} />
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Нарачател</h2>
            <p className="text-xs text-slate-500">Нарачајте храна</p>
          </Link>

          {/* Delivery Portal */}
          <Link 
            to="/delivery" 
            className="group bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-orange-100 flex flex-col items-center text-center hover:-translate-y-1"
          >
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Bike size={28} />
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Доставувач</h2>
            <p className="text-xs text-slate-500">Активни достави</p>
          </Link>

          {/* Marketing Portal */}
          <Link 
            to="/marketing" 
            className="group bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-orange-100 flex flex-col items-center text-center hover:-translate-y-1"
          >
            <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Users size={28} />
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Маркетинг</h2>
            <p className="text-xs text-slate-500">Маркетинг соработници</p>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <Link to="/register-restaurant" className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium bg-orange-100/50 hover:bg-orange-100 px-6 py-3 rounded-full transition-colors">
            <PlusCircle size={20} />
            Сакате да го додадете вашиот ресторан?
          </Link>
          <Link to="/register-delivery" className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium bg-emerald-100/50 hover:bg-emerald-100 px-6 py-3 rounded-full transition-colors">
            <PlusCircle size={20} />
            Сакате да станете доставувач?
          </Link>
        </div>

        {notificationStatus !== 'granted' && (
          <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-3xl border border-orange-100 shadow-sm">
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-800 mb-1">Бидете во тек!</h3>
              <p className="text-sm text-slate-500 mb-4">Вклучете известувања за да добивате информации за вашите нарачки во реално време.</p>
              <button 
                onClick={requestPermission}
                className="inline-flex items-center gap-2 bg-orange-600 text-white px-8 py-3 rounded-full font-bold hover:bg-orange-700 transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                <Bell size={20} />
                Овозможи известувања
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
