import { Link } from 'react-router-dom';
import { Shield, Store, User, Bike, PlusCircle } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-orange-600 mb-4 tracking-tight">PizzaTime</h1>
          <p className="text-xl text-orange-900/70">Изберете го вашиот профил за најава</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Admin Portal */}
          <Link 
            to="/admin" 
            className="group bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-orange-100 flex flex-col items-center text-center hover:-translate-y-1"
          >
            <div className="w-16 h-16 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-slate-600 group-hover:text-white transition-colors">
              <Shield size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Администратор</h2>
            <p className="text-sm text-slate-500">Управување со системот, корисници и ресторани</p>
          </Link>

          {/* Restaurant Portal */}
          <Link 
            to="/restaurant" 
            className="group bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-orange-100 flex flex-col items-center text-center hover:-translate-y-1"
          >
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-red-600 group-hover:text-white transition-colors">
              <Store size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Ресторан</h2>
            <p className="text-sm text-slate-500">Примање нарачки и управување со мени</p>
          </Link>

          {/* Customer Portal */}
          <Link 
            to="/customer" 
            className="group bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-orange-100 flex flex-col items-center text-center hover:-translate-y-1"
          >
            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-orange-600 group-hover:text-white transition-colors">
              <User size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Нарачател</h2>
            <p className="text-sm text-slate-500">Преглед на мени и правење нарачки</p>
          </Link>

          {/* Delivery Portal */}
          <Link 
            to="/delivery" 
            className="group bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-orange-100 flex flex-col items-center text-center hover:-translate-y-1"
          >
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Bike size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Доставувач</h2>
            <p className="text-sm text-slate-500">Преземање и следење на активни достави</p>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/register-restaurant" className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium bg-orange-100/50 hover:bg-orange-100 px-6 py-3 rounded-full transition-colors">
            <PlusCircle size={20} />
            Сакате да го додадете вашиот ресторан?
          </Link>
          <Link to="/register-delivery" className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium bg-emerald-100/50 hover:bg-emerald-100 px-6 py-3 rounded-full transition-colors">
            <PlusCircle size={20} />
            Сакате да станете доставувач?
          </Link>
        </div>
      </div>
    </div>
  );
}
