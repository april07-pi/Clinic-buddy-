import React, { useState } from 'react';
import { Volume2, VolumeX, CheckCircle, Info, Sparkles, Droplets } from 'lucide-react';
import { LanguageCode } from '../types';
import { VoiceNarrator, playTone } from '../utils/audioAssistant';

interface Props {
  language: LanguageCode;
}

export const SugarSaltStation: React.FC<Props> = ({ language }) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const scripts: Record<LanguageCode, { title: string; desc: string; steps: string[]; audio: string }> = {
    zu: {
      title: 'I-Sugar-Salt Solution (SSS) Ekhaya',
      desc: 'Ukunqanda ukuphelelwa ngamanzi emzimbeni ngenxa yohudo noma ukuhlanza.',
      steps: [
        'Geza izandla zakho ngensipho namanzi ahlanzekile.',
        'Thatha i-1 Litre yamanzi ahlanzekile abilisiwe futhi asepholile (noma ibhodlela le-Coke elingu-1L).',
        'Faka izipuni eziyisishiyagalombili (8) ezisiphiye zikashukela omhlophe noma onsundu.',
        'Faka uhhafu wesipuni (1/2) sikasawoti wokupheka.',
        'Gqugquzela kahle kuze kuncibilike konke. Mnike ingane ngesipuni emva kwalo lonke uhudo.',
      ],
      audio: 'Sawubona mama. Nansi indlela yokwenza i-Sugar-Salt Solution. Thatha i-1 Litre yamanzi abilisiwe apholile. Faka izipuni eziyisishiyagalombili zikashukela, nohhafu wesipuni sikasawoti. Govuza kahle. Mnike ingane ngesipuni kancane kancane emva kwalo lonke uhudo.',
    },
    xh: {
      title: 'I-Sugar-Salt Solution (SSS) Ekhaya',
      desc: 'Ukuthintela ukoma nokuphelelwa ngamanzi emntwaneni.',
      steps: [
        'Hlamba izandla zakho ngesepha namanzi acocekileyo.',
        'Thatha 1 Lita yamanzi abilisiweyo naphilileyo.',
        'Galela amacephe asi-8 eswekile.',
        'Galela isiqingatha secephe (1/2) setyuwa.',
        'Gqugquzela kakuhle de inyibilike yonke. Sela kancinci emva kohudo ngalunye.',
      ],
      audio: 'Molo mama. Lungisa 1 Lita yamanzi abilisiweyo naphilileyo. Galela amacephe asi-8 eswekile nesiqingatha secephe setyuwa. Mnike umntwana ngamacephe amancinci emva kokugabha okanye ukuhuda.',
    },
    en: {
      title: 'Homemade Sugar-Salt-Solution (SSS)',
      desc: 'Life-saving oral rehydration for diarrhea and vomiting to prevent dehydration.',
      steps: [
        'Wash hands thoroughly with clean water and soap.',
        'Measure 1 Litre of clean, boiled and cooled water (or 1L clean cold drink bottle).',
        'Add 8 level teaspoons of sugar (white or brown).',
        'Add half (1/2) level teaspoon of salt.',
        'Stir well until dissolved. Give small frequent sips by cup or spoon after every loose stool.',
      ],
      audio: 'To prepare Sugar-Salt-Solution, take one litre of boiled, cooled clean water. Add eight level teaspoons of sugar and half a teaspoon of salt. Stir until completely dissolved. Feed small sips regularly after every loose stool.',
    },
    st: {
      title: 'Tharollo ea Tsoekere le Letsoai (SSS)',
      desc: 'Ho thibela ho felloa ke metsi ' + "'meleng ka lebaka la letshollo.",
      steps: [
        'Hlatsoa matsoho a hao ka sesepa le metsi a hloekileng.',
        'Nka 1 Litara ea metsi a belang a pholileng.',
        'Kenya likhaba tse 8 tsa tsoekere.',
        'Kenya halofo (1/2) ea khaba ea letsoai.',
        "Hlohla hantle. Fana ka likhaba tse nyane khafetsa ka mor'a letshollo le leng le le leng.",
      ],
      audio: 'Nka litara e le ' + "'ngoe ea metsi a belang a pholileng. Kenya likhaba tse robeli tsa tsoekere le halofo ea khaba ea letsoai. E fane ka likhaba tse nyenyane.",
    },
    tn: {
      title: 'Motswako wa Sukiri le Letswai (SSS)',
      desc: 'Tharollo ya fa gae e e bolokang botshelo go thibela go felloa ke metsi mo mmeleng.',
      steps: [
        'Tlhapa diatla tsa gago ka sesepa le metsi a a phepa.',
        'Tshola 1 Litara ya metsi a a bedisitsweng a bo a fola.',
        'Tsenya ditlhobolo tse 8 tse di lekanetseng tsa sukiri.',
        'Tsenya halofo (1/2) ya khaba e nnye ya letswai.',
        'Fudua sentle go fitlhela e qhibidiha. Naya ngwana ka dikhaba tse dinnye morago ga go tlhatsa kgotsa letshollo.',
      ],
      audio: 'Tshola litara e le nngwe ya metsi a a phepa a a bedisitsweng a fola. Tsenya dikhaba tse 8 tsa sukiri le halofo ya letswai. Fudua mme o neye ngwana kgapetsakgapetsa.',
    },
    nso: {
      title: 'Hlaka Swikiri le Letswai ya Gae (SSS)',
      desc: 'Tharollo ya gae go thibela go felelwa ke meetse ka baka la go tšhologa.',
      steps: [
        'Hlatswa diatla tša gago ka sesepe le meetse a hlwekilego.',
        'Nka 1 Litara ya meetse a go bela a go fola.',
        'Tsenya dikhaba tše 8 tša swikiri.',
        'Tsenya seripa (1/2) sa khaba e nnyane ya letswai.',
        'Fuduwa gabotse go fihlela e tologa. Efa ngwana ka dikhaba tše nnyane morago ga go tšhologa.',
      ],
      audio: 'Nka litara e tee ya meetse a go bela a go fola. Tsenya dikhaba tše seswai tša swikiri le seripa sa letswai. Fuduwa gomme o fe ngwana morago ga letšhologo le lengwe le le lengwe.',
    },
    ts: {
      title: 'Ntswamba wa Chukele na Munyu (SSS)',
      desc: 'Ndlela yo ponisa vutomi bya n\'wana hi ku sivela ku hela ka mati emirhini hi mhaka yo chulula.',
      steps: [
        'Hlambani mavoko hi xisibi na mati yo tenga.',
        'Tekani 1 Litara ya mati yo virisiwa lama horisiweke.',
        'Chela maphama ya 8 ya chukele.',
        'Chela hafu (1/2) ya lephama ra munyu.',
        'Hakula kahle ku fikela loko swi n\'okile. Nyikani n\'wana hi maphamana endzhaku ko chulula hinkwako.',
      ],
      audio: 'Tekani litara yin\'we ya mati yo virisiwa lama horisiweke. Chela maphama ya nhungu ya chukele na hafu ya munyu. Hakula kahle kutani u nyika n\'wana.',
    },
    ve: {
      title: 'Tshisuthelwa tsha Swigiri na Muno (SSS)',
      desc: 'U thivhela u ṱhahelela ha maḓi muvhilini zwi tshi vhangwa nga u ṱhoma.',
      steps: [
        'Ṱambani zwanḓa nga tshisibe na maḓi o kunaho.',
        'Dzhenisani 1 Litha ya maḓi o vhilaho a rothololwa.',
        'Shelani zwikunzhi zwa 8 zwa swigiri.',
        'Shelani hafu (1/2) ya tshikunzhi tshiṱuku tsha muno.',
        'Piringanyani zwavhuḓi u swika zwi tshi n\'oka. Fhani ṅwana nga zwikunzhi zwiṱuku musi o ṱhoma.',
      ],
      audio: 'Dzhiani litha nthihi ya maḓi o vhilaho a rothololwa. Shelani zwikunzhi zwa malo zwa swigiri na hafu ya muno. Piringanyani ni fhe ṅwana musi o ṱhoma.',
    },
    ss: {
      title: 'Inhlanganisela yaShukela naLitswayi (SSS)',
      desc: 'Kusindzisa imphilo ngekuvimbela kuphelelwa ngemanti emtimbeni ngenca yekuhuda.',
      steps: [
        'Geza tandla takho ngensipho nangemanti lahlobile.',
        'Tfola 1 Litha yemanti labilisiwe labapholiswa.',
        'Faka tipunu letingu-8 tashukela.',
        'Faka hafu (1/2) yesipunu selitswayi.',
        'Gucula kahle ize incibilike yonkhe. Niketa umntfwana ngalokuncane emva kwekuhuda konkhe.',
      ],
      audio: 'Tfola litha linye yemanti labilisiwe laphola. Faka tipunu letisiphohlongo tashukela nehafu yelitswayi. Gucula kahle bese unika umntfwana kancane kancane.',
    },
    nr: {
      title: 'I-Sugar-Salt Solution (SSS) Yekhaya',
      desc: 'Iphungula ukuphelelwa mamanzi emzimbeni okubangelwa kukhutjha ngamandla.',
      steps: [
        'Hlamba izandla zakho ngesibha namanzi ahlwengileko.',
        'Thatha 1 Litha yamanzi abilisweko abaphola.',
        'Faka amapunu ama-8 kashukela.',
        'Faka ihafu (1/2) yepunu lamasawoti.',
        'Gqugquzela kuhle kukhambisane. Nikela umntwana ngamapunu amancani ngemva kokuhuda kwakhe.',
      ],
      audio: 'Thatha ilitha linye lamanzi abilisweko aphola. Faka amapunu alikhomba nanye kashukela nehafu yamasawoti. Gqugquzela kuhle bese uphisa umntwana kancani.',
    },
    af: {
      title: 'Tuisgemaakte Suiker-Sout Oplossing (SSS)',
      desc: 'Voorkom lewensgevaarlike dehidrasie van diarree en braking.',
      steps: [
        'Was jou hande deeglik met seep en skoon water.',
        'Meet 1 Liter gekookte en afgekoelde skoon water af.',
        'Voeg 8 gelyk teelepels suiker by.',
        'Voeg ' + "'n halwe (1/2) teelepel sout by.",
        'Roer deeglik tot opgelos. Gee gereelde klein slukkies met ' + "'n lepel na elke waterige stoelgang.",
      ],
      audio: 'Neem een liter gekookte, afgekoelde skoon water. Voeg agt teelepels suiker en ' + "'n halwe teelepel sout by. Roer tot opgelos en gee gereeld klein slukkies.",
    },
  };

  const current = scripts[language] || scripts.en;

  const toggleAudio = () => {
    if (isPlayingAudio) {
      VoiceNarrator.stop();
      setIsPlayingAudio(false);
    } else {
      setIsPlayingAudio(true);
      playTone('chime');
      VoiceNarrator.speak(current.audio, language, () => {
        setIsPlayingAudio(false);
      });
    }
  };

  const toggleStep = (idx: number) => {
    playTone('tick');
    if (completedSteps.includes(idx)) {
      setCompletedSteps(completedSteps.filter((s) => s !== idx));
    } else {
      setCompletedSteps([...completedSteps, idx]);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-sky-100 shadow-sm relative overflow-hidden">
      {/* Decorative background water tint */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-sky-50 rounded-full pointer-events-none opacity-60" />

      <div className="flex items-start justify-between gap-3 mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
            <Droplets className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-base sm:text-lg flex items-center gap-2">
              {current.title}
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                WHO / SA NDoH
              </span>
            </h3>
            <p className="text-xs text-stone-600 mt-0.5">{current.desc}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleAudio}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
            isPlayingAudio
              ? 'bg-sky-600 text-white shadow-sm ring-2 ring-sky-300 animate-pulse'
              : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
          }`}
        >
          {isPlayingAudio ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          <span>{isPlayingAudio ? 'Misa' : 'Lalela Izwi'}</span>
        </button>
      </div>

      {/* Visual recipe ratio graphic */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-gradient-to-r from-sky-50 via-teal-50 to-emerald-50 rounded-xl border border-sky-100/80 mb-4 text-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-sky-200/70 text-sky-800 flex items-center justify-center font-bold text-sm mb-1">
            1L
          </div>
          <span className="text-[11px] font-semibold text-stone-700">Clean Water</span>
          <span className="text-[10px] text-stone-500">Boiled & Cooled</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-amber-200/70 text-amber-900 flex items-center justify-center font-bold text-sm mb-1">
            8x
          </div>
          <span className="text-[11px] font-semibold text-stone-700">Sugar Spoons</span>
          <span className="text-[10px] text-stone-500">Level Teaspoons</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-stone-200/80 text-stone-800 flex items-center justify-center font-bold text-sm mb-1">
            ½x
          </div>
          <span className="text-[11px] font-semibold text-stone-700">Salt Spoon</span>
          <span className="text-[10px] text-stone-500">Level Teaspoon</span>
        </div>
      </div>

      {/* Interactive step checkoff list */}
      <div className="space-y-2">
        {current.steps.map((step, idx) => {
          const isDone = completedSteps.includes(idx);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => toggleStep(idx)}
              className={`w-full text-left flex items-start gap-3 p-2.5 rounded-xl border transition-all text-xs sm:text-sm ${
                isDone
                  ? 'bg-emerald-50 border-emerald-200 text-stone-700'
                  : 'bg-stone-50/70 border-stone-200 hover:bg-stone-100/70 text-stone-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border ${
                  isDone
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-white border-stone-300 text-transparent'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
              </div>
              <span className={`leading-relaxed ${isDone ? 'line-through text-stone-500' : ''}`}>{step}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px] text-stone-500 bg-stone-50 p-2 rounded-lg border border-stone-100">
        <Info className="w-4 h-4 text-sky-600 shrink-0" />
        <span>
          Give 1/2 cup to children under 2 years, or 1 full cup to older children after every watery stool. Keep feeding breast milk!
        </span>
      </div>
    </div>
  );
};
