import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "背景音乐", "关卡");
const SAMPLE_RATE = 22050;
const BEATS_PER_LOOP = 32;
const TWO_PI = Math.PI * 2;

const SCALE_INTERVALS = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
  pentatonic: [0, 3, 5, 7, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
};

const TRACKS = [
  {
    id: "cursor-hunt",
    file: "01-cursor-hunt.wav",
    bpm: 132,
    root: 45,
    scale: "minor",
    waveform: "square",
    chords: [[0, 3, 7], [5, 8, 12], [7, 10, 14], [3, 7, 10]],
    motif: [0, 2, 4, 2, 5, 4, 2, 1],
    percussion: "pursuit",
    texture: "cursor",
  },
  {
    id: "wrong-gateway",
    file: "02-wrong-gateway.wav",
    bpm: 118,
    root: 42,
    scale: "phrygian",
    waveform: "square",
    chords: [[0, 1, 7], [3, 7, 10], [1, 5, 8], [0, 3, 6]],
    motif: [0, 1, 3, 1, 4, 3, 1, 0],
    percussion: "glitch",
    texture: "gateway",
  },
  {
    id: "code-rebirth",
    file: "03-code-rebirth.wav",
    bpm: 104,
    root: 38,
    scale: "minor",
    waveform: "triangle",
    chords: [[0, 3, 7], [3, 7, 12], [5, 8, 12], [7, 10, 14]],
    motif: [0, 2, 3, 4, 6, 4, 3, 2],
    percussion: "organic",
    texture: "code",
  },
  {
    id: "trash-mountain",
    file: "04-trash-mountain.wav",
    bpm: 108,
    root: 40,
    scale: "locrian",
    waveform: "saw",
    chords: [[0, 3, 6], [5, 8, 12], [1, 5, 8], [3, 6, 10]],
    motif: [0, 2, 1, 3, 4, 3, 1, 0],
    percussion: "industrial",
    texture: "recycle",
  },
  {
    id: "p-drive",
    file: "05-p-drive.wav",
    bpm: 124,
    root: 43,
    scale: "dorian",
    waveform: "triangle",
    chords: [[0, 3, 7], [5, 9, 12], [7, 10, 14], [2, 5, 9]],
    motif: [0, 2, 4, 6, 4, 2, 3, 5],
    percussion: "network",
    texture: "lan",
  },
  {
    id: "leder-d-drive",
    file: "06-leder-d-drive.wav",
    bpm: 100,
    root: 41,
    scale: "minor",
    waveform: "triangle",
    chords: [[0, 3, 7], [7, 10, 14], [5, 8, 12], [3, 7, 10]],
    motif: [0, 2, 1, 4, 3, 5, 4, 2],
    percussion: "archive",
    texture: "drive",
  },
  {
    id: "c-wall",
    file: "07-c-wall.wav",
    bpm: 96,
    root: 39,
    scale: "harmonic",
    waveform: "square",
    chords: [[0, 3, 7], [8, 11, 15], [5, 8, 12], [7, 11, 14]],
    motif: [0, 1, 4, 1, 5, 4, 2, 1],
    percussion: "locked",
    texture: "permission",
  },
  {
    id: "leder-c-drive",
    file: "08-leder-c-drive.wav",
    bpm: 112,
    root: 37,
    scale: "harmonic",
    waveform: "saw",
    chords: [[0, 3, 7], [7, 11, 14], [3, 7, 10], [5, 8, 12]],
    motif: [0, 2, 4, 6, 5, 3, 2, 1],
    percussion: "system",
    texture: "admin",
  },
  {
    id: "router-core",
    file: "09-router-core.wav",
    bpm: 128,
    root: 43,
    scale: "dorian",
    waveform: "triangle",
    chords: [[0, 3, 7], [2, 5, 9], [7, 10, 14], [5, 9, 12]],
    motif: [0, 2, 4, 6, 5, 4, 2, 7],
    percussion: "network",
    texture: "router",
  },
  {
    id: "nas-graveyard",
    file: "10-nas-graveyard.wav",
    bpm: 92,
    root: 38,
    scale: "minor",
    waveform: "triangle",
    chords: [[0, 3, 7], [5, 8, 12], [10, 14, 17], [3, 7, 10]],
    motif: [0, 2, 3, 2, 5, 4, 3, 1],
    percussion: "archive",
    texture: "backup",
  },
  {
    id: "camera-eye",
    file: "11-camera-eye.wav",
    bpm: 116,
    root: 44,
    scale: "pentatonic",
    waveform: "sine",
    chords: [[0, 5, 10], [3, 7, 12], [5, 10, 15], [7, 10, 17]],
    motif: [0, 2, 4, 3, 1, 3, 4, 2],
    percussion: "lens",
    texture: "camera",
  },
  {
    id: "printer-belly",
    file: "12-printer-belly.wav",
    bpm: 106,
    root: 41,
    scale: "minor",
    waveform: "square",
    chords: [[0, 3, 7], [5, 8, 12], [7, 10, 14], [2, 5, 8]],
    motif: [0, 2, 4, 2, 3, 5, 3, 1],
    percussion: "mechanical",
    texture: "printer",
  },
  {
    id: "speaker-voiceprint",
    file: "13-speaker-voiceprint.wav",
    bpm: 122,
    root: 46,
    scale: "dorian",
    waveform: "sine",
    chords: [[0, 3, 7], [2, 5, 9], [5, 9, 12], [7, 10, 14]],
    motif: [0, 4, 6, 4, 2, 5, 4, 2],
    percussion: "voice",
    texture: "speaker",
  },
  {
    id: "dev-board",
    file: "14-dev-board.wav",
    bpm: 126,
    root: 43,
    scale: "dorian",
    waveform: "square",
    chords: [[0, 3, 7], [5, 9, 12], [7, 10, 14], [9, 12, 16]],
    motif: [0, 2, 4, 6, 7, 5, 3, 2],
    percussion: "hardware",
    texture: "board",
  },
];

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

for (const track of TRACKS) {
  const secondsPerBeat = 60 / track.bpm;
  const durationSeconds = BEATS_PER_LOOP * secondsPerBeat;
  const samples = new Float32Array(Math.ceil(durationSeconds * SAMPLE_RATE));
  const seed = hashString(track.id);

  addSubDrone(samples, midiToHz(track.root - 24), 0.02, durationSeconds, seed);
  addChordPads(samples, track, secondsPerBeat, durationSeconds);
  addBassLine(samples, track, secondsPerBeat);
  addArpLine(samples, track, secondsPerBeat, seed);
  addPercussion(samples, track, secondsPerBeat, seed);
  addTexture(samples, track, secondsPerBeat, durationSeconds, seed);
  softenLoopEdge(samples, 0.012);
  normalize(samples, 0.78);

  const outPath = path.join(OUTPUT_DIR, track.file);
  fs.writeFileSync(outPath, encodeWav(samples));
  console.log(`generated ${path.relative(ROOT, outPath)} (${durationSeconds.toFixed(2)}s)`);
}

function addChordPads(samples, track, secondsPerBeat, durationSeconds) {
  for (let beat = 0; beat < BEATS_PER_LOOP; beat += 4) {
    const chord = track.chords[(beat / 4) % track.chords.length];
    for (const interval of chord) {
      addNote(samples, {
        start: beat * secondsPerBeat,
        duration: 4 * secondsPerBeat,
        frequency: midiToHz(track.root + interval + 12),
        amplitude: 0.032,
        waveform: "triangle",
        attack: 0.22,
        release: 0.5,
      });
      addNote(samples, {
        start: beat * secondsPerBeat,
        duration: 4 * secondsPerBeat,
        frequency: midiToHz(track.root + interval + 24),
        amplitude: 0.015,
        waveform: "sine",
        attack: 0.3,
        release: 0.65,
      });
    }
  }

  addNote(samples, {
    start: 0,
    duration: durationSeconds,
    frequency: midiToHz(track.root - 12),
    amplitude: 0.02,
    waveform: "sine",
    attack: 0.4,
    release: 0.4,
  });
}

function addBassLine(samples, track, secondsPerBeat) {
  const roots = track.chords.map((chord) => chord[0]);
  for (let beat = 0; beat < BEATS_PER_LOOP; beat += 1) {
    const rootInterval = roots[Math.floor(beat / 4) % roots.length];
    const octave = beat % 4 === 3 ? -10 : -12;
    addNote(samples, {
      start: beat * secondsPerBeat,
      duration: secondsPerBeat * 0.62,
      frequency: midiToHz(track.root + rootInterval + octave),
      amplitude: 0.085,
      waveform: beat % 8 === 7 ? "saw" : "triangle",
      attack: 0.018,
      release: secondsPerBeat * 0.32,
    });
  }
}

function addArpLine(samples, track, secondsPerBeat, seed) {
  const scale = SCALE_INTERVALS[track.scale];
  const step = secondsPerBeat / 2;
  for (let index = 0; index < BEATS_PER_LOOP * 2; index += 1) {
    if ((index + seed) % 13 === 5) {
      continue;
    }
    const degree = track.motif[index % track.motif.length] % scale.length;
    const octave = index % 8 >= 4 ? 24 : 12;
    const accent = index % 8 === 0 ? 1.45 : index % 2 === 0 ? 1.1 : 0.72;
    addNote(samples, {
      start: index * step,
      duration: step * 0.72,
      frequency: midiToHz(track.root + scale[degree] + octave),
      amplitude: 0.032 * accent,
      waveform: track.waveform,
      attack: 0.01,
      release: step * 0.35,
    });
  }
}

function addPercussion(samples, track, secondsPerBeat, seed) {
  const beatCount = BEATS_PER_LOOP;
  for (let beat = 0; beat < beatCount; beat += 1) {
    if (beat % 4 === 0 || (track.percussion === "pursuit" && beat % 4 === 2)) {
      addKick(samples, beat * secondsPerBeat, secondsPerBeat * 0.36, track.percussion === "mechanical" ? 0.16 : 0.13);
    }
    if (beat % 4 === 2) {
      addNoiseBurst(samples, beat * secondsPerBeat, secondsPerBeat * 0.24, 0.08, 900, seed + beat * 17);
    }
  }

  const hatStep = secondsPerBeat / (track.percussion === "archive" ? 1 : 2);
  for (let index = 0; index < beatCount * (secondsPerBeat / hatStep); index += 1) {
    const isAccent = index % 4 === 0;
    const amp = isAccent ? 0.025 : 0.014;
    addNoiseBurst(samples, index * hatStep, hatStep * 0.18, amp, 5200, seed + index * 31);
  }
}

function addTexture(samples, track, secondsPerBeat, durationSeconds, seed) {
  const scale = SCALE_INTERVALS[track.scale];
  const rng = createRng(seed);
  const blipCount =
    track.texture === "router" || track.texture === "lan" || track.texture === "gateway"
      ? 42
      : track.texture === "speaker"
        ? 34
        : 24;

  for (let index = 0; index < blipCount; index += 1) {
    const start = rng() * durationSeconds;
    const degree = Math.floor(rng() * scale.length);
    const octave = rng() > 0.55 ? 24 : 36;
    const waveform = track.texture === "speaker" || track.texture === "camera" ? "sine" : "square";
    addNote(samples, {
      start,
      duration: 0.045 + rng() * 0.12,
      frequency: midiToHz(track.root + scale[degree] + octave),
      amplitude: 0.012 + rng() * 0.03,
      waveform,
      attack: 0.004,
      release: 0.045,
    });
  }

  if (track.texture === "camera") {
    for (let beat = 1; beat < BEATS_PER_LOOP; beat += 4) {
      addSweep(samples, beat * secondsPerBeat, secondsPerBeat * 1.5, midiToHz(track.root + 31), midiToHz(track.root + 43), 0.026);
    }
  }

  if (track.texture === "speaker") {
    for (let beat = 0; beat < BEATS_PER_LOOP; beat += 2) {
      addNote(samples, {
        start: beat * secondsPerBeat,
        duration: secondsPerBeat * 1.2,
        frequency: midiToHz(track.root - 12),
        amplitude: 0.045,
        waveform: "sine",
        attack: 0.03,
        release: secondsPerBeat * 0.6,
      });
    }
  }

  if (track.texture === "board") {
    for (let beat = 0; beat < BEATS_PER_LOOP; beat += 1) {
      addNote(samples, {
        start: beat * secondsPerBeat + secondsPerBeat * 0.72,
        duration: 0.05,
        frequency: midiToHz(track.root + 36 + (beat % 3) * 7),
        amplitude: 0.025,
        waveform: "square",
        attack: 0.002,
        release: 0.025,
      });
    }
  }

  if (track.texture === "recycle" || track.texture === "admin") {
    for (let beat = 0; beat < BEATS_PER_LOOP; beat += 8) {
      addNoiseBurst(samples, beat * secondsPerBeat + secondsPerBeat * 3.5, secondsPerBeat * 0.7, 0.06, 350, seed + beat * 101);
    }
  }
}

function addSubDrone(samples, frequency, amplitude, durationSeconds, seed) {
  const wobbleRate = 0.05 + (seed % 7) * 0.006;
  for (let i = 0; i < samples.length; i += 1) {
    const t = i / SAMPLE_RATE;
    const fade = Math.min(1, t / 0.3, (durationSeconds - t) / 0.3);
    const wobble = Math.sin(TWO_PI * wobbleRate * t) * 0.006;
    samples[i] += Math.sin(TWO_PI * frequency * (1 + wobble) * t) * amplitude * Math.max(0, fade);
  }
}

function addKick(samples, start, duration, amplitude) {
  const startIndex = Math.max(0, Math.floor(start * SAMPLE_RATE));
  const endIndex = Math.min(samples.length, Math.ceil((start + duration) * SAMPLE_RATE));
  for (let i = startIndex; i < endIndex; i += 1) {
    const t = (i - startIndex) / SAMPLE_RATE;
    const u = t / duration;
    const freq = 88 * Math.pow(0.38, u);
    const env = Math.pow(1 - u, 2.7);
    samples[i] += Math.sin(TWO_PI * freq * t) * amplitude * env;
  }
}

function addSweep(samples, start, duration, startFrequency, endFrequency, amplitude) {
  const startIndex = Math.max(0, Math.floor(start * SAMPLE_RATE));
  const endIndex = Math.min(samples.length, Math.ceil((start + duration) * SAMPLE_RATE));
  for (let i = startIndex; i < endIndex; i += 1) {
    const t = (i - startIndex) / SAMPLE_RATE;
    const u = t / duration;
    const freq = startFrequency * Math.pow(endFrequency / startFrequency, u);
    const env = Math.sin(Math.PI * u);
    samples[i] += Math.sin(TWO_PI * freq * t) * amplitude * env;
  }
}

function addNoiseBurst(samples, start, duration, amplitude, lowpassHz, seed) {
  const startIndex = Math.max(0, Math.floor(start * SAMPLE_RATE));
  const endIndex = Math.min(samples.length, Math.ceil((start + duration) * SAMPLE_RATE));
  let previous = 0;
  const smoothing = Math.exp(-TWO_PI * lowpassHz / SAMPLE_RATE);
  for (let i = startIndex; i < endIndex; i += 1) {
    const u = (i - startIndex) / Math.max(1, endIndex - startIndex);
    const raw = noiseUnit(i + seed) * 2 - 1;
    previous = previous * smoothing + raw * (1 - smoothing);
    samples[i] += previous * amplitude * Math.pow(1 - u, 2.2);
  }
}

function addNote(samples, options) {
  const startIndex = Math.max(0, Math.floor(options.start * SAMPLE_RATE));
  const endIndex = Math.min(samples.length, Math.ceil((options.start + options.duration) * SAMPLE_RATE));
  const attack = Math.max(0.001, options.attack);
  const release = Math.max(0.001, options.release);
  const frequency = options.frequency;
  const amplitude = options.amplitude;
  for (let i = startIndex; i < endIndex; i += 1) {
    const t = i / SAMPLE_RATE - options.start;
    const env = envelope(t, options.duration, attack, release);
    const value = oscillator(options.waveform, frequency, t);
    samples[i] += value * amplitude * env;
  }
}

function oscillator(waveform, frequency, t) {
  const phase = (frequency * t) % 1;
  if (waveform === "square") {
    return phase < 0.5 ? 1 : -1;
  }
  if (waveform === "triangle") {
    return 1 - 4 * Math.abs(Math.round(phase - 0.25) - (phase - 0.25));
  }
  if (waveform === "saw") {
    return 2 * phase - 1;
  }
  return Math.sin(TWO_PI * frequency * t);
}

function envelope(t, duration, attack, release) {
  if (t < attack) {
    return t / attack;
  }
  const remaining = duration - t;
  if (remaining < release) {
    return Math.max(0, remaining / release);
  }
  return 1;
}

function softenLoopEdge(samples, seconds) {
  const edgeSamples = Math.max(1, Math.floor(seconds * SAMPLE_RATE));
  for (let i = 0; i < edgeSamples; i += 1) {
    const gain = i / edgeSamples;
    samples[i] *= gain;
    samples[samples.length - 1 - i] *= gain;
  }
}

function normalize(samples, targetPeak) {
  let peak = 0;
  for (const sample of samples) {
    peak = Math.max(peak, Math.abs(sample));
  }
  const gain = peak > 0 ? Math.min(1.6, targetPeak / peak) : 1;
  for (let i = 0; i < samples.length; i += 1) {
    samples[i] = Math.tanh(samples[i] * gain * 1.08) * 0.92;
  }
}

function encodeWav(samples) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
  }
  return buffer;
}

function midiToHz(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = Math.imul(state ^ (state >>> 15), 1 | state);
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}

function noiseUnit(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453123;
  return value - Math.floor(value);
}
