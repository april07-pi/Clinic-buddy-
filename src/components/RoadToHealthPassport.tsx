import React, { useState } from 'react';
import { Shield, Volume2, VolumeX, CheckCircle, Clock, AlertCircle, Calendar, Plus, Award, ChevronRight, TrendingUp } from 'lucide-react';
import { LanguageCode, Patient, ImmunizationRecord, GrowthRecord } from '../types';
import { WHO_WEIGHT_FOR_AGE_BOYS } from '../data/healthProtocols';
import { VoiceNarrator, playTone } from '../utils/audioAssistant';

interface Props {
  patient: Patient;
  immunizations: ImmunizationRecord[];
  growthRecords: GrowthRecord[];
  language: LanguageCode;
  isChwMode: boolean;
  onUpdateImmunizations: (records: ImmunizationRecord[]) => void;
  onAddGrowthRecord: (record: GrowthRecord) => void;
}

export const RoadToHealthPassport: React.FC<Props> = ({
  patient,
  immunizations,
  growthRecords,
  language,
  isChwMode,
  onUpdateImmunizations,
  onAddGrowthRecord,
}) => {
  const [playingVaccineId, setPlayingVaccineId] = useState<string | null>(null);
  const [showAddWeighIn, setShowAddWeighIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'immunizations' | 'growthChart'>('immunizations');

  const [newWeighIn, setNewWeighIn] = useState({
    ageMonths: 8,
    weightKg: 8.4,
    heightCm: 68.5,
    muacCm: 14.1,
    examinerName: isChwMode ? 'CHW Zungu' : 'Mother self-check',
  });

  const handlePlayVaccineAudio = (rec: ImmunizationRecord) => {
    if (playingVaccineId === rec.id) {
      VoiceNarrator.stop();
      setPlayingVaccineId(null);
    } else {
      setPlayingVaccineId(rec.id);
      playTone('chime');
      const text = rec.audioGuide[language] || rec.audioGuide.en || `${rec.name}. ${rec.description}`;
      VoiceNarrator.speak(text, language, () => {
        setPlayingVaccineId(null);
      });
    }
  };

  const handleStampVaccine = (id: string) => {
    playTone('green');
    const updated = immunizations.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          status: 'completed' as const,
          administeredDate: new Date().toISOString().split('T')[0],
          facilityStamp: 'King Dinuzulu Clinic - CHW Verified',
        };
      }
      return item;
    });
    onUpdateImmunizations(updated);
  };

  const handleSaveWeighIn = (e: React.FormEvent) => {
    e.preventDefault();
    const newRec: GrowthRecord = {
      id: `gr-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      ageMonths: Number(newWeighIn.ageMonths),
      weightKg: Number(newWeighIn.weightKg),
      heightCm: Number(newWeighIn.heightCm),
      muacCm: Number(newWeighIn.muacCm),
      zScoreStatus: 'normal',
      notes: 'Road to Health check verified.',
      examinerName: newWeighIn.examinerName || 'Primary Health Nurse',
    };
    onAddGrowthRecord(newRec);
    setShowAddWeighIn(false);
    playTone('green');
  };

  // Sort growth records chronologically
  const sortedGrowth = [...growthRecords].sort((a, b) => a.ageMonths - b.ageMonths);
  const latestGrowth = sortedGrowth[sortedGrowth.length - 1];

  // SVG dimensions for Road to Health Growth Chart
  const svgWidth = 600;
  const svgHeight = 300;
  const padding = { top: 20, right: 30, bottom: 40, left: 45 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  const maxAge = 24;
  const maxWeight = 16;

  const xScale = (age: number) => padding.left + (age / maxAge) * graphWidth;
  const yScale = (weight: number) => padding.top + graphHeight - (weight / maxWeight) * graphHeight;

  // Build WHO curve lines
  const medianPoints = WHO_WEIGHT_FOR_AGE_BOYS.map((p) => `${xScale(p.age)},${yScale(p.median)}`).join(' ');
  const minus2Points = WHO_WEIGHT_FOR_AGE_BOYS.map((p) => `${xScale(p.age)},${yScale(p.minus2SD)}`).join(' ');
  const minus3Points = WHO_WEIGHT_FOR_AGE_BOYS.map((p) => `${xScale(p.age)},${yScale(p.minus3SD)}`).join(' ');

  // Patient actual growth curve
  const patientPoints = sortedGrowth.map((g) => `${xScale(g.ageMonths)},${yScale(g.weightKg)}`).join(' ');

  return (
    <div className="space-y-5">
      {/* Top Booklet Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-emerald-800 to-emerald-900 rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <Shield className="w-7 h-7 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-300 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  National Health System (NDoH)
                </span>
                <span className="text-xs text-emerald-200 font-mono">{patient.roadToHealthNumber}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-1">{patient.name}’s Health Passport</h2>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Caregiver: <strong>{patient.caregiverName}</strong> • Facility: {patient.clinicName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-2xl px-3.5 py-2 text-center">
              <div className="text-[10px] uppercase font-semibold text-emerald-200">Latest Weight</div>
              <div className="text-base sm:text-lg font-extrabold font-mono text-white">
                {latestGrowth ? `${latestGrowth.weightKg} kg` : '3.2 kg'}
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-2xl px-3.5 py-2 text-center">
              <div className="text-[10px] uppercase font-semibold text-emerald-200">Vaccines Done</div>
              <div className="text-base sm:text-lg font-extrabold font-mono text-emerald-300">
                {immunizations.filter((i) => i.status === 'completed').length} / {immunizations.length}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-white/15">
          <button
            type="button"
            onClick={() => setActiveTab('immunizations')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'immunizations'
                ? 'bg-white text-emerald-900 shadow-sm'
                : 'text-emerald-100 hover:bg-white/10'
            }`}
          >
            Immunization Schedule (EPI)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('growthChart')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'growthChart'
                ? 'bg-white text-emerald-900 shadow-sm'
                : 'text-emerald-100 hover:bg-white/10'
            }`}
          >
            Growth Trajectory (Road to Health Curve)
          </button>
        </div>
      </div>

      {/* TAB 1: IMMUNIZATIONS */}
      {activeTab === 'immunizations' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-stone-900 text-base">South African Expanded Programme on Immunisation</h3>
              <p className="text-xs text-stone-500">
                Click the speaker to hear why each vaccine is given and what to expect in your home language.
              </p>
            </div>
          </div>

          <div className="divide-y divide-stone-100">
            {immunizations.map((rec) => {
              const isPlaying = playingVaccineId === rec.id;
              return (
                <div key={rec.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        rec.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : rec.status === 'due'
                          ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-300 animate-pulse'
                          : 'bg-stone-100 text-stone-400'
                      }`}
                    >
                      {rec.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : rec.status === 'due' ? (
                        <AlertCircle className="w-5 h-5" />
                      ) : (
                        <Clock className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-stone-900 text-sm">{rec.code}</span>
                        <span className="text-xs text-stone-500">• {rec.name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            rec.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : rec.status === 'due'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {rec.status === 'completed'
                            ? 'Given'
                            : rec.status === 'due'
                            ? 'DUE NOW AT CLINIC'
                            : 'Upcoming'}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-teal-800 mt-0.5">{rec.targetMilestone}</div>
                      <p className="text-xs text-stone-600 mt-1 max-w-xl">{rec.description}</p>

                      {rec.facilityStamp && (
                        <div className="text-[11px] font-mono text-emerald-700 mt-1 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5" />
                          <span>
                            Stamped: {rec.administeredDate} ({rec.facilityStamp})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions: Audio Guide + CHW Stamp */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handlePlayVaccineAudio(rec)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        isPlaying
                          ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-300 animate-pulse'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                      }`}
                      title="Audio explanation in home language"
                    >
                      {isPlaying ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-amber-600" />}
                      <span>{isPlaying ? 'Misa' : 'Lalela'}</span>
                    </button>

                    {isChwMode && rec.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => handleStampVaccine(rec.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                      >
                        Stamp Given
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: GROWTH TRAJECTORY CHART */}
      {activeTab === 'growthChart' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-stone-900 text-base">Weight-for-Age Road to Health Trajectory</h3>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Upward line means baby is growing well! Flat or downward curve requires clinic nutritional support.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddWeighIn(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Log New Weigh-In</span>
            </button>
          </div>

          {/* SVG Road to Health Curve */}
          <div className="overflow-x-auto bg-stone-50/70 p-3 rounded-2xl border border-stone-200">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full max-w-2xl mx-auto h-auto">
              {/* Grid lines */}
              {[0, 4, 8, 12, 16].map((wt) => (
                <g key={`wt-${wt}`}>
                  <line
                    x1={padding.left}
                    y1={yScale(wt)}
                    x2={svgWidth - padding.right}
                    y2={yScale(wt)}
                    stroke="#e7e5e4"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <text x={padding.left - 6} y={yScale(wt) + 4} fontSize="9" fill="#78716c" textAnchor="end">
                    {wt}kg
                  </text>
                </g>
              ))}

              {[0, 6, 12, 18, 24].map((mo) => (
                <g key={`mo-${mo}`}>
                  <line
                    x1={xScale(mo)}
                    y1={padding.top}
                    x2={xScale(mo)}
                    y2={padding.top + graphHeight}
                    stroke="#e7e5e4"
                    strokeWidth="1"
                  />
                  <text x={xScale(mo)} y={padding.top + graphHeight + 15} fontSize="9" fill="#78716c" textAnchor="middle">
                    {mo}m
                  </text>
                </g>
              ))}

              {/* WHO Reference Curves */}
              {/* Normal green curve (median) */}
              <polyline fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="3 3" points={medianPoints} />

              {/* Moderate risk yellow curve (-2SD) */}
              <polyline fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 3" points={minus2Points} />

              {/* Severe risk red curve (-3SD) */}
              <polyline fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 3" points={minus3Points} />

              {/* Patient actual curve */}
              <polyline fill="none" stroke="#047857" strokeWidth="3.5" points={patientPoints} strokeLinecap="round" />

              {/* Data points */}
              {sortedGrowth.map((g) => (
                <g key={g.id}>
                  <circle cx={xScale(g.ageMonths)} cy={yScale(g.weightKg)} r="5" fill="#047857" stroke="#ffffff" strokeWidth="2" />
                  <text
                    x={xScale(g.ageMonths)}
                    y={yScale(g.weightKg) - 8}
                    fontSize="9"
                    fontWeight="bold"
                    fill="#065f46"
                    textAnchor="middle"
                  >
                    {g.weightKg}k
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-stone-600 pt-1">
            <span className="flex items-center gap-1.5 font-semibold text-emerald-800">
              <span className="w-3 h-3 rounded-full bg-emerald-700 inline-block" />
              {patient.name}’s Actual Growth
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="w-3 h-1 bg-emerald-500 inline-block" />
              WHO Standard (Normal Median)
            </span>
            <span className="flex items-center gap-1.5 text-amber-600">
              <span className="w-3 h-1 bg-amber-500 inline-block" />
              -2 SD (Underweight Alert)
            </span>
            <span className="flex items-center gap-1.5 text-rose-600">
              <span className="w-3 h-1 bg-rose-500 inline-block" />
              -3 SD (Severe Malnutrition)
            </span>
          </div>

          {/* Historical Weigh-In Logs */}
          <div className="border-t border-stone-100 pt-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Clinic Weigh-In History</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {sortedGrowth.map((rec) => (
                <div key={rec.id} className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs">
                  <div className="flex justify-between font-bold text-stone-800">
                    <span>{rec.ageMonths} Months</span>
                    <span className="text-emerald-700">{rec.weightKg} kg</span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    {rec.date} • {rec.examinerName}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Weigh-In Modal */}
      {showAddWeighIn && (
        <div className="fixed inset-0 z-50 bg-stone-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-stone-200">
            <h3 className="text-base font-bold text-stone-900 mb-1">Record Growth Measurements</h3>
            <p className="text-xs text-stone-600 mb-3">Add baby’s clinic weigh-in or CHW home visit weight.</p>

            <form onSubmit={handleSaveWeighIn} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Age in Months</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={newWeighIn.ageMonths}
                  onChange={(e) => setNewWeighIn({ ...newWeighIn, ageMonths: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Weight in Kilograms (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={newWeighIn.weightKg}
                  onChange={(e) => setNewWeighIn({ ...newWeighIn, weightKg: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">MUAC (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newWeighIn.muacCm}
                  onChange={(e) => setNewWeighIn({ ...newWeighIn, muacCm: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Examiner / Clinic</label>
                <input
                  type="text"
                  value={newWeighIn.examinerName}
                  onChange={(e) => setNewWeighIn({ ...newWeighIn, examinerName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddWeighIn(false)}
                  className="px-3.5 py-1.5 text-xs text-stone-600 hover:bg-stone-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                >
                  Save Measurement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
