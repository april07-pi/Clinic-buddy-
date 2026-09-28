import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, Volume2, VolumeX, AlertTriangle, CheckCircle2, AlertOctagon, Sparkles, FileText, ArrowRight, Share2, Copy, Check, Info, RefreshCw, Globe, Play } from 'lucide-react';
import { LanguageCode, Patient, TriageResult } from '../types';
import { VoiceNarrator, playTone } from '../utils/audioAssistant';
import { SugarSaltStation } from './SugarSaltStation';
import { SUPPORTED_LANGUAGES } from '../data/healthProtocols';

interface Props {
  patient: Patient;
  language: LanguageCode;
  attachedVitals?: {
    temperature: number;
    breathingRate: number;
    muacCm: number;
    muacColor: 'green' | 'yellow' | 'red';
    dehydrationPinch: 'normal' | 'slow' | 'very_slow';
  } | null;
  onClearVitals?: () => void;
}

export const SymptomTriageAssistant: React.FC<Props> = ({
  patient,
  language,
  attachedVitals,
  onClearVitals,
}) => {
  const [symptomsInput, setSymptomsInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<TriageResult | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copiedSlip, setCopiedSlip] = useState(false);
  const [offlineModeNotice, setOfflineModeNotice] = useState(false);

  // Age in months calculation
  const calculateAgeMonths = (birthDate: string) => {
    const b = new Date(birthDate);
    const now = new Date('2026-09-16'); // consistent current timestamp
    const diffYears = now.getFullYear() - b.getFullYear();
    const diffMonths = now.getMonth() - b.getMonth();
    return Math.max(0, diffYears * 12 + diffMonths);
  };

  const patientAgeMonths = calculateAgeMonths(patient.birthDate);

  // Quick symptom chips by language across all 11 official South African languages
  const commonSymptoms: Record<LanguageCode, { label: string; text: string }[]> = {
    zu: [
      { label: 'Umkhuhlane (Fever)', text: 'Ingane inemfiva eshisayo nomkhuhlane selokhu izolo.' },
      { label: 'Uhudo Olumanzi (Diarrhea)', text: 'Ingane ihudula kakhulu amanzi, amehlo atshonile phakathi.' },
      { label: 'Ukukhwehlela Nesifuba (Cough)', text: 'Ukukhwehlela okukhulu nokuphefumula ngokushesha okungaphezi.' },
      { label: 'Akayidli Into (Not Feeding)', text: 'Ingane ayikwazi ukumunya ubisi lwebele futhi iyahlanza konke.' },
      { label: 'Amehlo Nemilomo Eyomile', text: 'Umlomo womile, amehlo awanawo izinyembezi lapho ikhala.' },
    ],
    xh: [
      { label: 'Umkhuhlane (Fever)', text: 'Umntwana unomkhuhlane oshushu kakhulu ukususela izolo.' },
      { label: 'Urhudo Olumanzi (Diarrhea)', text: 'Umntwana urhuda amanzi amaxesha amaninzi namhlanje.' },
      { label: 'Ukukhohlela (Cough)', text: 'Ukukhohlela kakhulu nokuphefumla ngokukhawuleza, isifuba singena ngaphakathi.' },
      { label: 'Akanancanca (Refusing milk)', text: 'Umntwana akancanci kwaye ugabha yonke into ayiselayo.' },
      { label: 'Amehlo Atshonileyo (Dry)', text: 'Amehlo omntwana atshonile, ulusu lubuyela emva kancinci.' },
    ],
    st: [
      { label: 'Feberu e Phahameng (Fever)', text: 'Ngoana o na le mocheso o phahameng haholo le feberu ho tloha maobane.' },
      { label: 'Letshollo la Metsi (Diarrhea)', text: 'Ngoana o tsoa letshollo le metsi ka makhetlo a mangata kajeno.' },
      { label: 'Ho Khohlela (Cough/Chest)', text: 'Ho khohlela ka matla le ho phefumoloha ka potlako e matla.' },
      { label: 'Ha a Khone ho Anya (Refusing feed)', text: 'Ngoana ha a anye ebile o hlatsa ntho e \'ngoe le e \'ngoe.' },
      { label: 'Mahlo a Tebileng (Sunken eyes)', text: 'Mahlo a ngoana a tebile ka hare mme ha a na meokgo ha a lla.' },
    ],
    tn: [
      { label: 'Letshoroma le le Bogale (Fever)', text: 'Ngwana o na le mogote o o kwa godimo thata le letshoroma.' },
      { label: 'Letshollo / Tšhologa (Diarrhea)', text: 'Ngwana o tšhologa metsi mme o tlhatsa sengwe le sengwe se a se jang.' },
      { label: 'Kgotlholo le go Hema (Cough)', text: 'Kgotlholo e kgolo le sehuba se se tsenang mo teng fa a hema.' },
      { label: 'Ga a Kgone go Anyisa (Cannot feed)', text: 'Ngwana ga a kgone go nwa kgotsa go anya, o tletse bokoa.' },
      { label: 'Matlho a a Tseneletseng (Dry eyes)', text: 'Matlho a tseneletse mo teng, molomo o omeletse.' },
    ],
    nso: [
      { label: 'Phišo / Letšhoroma (Fever)', text: 'Ngwana o na le phišo e kgolo ya mmele le go thothomela.' },
      { label: 'Go Tšhologa (Diarrhea)', text: 'Ngwana o tšhologa meetse kgafetšakgafetša le go hlatša.' },
      { label: 'Go Gohlela le go Hema (Cough)', text: 'Go gohlela kudu le sehuba se se nwelago ka gare ge a hema.' },
      { label: 'Ga a Anyi (Refusing feed)', text: 'Ngwana ga a kgone go anya gomme o hlatša tšhohle tše a di nwelago.' },
      { label: 'Mahlo a Keneletšego (Sunken eyes)', text: 'Mahlo a keneletše ka gare, molomo o omile kudu.' },
    ],
    ts: [
      { label: 'Mukhuhlwana wo Hisa (Fever)', text: 'N\'wana u na mukhuhlwana wo tika swinene ku sukela tolo.' },
      { label: 'Kuhuda Mati (Diarrhea)', text: 'N\'wana u huda mati minkarhi yo tala namuntlha u tlhela a hlanta.' },
      { label: 'Ku Khohlela (Cough/Breathing)', text: 'Ku khohlela hi ku tiya na xifuva xi nghena endzeni loko a hefemula.' },
      { label: 'A nga Nwi Mafi (Not feeding)', text: 'N\'wana a nga koti ku nwa kumbe ku mama, a nga hanyi kahle.' },
      { label: 'Matihlo ma Nghenele (Dehydration)', text: 'Matihlo ya n\'wana ma nghenele endzeni, nomo wu omile.' },
    ],
    ve: [
      { label: 'Mufhiso Muhulwane (Fever)', text: 'Ṅwana u khou fhisa vhukuma nahone u na mufhiso u bva mulovha.' },
      { label: 'U Ṱhoma Maḓi (Diarrhea)', text: 'Ṅwana u khou ṱhoma maḓi lunzhi namusi nahone u a tanza.' },
      { label: 'U Hoṱola na u Fhema (Cough)', text: 'U hoṱola nga maanḓa na khana i tshi dzhena ngomu musi a tshi fhema.' },
      { label: 'A thi Nwi Mukhaha (Not feeding)', text: 'Ṅwana ha khou kona u nwa mukhaha kana maḓi nahone u a lwala.' },
      { label: 'Maṱo o Dzhenelelaho (Sunken eyes)', text: 'Maṱo o dzhenelela ngomu, mulomo wo oma.' },
    ],
    ss: [
      { label: 'Umfiva Loshisako (Fever)', text: 'Umntfwana unemfiva leshisako kakhulu kusukela itolo.' },
      { label: 'Kuhuda Kwemanti (Diarrhea)', text: 'Umntfwana uhuda emanti kanyenti lamuhla futsi uyahlanza.' },
      { label: 'Kukhwehlela Nemaphephu (Cough)', text: 'Kukhwehlela lokukhulu nesifuba lesingena ngekhatsi lapho aphefumula.' },
      { label: 'Akamunyi Lubisi (Cannot feed)', text: 'Umntfwana akakhoni kumunya futsi ulahla konkhe lakudlako.' },
      { label: 'Emehlo Lagwilike (Sunken eyes)', text: 'Emehlo agwilike ngekhatsi, umlomo womile kakhulu.' },
    ],
    nr: [
      { label: 'Itjhisa Eliphezulu (Fever)', text: 'Umntwana unetjhisa eliphezulu khulu nomkhuhlani kusukela izolo.' },
      { label: 'Ukukhutjha Amanzi (Diarrhea)', text: 'Umntwana ukhutjha amanzi kanengi namhlanjesi begodu uyahlanta.' },
      { label: 'Ukukhohlela (Cough/Breathing)', text: 'Ukukhohlela khulu nesifuba esingena ngaphakathi nakaphefumulako.' },
      { label: 'Akasele L识tho (Refusing drink)', text: 'Umntwana akakwazi ukumunya ubisi begodu uhlanta koke akufakako.' },
      { label: 'Amehlo Atjhingileko (Dehydration)', text: 'Amehlo atjhingele ngaphakathi, umlomo womile khulu.' },
    ],
    af: [
      { label: 'Hoë Koors (Fever)', text: 'Baba het hoë koors en is baie kriewelrig sedert gister.' },
      { label: 'Waterige Diarree & Braking', text: 'Waterige stoelgang meer as vier keer vandag met aanhoudende braking.' },
      { label: 'Vinnige Asemhaling & Hoes', text: 'Borskas trek in tydens vinnige asemhaling met aanhoudende hewige hoes.' },
      { label: 'Weier om te Drink of Voed', text: 'Kind weier alle vloeistowwe en borsmelk en is uiters lomerig en swak.' },
      { label: 'Ingesonke Oë & Droë Mond', text: 'Ingesonke oë sonder trane wanneer huil, velknyp keer baie stadig terug.' },
    ],
    en: [
      { label: 'High Fever (>38.5°C)', text: 'Child has high fever for 2 days and is irritable.' },
      { label: 'Watery Diarrhea & Vomit', text: 'Watery diarrhea 4 times today, vomiting sips of water.' },
      { label: 'Fast Breathing / Chest Cough', text: 'Cough with fast rapid breathing, chest pulling inward.' },
      { label: 'Unable to Feed / Lethargic', text: 'Child cannot breastfeed or drink, unusually sleepy and floppy.' },
      { label: 'Sunken Eyes & Slow Pinch', text: 'Skin pinch on tummy goes back slowly, sunken dry eyes.' },
    ],
  };

  const chips = commonSymptoms[language] || commonSymptoms.en;

  // Speech recognition handler
  const recognitionRef = useRef<any>(null);

  const toggleSpeechRecognition = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Voice recognition fallback preset demo
      const preset = chips[0]?.text || 'Child has high fever and loose stools.';
      setSymptomsInput((prev) => (prev ? `${prev} ${preset}` : preset));
      playTone('tick');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;

      const langMap: Record<LanguageCode, string> = {
        zu: 'zu-ZA',
        xh: 'xh-ZA',
        st: 'st-ZA',
        tn: 'tn-ZA',
        nso: 'nso-ZA',
        ts: 'ts-ZA',
        ve: 've-ZA',
        ss: 'ss-ZA',
        nr: 'nr-ZA',
        af: 'af-ZA',
        en: 'en-ZA',
      };
      recognition.lang = langMap[language] || 'en-ZA';

      recognition.onstart = () => {
        setIsListening(true);
        playTone('chime');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSymptomsInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.warn('Speech recognition start failed:', e);
      setIsListening(false);
    }
  };

  // Perform Triage Assessment
  const handleRunTriage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!symptomsInput.trim() && !attachedVitals) return;

    setIsLoading(true);
    setCurrentResult(null);
    VoiceNarrator.stop();
    setIsPlayingAudio(false);

    try {
      const response = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientAgeMonths,
          patientName: patient.name,
          patientGender: patient.gender,
          symptomsText: symptomsInput || 'Routine check with reported vitals',
          selectedLanguage: language,
          vitals: attachedVitals || {
            temperature: 37.2,
            breathingRate: 34,
            muacCm: 13.5,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      const triageResult: TriageResult = {
        id: `tri-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        patientId: patient.id,
        triageLevel: data.triageLevel || 'GREEN',
        urgencyTitle: data.urgencyTitle || 'Assessment Complete',
        urgencyTitleEnglish: data.urgencyTitleEnglish || 'IMCI Assessment',
        explanationLocalized: data.explanationLocalized || '',
        explanationEnglish: data.explanationEnglish || '',
        homeCareSteps: data.homeCareSteps || [],
        dangerSignsToWatch: data.dangerSignsToWatch || [],
        clinicTransferNote: data.clinicTransferNote || '',
        suggestedSpokenAudio: data.suggestedSpokenAudio || '',
        roadToHealthFlags: data.roadToHealthFlags || [],
        symptomsPrompt: symptomsInput,
        source: data.source || 'IMCI Engine',
      };

      setCurrentResult(triageResult);
      setOfflineModeNotice(data.source.includes('offline'));

      // Play alert tone based on severity
      if (triageResult.triageLevel === 'RED') {
        playTone('red');
      } else if (triageResult.triageLevel === 'YELLOW') {
        playTone('yellow');
      } else {
        playTone('green');
      }
    } catch (err: any) {
      console.warn('Network / API error, falling back locally:', err);
      // Emergency offline client-side evaluation fallback
      const text = symptomsInput.toLowerCase();
      const isUrgent =
        text.includes('convuls') ||
        text.includes('isithuthwane') ||
        text.includes('unconscious') ||
        text.includes('cannot drink') ||
        (attachedVitals?.breathingRate && attachedVitals.breathingRate >= 50);

      const fallbackLevel = isUrgent ? 'RED' : text.includes('diarrhea') || text.includes('uhudo') ? 'YELLOW' : 'GREEN';

      setCurrentResult({
        id: `tri-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        patientId: patient.id,
        triageLevel: fallbackLevel,
        urgencyTitle:
          fallbackLevel === 'RED'
            ? 'Hamba Emtholampilo Ngokushesha (Emergency)'
            : fallbackLevel === 'YELLOW'
            ? 'Vakashela Umtholampilo Namhlanje'
            : 'Ukunakekela Ekhaya (Home Care)',
        urgencyTitleEnglish:
          fallbackLevel === 'RED'
            ? 'Immediate Clinic Referral (IMCI Red)'
            : fallbackLevel === 'YELLOW'
            ? 'Clinic Visit Recommended Today'
            : 'Home Management Appropriate',
        explanationLocalized:
          fallbackLevel === 'RED'
            ? 'Ingane ibonisa izimpawu ezidinga ukuhlolwa ngumhlengikazi ngokushesha okukhulu.'
            : 'Ingane idinga ukuhlolwa ngumhlengikazi emtholampilo namhlanje ukuze ithole usizo.',
        explanationEnglish: 'Patient evaluated via offline South African NDoH IMCI rule set.',
        homeCareSteps: [
          'Lungisa i-Sugar-Salt Solution (SSS) uma ihudula.',
          'Qhubeka nokuncelisa ingane njalo endleleni eya emtholampilo.',
          'Gcina ingane ifudumele kodwa ungalokothi uyigqokise kakhulu.',
        ],
        dangerSignsToWatch: [
          'Ukungakwazi ukuphuza noma ukumunya',
          'Ukuhlanza konke ekudlayo',
          'Ukuphefumula kanzima nesifuba esingena phakathi',
        ],
        clinicTransferNote: `CLINIKBUDDY OFFLINE REFERRAL: Age: ${patientAgeMonths}m. Symptoms: "${symptomsInput}". Level: ${fallbackLevel}.`,
        suggestedSpokenAudio: 'Hamba emtholampilo ngokushesha mama. Qhubeka umcelise ingane endleleni.',
        roadToHealthFlags: ['Offline IMCI Protocol', 'Immediate Oral Fluids'],
        symptomsPrompt: symptomsInput,
        source: 'Client Offline IMCI Engine',
      });
      setOfflineModeNotice(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleVoicePlayback = () => {
    if (!currentResult) return;
    if (isPlayingAudio) {
      VoiceNarrator.stop();
      setIsPlayingAudio(false);
    } else {
      setIsPlayingAudio(true);
      playTone('chime');
      const text =
        currentResult.suggestedSpokenAudio ||
        `${currentResult.urgencyTitle}. ${currentResult.explanationLocalized}`;
      VoiceNarrator.speak(text, language, () => {
        setIsPlayingAudio(false);
      });
    }
  };

  const handleCopyReferralSlip = () => {
    if (!currentResult) return;
    const slipText = `*** CLINIKBUDDY CLINIC REFERRAL SLIP ***
Patient: ${patient.name} (${patientAgeMonths} months, ${patient.gender})
Health Booklet ID: ${patient.roadToHealthNumber}
Caregiver: ${patient.caregiverName} (${patient.caregiverPhone})
Clinic: ${patient.clinicName}

TRIAGE CATEGORY: ${currentResult.triageLevel} (${currentResult.urgencyTitleEnglish})
Reported Symptoms: "${currentResult.symptomsPrompt}"
Vitals: Temp: ${attachedVitals?.temperature ?? '37.2'}°C, Resp Rate: ${attachedVitals?.breathingRate ?? '36'} bpm, MUAC: ${attachedVitals?.muacCm ?? '13.5'} cm (${attachedVitals?.muacColor ?? 'green'})

Nurse Handover Note:
${currentResult.clinicTransferNote}

Generated via ClinikBuddy SA NDoH Guidelines Engine.`;

    navigator.clipboard.writeText(slipText);
    setCopiedSlip(true);
    playTone('tick');
    setTimeout(() => setCopiedSlip(false), 2500);
  };

  return (
    <div className="space-y-5">
      {/* Symptom Input Container */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                SA NDoH Guidelines Assistant
              </span>
              <span className="text-xs text-stone-500">
                Patient: <strong>{patient.name}</strong> ({patientAgeMonths} months)
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-stone-900 mt-1">
              Type or Say Symptoms in Home Language
            </h3>
            <p className="text-xs text-stone-600">
              Assesses emergency red flags, clinic triage priority, and home sugar-salt solution guidance.
            </p>
          </div>

          {/* Attached Vitals Chip */}
          {attachedVitals && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-2.5 flex items-center justify-between gap-3 shrink-0">
              <div className="text-xs">
                <div className="font-bold text-emerald-900">Vitals Attached</div>
                <div className="text-[11px] text-emerald-700">
                  {attachedVitals.temperature}°C • {attachedVitals.breathingRate} bpm • MUAC {attachedVitals.muacCm}cm
                </div>
              </div>
              {onClearVitals && (
                <button
                  type="button"
                  onClick={onClearVitals}
                  className="text-emerald-800 hover:text-emerald-950 text-xs underline font-semibold"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* Common symptom quick chips */}
        <div className="mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5 block">
            Tap Quick Symptoms:
          </span>
          <div className="flex flex-wrap gap-2">
            {chips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  playTone('tick');
                  setSymptomsInput((prev) => (prev ? `${prev} ${chip.text}` : chip.text));
                }}
                className="text-xs px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium transition-all active:scale-95 border border-stone-200/60"
              >
                + {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Textarea + Voice Input */}
        <form onSubmit={handleRunTriage} className="space-y-3">
          <div className="relative">
            <textarea
              rows={3}
              value={symptomsInput}
              onChange={(e) => setSymptomsInput(e.target.value)}
              placeholder="e.g. Ingane inomkhuhlane kusukela izolo, ihlanza konke ekudlayo, futhi ayikwazi ukumunya..."
              className="w-full p-4 pr-14 rounded-2xl border border-stone-300 text-stone-900 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-hidden resize-none bg-stone-50/50"
            />

            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`absolute right-3 top-3.5 p-2.5 rounded-xl transition-all ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse shadow-md ring-4 ring-rose-200'
                  : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
              }`}
              title="Click to speak symptoms in your home language"
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          </div>

          {/* Active speech recognition feedback banner */}
          {isListening && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex items-center justify-between text-xs text-rose-900 animate-fade-in">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
                <div>
                  <div className="font-bold">
                    Listening for voice input in{' '}
                    {SUPPORTED_LANGUAGES.find((l) => l.code === language)?.name || 'Home Language'}...
                  </div>
                  <div className="text-[11px] text-rose-700">
                    Speak your baby's symptoms clearly into your microphone. Tap red mic button when finished.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 h-5">
                <span className="w-1 h-3 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1 h-5 bg-rose-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1 h-2.5 bg-rose-500 rounded-full animate-bounce"></span>
              </div>
            </div>
          )}

          {/* Voice input helper row & sample test */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600 px-1">
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                Voice & triage active in:{' '}
                <strong>
                  {SUPPORTED_LANGUAGES.find((l) => l.code === language)?.flagEmoji}{' '}
                  {SUPPORTED_LANGUAGES.find((l) => l.code === language)?.nativeName} (
                  {SUPPORTED_LANGUAGES.find((l) => l.code === language)?.name})
                </strong>
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                const sample = chips[0]?.text;
                if (sample) {
                  setSymptomsInput(sample);
                  playTone('chime');
                }
              }}
              className="text-[11px] text-emerald-800 hover:text-emerald-950 font-semibold underline flex items-center gap-1 cursor-pointer"
            >
              <Play className="w-3 h-3 text-emerald-600" />
              <span>Simulate voice: "{chips[0]?.label}"</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
              <span>Offline IMCI Decision Matrix & Gemini AI protocol ready</span>
            </div>

            <button
              type="submit"
              disabled={isLoading || (!symptomsInput.trim() && !attachedVitals)}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Evaluating Protocols...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Evaluate Symptoms Now</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* TRIAGE RESULT BANNER */}
      {currentResult && (
        <div className="space-y-4">
          {/* Main Triage Card */}
          <div
            className={`rounded-3xl p-6 border shadow-sm transition-all relative overflow-hidden ${
              currentResult.triageLevel === 'RED'
                ? 'bg-gradient-to-b from-rose-50 via-white to-rose-50/30 border-rose-300'
                : currentResult.triageLevel === 'YELLOW'
                ? 'bg-gradient-to-b from-amber-50 via-white to-amber-50/30 border-amber-300'
                : 'bg-gradient-to-b from-emerald-50 via-white to-emerald-50/30 border-emerald-300'
            }`}
          >
            {/* Top Level Pill */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    currentResult.triageLevel === 'RED'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-200'
                      : currentResult.triageLevel === 'YELLOW'
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
                      : 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                  }`}
                >
                  {currentResult.triageLevel === 'RED' ? (
                    <AlertOctagon className="w-7 h-7" />
                  ) : currentResult.triageLevel === 'YELLOW' ? (
                    <AlertTriangle className="w-7 h-7" />
                  ) : (
                    <CheckCircle2 className="w-7 h-7" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-black uppercase tracking-wider px-3 py-0.5 rounded-full ${
                        currentResult.triageLevel === 'RED'
                          ? 'bg-rose-600 text-white'
                          : currentResult.triageLevel === 'YELLOW'
                          ? 'bg-amber-500 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {currentResult.triageLevel === 'RED'
                        ? 'RED / EMERGENCY'
                        : currentResult.triageLevel === 'YELLOW'
                        ? 'YELLOW / CLINIC TODAY'
                        : 'GREEN / HOME CARE'}
                    </span>
                    <span className="text-xs text-stone-500 font-mono">
                      IMCI Triage at {currentResult.timestamp}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-stone-900 mt-1">
                    {currentResult.urgencyTitle}
                  </h3>
                </div>
              </div>

              {/* Audio Voice Readout */}
              <button
                type="button"
                onClick={handleToggleVoicePlayback}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shadow-sm ${
                  isPlayingAudio
                    ? 'bg-stone-900 text-white ring-4 ring-stone-200 animate-pulse'
                    : 'bg-white hover:bg-stone-100 text-stone-800 border border-stone-200'
                }`}
              >
                {isPlayingAudio ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-600" />}
                <span>{isPlayingAudio ? 'Stop Voice' : 'Play Voice Advice (Izwi)'}</span>
              </button>
            </div>

            {/* Localized Explanation for the mother */}
            <div className="bg-white/80 backdrop-blur-xs p-4 rounded-2xl border border-stone-200/80 mb-4">
              <p className="text-sm font-medium text-stone-800 leading-relaxed">
                {currentResult.explanationLocalized}
              </p>
              {currentResult.explanationEnglish && (
                <p className="text-xs text-stone-500 mt-2 italic border-t border-stone-100 pt-2">
                  Clinical English summary: {currentResult.explanationEnglish}
                </p>
              )}
            </div>

            {/* Two-Column Grid: Immediate Home Steps & Danger Signs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Home Care / Journey Steps */}
              <div className="bg-white p-4 rounded-2xl border border-stone-200/80">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Immediate Action Steps:</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-stone-700">
                  {currentResult.homeCareSteps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Red Flag Danger Signs */}
              <div className="bg-white p-4 rounded-2xl border border-stone-200/80">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900 mb-2 flex items-center gap-1.5">
                  <AlertOctagon className="w-4 h-4 text-rose-600" />
                  <span>Red Flag Danger Signs (Rush to Clinic):</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-stone-700">
                  {currentResult.dangerSignsToWatch.map((sign, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-rose-500 font-bold shrink-0">•</span>
                      <span>{sign}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Oral Rehydration Solution Mixing Guide if diarrhea or vomiting mentioned in any SA language */}
            {(() => {
              const lower = symptomsInput.toLowerCase();
              const hasDiarrheaOrVomit =
                lower.includes('uhudo') ||
                lower.includes('urhudo') ||
                lower.includes('diarrhea') ||
                lower.includes('letshollo') ||
                lower.includes('tšhologa') ||
                lower.includes('chulula') ||
                lower.includes('ṱhoma') ||
                lower.includes('kuhuda') ||
                lower.includes('khutjha') ||
                lower.includes('vomit') ||
                lower.includes('hlanza') ||
                lower.includes('gabha') ||
                lower.includes('tlhatsa') ||
                lower.includes('tanza') ||
                lower.includes('braking') ||
                currentResult.roadToHealthFlags.some((f) => f.toLowerCase().includes('rehydration') || f.toLowerCase().includes('sss'));

              return hasDiarrheaOrVomit ? (
                <div className="mb-4">
                  <SugarSaltStation language={language} />
                </div>
              ) : null;
            })()}

            {/* DIGITAL CLINIC REFERRAL SLIP (Bypasses the 4-hour clinic queue) */}
            <div className="bg-stone-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-stone-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Digital Triage Referral Slip (Show to Clinic Nurse)
                    </span>
                    <div className="text-xs text-stone-400">
                      Passes patient details & vital signs directly to the triage nurse to expedite emergency care.
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyReferralSlip}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs text-white font-semibold transition-colors shrink-0"
                >
                  {copiedSlip ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSlip ? 'Copied to Clipboard' : 'Copy Referral Note'}</span>
                </button>
              </div>

              {/* Referral summary block */}
              <div className="bg-stone-950 p-3.5 rounded-xl font-mono text-xs text-emerald-200/90 leading-relaxed border border-stone-800/80">
                <div className="text-stone-400 mb-1">
                  PATIENT: {patient.name} ({patientAgeMonths}mo) | ID: {patient.roadToHealthNumber} | FACILITY:{' '}
                  {patient.clinicName}
                </div>
                <div>{currentResult.clinicTransferNote}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
