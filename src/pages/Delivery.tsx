import { Link } from 'react-router-dom';
import { ArrowLeft, Map, Navigation, CheckCircle2 } from 'lucide-react';

export default function Delivery() {
  return (
    <div className="min-h-screen bg-emerald-50/30">
      <header className="bg-white border-b border-emerald-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-emerald-50 rounded-full text-emerald-500 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold text-slate-800">Доставувач</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Активен
          </div>
        </div>
      </header>
      
      <main className="max-w-md mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Map className="text-emerald-500" size={20} />
              Нови достави
            </h2>
            <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-xs font-bold">0</span>
          </div>
          <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p>Нема нови барања за достава.</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Тековна достава</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6 opacity-50">
            <div className="flex items-center justify-center py-6 text-slate-400 gap-2">
              <CheckCircle2 size={24} />
              <span>Слободен</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
