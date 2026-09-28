export type LanguageCode =
  | 'zu' // isiZulu (Zulu)
  | 'xh' // isiXhosa (Xhosa)
  | 'st' // Sesotho (Southern Sotho)
  | 'tn' // Setswana (Tswana)
  | 'nso' // Sepedi / Sesotho sa Leboa (Northern Sotho)
  | 'ts' // Xitsonga (Tsonga)
  | 've' // Tshivenda (Venda)
  | 'ss' // siSwati (Swati)
  | 'nr' // isiNdebele (Ndebele)
  | 'af' // Afrikaans
  | 'en'; // South African English

export interface LanguageOption {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flagEmoji: string;
  regionHint: string;
  speechCode: string;
}

export interface Patient {
  id: string;
  name: string;
  gender: 'female' | 'male';
  birthDate: string; // YYYY-MM-DD
  village: string;
  clinicId: string;
  clinicName: string;
  roadToHealthNumber: string;
  caregiverName: string;
  caregiverPhone: string;
  caregiverRelation: string;
  hivExposed: boolean;
  bloodType?: string;
  allergies?: string[];
  avatarColor: string;
}

export interface ImmunizationRecord {
  id: string;
  code: string;
  name: string;
  targetMilestone: string;
  dueAgeMonths: number;
  description: string;
  sideEffectsNote: string;
  audioGuide: Partial<Record<LanguageCode, string>> & { en: string };
  status: 'completed' | 'due' | 'overdue' | 'upcoming';
  administeredDate?: string;
  batchNumber?: string;
  facilityStamp?: string;
}

export interface GrowthRecord {
  id: string;
  date: string;
  ageMonths: number;
  weightKg: number;
  heightCm?: number;
  headCircumferenceCm?: number;
  muacCm?: number;
  zScoreStatus: 'normal' | 'moderate_risk' | 'severe_risk';
  notes?: string;
  examinerName: string;
}

export type TimeOfDay = 'morning' | 'midday' | 'evening' | 'night';

export interface MedicationItem {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  purpose: string;
  instructions: string;
  schedule: {
    morning: boolean;
    midday: boolean;
    evening: boolean;
    night: boolean;
  };
  withFood: boolean;
  colorHex: string;
  icon: 'liquid' | 'pill' | 'powder' | 'drops' | 'injection';
  totalDays: number;
  daysCompleted: number;
  audioText: Partial<Record<LanguageCode, string>> & { en: string };
}

export interface VitalCheck {
  id: string;
  timestamp: string;
  temperatureC: number;
  breathingRateBpm: number;
  capillaryRefillSec?: number;
  dehydrationSkinPinch: 'normal' | 'slow' | 'very_slow';
  muacCm?: number;
  muacColor: 'green' | 'yellow' | 'red';
  isFever: boolean;
  isRapidBreathing: boolean;
  notes?: string;
}

export interface TriageResult {
  id: string;
  timestamp: string;
  patientId: string;
  triageLevel: 'RED' | 'YELLOW' | 'GREEN';
  urgencyTitle: string;
  urgencyTitleEnglish: string;
  explanationLocalized: string;
  explanationEnglish: string;
  homeCareSteps: string[];
  dangerSignsToWatch: string[];
  clinicTransferNote: string;
  suggestedSpokenAudio: string;
  roadToHealthFlags: string[];
  symptomsPrompt: string;
  source: string;
}
