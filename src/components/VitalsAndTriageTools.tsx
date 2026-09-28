import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, RotateCcw, AlertTriangle, CheckCircle, Info, Heart, Volume2 } from 'lucide-react';
import { LanguageCode } from '../types';
import { playTone, VoiceNarrator } from '../utils/audioAssistant';

interface Props {
  language: LanguageCode;
  patientAgeMonths: number;
  onApplyVitalsToTriage?: (vitals: {
    temperature: number;
    breathingRate: number;
    muacCm: number;
    muacColor: 'green' | 'yellow' | 'red';
    dehydrationPinch: 'normal' | 'slow' | 'very_slow';
  }) => void;
}

export const VitalsAndTriageTools: React.FC<Props> = ({
  language,
  patientAgeMonths,
  onApplyVitalsToTriage,
}) => {
  // 1. Fast Breathing Timer State
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(60);
  const [isCountingTimer, setIsCountingTimer] = useState(false);
  const [breathCount, setBreathCount] = useState(0);
  const intervalRef = useRef<number | null>(null);

  // 2. MUAC State
  const [muacValue, setMuacValue] = useState<number>(13.2);

  // 3. Temperature State
  const [temperature, setTemperature] = useState<number>(37.1);

  // 4. Skin Pinch State
  const [skinPinch, setSkinPinch] = useState<'normal' | 'slow' | 'very_slow'>('normal');

  // Age-based fast breathing cutoff
  const getBreathingThreshold = (age: number) => {
    if (age < 2) return 60;
    if (age < 12) return 50;
    return 40;
  };

  const cutoffBpm = getBreathingThreshold(patientAgeMonths);
  const isRapidBreathing = breathCount >= cutoffBpm;

  // MUAC categorization
  const getMuacCategory = (val: number): { color: 'green' | 'yellow' | 'red'; label: string; desc: string } => {
    if (val < 11.5) {
      return {
        color: 'red',
        label: 'Red Zone (< 11.5 cm)',
        desc: 'Severe Acute Malnutrition (SAM). Immediate referral for therapeutic food (RUTF).',
      };
    }
    if (val < 12.5) {
      return {
        color: 'yellow',
        label: 'Yellow Zone (11.5 - 12.4 cm)',
        desc: 'Moderate Acute Malnutrition (MAM). Supplementary feeding and clinic check required.',
      };
    }
    return {
      color: 'green',
      label: 'Green Zone (≥ 12.5 cm)',
      desc: 'Adequate nutrition status according to WHO / SA NDoH standards.',
    };
  };

  const muacStatus = getMuacCategory(muacValue);

  // Timer logic
  useEffect(() => {
    if (isCountingTimer) {
      intervalRef.current = window.setInterval(() => {
        setTimerSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setIsCountingTimer(false);
            playTone('chime');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isCountingTimer]);

  const handleStartTimer = () => {
    setBreathCount(0);
    setTimerSecondsLeft(60);
    setIsCountingTimer(true);
    playTone('chime');
  };

  const handleStopTimer = () => {
    setIsCountingTimer(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const handleResetTimer = () => {
    setIsCountingTimer(false);
    setBreathCount(0);
    setTimerSecondsLeft(60);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const handleTapBreath = () => {
    playTone('tick');
    setBreathCount((c) => c + 1);
  };

  const handleExportToTriage = () => {
    playTone('chime');
    if (onApplyVitalsToTriage) {
      onApplyVitalsToTriage({
        temperature,
        breathingRate: breathCount > 0 ? breathCount : 32,
        muacCm: muacValue,
        muacColor: muacStatus.color,
        dehydrationPinch: skinPinch,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* SECTION 1: Fast Breathing Counter with Acoustic Tick */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              SA IMCI Respiratory Tool
            </span>
            <h3 className="text-lg font-bold text-stone-900 mt-1 flex items-center gap-2">
              Fast Breathing Metronome & 60-Second Counter
            </h3>
            <p className="text-xs text-stone-600 mt-0.5">
              Target for {patientAgeMonths}mo infant: Fast breathing if ≥{' '}
              <strong className="text-rose-600">{cutoffBpm} breaths/min</strong> (sign of pneumonia).
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              VoiceNarrator.speak(
                `Watch the baby's chest rise and fall when calm. Tap the button every time the baby takes a breath for 60 seconds. For a ${patientAgeMonths} month old baby, forty to fifty breaths is normal. Above ${cutoffBpm} means fast breathing and possible chest infection.`,
                language
              );
            }}
            className="p-2 rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors shrink-0"
            title="Spoken audio instructions"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>

        {/* Counter Display and Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-stone-50 p-4 rounded-xl border border-stone-200 mb-4">
          {/* Left: Timer & Count */}
          <div className="flex items-center justify-around text-center">
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight font-mono">
                {timerSecondsLeft}s
              </div>
              <span className="text-[11px] font-semibold text-stone-500 uppercase">Countdown</span>
            </div>
            <div className="h-10 w-px bg-stone-300" />
            <div>
              <div
                className={`text-3xl sm:text-4xl font-extrabold font-mono transition-colors ${
                  breathCount >= cutoffBpm ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {breathCount}
              </div>
              <span className="text-[11px] font-semibold text-stone-500 uppercase">Breaths / min</span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex flex-col gap-2">
            {!isCountingTimer ? (
              <button
                type="button"
                onClick={handleStartTimer}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-all active:scale-98"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{timerSecondsLeft === 0 ? 'Start New 60s Count' : 'Start 60s Breath Timer'}</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleTapBreath}
                  className="col-span-2 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 animate-pulse"
                >
                  <Heart className="w-4 h-4 fill-white" />
                  <span>TAP EACH BREATH ({breathCount})</span>
                </button>
                <button
                  type="button"
                  onClick={handleStopTimer}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold"
                >
                  <Square className="w-3.5 h-3.5 fill-stone-700" />
                  <span>Pause</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetTimer}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Breathing classification readout */}
        {breathCount > 0 && (
          <div
            className={`p-3 rounded-xl border flex items-start gap-3 text-xs sm:text-sm ${
              isRapidBreathing
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            {isRapidBreathing ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold">
                {isRapidBreathing
                  ? `FAST BREATHING DETECTED (${breathCount} bpm ≥ ${cutoffBpm} cutoff)`
                  : `Normal Respiratory Rate (${breathCount} bpm)`}
              </div>
              <p className="text-xs mt-0.5 opacity-90">
                {isRapidBreathing
                  ? 'Child has rapid breathing under IMCI criteria. Check for lower chest indrawing or stridor. Immediate clinic review recommended.'
                  : 'Breathing rate is within acceptable range for age. Ensure child remains calm and comfortable.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: MUAC (Mid-Upper Arm Circumference) Interactive Tape */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
              Nutrition Screening
            </span>
            <h3 className="text-lg font-bold text-stone-900 mt-1">
              Mid-Upper Arm Circumference (MUAC Tape)
            </h3>
            <p className="text-xs text-stone-600">
              Assesses acute malnutrition in children 6 to 59 months without needing a scale.
            </p>
          </div>

          <div
            className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider shrink-0 ${
              muacStatus.color === 'red'
                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                : muacStatus.color === 'yellow'
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}
          >
            {muacValue.toFixed(1)} cm
          </div>
        </div>

        {/* Visual Slider Tape */}
        <div className="my-4">
          <div className="h-6 w-full rounded-lg overflow-hidden flex shadow-inner border border-stone-300">
            <div
              className="bg-rose-500 h-full flex items-center justify-center text-[10px] font-bold text-white tracking-wider"
              style={{ width: '35%' }}
            >
              RED (&lt;11.5)
            </div>
            <div
              className="bg-amber-400 h-full flex items-center justify-center text-[10px] font-bold text-stone-900 tracking-wider"
              style={{ width: '15%' }}
            >
              YELLOW
            </div>
            <div
              className="bg-emerald-500 h-full flex items-center justify-center text-[10px] font-bold text-white tracking-wider"
              style={{ width: '50%' }}
            >
              GREEN (≥12.5)
            </div>
          </div>

          <input
            type="range"
            min="9.0"
            max="16.5"
            step="0.1"
            value={muacValue}
            onChange={(e) => {
              setMuacValue(parseFloat(e.target.value));
            }}
            className="w-full mt-3 accent-stone-800 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-stone-500 font-mono mt-1">
            <span>9.0 cm</span>
            <span>11.5 cm</span>
            <span>12.5 cm</span>
            <span>16.5 cm</span>
          </div>
        </div>

        {/* MUAC status banner */}
        <div
          className={`p-3 rounded-xl border flex items-start gap-3 text-xs sm:text-sm ${
            muacStatus.color === 'red'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : muacStatus.color === 'yellow'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <Info className="w-5 h-5 shrink-0 mt-0.5 opacity-80" />
          <div>
            <div className="font-bold">{muacStatus.label}</div>
            <p className="text-xs mt-0.5 opacity-90">{muacStatus.desc}</p>
          </div>
        </div>
      </div>

      {/* SECTION 3: Temperature & Dehydration Skin Pinch Guide */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Temperature */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500 uppercase">Body Temperature</span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                temperature >= 38.5
                  ? 'bg-rose-100 text-rose-800'
                  : temperature >= 37.5
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {temperature >= 38.5 ? 'High Fever' : temperature >= 37.5 ? 'Mild Fever' : 'Normal'}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-stone-900 mb-3">{temperature.toFixed(1)} °C</div>
          <input
            type="range"
            min="35.5"
            max="40.5"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full accent-amber-600"
          />
          <div className="flex justify-between text-[11px] text-stone-500 mt-1">
            <span>35.5°C</span>
            <span>37.5°C</span>
            <span>40.5°C</span>
          </div>
        </div>

        {/* Skin Pinch Test */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500 uppercase">Dehydration Skin Pinch</span>
            <span className="text-[11px] text-stone-500">Pinch abdomen skin</span>
          </div>
          <div className="space-y-1.5 mt-3">
            {[
              { id: 'normal', label: 'Goes back immediately (< 1s)', sub: 'No sign of severe dehydration' },
              { id: 'slow', label: 'Goes back slowly (1 - 2s)', sub: 'Some dehydration present' },
              { id: 'very_slow', label: 'Very slowly (> 2s)', sub: 'Severe dehydration emergency!' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSkinPinch(opt.id as any)}
                className={`w-full text-left p-2 rounded-xl text-xs border transition-all ${
                  skinPinch === opt.id
                    ? opt.id === 'very_slow'
                      ? 'bg-rose-100 border-rose-300 font-bold text-rose-900'
                      : opt.id === 'slow'
                      ? 'bg-amber-100 border-amber-300 font-bold text-amber-900'
                      : 'bg-emerald-100 border-emerald-300 font-bold text-emerald-900'
                    : 'bg-stone-50 border-stone-200 hover:bg-stone-100 text-stone-700'
                }`}
              >
                <div>{opt.label}</div>
                <div className="text-[10px] opacity-75 font-normal">{opt.sub}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Button to attach vitals into Triage Assessment */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 rounded-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div>
          <div className="font-bold text-sm sm:text-base">Ready to Triage with Live Vitals?</div>
          <p className="text-xs text-emerald-100">
            Sends {temperature}°C, {breathCount || 34} bpm, MUAC {muacValue}cm, and {skinPinch} pinch to the AI Triage
            Assistant.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportToTriage}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 font-bold text-xs shadow transition-all active:scale-98 shrink-0"
        >
          Transfer Vitals to Triage
        </button>
      </div>
    </div>
  );
};
