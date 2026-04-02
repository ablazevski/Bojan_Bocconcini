import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Shield, CreditCard, Truck } from 'lucide-react';
import SEO from '../components/SEO';

const LegalLayout = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-orange-100 selection:text-orange-900">
      <SEO title={`${title} | PIZZA TIME`} description={title} />
      
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors group">
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold text-sm">Назад</span>
          </Link>
          <div className="flex items-center gap-2">
            <Icon size={20} className="text-orange-500" />
            <span className="font-black text-slate-900 dark:text-white tracking-tight">PIZZA TIME</span>
          </div>
          <div className="w-10"></div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 md:p-12">
          <header className="mb-12 text-center">
            <div className="inline-flex p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl mb-6">
              <Icon size={40} className="text-orange-500" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4">{title}</h1>
            <p className="text-slate-500 dark:text-slate-400">Последна промена: {new Date().toLocaleDateString('mk-MK')}</p>
          </header>

          <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-black prose-headings:tracking-tight prose-p:text-slate-600 dark:prose-p:text-slate-400 prose-li:text-slate-600 dark:prose-li:text-slate-400">
            {children}
          </div>
        </div>
      </main>

      <footer className="max-w-4xl mx-auto px-6 py-12 text-center">
        <p className="text-slate-400 dark:text-slate-600 text-xs font-bold uppercase tracking-widest">
          © {new Date().getFullYear()} PIZZA TIME. Сите права се задржани.
        </p>
      </footer>
    </div>
  );
};

export const PrivacyPolicy = () => (
  <LegalLayout title="Политика за приватност" icon={Shield}>
    <h2>1. Собирање на информации</h2>
    <p>Ние собираме информации кои ни ги давате директно кога користите нашите услуги, како што се вашето име, адреса за достава, телефонски број и е-маил адреса.</p>
    
    <h2>2. Користење на информациите</h2>
    <p>Вашите информации ги користиме исклучиво за процесирање на вашите нарачки, подобрување на нашите услуги и комуникација со вас во врска со вашите нарачки.</p>
    
    <h2>3. Заштита на податоци</h2>
    <p>Ние применуваме низа безбедносни мерки за да ја одржиме безбедноста на вашите лични информации. Вашите лични податоци се чуваат зад обезбедени мрежи и се достапни само за ограничен број лица кои имаат посебни права за пристап до таквите системи.</p>
    
    <h2>4. Колачиња (Cookies)</h2>
    <p>Користиме колачиња за да го подобриме вашето искуство на нашата веб-страница, да ги запомниме вашите преференции и да анализираме како се користи нашата услуга.</p>
  </LegalLayout>
);

export const PaymentTerms = () => (
  <LegalLayout title="Услови за плаќање" icon={CreditCard}>
    <h2>1. Начини на плаќање</h2>
    <p>Прифаќаме плаќање во готово при достава и плаќање со кредитни/дебитни картички (Visa, MasterCard, Maestro, Diners) преку нашиот безбеден систем за онлајн плаќање.</p>
    
    <h2>2. Безбедност на плаќањето</h2>
    <p>Сите трансакции со картички се вршат преку безбеден протокол и податоците за вашата картичка не се чуваат на нашите сервери.</p>
    
    <h2>3. Валута</h2>
    <p>Сите цени се изразени во македонски денари (МКД) со вклучен ДДВ.</p>
    
    <h2>4. Потврда за плаќање</h2>
    <p>По успешното плаќање, ќе добиете потврда на вашата е-маил адреса со детали за трансакцијата.</p>
  </LegalLayout>
);

export const DeliveryTerms = () => (
  <LegalLayout title="Начини на достава и враќање на средствата" icon={Truck}>
    <h2>1. Достава</h2>
    <p>Доставата се врши во најкраток можен рок по потврдата на нарачката. Времето на достава зависи од вашата локација и моменталната оптовареност на рестораните.</p>
    
    <h2>2. Трошоци за достава</h2>
    <p>Трошоците за достава се јасно наведени пред да ја потврдите вашата нарачка.</p>
    
    <h2>3. Враќање на средствата</h2>
    <p>Враќање на средствата е можно во случај на погрешно доставена нарачка или доколку нарачката не е доставена воопшто. Ве молиме контактирајте ја нашата поддршка веднаш по воочување на проблемот.</p>
    
    <h2>4. Откажување на нарачка</h2>
    <p>Нарачката може да се откаже само пред ресторанот да започне со нејзина подготовка.</p>
  </LegalLayout>
);
