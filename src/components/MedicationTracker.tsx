import React, { useState } from 'react';
import { Volume2, VolumeX, CheckCircle, Clock, Plus, AlertCircle, Sun, Moon, Sunrise, Sunset, Utensils, Droplet, Pill, ShieldCheck } from 'lucide-react';
import { LanguageCode, MedicationItem } from '../types';
import { VoiceNarrator, playTone } from '../utils/audioAssistant';

interface Props {
  medications: MedicationItem[];
  language: LanguageCode;
  onUpdateMedications: (meds: MedicationItem[]) => void;
  isChwMode: boolean;
}

export const MedicationTracker: React.FC<Props> = ({
  medications,
  language,
  onUpdateMedications,
  isChwMode,
}) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMed, setNewMed] = useState({
    name: '',
    dosage: '',
    purpose: '',
    frequency: 'Twice daily (morning & evening)',
    instructions: 'Take after eating food with clean boiled water.',
    totalDays: 7,
    withFood: true,
  });

  const handlePlayAudio = (med: MedicationItem) => {
    if (playingId === med.id) {
      VoiceNarrator.stop();
      setPlayingId(null);
    } else {
      setPlayingId(med.id);
      playTone('chime');
      const textToSpeak = med.audioText[language] || med.audioText.en || `${med.name}. ${med.dosage}. ${med.instructions}`;
      VoiceNarrator.speak(textToSpeak, language, () => {
        setPlayingId(null);
      });
    }
  };

  const handleIncrementDose = (medId: string) => {
    playTone('green');
    const updated = medications.map((m) => {
      if (m.id === medId) {
        const nextDay = Math.min(m.totalDays, m.daysCompleted + 1);
        return { ...m, daysCompleted: nextDay };
      }
      return m;
    });
    onUpdateMedications(updated);
  };

  const handleAddMedication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMed.name) return;

    const newItem: MedicationItem = {
      id: `med-${Date.now()}`,
      patientId: 'p-001',
      name: newMed.name,
      dosage: newMed.dosage || '5 mL once daily',
      frequency: newMed.frequency,
      purpose: newMed.purpose || 'Prescribed clinic therapy',
      instructions: newMed.instructions,
      schedule: { morning: true, midday: false, evening: true, night: false },
      withFood: newMed.withFood,
      colorHex: '#0d9488',
      icon: 'liquid',
      totalDays: Number(newMed.totalDays) || 7,
      daysCompleted: 0,
      audioText: {
        zu: `Umuthi: ${newMed.name}. Isilinganiso: ${newMed.dosage}. ${newMed.instructions}`,
        xh: `Iyeza: ${newMed.name}. Idosi: ${newMed.dosage}. ${newMed.instructions}`,
        en: `Medication: ${newMed.name}. Dose: ${newMed.dosage}. ${newMed.instructions}`,
        st: `Moriana: ${newMed.name}. Tekanyetso: ${newMed.dosage}. ${newMed.instructions}`,
        af: `Medikasie: ${newMed.name}. Dosis: ${newMed.dosage}. ${newMed.instructions}`,
      },
    };

    onUpdateMedications([...medications, newItem]);
    setShowAddModal(false);
    playTone('chime');
    setNewMed({
      name: '',
      dosage: '',
      purpose: '',
      frequency: 'Twice daily (morning & evening)',
      instructions: 'Take after eating food with clean boiled water.',
      totalDays: 7,
      withFood: true,
    });
  };

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
        <div>
          <h3 className="font-bold text-lg text-stone-900 flex items-center gap-2">
            Visual Medication Schedules & Audio Playback
          </h3>
          <p className="text-xs text-stone-600 mt-0.5">
            Clear picture schedules and spoken instructions in home language for pediatric and chronic care.
          </p>
        </div>

        {isChwMode && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Prescription</span>
          </button>
        )}
      </div>

      {/* Medication cards list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {medications.map((med) => {
          const isPlaying = playingId === med.id;
          const isFinished = med.daysCompleted >= med.totalDays;
          const progressPercent = Math.round((med.daysCompleted / med.totalDays) * 100);

          return (
            <div
              key={med.id}
              className={`rounded-2xl border p-5 transition-all relative overflow-hidden bg-white shadow-sm ${
                isFinished ? 'border-emerald-200 bg-emerald-50/20' : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              {/* Top Row: Name, Dosage, Audio button */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                    style={{ backgroundColor: med.colorHex }}
                  >
                    {med.icon === 'liquid' ? (
                      <Droplet className="w-5 h-5" />
                    ) : med.icon === 'powder' ? (
                      <ShieldCheck className="w-5 h-5" />
                    ) : (
                      <Pill className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 text-base">{med.name}</h4>
                    <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md inline-block mt-0.5">
                      {med.dosage}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handlePlayAudio(med)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                    isPlaying
                      ? 'bg-amber-500 text-white shadow-md animate-pulse ring-2 ring-amber-300'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                  }`}
                  title="Listen to spoken instructions in your home language"
                >
                  {isPlaying ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-600" />}
                  <span>{isPlaying ? 'Misa' : 'Lalela'}</span>
                </button>
              </div>

              {/* Purpose & Instructions */}
              <p className="text-xs text-stone-600 mb-3 line-clamp-2">{med.purpose}</p>

              {/* Visual Daily Schedule Timeline (Sun & Moon) */}
              <div className="bg-stone-50 rounded-xl p-3 border border-stone-100 mb-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2">
                  Daily Times To Give
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div
                    className={`p-2 rounded-lg border flex flex-col items-center gap-1 transition-all ${
                      med.schedule.morning
                        ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold shadow-xs'
                        : 'bg-stone-100/50 border-stone-200 text-stone-400 opacity-50'
                    }`}
                  >
                    <Sunrise className="w-4 h-4" />
                    <span className="text-[10px]">Morning</span>
                  </div>

                  <div
                    className={`p-2 rounded-lg border flex flex-col items-center gap-1 transition-all ${
                      med.schedule.midday
                        ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold shadow-xs'
                        : 'bg-stone-100/50 border-stone-200 text-stone-400 opacity-50'
                    }`}
                  >
                    <Sun className="w-4 h-4" />
                    <span className="text-[10px]">Midday</span>
                  </div>

                  <div
                    className={`p-2 rounded-lg border flex flex-col items-center gap-1 transition-all ${
                      med.schedule.evening
                        ? 'bg-orange-100 border-orange-300 text-orange-900 font-bold shadow-xs'
                        : 'bg-stone-100/50 border-stone-200 text-stone-400 opacity-50'
                    }`}
                  >
                    <Sunset className="w-4 h-4" />
                    <span className="text-[10px]">Sunset</span>
                  </div>

                  <div
                    className={`p-2 rounded-lg border flex flex-col items-center gap-1 transition-all ${
                      med.schedule.night
                        ? 'bg-indigo-100 border-indigo-300 text-indigo-900 font-bold shadow-xs'
                        : 'bg-stone-100/50 border-stone-200 text-stone-400 opacity-50'
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                    <span className="text-[10px]">Night</span>
                  </div>
                </div>

                {/* Food rule banner */}
                <div className="mt-2.5 pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px] text-stone-600">
                  <span className="flex items-center gap-1.5">
                    {med.withFood ? (
                      <>
                        <Utensils className="w-3.5 h-3.5 text-amber-600" />
                        <span>Give after food / milk</span>
                      </>
                    ) : (
                      <>
                        <Droplet className="w-3.5 h-3.5 text-sky-600" />
                        <span>Take with clean water</span>
                      </>
                    )}
                  </span>
                  <span className="font-mono text-stone-500">{med.frequency}</span>
                </div>
              </div>

              {/* Course Progress & Dose Checkoff Button */}
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-[11px] text-stone-600 mb-1">
                    <span>Course Progress</span>
                    <span className="font-bold text-stone-800">
                      Day {med.daysCompleted} of {med.totalDays}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isFinished}
                  onClick={() => handleIncrementDose(med.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    isFinished
                      ? 'bg-emerald-100 text-emerald-800 cursor-default'
                      : 'bg-stone-900 hover:bg-stone-800 active:scale-95 text-white shadow-xs'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{isFinished ? 'Completed' : 'Take Dose'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Medication Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200">
            <h3 className="text-lg font-bold text-stone-900 mb-1">Add Medication Record</h3>
            <p className="text-xs text-stone-600 mb-4">
              Enter prescription instructions prescribed by the clinic or doctor.
            </p>

            <form onSubmit={handleAddMedication} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Medicine Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amoxicillin Suspension 125mg/5mL"
                  value={newMed.name}
                  onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Dosage Amount</label>
                <input
                  type="text"
                  placeholder="e.g. 5 mL (1 medicine spoon)"
                  value={newMed.dosage}
                  onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Frequency</label>
                  <select
                    value={newMed.frequency}
                    onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs border border-stone-300 rounded-xl bg-white focus:outline-hidden"
                  >
                    <option value="Once daily in the morning">Once daily (morning)</option>
                    <option value="Twice daily (morning & evening)">Twice daily (morning & night)</option>
                    <option value="Three times daily (8 hourly)">Three times daily</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={newMed.totalDays}
                    onChange={(e) => setNewMed({ ...newMed, totalDays: parseInt(e.target.value) || 7 })}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="withFood"
                  checked={newMed.withFood}
                  onChange={(e) => setNewMed({ ...newMed, withFood: e.target.checked })}
                  className="rounded-sm text-emerald-600"
                />
                <label htmlFor="withFood" className="text-xs text-stone-700 cursor-pointer">
                  Must be taken with food or milk
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
