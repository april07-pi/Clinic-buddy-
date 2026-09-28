import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SymptomTriageAssistant } from './components/SymptomTriageAssistant';
import { RoadToHealthPassport } from './components/RoadToHealthPassport';
import { MedicationTracker } from './components/MedicationTracker';
import { VitalsAndTriageTools } from './components/VitalsAndTriageTools';
import { LanguageCode, Patient, ImmunizationRecord, MedicationItem, GrowthRecord } from './types';
import {
  INITIAL_PATIENT,
  SECONDARY_PATIENT,
  INITIAL_IMMUNIZATIONS,
  INITIAL_MEDICATIONS,
  INITIAL_GROWTH_RECORDS,
  UI_TRANSLATIONS,
} from './data/healthProtocols';
import { PhoneCall, ShieldAlert, Plus, UserPlus, Heart, Sparkles, MapPin, Check } from 'lucide-react';
import { playTone } from './utils/audioAssistant';

export default function App() {
  // Local storage hydrated states
  const [language, setLanguage] = useState<LanguageCode>(() => {
    return (localStorage.getItem('clinikbuddy_lang') as LanguageCode) || 'zu';
  });

  const [isChwMode, setIsChwMode] = useState<boolean>(() => {
    return localStorage.getItem('clinikbuddy_chw_mode') === 'true';
  });

  const [patients, setPatients] = useState<Patient[]>(() => {
    const saved = localStorage.getItem('clinikbuddy_patients');
    return saved ? JSON.parse(saved) : [INITIAL_PATIENT, SECONDARY_PATIENT];
  });

  const [activePatientId, setActivePatientId] = useState<string>(() => {
    return localStorage.getItem('clinikbuddy_active_patient') || INITIAL_PATIENT.id;
  });

  const [immunizations, setImmunizations] = useState<ImmunizationRecord[]>(() => {
    const saved = localStorage.getItem('clinikbuddy_immunizations');
    return saved ? JSON.parse(saved) : INITIAL_IMMUNIZATIONS;
  });

  const [medications, setMedications] = useState<MedicationItem[]>(() => {
    const saved = localStorage.getItem('clinikbuddy_medications');
    return saved ? JSON.parse(saved) : INITIAL_MEDICATIONS;
  });

  const [growthRecords, setGrowthRecords] = useState<GrowthRecord[]>(() => {
    const saved = localStorage.getItem('clinikbuddy_growth');
    return saved ? JSON.parse(saved) : INITIAL_GROWTH_RECORDS;
  });

  const [activeView, setActiveView] = useState<'triage' | 'passport' | 'medications' | 'vitals'>('triage');

  const [attachedVitals, setAttachedVitals] = useState<{
    temperature: number;
    breathingRate: number;
    muacCm: number;
    muacColor: 'green' | 'yellow' | 'red';
    dehydrationPinch: 'normal' | 'slow' | 'very_slow';
  } | null>(null);

  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState({
    name: '',
    gender: 'male' as 'male' | 'female',
    birthDate: '2026-01-15',
    village: 'Eshowe Ward 4, KwaZulu-Natal',
    clinicName: 'King Dinuzulu Memorial Clinic',
    caregiverName: '',
    caregiverPhone: '',
    roadToHealthNumber: `RTHB-${Math.floor(1000 + Math.random() * 9000)}`,
  });

  // Sync with localStorage
  useEffect(() => {
    localStorage.setItem('clinikbuddy_lang', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('clinikbuddy_chw_mode', String(isChwMode));
  }, [isChwMode]);

  useEffect(() => {
    localStorage.setItem('clinikbuddy_patients', JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    localStorage.setItem('clinikbuddy_active_patient', activePatientId);
  }, [activePatientId]);

  useEffect(() => {
    localStorage.setItem('clinikbuddy_immunizations', JSON.stringify(immunizations));
  }, [immunizations]);

  useEffect(() => {
    localStorage.setItem('clinikbuddy_medications', JSON.stringify(medications));
  }, [medications]);

  useEffect(() => {
    localStorage.setItem('clinikbuddy_growth', JSON.stringify(growthRecords));
  }, [growthRecords]);

  const activePatient = patients.find((p) => p.id === activePatientId) || patients[0];

  // Calculate age months
  const calculateAgeMonths = (birthDate: string) => {
    const b = new Date(birthDate);
    const now = new Date('2026-09-16');
    const diffYears = now.getFullYear() - b.getFullYear();
    const diffMonths = now.getMonth() - b.getMonth();
    return Math.max(0, diffYears * 12 + diffMonths);
  };

  const patientAgeMonths = calculateAgeMonths(activePatient.birthDate);

  const handleApplyVitals = (v: any) => {
    setAttachedVitals(v);
    setActiveView('triage');
  };

  const handleAddNewPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientForm.name) return;

    const created: Patient = {
      id: `p-${Date.now()}`,
      name: newPatientForm.name,
      gender: newPatientForm.gender,
      birthDate: newPatientForm.birthDate,
      village: newPatientForm.village,
      clinicId: 'KZN-CLINIC-01',
      clinicName: newPatientForm.clinicName,
      roadToHealthNumber: newPatientForm.roadToHealthNumber,
      caregiverName: newPatientForm.caregiverName || 'Primary Caregiver',
      caregiverPhone: newPatientForm.caregiverPhone || '071 000 0000',
      caregiverRelation: 'Mother',
      hivExposed: false,
      allergies: ['None known'],
      avatarColor: 'from-blue-600 to-indigo-800',
    };

    setPatients([...patients, created]);
    setActivePatientId(created.id);
    setShowAddPatientModal(false);
    playTone('chime');
  };

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-900 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        language={language}
        onLanguageChange={setLanguage}
        isChwMode={isChwMode}
        onToggleChwMode={() => setIsChwMode(!isChwMode)}
        activePatient={activePatient}
        patientList={patients}
        onSelectPatient={(p) => setActivePatientId(p.id)}
        activeView={activeView}
        onSelectView={setActiveView}
      />

      {/* Emergency Hotline Alert Strip */}
      <div className="bg-rose-700 text-white text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-medium">
            <ShieldAlert className="w-4 h-4 text-rose-200 shrink-0" />
            <span>
              South Africa Emergency: Dial <strong>112</strong> or <strong>10177</strong> for Ambulance • Poison Info
              Centre: <strong>0861 555 777</strong>
            </span>
          </div>
          <span className="text-[11px] text-rose-200 hidden sm:inline">
            Free from any cell phone or landline
          </span>
        </div>
      </div>

      {/* Active Patient Bar */}
      <section className="bg-white border-b border-stone-200 py-3.5 px-4 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${activePatient.avatarColor} text-white font-black text-base flex items-center justify-center shadow-sm shrink-0`}
            >
              {activePatient.name.charAt(0)}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-stone-900 text-base">{activePatient.name}</h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                  {patientAgeMonths} Months Old ({activePatient.gender})
                </span>
                <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {activePatient.roadToHealthNumber}
                </span>
              </div>
              <div className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-stone-400" />
                <span>
                  {activePatient.village} • {activePatient.clinicName}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {isChwMode && (
              <button
                type="button"
                onClick={() => setShowAddPatientModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5 text-emerald-700" />
                <span>Register New Child</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1">
        {activeView === 'triage' && (
          <SymptomTriageAssistant
            patient={activePatient}
            language={language}
            attachedVitals={attachedVitals}
            onClearVitals={() => setAttachedVitals(null)}
          />
        )}

        {activeView === 'passport' && (
          <RoadToHealthPassport
            patient={activePatient}
            immunizations={immunizations}
            growthRecords={growthRecords}
            language={language}
            isChwMode={isChwMode}
            onUpdateImmunizations={setImmunizations}
            onAddGrowthRecord={(rec) => setGrowthRecords([...growthRecords, rec])}
          />
        )}

        {activeView === 'medications' && (
          <MedicationTracker
            medications={medications}
            language={language}
            isChwMode={isChwMode}
            onUpdateMedications={setMedications}
          />
        )}

        {activeView === 'vitals' && (
          <VitalsAndTriageTools
            language={language}
            patientAgeMonths={patientAgeMonths}
            onApplyVitalsToTriage={handleApplyVitals}
          />
        )}
      </main>

      {/* Register New Patient Modal */}
      {showAddPatientModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <h3 className="text-lg font-bold text-stone-900 mb-1">Register Child or Patient</h3>
            <p className="text-xs text-stone-600 mb-4">
              Community Health Worker Intake for rural or under-resourced households.
            </p>

            <form onSubmit={handleAddNewPatient} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Child / Patient Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bandile Ndlovu"
                  value={newPatientForm.name}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Gender</label>
                  <select
                    value={newPatientForm.gender}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, gender: e.target.value as any })}
                    className="w-full px-2.5 py-2 text-xs border border-stone-300 rounded-xl bg-white"
                  >
                    <option value="male">Male (Boy)</option>
                    <option value="female">Female (Girl)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Birth Date</label>
                  <input
                    type="date"
                    required
                    value={newPatientForm.birthDate}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, birthDate: e.target.value })}
                    className="w-full px-2.5 py-2 text-xs border border-stone-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Village / Ward Location</label>
                <input
                  type="text"
                  value={newPatientForm.village}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, village: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Caregiver Name</label>
                  <input
                    type="text"
                    placeholder="Mother / Grandmother"
                    value={newPatientForm.caregiverName}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, caregiverName: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Caregiver Phone</label>
                  <input
                    type="text"
                    placeholder="07x xxx xxxx"
                    value={newPatientForm.caregiverPhone}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, caregiverPhone: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddPatientModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  Register Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 py-6 px-4 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto space-y-2">
          <p className="font-semibold text-stone-700">
            ClinikBuddy • Community Health Worker & Maternal Care Assistant
          </p>
          <p className="max-w-2xl mx-auto text-[11px] text-stone-400">
            Protocols strictly reference the South African National Department of Health (NDoH) Integrated Management of
            Childhood Illness (IMCI) and Primary Health Care (PHC) Standard Treatment Guidelines. Always seek immediate
            emergency care for convulsions, unconsciousness, severe dehydration, or inability to feed.
          </p>
        </div>
      </footer>
    </div>
  );
}
