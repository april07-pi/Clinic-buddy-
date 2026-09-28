import React from 'react';
import { Shield, Users, User, Globe, Wifi, Volume2, VolumeX, Sparkles, HeartPulse } from 'lucide-react';
import { LanguageCode, Patient } from '../types';
import { SUPPORTED_LANGUAGES, UI_TRANSLATIONS } from '../data/healthProtocols';
import { VoiceNarrator } from '../utils/audioAssistant';

interface Props {
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  isChwMode: boolean;
  onToggleChwMode: () => void;
  activePatient: Patient;
  patientList: Patient[];
  onSelectPatient: (patient: Patient) => void;
  activeView: 'triage' | 'passport' | 'medications' | 'vitals';
  onSelectView: (view: 'triage' | 'passport' | 'medications' | 'vitals') => void;
}

export const Header: React.FC<Props> = ({
  language,
  onLanguageChange,
  isChwMode,
  onToggleChwMode,
  activePatient,
  patientList,
  onSelectPatient,
  activeView,
  onSelectView,
}) => {
  const t = UI_TRANSLATIONS[language] || UI_TRANSLATIONS.en;

  return (
    <header className="sticky top-0 z-40 bg-stone-900 text-white border-b border-stone-800 shadow-md">
      {/* Top utility row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs border-b border-stone-800/80">
        <div className="flex items-center gap-3">
          {/* Offline indicator */}
          <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-1 rounded-full font-medium">
            <Wifi className="w-3.5 h-3.5" />
            <span>Offline Ready (SA NDoH IMCI)</span>
          </div>

          {/* Active patient pill */}
          <div className="flex items-center gap-1.5 bg-stone-800/80 px-2.5 py-1 rounded-full text-stone-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Active:</span>
            <select
              value={activePatient.id}
              onChange={(e) => {
                const found = patientList.find((p) => p.id === e.target.value);
                if (found) onSelectPatient(found);
              }}
              className="bg-transparent font-semibold text-white focus:outline-hidden cursor-pointer"
            >
              {patientList.map((p) => (
                <option key={p.id} value={p.id} className="bg-stone-900 text-white">
                  {p.name} ({p.roadToHealthNumber})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode Switcher */}
          <button
            type="button"
            onClick={onToggleChwMode}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              isChwMode
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            {isChwMode ? <Users className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
            <span>{isChwMode ? t.chwMode : t.caregiverMode}</span>
          </button>

          {/* Language Selector */}
          <div className="flex items-center gap-1 bg-stone-800/90 rounded-full px-2 py-0.5 border border-stone-700">
            <Globe className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value as LanguageCode)}
              aria-label="Select Language"
              className="bg-transparent text-xs font-semibold text-white focus:outline-hidden cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} className="bg-stone-900 text-white">
                  {l.flagEmoji} {l.name} ({l.nativeName})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main navigation row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-900/40">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">ClinikBuddy</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                HealthTech
              </span>
            </div>
            <p className="text-xs text-stone-400 font-medium">{t.tagline}</p>
          </div>
        </div>

        {/* View Tabs */}
        <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => onSelectView('triage')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeView === 'triage'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-stone-300 hover:bg-stone-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{t.symptomTracker}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectView('passport')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeView === 'passport'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-stone-300 hover:bg-stone-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>{t.healthPassport}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectView('medications')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeView === 'medications'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-stone-300 hover:bg-stone-800'
            }`}
          >
            <span className="text-sm">💊</span>
            <span>{t.medications}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectView('vitals')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeView === 'vitals'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-stone-300 hover:bg-stone-800'
            }`}
          >
            <span className="text-sm">🫁</span>
            <span>{t.vitalsCheck}</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
