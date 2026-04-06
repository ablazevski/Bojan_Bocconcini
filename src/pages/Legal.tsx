import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Shield, CreditCard, Truck, AlertTriangle, Moon, Sun } from 'lucide-react';
import SEO from '../components/SEO';
import { useTheme } from '../context/ThemeContext';

const LegalLayout = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-orange-100 selection:text-orange-900 transition-colors duration-300">
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
          <button 
            onClick={toggleTheme}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            title={theme === 'light' ? 'Префрли во темен режим' : 'Префрли во светол режим'}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 md:p-12 transition-colors duration-300">
          <header className="mb-12 text-center">
            <div className="inline-flex p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl mb-6">
              <Icon size={40} className="text-orange-500" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4">{title}</h1>
          </header>

          <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-black prose-headings:tracking-tight prose-p:text-slate-600 dark:prose-p:text-slate-400 prose-li:text-slate-600 dark:prose-li:text-slate-400">
            {children}
          </div>
        </div>
      </main>

      <footer className="max-w-4xl mx-auto px-6 py-12 text-center border-t border-slate-200 dark:border-slate-800 mt-12">
        <p className="text-slate-400 dark:text-slate-600 text-xs font-bold uppercase tracking-widest">
          © {new Date().getFullYear()} PIZZA TIME. Сите права се задржани.
        </p>
      </footer>
    </div>
  );
};

export const DynamicPage = ({ slug: propSlug, icon: Icon = Shield }: { slug?: string, icon?: any }) => {
  const { slug: urlSlug } = useParams<{ slug: string }>();
  const slug = propSlug || urlSlug;
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const fetchPage = async () => {
      try {
        const res = await fetch(`/api/pages/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setPage(data);
        }
      } catch (e) {
        console.error('Failed to fetch page', e);
      } finally {
        setLoading(false);
      }
    };
    fetchPage();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!page) {
    return (
      <LegalLayout title="Страницата не е пронајдена" icon={AlertTriangle}>
        <div className="text-center py-12">
          <p className="text-slate-600 dark:text-slate-400 mb-8">Се извинуваме, но страницата што ја барате не постои или е деактивирана.</p>
          <Link to="/" className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-2xl font-bold hover:bg-orange-600 transition-all">
            Врати се на почетна
          </Link>
        </div>
      </LegalLayout>
    );
  }

  return (
    <LegalLayout 
      title={page.title} 
      icon={Icon}
    >
      <SEO 
        title={page.meta_title || `${page.title} | PIZZA TIME`}
        description={page.meta_description || page.subtitle || page.title}
        keywords={page.meta_keywords}
      />
      {page.subtitle && <p className="text-lg text-slate-500 dark:text-slate-400 mb-8 italic">{page.subtitle}</p>}
      <div className="dynamic-content prose prose-slate dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: page.content }} />
    </LegalLayout>
  );
};

export const PrivacyPolicy = () => <DynamicPage slug="privacy-policy" icon={Shield} />;
export const PaymentTerms = () => <DynamicPage slug="payment-terms" icon={CreditCard} />;
export const DeliveryTerms = () => <DynamicPage slug="delivery-terms" icon={Truck} />;
