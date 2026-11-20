import React, { useState } from 'react';
import { RotateCcw, Languages } from 'lucide-react';
import { Lang, LabModule, TRANSLATIONS } from './i18n/translations';
import { Module1ZerothLaw } from './modules/Module1ZerothLaw';
import { Module2Scales } from './modules/Module2Scales';
import { Module3FaultyTriplePoint } from './modules/Module3FaultyTriplePoint';

export default function App() {
  const [lang, setLang] = useState<Lang>('bn');
  const [activeModule, setActiveModule] = useState<LabModule>('mod1');
  const [resetCounters, setResetCounters] = useState<Record<LabModule, number>>({
    mod1: 0,
    mod2: 0,
    mod3: 0,
  });

  const t = TRANSLATIONS[lang];

  const handleResetActive = () => {
    setResetCounters((prev) => ({
      ...prev,
      [activeModule]: prev[activeModule] + 1,
    }));
  };

  const toggleLang = () => {
    setLang((prev) => (prev === 'bn' ? 'en' : 'bn'));
  };

  const tabs: Array<{ id: LabModule; full: string; short: string }> = [
    { id: 'mod1', full: t.tabs.mod1, short: t.tabs.mod1Short },
    { id: 'mod2', full: t.tabs.mod2, short: t.tabs.mod2Short },
    { id: 'mod3', full: t.tabs.mod3, short: t.tabs.mod3Short },
  ];

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col bg-sky-50 text-slate-950">
      {/* TOP NAVIGATION & BRANDING BAR */}
      <header className="shrink-0 bg-white/95 backdrop-blur-md border-b border-sky-200 px-4 py-2.5 shadow-xs">
        <div className="max-w-[1920px] mx-auto flex flex-wrap xl:flex-nowrap items-center justify-between gap-3">
          {/* Left: Studio Title */}
          <div className="min-w-0 flex items-center">
            <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-950 truncate max-w-[340px] 2xl:max-w-[460px]">
              {t.appTitle}
            </h1>
          </div>

          {/* Center: 3 Interactive Lab Mode Tabs (Pill Navigation) */}
          <nav
            aria-label="Laboratory Modules"
            className="order-3 xl:order-2 w-full xl:w-auto flex items-center justify-start xl:justify-center overflow-x-auto lab-scroll"
          >
            <div className="inline-flex items-center gap-1 p-1 rounded-full bg-sky-100/80 border border-sky-200">
              {tabs.map((tab) => {
                const isActive = activeModule === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveModule(tab.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-700 hover:text-slate-950 hover:bg-white/70'
                    }`}
                  >
                    <span className="hidden 2xl:inline">{tab.full}</span>
                    <span className="2xl:hidden">{tab.short}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Right: Language Switcher, Reset Button & Institution Badge */}
          <div className="order-2 xl:order-3 flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleLang}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-200 bg-sky-50/70 hover:bg-sky-100 text-slate-900 text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              <Languages className="w-3.5 h-3.5 text-sky-700" />
              <span>{t.langToggle}</span>
            </button>

            <button
              type="button"
              onClick={handleResetActive}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-200 bg-white hover:bg-sky-50 text-slate-900 text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-700" />
              <span>{t.reset}</span>
            </button>

            <span className="bg-rose-50 border border-rose-300 text-rose-600 font-extrabold px-3 py-1 rounded-full text-sm whitespace-nowrap shrink-0">
              উদ্ভাস
            </span>
          </div>
        </div>
      </header>

      {/* MAIN 3-COLUMN WORKSPACE STAGE */}
      <main className="flex-1 min-h-0 p-3 sm:p-4 max-w-[1920px] w-full mx-auto">
        {activeModule === 'mod1' && (
          <Module1ZerothLaw lang={lang} t={t} resetSignal={resetCounters.mod1} />
        )}
        {activeModule === 'mod2' && (
          <Module2Scales lang={lang} t={t} resetSignal={resetCounters.mod2} />
        )}
        {activeModule === 'mod3' && (
          <Module3FaultyTriplePoint lang={lang} t={t} resetSignal={resetCounters.mod3} />
        )}
      </main>
    </div>
  );
}
