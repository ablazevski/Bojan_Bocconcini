import React, { useState, useEffect } from 'react';
import { X, Download, Share2, PlusSquare } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');

  useEffect(() => {
    // Check if already in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');

    if (isStandalone) return;

    // Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);

    setPlatform(isIos ? 'ios' : isAndroid ? 'android' : 'other');

    // Show after 5 seconds of session
    const timer = setTimeout(() => {
      const dismissed = localStorage.getItem('pwa_prompt_dismissed');
      if (!dismissed) setShow(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] animate-in fade-in slide-in-from-bottom-5 duration-500">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-orange-100 dark:border-slate-700 p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-red-500"></div>
        
        <button 
          onClick={() => {
            setShow(false);
            localStorage.setItem('pwa_prompt_dismissed', 'true');
          }}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4">
          <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-xl">
            <Download className="text-orange-600 dark:text-orange-400" size={24} />
          </div>
          <div className="flex-1 pr-6">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-1">Инсталирај PizzaTime</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
              Додајте ја апликацијата на почетниот екран за побрз пристап без отворање прелистувач.
            </p>

            {platform === 'ios' ? (
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="text-[10px] text-slate-600 dark:text-slate-400 flex items-center gap-2 mb-2">
                  1. Притиснете на иконата за споделување <Share2 size={12} className="text-blue-500" />
                </p>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  2. Изберете <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">Add to Home Screen <PlusSquare size={12} /></span>
                </p>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="text-[10px] text-slate-600 dark:text-slate-400">
                  Притиснете на менито на прелистувачот (три точки) и изберете <span className="font-bold text-slate-800 dark:text-slate-200">"Install app"</span> или <span className="font-bold text-slate-800 dark:text-slate-200">"Add to Home Screen"</span>.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
