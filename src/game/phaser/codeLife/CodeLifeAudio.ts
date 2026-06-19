export type CodeLifeSfxId =
  | "tentacle-grab"
  | "devour"
  | "hurt"
  | "scan-alarm"
  | "permission-gate"
  | "boss-hit"
  | "material-mark"
  | "voiceprint-spoof"
  | "device-overload";

export type CodeLifeAudioCategory = "body" | "combat" | "system" | "boss";
export type CodeLifeAudioSourceKind = "oscillator" | "noise";
export type CodeLifeAudioCurve = "instant" | "linear" | "exponential";

export interface CodeLifeAudioRamp {
  readonly atMs: number;
  readonly value: number;
  readonly curve?: CodeLifeAudioCurve;
}

export interface CodeLifeAudioEnvelope {
  readonly attackMs: number;
  readonly decayMs: number;
  readonly sustainGain: number;
  readonly holdMs: number;
  readonly releaseMs: number;
  readonly peakGain: number;
  readonly curve?: CodeLifeAudioCurve;
}

export interface CodeLifeAudioFilter {
  readonly type: BiquadFilterType;
  readonly frequencyHz: number;
  readonly q?: number;
  readonly gainDb?: number;
  readonly frequencyRamp?: readonly CodeLifeAudioRamp[];
}

export interface CodeLifeAudioLayer {
  readonly id: string;
  readonly source: CodeLifeAudioSourceKind;
  readonly waveform?: OscillatorType;
  readonly frequencyHz?: number;
  readonly frequencyRamp?: readonly CodeLifeAudioRamp[];
  readonly detuneCents?: number;
  readonly delayMs?: number;
  readonly durationMs: number;
  readonly gain?: number;
  readonly pan?: number;
  readonly envelope: CodeLifeAudioEnvelope;
  readonly filter?: CodeLifeAudioFilter;
  readonly note?: string;
}

export interface CodeLifeAudioPatch {
  readonly id: CodeLifeSfxId;
  readonly label: string;
  readonly category: CodeLifeAudioCategory;
  readonly durationMs: number;
  readonly mixGain: number;
  readonly cooldownMs: number;
  readonly phaserKey: string;
  readonly hapticHint?: "tap" | "pulse" | "heavy";
  readonly layers: readonly CodeLifeAudioLayer[];
}

export interface CodeLifeAudioTriggerOptions {
  readonly intensity?: number;
  readonly volume?: number;
  readonly pitchShiftCents?: number;
  readonly pan?: number;
  readonly distanceGain?: number;
  readonly startedAtMs?: number;
  readonly position?: Readonly<{ x: number; y: number }>;
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

export interface CodeLifeAudioEventPayload {
  readonly id: CodeLifeSfxId;
  readonly patch: CodeLifeAudioPatch;
  readonly options: CodeLifeAudioTriggerOptions;
}

export interface CodeLifeAudioEventEmitter {
  emit(eventName: string, payload: CodeLifeAudioEventPayload): boolean | void;
}

export interface CodeLifeAudioAdapter {
  playPatch(patch: CodeLifeAudioPatch, options: CodeLifeAudioTriggerOptions): CodeLifeAudioPlayback | void;
}

export interface CodeLifeWebAudioTarget {
  readonly context: BaseAudioContext;
  readonly destination?: AudioNode;
}

export interface CodeLifeWebAudioPlaybackOptions extends CodeLifeAudioTriggerOptions {
  readonly destination?: AudioNode;
  readonly now?: number;
}

export interface CodeLifeAudioPlayback {
  readonly patch: CodeLifeAudioPatch;
  stop(atSeconds?: number): void;
}

export type CodeLifeAudioTarget = BaseAudioContext | CodeLifeWebAudioTarget | CodeLifeAudioAdapter | CodeLifeAudioEventEmitter;

export const CODE_LIFE_AUDIO_EVENT = "code-life:sfx";

export const CODE_LIFE_AUDIO_PATCHES: Readonly<Record<CodeLifeSfxId, CodeLifeAudioPatch>> = {
  "tentacle-grab": {
    id: "tentacle-grab",
    label: "Tentacle Grab",
    category: "body",
    durationMs: 420,
    mixGain: 0.72,
    cooldownMs: 85,
    phaserKey: "code-life-sfx-tentacle-grab",
    hapticHint: "tap",
    layers: [
      {
        id: "wet-snap",
        source: "noise",
        delayMs: 0,
        durationMs: 180,
        gain: 0.46,
        pan: -0.12,
        envelope: {
          attackMs: 3,
          decayMs: 45,
          sustainGain: 0.16,
          holdMs: 30,
          releaseMs: 95,
          peakGain: 1,
          curve: "exponential",
        },
        filter: {
          type: "bandpass",
          frequencyHz: 960,
          q: 7.5,
          frequencyRamp: [{ atMs: 160, value: 330, curve: "exponential" }],
        },
      },
      {
        id: "elastic-pull",
        source: "oscillator",
        waveform: "triangle",
        frequencyHz: 210,
        frequencyRamp: [
          { atMs: 75, value: 118, curve: "exponential" },
          { atMs: 260, value: 74, curve: "exponential" },
        ],
        durationMs: 340,
        gain: 0.36,
        envelope: {
          attackMs: 10,
          decayMs: 70,
          sustainGain: 0.35,
          holdMs: 110,
          releaseMs: 150,
          peakGain: 0.9,
          curve: "linear",
        },
        filter: {
          type: "lowpass",
          frequencyHz: 780,
          q: 0.8,
        },
      },
      {
        id: "micro-glitch",
        source: "oscillator",
        waveform: "square",
        frequencyHz: 1430,
        frequencyRamp: [{ atMs: 42, value: 1890, curve: "instant" }],
        delayMs: 55,
        durationMs: 90,
        gain: 0.11,
        envelope: {
          attackMs: 1,
          decayMs: 12,
          sustainGain: 0.25,
          holdMs: 20,
          releaseMs: 48,
          peakGain: 0.7,
        },
      },
    ],
  },
  devour: {
    id: "devour",
    label: "Devour",
    category: "body",
    durationMs: 820,
    mixGain: 0.82,
    cooldownMs: 180,
    phaserKey: "code-life-sfx-devour",
    hapticHint: "heavy",
    layers: [
      {
        id: "sub-swallow",
        source: "oscillator",
        waveform: "sawtooth",
        frequencyHz: 94,
        frequencyRamp: [
          { atMs: 150, value: 58, curve: "exponential" },
          { atMs: 560, value: 132, curve: "exponential" },
        ],
        durationMs: 710,
        gain: 0.48,
        envelope: {
          attackMs: 35,
          decayMs: 120,
          sustainGain: 0.42,
          holdMs: 320,
          releaseMs: 235,
          peakGain: 1,
          curve: "exponential",
        },
        filter: {
          type: "lowpass",
          frequencyHz: 420,
          q: 1.1,
          frequencyRamp: [
            { atMs: 220, value: 250, curve: "exponential" },
            { atMs: 620, value: 760, curve: "exponential" },
          ],
        },
      },
      {
        id: "byte-crunch",
        source: "noise",
        delayMs: 95,
        durationMs: 390,
        gain: 0.34,
        pan: 0.14,
        envelope: {
          attackMs: 4,
          decayMs: 55,
          sustainGain: 0.24,
          holdMs: 180,
          releaseMs: 150,
          peakGain: 0.85,
        },
        filter: {
          type: "highpass",
          frequencyHz: 1180,
          q: 1.4,
        },
      },
      {
        id: "digest-sparks",
        source: "oscillator",
        waveform: "sine",
        frequencyHz: 760,
        frequencyRamp: [
          { atMs: 80, value: 1180, curve: "linear" },
          { atMs: 180, value: 910, curve: "linear" },
          { atMs: 310, value: 1510, curve: "linear" },
        ],
        delayMs: 380,
        durationMs: 330,
        gain: 0.18,
        envelope: {
          attackMs: 6,
          decayMs: 70,
          sustainGain: 0.18,
          holdMs: 80,
          releaseMs: 170,
          peakGain: 0.78,
        },
      },
    ],
  },
  hurt: {
    id: "hurt",
    label: "Hurt",
    category: "combat",
    durationMs: 520,
    mixGain: 0.74,
    cooldownMs: 110,
    phaserKey: "code-life-sfx-hurt",
    hapticHint: "pulse",
    layers: [
      {
        id: "integrity-tear",
        source: "oscillator",
        waveform: "square",
        frequencyHz: 620,
        frequencyRamp: [
          { atMs: 45, value: 1310, curve: "linear" },
          { atMs: 165, value: 220, curve: "exponential" },
        ],
        durationMs: 260,
        gain: 0.3,
        envelope: {
          attackMs: 2,
          decayMs: 38,
          sustainGain: 0.28,
          holdMs: 45,
          releaseMs: 175,
          peakGain: 1,
        },
        filter: {
          type: "bandpass",
          frequencyHz: 1380,
          q: 4.2,
        },
      },
      {
        id: "static-blood",
        source: "noise",
        durationMs: 430,
        gain: 0.38,
        envelope: {
          attackMs: 1,
          decayMs: 70,
          sustainGain: 0.18,
          holdMs: 90,
          releaseMs: 270,
          peakGain: 0.9,
          curve: "exponential",
        },
        filter: {
          type: "highpass",
          frequencyHz: 860,
          q: 0.6,
        },
      },
    ],
  },
  "scan-alarm": {
    id: "scan-alarm",
    label: "Scan Alarm",
    category: "system",
    durationMs: 940,
    mixGain: 0.62,
    cooldownMs: 520,
    phaserKey: "code-life-sfx-scan-alarm",
    hapticHint: "pulse",
    layers: [
      {
        id: "scanner-pulse-a",
        source: "oscillator",
        waveform: "square",
        frequencyHz: 520,
        frequencyRamp: [
          { atMs: 120, value: 520, curve: "instant" },
          { atMs: 135, value: 710, curve: "instant" },
          { atMs: 260, value: 710, curve: "instant" },
          { atMs: 275, value: 520, curve: "instant" },
        ],
        durationMs: 690,
        gain: 0.24,
        envelope: {
          attackMs: 3,
          decayMs: 28,
          sustainGain: 0.34,
          holdMs: 520,
          releaseMs: 120,
          peakGain: 0.8,
        },
        filter: {
          type: "bandpass",
          frequencyHz: 1240,
          q: 8,
        },
      },
      {
        id: "scanline-hiss",
        source: "noise",
        delayMs: 40,
        durationMs: 820,
        gain: 0.16,
        envelope: {
          attackMs: 30,
          decayMs: 90,
          sustainGain: 0.45,
          holdMs: 420,
          releaseMs: 280,
          peakGain: 0.62,
        },
        filter: {
          type: "bandpass",
          frequencyHz: 2600,
          q: 2,
          frequencyRamp: [{ atMs: 730, value: 4700, curve: "linear" }],
        },
      },
    ],
  },
  "permission-gate": {
    id: "permission-gate",
    label: "Permission Gate",
    category: "system",
    durationMs: 760,
    mixGain: 0.8,
    cooldownMs: 260,
    phaserKey: "code-life-sfx-permission-gate",
    hapticHint: "heavy",
    layers: [
      {
        id: "access-denied-thud",
        source: "oscillator",
        waveform: "triangle",
        frequencyHz: 155,
        frequencyRamp: [
          { atMs: 58, value: 72, curve: "exponential" },
          { atMs: 260, value: 44, curve: "exponential" },
        ],
        durationMs: 420,
        gain: 0.54,
        envelope: {
          attackMs: 6,
          decayMs: 80,
          sustainGain: 0.22,
          holdMs: 105,
          releaseMs: 250,
          peakGain: 1,
          curve: "exponential",
        },
        filter: {
          type: "lowpass",
          frequencyHz: 360,
          q: 1.7,
        },
      },
      {
        id: "lock-teeth",
        source: "noise",
        delayMs: 35,
        durationMs: 240,
        gain: 0.3,
        envelope: {
          attackMs: 1,
          decayMs: 30,
          sustainGain: 0.14,
          holdMs: 60,
          releaseMs: 150,
          peakGain: 0.76,
        },
        filter: {
          type: "bandpass",
          frequencyHz: 1840,
          q: 11,
          frequencyRamp: [{ atMs: 210, value: 660, curve: "exponential" }],
        },
      },
      {
        id: "admin-token-chirp",
        source: "oscillator",
        waveform: "sine",
        frequencyHz: 980,
        frequencyRamp: [
          { atMs: 40, value: 1320, curve: "linear" },
          { atMs: 120, value: 880, curve: "linear" },
        ],
        delayMs: 300,
        durationMs: 250,
        gain: 0.2,
        envelope: {
          attackMs: 4,
          decayMs: 36,
          sustainGain: 0.22,
          holdMs: 45,
          releaseMs: 165,
          peakGain: 0.74,
        },
      },
    ],
  },
  "boss-hit": {
    id: "boss-hit",
    label: "Boss Hit",
    category: "boss",
    durationMs: 620,
    mixGain: 0.88,
    cooldownMs: 95,
    phaserKey: "code-life-sfx-boss-hit",
    hapticHint: "heavy",
    layers: [
      {
        id: "core-impact",
        source: "oscillator",
        waveform: "sawtooth",
        frequencyHz: 118,
        frequencyRamp: [
          { atMs: 70, value: 64, curve: "exponential" },
          { atMs: 250, value: 92, curve: "exponential" },
        ],
        durationMs: 440,
        gain: 0.46,
        envelope: {
          attackMs: 5,
          decayMs: 75,
          sustainGain: 0.2,
          holdMs: 105,
          releaseMs: 255,
          peakGain: 1,
          curve: "exponential",
        },
        filter: {
          type: "lowpass",
          frequencyHz: 540,
          q: 1.4,
        },
      },
      {
        id: "shell-fracture",
        source: "noise",
        delayMs: 25,
        durationMs: 310,
        gain: 0.42,
        envelope: {
          attackMs: 1,
          decayMs: 42,
          sustainGain: 0.2,
          holdMs: 70,
          releaseMs: 220,
          peakGain: 0.88,
        },
        filter: {
          type: "bandpass",
          frequencyHz: 1360,
          q: 5.5,
          frequencyRamp: [{ atMs: 260, value: 260, curve: "exponential" }],
        },
      },
      {
        id: "weakpoint-ring",
        source: "oscillator",
        waveform: "sine",
        frequencyHz: 390,
        frequencyRamp: [
          { atMs: 120, value: 570, curve: "linear" },
          { atMs: 310, value: 330, curve: "linear" },
        ],
        delayMs: 115,
        durationMs: 360,
        gain: 0.22,
        envelope: {
          attackMs: 8,
          decayMs: 52,
          sustainGain: 0.32,
          holdMs: 90,
          releaseMs: 210,
          peakGain: 0.75,
        },
        filter: {
          type: "peaking",
          frequencyHz: 720,
          q: 2.5,
          gainDb: 5,
        },
      },
    ],
  },
  "material-mark": {
    id: "material-mark",
    label: "Material Mark",
    category: "system",
    durationMs: 540,
    mixGain: 0.66,
    cooldownMs: 120,
    phaserKey: "code-life-sfx-material-mark",
    hapticHint: "pulse",
    layers: [
      {
        id: "printer-head",
        source: "noise",
        durationMs: 240,
        gain: 0.32,
        envelope: {
          attackMs: 1,
          decayMs: 38,
          sustainGain: 0.28,
          holdMs: 80,
          releaseMs: 120,
          peakGain: 0.86,
        },
        filter: {
          type: "bandpass",
          frequencyHz: 1260,
          q: 8,
          frequencyRamp: [{ atMs: 190, value: 480, curve: "exponential" }],
        },
      },
      {
        id: "anchor-print",
        source: "oscillator",
        waveform: "triangle",
        frequencyHz: 164,
        frequencyRamp: [
          { atMs: 72, value: 218, curve: "linear" },
          { atMs: 260, value: 92, curve: "exponential" },
        ],
        delayMs: 80,
        durationMs: 380,
        gain: 0.34,
        envelope: {
          attackMs: 8,
          decayMs: 58,
          sustainGain: 0.42,
          holdMs: 110,
          releaseMs: 210,
          peakGain: 0.72,
        },
        filter: {
          type: "lowpass",
          frequencyHz: 620,
          q: 0.9,
        },
      },
    ],
  },
  "voiceprint-spoof": {
    id: "voiceprint-spoof",
    label: "Voiceprint Spoof",
    category: "system",
    durationMs: 760,
    mixGain: 0.7,
    cooldownMs: 160,
    phaserKey: "code-life-sfx-voiceprint-spoof",
    hapticHint: "pulse",
    layers: [
      {
        id: "formant-bloom",
        source: "oscillator",
        waveform: "sine",
        frequencyHz: 310,
        frequencyRamp: [
          { atMs: 90, value: 620, curve: "linear" },
          { atMs: 260, value: 388, curve: "linear" },
          { atMs: 520, value: 744, curve: "linear" },
        ],
        durationMs: 660,
        gain: 0.34,
        envelope: {
          attackMs: 16,
          decayMs: 80,
          sustainGain: 0.46,
          holdMs: 260,
          releaseMs: 260,
          peakGain: 0.76,
        },
        filter: {
          type: "bandpass",
          frequencyHz: 740,
          q: 3.2,
          frequencyRamp: [{ atMs: 620, value: 1280, curve: "linear" }],
        },
      },
      {
        id: "codec-teeth",
        source: "oscillator",
        waveform: "square",
        frequencyHz: 1880,
        frequencyRamp: [
          { atMs: 48, value: 1240, curve: "instant" },
          { atMs: 128, value: 2060, curve: "instant" },
        ],
        delayMs: 60,
        durationMs: 260,
        gain: 0.1,
        envelope: {
          attackMs: 1,
          decayMs: 16,
          sustainGain: 0.22,
          holdMs: 110,
          releaseMs: 120,
          peakGain: 0.74,
        },
      },
    ],
  },
  "device-overload": {
    id: "device-overload",
    label: "Device Overload",
    category: "boss",
    durationMs: 680,
    mixGain: 0.86,
    cooldownMs: 110,
    phaserKey: "code-life-sfx-device-overload",
    hapticHint: "heavy",
    layers: [
      {
        id: "weakness-crack",
        source: "noise",
        durationMs: 320,
        gain: 0.5,
        envelope: {
          attackMs: 1,
          decayMs: 35,
          sustainGain: 0.18,
          holdMs: 88,
          releaseMs: 210,
          peakGain: 0.92,
          curve: "exponential",
        },
        filter: {
          type: "bandpass",
          frequencyHz: 1760,
          q: 6.8,
          frequencyRamp: [{ atMs: 280, value: 360, curve: "exponential" }],
        },
      },
      {
        id: "armor-drop",
        source: "oscillator",
        waveform: "sawtooth",
        frequencyHz: 132,
        frequencyRamp: [
          { atMs: 80, value: 58, curve: "exponential" },
          { atMs: 360, value: 74, curve: "linear" },
        ],
        delayMs: 20,
        durationMs: 520,
        gain: 0.4,
        envelope: {
          attackMs: 5,
          decayMs: 72,
          sustainGain: 0.28,
          holdMs: 150,
          releaseMs: 290,
          peakGain: 0.88,
        },
        filter: {
          type: "lowpass",
          frequencyHz: 480,
          q: 1.6,
        },
      },
    ],
  },
};

export function getCodeLifeAudioPatch(id: CodeLifeSfxId): CodeLifeAudioPatch {
  return CODE_LIFE_AUDIO_PATCHES[id];
}

export function createCodeLifeAudioEvent(
  id: CodeLifeSfxId,
  options: CodeLifeAudioTriggerOptions = {},
): CodeLifeAudioEventPayload {
  return {
    id,
    patch: getCodeLifeAudioPatch(id),
    options,
  };
}

export function emitCodeLifeAudioEvent(
  emitter: CodeLifeAudioEventEmitter,
  id: CodeLifeSfxId,
  options: CodeLifeAudioTriggerOptions = {},
): boolean | void {
  return emitter.emit(CODE_LIFE_AUDIO_EVENT, createCodeLifeAudioEvent(id, options));
}

export function triggerCodeLifeAudio(
  target: CodeLifeAudioTarget,
  id: CodeLifeSfxId,
  options: CodeLifeWebAudioPlaybackOptions = {},
): CodeLifeAudioPlayback | void {
  const patch = getCodeLifeAudioPatch(id);

  if (isCodeLifeAudioAdapter(target)) {
    return target.playPatch(patch, options);
  }

  if (isCodeLifeAudioEmitter(target)) {
    emitCodeLifeAudioEvent(target, id, options);
    return undefined;
  }

  if (isCodeLifeWebAudioTarget(target)) {
    return playCodeLifePatchWithWebAudio(target.context, patch, {
      ...options,
      destination: options.destination ?? target.destination,
    });
  }

  return playCodeLifePatchWithWebAudio(target, patch, options);
}

export function playCodeLifePatchWithWebAudio(
  context: BaseAudioContext,
  patch: CodeLifeAudioPatch,
  options: CodeLifeWebAudioPlaybackOptions = {},
): CodeLifeAudioPlayback {
  const startedAt = options.now ?? context.currentTime;
  const destination = options.destination ?? context.destination;
  const intensity = clampNumber(options.intensity ?? 1, 0, 2);
  const volume = clampNumber(options.volume ?? 1, 0, 1.6);
  const distanceGain = clampNumber(options.distanceGain ?? 1, 0, 1);
  const spatialPan = clampNumber(options.pan ?? 0, -1, 1);
  const pitchMultiplier = centsToMultiplier(options.pitchShiftCents ?? 0);
  const masterGain = context.createGain();
  const sources: AudioScheduledSourceNode[] = [];
  let latestEnd = startedAt;

  masterGain.gain.setValueAtTime(patch.mixGain * volume * distanceGain * (0.68 + intensity * 0.32), startedAt);
  masterGain.connect(destination);

  for (const layer of patch.layers) {
    const layerStart = startedAt + (layer.delayMs ?? 0) / 1000;
    const layerEnd = layerStart + layer.durationMs / 1000;
    const layerGain = context.createGain();
    const filter = createLayerFilter(context, layer, layerStart);
    const panner = createLayerPanner(context, (layer.pan ?? 0) + spatialPan);
    const firstNode = filter ?? layerGain;
    const finalNode = panner ?? layerGain;

    applyEnvelope(layerGain.gain, layer.envelope, layerStart, layer.durationMs, (layer.gain ?? 1) * intensity);

    if (filter) {
      filter.connect(layerGain);
    }
    if (panner) {
      layerGain.connect(panner);
      panner.connect(masterGain);
    } else {
      layerGain.connect(masterGain);
    }

    const source = createSourceNode(context, layer, layerStart, pitchMultiplier);
    source.connect(firstNode);
    source.start(layerStart);
    source.stop(layerEnd + 0.03);
    sources.push(source);
    latestEnd = Math.max(latestEnd, layerEnd);
  }

  const cleanupDelayMs = Math.max(0, (latestEnd - context.currentTime) * 1000) + 100;
  globalThis.setTimeout(() => {
    try {
      masterGain.disconnect();
    } catch {
      // Already disconnected by an eager stop call.
    }
  }, cleanupDelayMs);

  return {
    patch,
    stop(atSeconds = context.currentTime) {
      for (const source of sources) {
        try {
          source.stop(atSeconds);
        } catch {
          // WebAudio throws if a scheduled source has already stopped.
        }
      }
      try {
        masterGain.disconnect();
      } catch {
        // The cleanup timer may have disconnected this node already.
      }
    },
  };
}

function createSourceNode(
  context: BaseAudioContext,
  layer: CodeLifeAudioLayer,
  startAt: number,
  pitchMultiplier: number,
): AudioScheduledSourceNode {
  if (layer.source === "noise") {
    const source = context.createBufferSource();
    source.buffer = createNoiseBuffer(context, layer.durationMs / 1000 + 0.04);
    return source;
  }

  const source = context.createOscillator();
  source.type = layer.waveform ?? "sine";
  source.detune.setValueAtTime(layer.detuneCents ?? 0, startAt);
  source.frequency.setValueAtTime((layer.frequencyHz ?? 440) * pitchMultiplier, startAt);
  applyParamRamps(source.frequency, layer.frequencyRamp, startAt, pitchMultiplier);
  return source;
}

function createNoiseBuffer(context: BaseAudioContext, durationSeconds: number): AudioBuffer {
  const length = Math.max(1, Math.ceil(durationSeconds * context.sampleRate));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < data.length; i += 1) {
    const decay = 1 - i / data.length;
    data[i] = (Math.random() * 2 - 1) * (0.35 + decay * 0.65);
  }

  return buffer;
}

function createLayerFilter(
  context: BaseAudioContext,
  layer: CodeLifeAudioLayer,
  startAt: number,
): BiquadFilterNode | undefined {
  if (!layer.filter) {
    return undefined;
  }

  const filter = context.createBiquadFilter();
  filter.type = layer.filter.type;
  filter.frequency.setValueAtTime(layer.filter.frequencyHz, startAt);

  if (layer.filter.q !== undefined) {
    filter.Q.setValueAtTime(layer.filter.q, startAt);
  }
  if (layer.filter.gainDb !== undefined) {
    filter.gain.setValueAtTime(layer.filter.gainDb, startAt);
  }

  applyParamRamps(filter.frequency, layer.filter.frequencyRamp, startAt, 1);
  return filter;
}

function createLayerPanner(context: BaseAudioContext, pan: number): StereoPannerNode | undefined {
  if (pan === 0) {
    return undefined;
  }

  const maybeContext = context as BaseAudioContext & {
    createStereoPanner?: () => StereoPannerNode;
  };
  const panner = maybeContext.createStereoPanner?.();
  if (!panner) {
    return undefined;
  }

  panner.pan.value = clampNumber(pan, -1, 1);
  return panner;
}

function applyEnvelope(
  gainParam: AudioParam,
  envelope: CodeLifeAudioEnvelope,
  startAt: number,
  durationMs: number,
  gainScale: number,
): void {
  const endAt = startAt + durationMs / 1000;
  const attackEnd = startAt + Math.max(0.001, envelope.attackMs / 1000);
  const decayEnd = Math.min(endAt, attackEnd + Math.max(0, envelope.decayMs / 1000));
  const releaseStart = Math.max(decayEnd, endAt - Math.max(0.001, envelope.releaseMs / 1000));
  const peak = Math.max(0.0001, envelope.peakGain * gainScale);
  const sustain = Math.max(0.0001, envelope.sustainGain * gainScale);

  gainParam.cancelScheduledValues(startAt);
  gainParam.setValueAtTime(0.0001, startAt);
  rampParam(gainParam, peak, attackEnd, envelope.curve ?? "linear");
  rampParam(gainParam, sustain, decayEnd, envelope.curve ?? "linear");
  gainParam.setValueAtTime(sustain, releaseStart);
  rampParam(gainParam, 0.0001, endAt, envelope.curve ?? "linear");
}

function applyParamRamps(
  param: AudioParam,
  ramps: readonly CodeLifeAudioRamp[] | undefined,
  startAt: number,
  valueMultiplier: number,
): void {
  if (!ramps) {
    return;
  }

  for (const ramp of ramps) {
    const value = Math.max(0.0001, ramp.value * valueMultiplier);
    const at = startAt + ramp.atMs / 1000;
    rampParam(param, value, at, ramp.curve ?? "linear");
  }
}

function rampParam(param: AudioParam, value: number, at: number, curve: CodeLifeAudioCurve): void {
  if (curve === "instant") {
    param.setValueAtTime(value, at);
  } else if (curve === "exponential") {
    param.exponentialRampToValueAtTime(Math.max(0.0001, value), at);
  } else {
    param.linearRampToValueAtTime(value, at);
  }
}

function centsToMultiplier(cents: number): number {
  return 2 ** (cents / 1200);
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isCodeLifeAudioAdapter(target: CodeLifeAudioTarget): target is CodeLifeAudioAdapter {
  return typeof (target as CodeLifeAudioAdapter).playPatch === "function";
}

function isCodeLifeAudioEmitter(target: CodeLifeAudioTarget): target is CodeLifeAudioEventEmitter {
  return typeof (target as CodeLifeAudioEventEmitter).emit === "function";
}

function isCodeLifeWebAudioTarget(target: CodeLifeAudioTarget): target is CodeLifeWebAudioTarget {
  return typeof (target as CodeLifeWebAudioTarget).context?.createGain === "function";
}
