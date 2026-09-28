import { LanguageCode } from '../types';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Play clinical acoustic alert tones
export function playTone(type: 'red' | 'yellow' | 'green' | 'tick' | 'chime') {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    if (type === 'tick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
      return;
    }

    if (type === 'chime') {
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.09);
        gain.gain.setValueAtTime(0, now + i * 0.09);
        gain.gain.linearRampToValueAtTime(0.15, now + i * 0.09 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.09);
        osc.stop(now + i * 0.09 + 0.36);
      });
      return;
    }

    if (type === 'red') {
      // Urgent double warning pulse
      [0, 0.22].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now + offset);
        osc.frequency.linearRampToValueAtTime(320, now + offset + 0.18);
        gain.gain.setValueAtTime(0.2, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.21);
      });
      return;
    }

    if (type === 'yellow') {
      // Moderate reminder tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(739.99, now + 0.15); // F#5
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.41);
      return;
    }

    if (type === 'green') {
      // Reassuring soft major chord
      [440, 554.37, 659.25].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.12, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.51);
      });
      return;
    }
  } catch (err) {
    console.warn('Audio tone play warning:', err);
  }
}

// Text-to-speech voice assistant
export class VoiceNarrator {
  private static synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;
  private static currentUtterance: SpeechSynthesisUtterance | null = null;
  private static onStateChangeCallback: ((speaking: boolean) => void) | null = null;

  public static setCallback(cb: (speaking: boolean) => void) {
    this.onStateChangeCallback = cb;
  }

  public static stop() {
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(false);
      }
    }
  }

  public static isSpeaking(): boolean {
    return Boolean(this.synth?.speaking);
  }

  public static speak(text: string, lang: LanguageCode, onEnd?: () => void) {
    if (!this.synth) {
      console.warn('Speech synthesis not available in this browser');
      return;
    }

    this.stop();

    // Map language code to BCP 47 voice tags
    const langMap: Record<LanguageCode, string[]> = {
      zu: ['zu-ZA', 'zu', 'en-ZA', 'en-GB'],
      xh: ['xh-ZA', 'xh', 'en-ZA', 'en-GB'],
      st: ['st-ZA', 'st', 'en-ZA', 'en-GB'],
      tn: ['tn-ZA', 'tn', 'en-ZA', 'en-GB'],
      nso: ['nso-ZA', 'nso', 'en-ZA', 'en-GB'],
      ts: ['ts-ZA', 'ts', 'en-ZA', 'en-GB'],
      ve: ['ve-ZA', 've', 'en-ZA', 'en-GB'],
      ss: ['ss-ZA', 'ss', 'en-ZA', 'en-GB'],
      nr: ['nr-ZA', 'nr', 'en-ZA', 'en-GB'],
      af: ['af-ZA', 'af', 'nl-NL', 'nl-BE', 'en-ZA'],
      en: ['en-ZA', 'en-GB', 'en-US'],
    };

    const targetTags = langMap[lang] || ['en-ZA', 'en-US'];
    const voices = this.synth.getVoices();

    let matchedVoice = voices.find((v) =>
      targetTags.some((tag) => v.lang.toLowerCase().startsWith(tag.toLowerCase()) || v.lang.toLowerCase() === tag.toLowerCase())
    );
    if (!matchedVoice) {
      matchedVoice = voices.find((v) => v.lang.toLowerCase().includes('za') || v.lang.toLowerCase().includes('en'));
    }

    const utterance = new SpeechSynthesisUtterance(text);
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }
    utterance.lang = targetTags[0] || 'en-ZA';
    utterance.rate = 0.90; // calibrated gentle pace for mothers & elder caregivers
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(true);
      }
    };

    utterance.onend = () => {
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(false);
      }
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(false);
      }
      if (onEnd) onEnd();
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }
}
