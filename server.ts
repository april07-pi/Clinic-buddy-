import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy initialization for Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// South African NDoH IMCI Triage Engine Endpoint
app.post('/api/triage', async (req, res) => {
  try {
    const {
      patientAgeMonths,
      patientName,
      patientGender,
      symptomsText,
      selectedLanguage = 'en',
      vitals,
      chwAssisted = false,
    } = req.body;

    if (!symptomsText || typeof symptomsText !== 'string') {
      res.status(400).json({ error: 'symptomsText is required' });
      return;
    }

    const ai = getAiClient();

    // If no API key configured or offline fallback requested, return a structured IMCI protocol response
    if (!ai) {
      const fallback = generateImciFallbackTriage({
        patientAgeMonths,
        symptomsText,
        selectedLanguage,
        vitals,
      });
      res.json({
        ...fallback,
        source: 'offline_protocol_engine',
      });
      return;
    }

    const systemInstruction = `You are ClinikBuddy's Clinical Decision Support Assistant, strictly aligned with the South African National Department of Health (NDoH) Integrated Management of Childhood Illness (IMCI) and Primary Health Care (PHC) Standard Treatment Guidelines.
You are assisting either a mother/caregiver or a Community Health Worker (CHW) in rural or low-resource primary care clinics in South Africa.
The patient is a child aged ${patientAgeMonths !== undefined ? patientAgeMonths + ' months' : 'pediatric/general'}.
Requested Target Language: ${selectedLanguage} (one of South Africa's official languages: "zu" [isiZulu], "xh" [isiXhosa], "st" [Sesotho], "tn" [Setswana], "nso" [Sepedi / Sesotho sa Leboa], "ts" [Xitsonga], "ve" [Tshivenḓa], "ss" [siSwati], "nr" [isiNdebele], "af" [Afrikaans], "en" [English]).

MULTILINGUAL UNDERSTANDING:
Caregivers often speak or type in vernacular, mother-tongue idioms, or township slang. You MUST correctly understand pediatric symptoms in any South African language or code-switching:
- Fever/hot body: umkhuhlane, feberu, letshoroma, phišo, mukhuhlwana, mufhiso, umfiva, itjhisa, koors, hot forehead.
- Diarrhea/loose stools: uhudo, urhudo, letshollo, go tšhologa, ku chulula, u ṱhoma maḓi, kuhuda, ukukhutjha amanzi, waterige stoelgang, runny tummy.
- Fast/difficult breathing: ukufuthelana, ukuphefumula ngokushesha, ho phefumoloha ka potlako, go hema ka bonako, ku hema hi ku hatlisa, u fhema nga u ṱavhanya, kortasem, vinnige asemhaling, chest indrawing (isifuba singena ngaphakathi / borskas trek in).
- Refusing feeds/breastmilk: akayidli into, ayincanci, akanancanca, ha a anye, ga a anye, a nga nwi mele, ha nwi mafhi, akayitsandzi intfo, drink nie melk nie.
- Vomiting: ukuhlanza, ukugabha, go tlhatsa, ku hlanta, u ṱanza, kuhlanta, braak, gooi op.

TRIAGE CLASSIFICATIONS (SA IMCI):
1. "RED" (EMERGENCY / IMMEDIATE TRANSFER):
   - General Danger Signs: unable to drink or breastfeed, vomits everything, convulsions, lethargic or unconscious.
   - Severe pneumonia: chest indrawing, stridor in calm child, respiratory rate > 50 bpm (2-11 mo) or > 40 bpm (12-59 mo) with distress.
   - Severe dehydration: lethargic/floppy, sunken eyes, skin pinch goes back very slowly (>2 seconds).
   - Severe Acute Malnutrition (MUAC < 11.5 cm / red zone, visible wasting, bipedal pitting oedema).
   - High fever (>38.5°C) in infant < 2 months, stiff neck, petechiae.

2. "YELLOW" (CLINIC VISIT TODAY):
   - Some dehydration: restless, irritable, sunken eyes, drinks eagerly, skin pinch goes back slowly.
   - Persistent diarrhea (>= 14 days) or dysentery (blood in stool).
   - Fever >= 3 days, ear pain or discharge, cough > 14 days.
   - Moderate Acute Malnutrition (MUAC 11.5 - 12.5 cm / yellow zone).
   - Missed immunizations or vitamin A.

3. "GREEN" (HOME CARE & REHYDRATION):
   - Mild cold, uncomplicated cough without fast breathing or chest indrawing.
   - Mild loose stool with no dehydration signs (safe for home Sugar-Salt-Solution).
   - Mild low-grade fever with child playful, active, and drinking fluids well.

LANGUAGE OUTPUT REQUIREMENTS:
- You MUST write the "urgencyTitle", "explanationLocalized", "homeCareSteps", "dangerSignsToWatch", and "suggestedSpokenAudio" in the EXACT selected home language (${selectedLanguage}) using natural, compassionate, grammatically authentic phrasing.
- "urgencyTitleEnglish", "explanationEnglish", and "clinicTransferNote" MUST be in clear professional English so primary clinic triage nurses or ambulance crew can understand immediately.
- Always include actionable home steps (e.g. homemade Sugar-Salt-Solution [SSS]: 1 Litre boiled & cooled clean water + 8 level teaspoons sugar + 1/2 level teaspoon salt; continue breastfeeding; give zinc if available).`;

    const prompt = `Patient Details:
- Name: ${patientName || 'Child'}
- Age in months: ${patientAgeMonths ?? 'Unknown'}
- Sex: ${patientGender || 'Unspecified'}
- Vitals reported: ${JSON.stringify(vitals || {})}
- Symptoms / Caregiver Report: "${symptomsText}"
- Target Language: ${selectedLanguage}

Evaluate according to SA NDoH IMCI guidelines and respond in the requested JSON format.`;

    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const generatePromise = ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            triageLevel: {
              type: Type.STRING,
              description: 'MUST be one of: "RED", "YELLOW", "GREEN"',
            },
            urgencyTitle: {
              type: Type.STRING,
              description: 'Short headline in selected language, e.g. "Hamba Emtholampilo Ngokushesha" or "Go to Clinic Immediately"',
            },
            urgencyTitleEnglish: {
              type: Type.STRING,
              description: 'Short headline in English, e.g. "Immediate Urgent Clinic Referral Needed"',
            },
            explanationLocalized: {
              type: Type.STRING,
              description: 'Clear, compassionate explanation for the mother in the selected language',
            },
            explanationEnglish: {
              type: Type.STRING,
              description: 'Clear clinical summary for the healthcare provider in English',
            },
            homeCareSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Bullet steps for care at home or while preparing to travel (in localized language)',
            },
            dangerSignsToWatch: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Crucial danger red flags (in localized language)',
            },
            clinicTransferNote: {
              type: Type.STRING,
              description: 'Formal concise clinical handover note in English for the primary clinic triage nurse',
            },
            suggestedSpokenAudio: {
              type: Type.STRING,
              description: 'A friendly 2-3 sentence audio script in the localized language for read-aloud playback',
            },
            roadToHealthFlags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Relevant Road-to-Health booklet tags like "Deworming Check", "Vitamin A", "Growth Monitoring", "Oral Rehydration"',
            },
          },
          required: [
            'triageLevel',
            'urgencyTitle',
            'urgencyTitleEnglish',
            'explanationLocalized',
            'explanationEnglish',
            'homeCareSteps',
            'dangerSignsToWatch',
            'clinicTransferNote',
            'suggestedSpokenAudio',
          ],
        },
      },
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI generation timed out (fallback to IMCI rules)')), 5000)
    );

    const response = (await Promise.race([generatePromise, timeoutPromise])) as any;

    const parsedData = JSON.parse(response.text || '{}');
    res.json({
      ...parsedData,
      source: 'gemini_ai_assistant',
    });
  } catch (error: any) {
    console.error('Triage endpoint error:', error);
    // Fall back to rule-based offline protocol engine gracefully
    const fallback = generateImciFallbackTriage({
      patientAgeMonths: req.body?.patientAgeMonths,
      symptomsText: req.body?.symptomsText || '',
      selectedLanguage: req.body?.selectedLanguage || 'en',
      vitals: req.body?.vitals,
    });
    res.json({
      ...fallback,
      source: 'offline_protocol_engine_fallback',
      errorNotice: error?.message || 'Server processed via offline IMCI protocol',
    });
  }
});

// Rule-based fallback strictly aligned with SA NDoH IMCI algorithms
function generateImciFallbackTriage(input: {
  patientAgeMonths?: number;
  symptomsText: string;
  selectedLanguage: string;
  vitals?: any;
}) {
  const text = (input.symptomsText || '').toLowerCase();
  const lang = input.selectedLanguage || 'en';
  const age = input.patientAgeMonths ?? 12;
  const temp = input.vitals?.temperature ? parseFloat(input.vitals.temperature) : null;
  const respRate = input.vitals?.breathingRate ? parseInt(input.vitals.breathingRate) : null;
  const muac = input.vitals?.muacCm ? parseFloat(input.vitals.muacCm) : null;

  const isRed =
    text.includes('convuls') ||
    text.includes('seizure') ||
    text.includes('isithuthwane') ||
    text.includes('ukunyakaza') ||
    text.includes('qhaqhazela') ||
    text.includes('quleka') ||
    text.includes('cannot drink') ||
    text.includes('unable to drink') ||
    text.includes('ayincanci') ||
    text.includes('akanancanca') ||
    text.includes('ha a anye') ||
    text.includes('ga a anye') ||
    text.includes('a nga nwi') ||
    text.includes('ha nwi') ||
    text.includes('vomit everything') ||
    text.includes('hlanza konke') ||
    text.includes('unconscious') ||
    text.includes('letharg') ||
    text.includes('chest indrawing') ||
    text.includes('isifuba') ||
    text.includes('stridor') ||
    (temp !== null && temp >= 39.0 && age < 3) ||
    (respRate !== null && age < 12 && respRate >= 50) ||
    (respRate !== null && age >= 12 && respRate >= 40) ||
    (muac !== null && muac < 11.5);

  const isYellow =
    !isRed &&
    (text.includes('fever') ||
      text.includes('umkhuhlane') ||
      text.includes('feberu') ||
      text.includes('letshoroma') ||
      text.includes('phišo') ||
      text.includes('mukhuhlwana') ||
      text.includes('mufhiso') ||
      text.includes('umfiva') ||
      text.includes('itjhisa') ||
      text.includes('koors') ||
      text.includes('diarrhea') ||
      text.includes('uhudo') ||
      text.includes('urhudo') ||
      text.includes('letshollo') ||
      text.includes('tšhologa') ||
      text.includes('chulula') ||
      text.includes('ṱhoma') ||
      text.includes('kuhuda') ||
      text.includes('khutjha') ||
      text.includes('cough') ||
      text.includes('ukukhwehlela') ||
      text.includes('khohlela') ||
      text.includes('hema') ||
      text.includes('phefumula') ||
      text.includes('phefumoloha') ||
      text.includes('fhema') ||
      text.includes('asemhaling') ||
      text.includes('vomit') ||
      text.includes('hlanza') ||
      text.includes('gabha') ||
      text.includes('tlhatsa') ||
      text.includes('rash') ||
      text.includes('indlebe') ||
      text.includes('tsebe') ||
      text.includes('ndleve') ||
      text.includes('ear') ||
      (muac !== null && muac >= 11.5 && muac < 12.5) ||
      (temp !== null && temp >= 38.0));

  // Fallback language family resolution
  const resolveLang = (target: string): string => {
    if (['zu', 'xh', 'st', 'tn', 'nso', 'ts', 've', 'ss', 'nr', 'af', 'en'].includes(target)) {
      return target;
    }
    return 'en';
  };
  const activeLang = resolveLang(lang);

  if (isRed) {
    const localized: Record<string, any> = {
      zu: {
        title: 'Hamba Emtholampilo Ngokushesha (Isimo Esiphuthumayo)',
        explanation: 'Ingane ibonisa izimpawu eziyingozi (IMCI Red Flag). Udinga ukubonwa ngumhlengikazi noma udokotela esibhedlela ngokushesha okukhulu.',
        steps: [
          'Hamba emtholampilo noma esibhedlela ngokushesha.',
          'Uma ingane ingagodoli, qhubeka uyincelise indlela yonke eya emtholampilo.',
          'Uma iphethwe ngumkhuhlane omkhulu, musa ukuyigqokisa izingubo ezishisayo.',
          'Lungisa i-Sugar-Salt Solution (SSS) uma ihudula ngenkathi usendleleni.',
        ],
        dangerSigns: [
          'Ayikwazi ukumunya noma ukuphuza lutho.',
          'Iyahlanza konke ekudlayo.',
          'Ukuquleka noma ukuqhaqhazela komzimba.',
          'Ukuphefumula kanzima noma isifuba singena ngaphakathi.',
        ],
        audio: 'Sawubona mama. Ingane yakho idinga ukubonwa ngokushesha emtholampilo. Hamba manje, qhubeka umcelise endleleni.',
      },
      xh: {
        title: 'Yiya eKliniki Ngokukhawuleza (Ingxaki Engxamisekileyo)',
        explanation: 'Umntwana ubonisa iimpawu eziyingozi kakhulu. Kufuneka abonwe ngumongikazi ngokukhawuleza.',
        steps: [
          'Yiya ekliniki okanye esibhedlele kwangoko.',
          'Qhubeka umancise umntwana endleleni eya ekliniki.',
          'Musa ukumthiyelela ngeengubo ezishushu kakhulu.',
          'Mnike i-Sugar-Salt Solution (SSS) endleleni.',
        ],
        dangerSigns: [
          'Akanako ukuncanca okanye ukusela.',
          'Ugabha yonke into.',
          'Ukugqabhuka okanye ukungaqondi.',
        ],
        audio: 'Molo mama. Umntwana wakho ufuna uncedo olukhawulezileyo ekliniki. Khawuleza uhambe ngoku.',
      },
      st: {
        title: "Tsohle e Potlakileng - Eya Tlelerekeng Hang-hang",
        explanation: "Ngoana o bontša matšoao a kotsi a IMCI. O hloka ho hlahlojoa ke mooki tleliniking hang-hang.",
        steps: [
          'Eya tleliniking kapa sepetlele hang-hang.',
          "Tsoela pele ho anyesa ngoana tseleng e eang tleliniking.",
          'Lokisa tharollo ea tsoekere le letsoai (SSS) haeba a tsoa letshollo.',
        ],
        dangerSigns: [
          'Ha a khone ho anya kapa ho noa.',
          'O hlatsa ntho e \'ngoe le e \'ngoe.',
          'Ho hema ka potlako kapa sefuba se kenang ka hare.',
        ],
        audio: "Dumela 'm'e. Ngoana o hloka ho ea tleliniking hang-hang. Tsamaea joale, tsoela pele ho mo anyesa tseleng.",
      },
      tn: {
        title: 'Potlako e Kgolo - Ya Tleliniking Ka Bonako',
        explanation: 'Ngwana o supa ditshupo tse di kotsi tsa IMCI. O tlhoka go bonwa ke mooki ka bonako.',
        steps: [
          'Ya kwa tleliniking kgotsa kokelong ka bonako.',
          'Tswelela go anyisa ngwana mo tseleng e e yang kwa tleliniking.',
          'Mo fe motswako wa sukiri le letswai (SSS) fa a tšhologa.',
        ],
        dangerSigns: [
          'Ga a kgone go nwa kgotsa go anya.',
          'O tlhatsa sengwe le sengwe.',
          'Kgotlholo le go hema ka bonako.',
        ],
        audio: 'Dumela mma. Ngwana o tlhoka go bonwa ke mooki ka bonako kwa tleliniking. Tsamaya jaanong.',
      },
      nso: {
        title: 'Tšhoganetšo - Eya Kliniking Kapejana',
        explanation: 'Ngwana o laetša dika tše kotsi tša IMCI tšeo di hlokago thušo ya booki kapejana.',
        steps: [
          'Eya kliniking kapa sepetleleng kapejana.',
          'Tšwela pele go anyiša ngwana tseleng go ya kliniking.',
          'Mphe hlaka ya swikiri le letswai (SSS) ge a tšhologa.',
        ],
        dangerSigns: [
          'Ga a kgone go anya goba go nwa.',
          'O hlatša tšhohle tšeo a di jago.',
          'Go hema kapejana ka bothata.',
        ],
        audio: 'Dumela mma. Ngwana o swanetše go ya kliniking kapejana. Tsamaya bjale, mo anyiše tseleng.',
      },
      af: {
        title: 'Noodgeval - Gaan Dadelik na die Kliniek (Rooi Vlag)',
        explanation: 'Die kind toon ernstige IMCI gevaartekens wat onmiddellike verpleegkundige ondersoek vereis.',
        steps: [
          'Gaan dadelik na die naaste kliniek of hospitaal noodsaal.',
          'Hou die kind kalm en gaan voort met borsvoeding op pad na die kliniek.',
          'Berei tuisgemaakte suiker-sout oplossing (SSS) voor indien diarree teenwoordig is.',
        ],
        dangerSigns: [
          'Nie in staat om te drink of te borsvoed nie',
          'Breek alles op wat ingeneem word',
          'Stuiptrekkings of borskas intrekking',
        ],
        audio: 'Gaan asseblief dadelik na die kliniek met die kind. Hou aan borsvoed op pad.',
      },
      en: {
        title: 'Seek Immediate Emergency Clinic Referral (Red Flag)',
        explanation: 'The child presents with severe IMCI danger signs requiring immediate transfer to a primary clinic or hospital.',
        steps: [
          'Proceed to the nearest clinic or hospital emergency room immediately.',
          'Keep the child calm and warm; do not overwrap if feverish.',
          'Continue frequent sips of clean fluid or breast milk on the journey.',
          'Show this digital clinic referral passport to the triage nurse upon arrival.',
        ],
        dangerSigns: [
          'Unable to drink or breastfeed',
          'Vomiting everything consumed',
          'Convulsions or seizures',
          'Severe chest indrawing or extreme lethargy',
        ],
        audio: 'Please take the child to the nearest clinic immediately. Keep breastfeeding on the way.',
      },
    };

    // Fallback cluster matching
    let selected = localized[activeLang];
    if (!selected) {
      if (['ss', 'nr'].includes(activeLang)) selected = localized.zu;
      else if (['ts', 've'].includes(activeLang)) selected = localized.en;
      else selected = localized.en;
    }
    return {
      triageLevel: 'RED',
      urgencyTitle: selected.title,
      urgencyTitleEnglish: 'Immediate Urgent Clinic Referral (IMCI Red Category)',
      explanationLocalized: selected.explanation,
      explanationEnglish: 'Child exhibits IMCI general danger signs / acute respiratory or metabolic risk requiring priority nurse assessment.',
      homeCareSteps: selected.steps,
      dangerSignsToWatch: selected.dangerSigns,
      clinicTransferNote: `CLINIKBUDDY REFERRAL: Age: ${age}mo. Symptoms: "${input.symptomsText}". Triage: RED/EMERGENCY. Protocol: Immediate IMCI triage assessment required.`,
      suggestedSpokenAudio: selected.audio,
      roadToHealthFlags: ['Priority Triage', 'IMCI Danger Assessment', 'Immediate Rehydration'],
    };
  }

  if (isYellow) {
    const localized: Record<string, any> = {
      zu: {
        title: 'Vakashela Umtholampilo Namhlanje (Yellow Flag)',
        explanation: 'Ingane inezimpawu ezidinga ukuhlolwa ngumhlengikazi emtholampilo namhlanje, kodwa ayikho esimweni esiphuthumayo esibucayi kakhulu.',
        steps: [
          'Hlela ukuya emtholampilo wasekhaya namhlanje ekuseni.',
          'Lungisa amanzi kasawoti noshukela (SSS): 1 Litre wamanzi abilisiwe apholile + 8 izipuni zikashukela + uhhafu wesipuni sikasawoti.',
          'Qhubeka uncelise ingane kaningi.',
          'Mnike uketshezi oluningi ngesipuni.',
        ],
        dangerSigns: [
          'Uma engasakwazi ukuphuza noma ecobeka kakhulu.',
          'Uma isifuba siqala ukungena phakathi lapho ephefumula.',
          'Uma amehlo etshona phakathi ngenxa yokuphelelwa ngamanzi.',
        ],
        audio: 'Sawubona mama. Ingane yakho idinga ukuya emtholampilo namhlanje ukuze ithole imithi efanele.',
      },
      xh: {
        title: 'Tyelela iKliniki Namhlanje (Icandelo Eliquletheyo)',
        explanation: 'Umntwana uneempawu ezifuna ukuhlolwa ngumongikazi namhlanje ukuze afumane iyeza elifanelekileyo.',
        steps: [
          'Tyelela ikliniki yasekhaya namhlanje.',
          'Lungisa i-Sugar-Salt Solution (SSS) ekhaya kwaye umnike amaxesha amaninzi.',
          'Qhubeka umancise kwaye ujonge ubushushu bomzimba.',
        ],
        dangerSigns: [
          'Ukuba akasakwazi ukusela okanye ukuncanca.',
          'Ukuphefumla ngokukhawuleza okanye amehlo atshonileyo.',
        ],
        audio: 'Molo mama. Nceda utyelele ikliniki namhlanje ukuze umntwana ahlolwe ngumongikazi.',
      },
      st: {
        title: 'Etela Tlelereke Kajeno (Matšoao a Hlokang Tlhokomelo)',
        explanation: "Ngoana o na le matšoao a hlokang hore a bonoe ke mooki tleliniking kajeno.",
        steps: [
          'Etela tlelereke ea heno ea bophelo bo botle kajeno.',
          'Lokisa tharollo ea tsoekere le letsoai (SSS) bakeng sa letshollo.',
          'Tsoela pele ho mo anyesa khafetsa le ho mo fa metsi a hloekileng.',
        ],
        dangerSigns: [
          'Haeba a fokola haholo hoo a sa khoneng ho noa.',
          'Haeba a hema ka thata kapa mahlo a teba ka hare.',
        ],
        audio: "Dumela 'm'e. Etela tlelereke kajeno bakeng sa tlhahlobo ea ngoana. Mo fe lino khafetsa.",
      },
      tn: {
        title: 'Etela Tleliniki Gompieno (Tlhokomelo e e Potlakileng)',
        explanation: 'Ngwana o na le ditshupo tse di tlhokang go tlhatlhobiwa ke mooki kwa tleliniking gompieno.',
        steps: [
          'Etela tleliniki ya gago ya fa gae gompieno.',
          'Mo fe motswako wa sukiri le letswai (SSS) le metsi a a phepa.',
          'Tswelela go mo anyisa kgapetsakgapetsa.',
        ],
        dangerSigns: [
          'Fa a sa kgone go nwa kgotsa a tletse letsapa.',
          'Fa a hema ka bonako kgotsa matlho a tseneletse mo teng.',
        ],
        audio: 'Dumela mma. Ya kwa tleliniking gompieno go bona mooki. Naya ngwana metsi a sukiri le letswai.',
      },
      af: {
        title: 'Besoek Kliniek Vandag (Geel Kategorie)',
        explanation: 'Die kind toon simptome wat vandag deur \'n kliniekverpleegster beoordeel moet word.',
        steps: [
          'Besoek u plaaslike primêre gesondheidskliniek vandag.',
          'Berei tuisgemaakte suiker-sout oplossing (SSS) voor.',
          'Gaan voort met gereelde borsvoeding en vloeistowwe.',
        ],
        dangerSigns: [
          'Raak te swak om te drink of te borsvoed',
          'Vinnige asemhaling of ingesonke oë ontwikkel',
        ],
        audio: 'Besoek asseblief vandag die kliniek vir \'n roetine-evaluasie van u kind.',
      },
      en: {
        title: 'Visit Local Clinic Today (Yellow Category)',
        explanation: 'The child has symptoms that require evaluation by a clinic nurse today for proper diagnosis and treatment.',
        steps: [
          'Visit your local primary healthcare clinic today.',
          'Prepare homemade Sugar-Salt-Solution (SSS): 1 Litre boiled & cooled water + 8 level teaspoons sugar + 1/2 level teaspoon salt.',
          'Continue frequent breastfeeding and small sips of fluid.',
          'Track temperature and keep baby comfortable in light clothing.',
        ],
        dangerSigns: [
          'Becomes too weak to drink or breastfeed',
          'Vomiting continuously',
          'Rapid breathing develops or sunken eyes',
        ],
        audio: 'Please visit the clinic today for a routine assessment. Offer small sips of fluids regularly.',
      },
    };

    let selected = localized[activeLang];
    if (!selected) {
      if (['ss', 'nr'].includes(activeLang)) selected = localized.zu;
      else if (['nso'].includes(activeLang)) selected = localized.st;
      else selected = localized.en;
    }
    return {
      triageLevel: 'YELLOW',
      urgencyTitle: selected.title,
      urgencyTitleEnglish: 'Clinic Assessment Recommended Within 24 Hours',
      explanationLocalized: selected.explanation,
      explanationEnglish: 'Child exhibits IMCI yellow category indicators. Needs nurse examination, prescription, and hydration monitoring.',
      homeCareSteps: selected.steps,
      dangerSignsToWatch: selected.dangerSigns,
      clinicTransferNote: `CLINIKBUDDY REFERRAL: Age: ${age}mo. Symptoms: "${input.symptomsText}". Triage: YELLOW. Protocol: IMCI nurse review within 24h.`,
      suggestedSpokenAudio: selected.audio,
      roadToHealthFlags: ['Road to Health Booklet Check', 'Hydration Support', 'Deworming & Vitamin A Check'],
    };
  }

  // Green category
  const localized: Record<string, any> = {
    zu: {
      title: 'Ukunakekela Ekhaya (Isimo Esiphephile - Green)',
      explanation: 'Ingane ibonakala iphephile okwamanje. Ungayinakekela ekhaya ngenkathi ubheka izimpawu eziyingozi.',
      steps: [
        'Qhubeka nokuyincelisa njalo noma uyiphe ukudla okunempilo.',
        'Yiphe uketshezi olwengeziwe (amanzi ahlanzekile, isobho, i-SSS).',
        'Uma inomkhuhlane omncane, sula umzimba ngendwangu emanzi emanzini apholile (tepid sponge).',
        'Gcina ingane iphumule endaweni enomoya ohlanzekile.',
      ],
      dangerSigns: [
        'Ukuphefumula ngokushesha kakhulu.',
        'Ukungafuni ukuncela noma ukuphuza.',
        'Umkhuhlane ophezulu ongadambiyo ngemuva kwezinsuku ezimbili.',
      ],
      audio: 'Ingane inganakekelwa ekhaya okwamanje mama. Mnike uketshezi oluningi futhi umbheke ngokucophelela.',
    },
    xh: {
      title: 'Ukhathalelo Lwasekhaya (Ikhuselekile)',
      explanation: 'Akukho zimpawu zingozi zingxamisekileyo zifunyenweyo. Umntwana unokukhathalelwa ekhaya ngokukhuselekileyo.',
      steps: [
        'Qhubeka umancise rhoqo kwaye umnike ukutya okucocekileyo.',
        'Yandisa amanzi ahlaziyekileyo ne-Sugar-Salt Solution.',
        'Mphumze kwindawo epholileyo enomoya.',
      ],
      dangerSigns: [
        'Ukala ukuncanca okanye ukusela.',
        'Ukuphefumla ngokukhawuleza okungaqhelekanga.',
      ],
      audio: 'Umntwana unokulawulwa ekhaya mama. Mnike amanzi amaninzi kwaye uqaphele iimpawu.',
    },
    st: {
      title: 'Tlhokomelo ea Lapeng (E Sireletsehile)',
      explanation: 'Ha ho matšoao a kotsi a bonahalang. Ngoana a ka hlokomeloa lapeng ka tlhokomelo e tšehetsang.',
      steps: [
        'Tsoela pele ho anyesa khafetsa le ho mo fa lijo tse matlafatsang.',
        'Eketsa lino tse hloekileng le tharollo ea SSS.',
        'Boloka ngoana a phutholohile ka liaparo tse bobebe.',
      ],
      dangerSigns: [
        'Ho hana ho anya kapa ho noa.',
        'Ho hema ka potlako e fetelletseng.',
      ],
      audio: "Ngoana a ka hlokomeloa lapeng hantle 'm'e. Mo fe lino tse ngata le ho mo shebisisa.",
    },
    tn: {
      title: 'Tlhokomelo ya Fa Gae (E Babalesegile)',
      explanation: 'Ga go ditshupo tsa kotsi tse di bonetseng. Ngwana a ka tlhokomelwa fa gae ka tshireletsego.',
      steps: [
        'Tswelela go anyisa kgapetsakgapetsa le go mo naya dijo tse di siameng.',
        'Oketsega metsi a a phepa le motswako wa sukiri le letswai.',
        'Tlogela ngwana a ikhutse mo kamoreng e e nang le moya.',
      ],
      dangerSigns: [
        'Go gana go anya kgotsa go nwa.',
        'Go hema ka bonako.',
      ],
      audio: 'Ngwana o ka tlhokomelwa fa gae mma. Mo fe metsi a a lekaneng mme o tlhokomele botsogo jwa gagwe.',
    },
    af: {
      title: 'Tuisversorging & Waaksaamheid (Groen Kategorie)',
      explanation: 'Geen dringende gevaartekens bespeur nie. Die simptome kan veilig tuis bestuur word met hidrasie.',
      steps: [
        'Gaan voort met gereelde borsvoeding en voedsame sagte kosse.',
        'Verhoog vloeistofinname (skoon water, ligte sop of SSS).',
        'Hou die kind gemaklik in ligte klere in \'n goed geventileerde vertrek.',
      ],
      dangerSigns: [
        'Weier om te drink of te voed',
        'Asemhaling word vinnig of raserig',
        'Hoë koors langer as 48 uur',
      ],
      audio: 'Die kind kan vir eers veilig tuis versorg word. Gee genoeg vloeistowwe en hou die kind dop.',
    },
    en: {
      title: 'Home Care & Watchful Monitoring (Green Category)',
      explanation: 'No urgent danger signs detected. The symptoms can be carefully managed at home with hydration and supportive care.',
      steps: [
        'Continue regular breastfeeding and nutritious, soft foods.',
        'Increase fluid intake (clean water, light broth, or diluted fruit sips).',
        'Keep the child comfortable in light clothing; rest in well-ventilated room.',
        'Keep your Road to Health card handy for the next scheduled immunization visit.',
      ],
      dangerSigns: [
        'Refusing to feed or drink',
        'Breathing becomes rapid or noisy',
        'High fever lasting longer than 48 hours',
        'Extreme drowsiness or weakness',
      ],
      audio: 'The child can be safely cared for at home for now. Offer plenty of fluids and monitor closely.',
    },
  };

  let selected = localized[activeLang];
  if (!selected) {
    if (['ss', 'nr'].includes(activeLang)) selected = localized.zu;
    else if (['nso'].includes(activeLang)) selected = localized.st;
    else selected = localized.en;
  }
  return {
    triageLevel: 'GREEN',
    urgencyTitle: selected.title,
    urgencyTitleEnglish: 'Home Management Appropriate',
    explanationLocalized: selected.explanation,
    explanationEnglish: 'No IMCI danger signs present. Patient can be monitored with home supportive care, oral fluids, and watchful waiting.',
    homeCareSteps: selected.steps,
    dangerSignsToWatch: selected.dangerSigns,
    clinicTransferNote: `CLINIKBUDDY PROTOCOL: Age: ${age}mo. Symptoms: "${input.symptomsText}". Triage: GREEN. Advise caregiver on IMCI home care and danger signs.`,
    suggestedSpokenAudio: selected.audio,
    roadToHealthFlags: ['Home Oral Fluids', 'Routine Growth Monitoring', 'Next Clinic Visit on Schedule'],
  };
}

// Vite integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ClinikBuddy Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
