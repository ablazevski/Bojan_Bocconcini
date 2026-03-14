import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { FileText, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

export default function Contract() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signed, setSigned] = useState(false);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    fetchPartner();
  }, [id]);

  const fetchPartner = async () => {
    try {
      const res = await fetch(`/api/delivery/partner/${id}`);
      if (!res.ok) throw new Error('Доставувачот не е пронајден');
      const data = await res.json();
      setPartner(data);
      if (data.has_signed_contract === 1) {
        setSigned(true);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    setSigning(true);
    try {
      const res = await fetch(`/api/delivery/partner/${id}/sign`, {
        method: 'POST'
      });
      if (res.ok) {
        setSigned(true);
      } else {
        throw new Error('Грешка при потпишување');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center max-w-md w-full">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Грешка</h2>
          <p className="text-slate-500 mb-6">{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold"
          >
            Назад кон почетна
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden"
        >
          <div className="bg-slate-900 p-8 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-500/20 p-2 rounded-lg">
                <FileText className="text-blue-400" size={24} />
              </div>
              <h1 className="text-2xl font-bold">Договор за соработка</h1>
            </div>
            <p className="text-slate-400">
              Почитуван/а {partner.name}, ве молиме прочитајте го и потпишете го договорот за да можете да започнете со работа.
            </p>
          </div>

          <div className="p-8 space-y-6">
            <div className="prose prose-slate max-w-none h-[400px] overflow-y-auto p-6 bg-slate-50 rounded-2xl border border-slate-200 text-sm leading-relaxed">
              <h3 className="text-center font-bold mb-4">ДОГОВОР ЗА ДЕЛОВНА СОРАБОТКА</h3>
              <p className="mb-4">
                Овој договор е склучен помеѓу Платформата за достава (во понатамошниот текст: "Платформа") и {partner.name} (во понатамошниот текст: "Доставувач").
              </p>
              
              <h4 className="font-bold mb-2">1. ПРЕДМЕТ НА ДОГОВОРОТ</h4>
              <p className="mb-4">
                Предмет на овој договор е регулирање на меѓусебните права и обврски во врска со вршење на услуги за достава на храна и други производи од рестораните партнери до крајните корисници преку Платформата.
              </p>

              <h4 className="font-bold mb-2">2. ОБВРСКИ НА ДОСТАВУВАЧОТ</h4>
              <ul className="list-disc pl-5 mb-4 space-y-2">
                <li>Доставувачот се обврзува услугите да ги врши професионално, навремено и со внимание на добар стопанственик.</li>
                <li>Доставувачот е должен да поседува соодветно превозно средство и мобилен уред за користење на апликацијата.</li>
                <li>Доставувачот е одговорен за безбедноста на производите за време на транспортот.</li>
                <li>Доставувачот се обврзува да ги почитува хигиенските стандарди и правилата за сообраќај.</li>
              </ul>

              <h4 className="font-bold mb-2">3. НАДОМЕСТОК И ИСПЛАТА</h4>
              <p className="mb-4">
                Надоместокот за извршените услуги се пресметува согласно важечкиот ценовник на Платформата во моментот на извршување на доставата. Исплатата се врши на неделна основа на трансакциската сметка на Доставувачот.
              </p>

              <h4 className="font-bold mb-2">4. ТРАЕЊЕ И РАСКИНУВАЊЕ</h4>
              <p className="mb-4">
                Овој договор е склучен на неопределено време. Секоја од страните може да го раскине договорот со писмено известување од 7 дена. Платформата го задржува правото на итен раскин во случај на сериозно прекршување на правилата.
              </p>

              <h4 className="font-bold mb-2">5. ЗАШТИТА НА ПОДАТОЦИ</h4>
              <p className="mb-4">
                Доставувачот се обврзува да ги чува како деловна тајна сите информации до кои ќе дојде за време на вршењето на услугите, вклучувајќи ги и личните податоци на корисниците.
              </p>

              <div className="mt-12 pt-8 border-t border-slate-200">
                <p className="italic text-slate-400 text-xs">
                  * Овој договор е дигитално генериран и неговото потпишување преку Платформата има правна важност.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <div className="bg-blue-500 text-white p-2 rounded-full">
                <CheckCircle2 size={20} />
              </div>
              <p className="text-sm text-blue-800">
                Со кликнување на копчето "Потпиши и прифати", вие се согласувате со сите наведени услови во овој договор.
              </p>
            </div>

            {signed ? (
              <div className="bg-green-50 border border-green-200 p-6 rounded-2xl text-center">
                <CheckCircle2 className="mx-auto text-green-500 mb-2" size={32} />
                <h3 className="text-lg font-bold text-green-800">Договорот е потпишан!</h3>
                <p className="text-green-600 text-sm mb-4">Сега можете да се најавите на вашиот профил и да започнете со работа.</p>
                <button 
                  onClick={() => navigate('/portal')}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold transition-all"
                >
                  Оди на најава
                </button>
              </div>
            ) : (
              <button 
                onClick={handleSign}
                disabled={signing}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
              >
                {signing ? (
                  <><Loader2 className="animate-spin" size={20} /> Се процесира...</>
                ) : (
                  'Потпиши и прифати'
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
