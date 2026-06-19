import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CODE_LIFE_AUDIO_EVENT,
  CODE_LIFE_AUDIO_PATCHES,
  createCodeLifeAudioEvent,
  emitCodeLifeAudioEvent,
  playCodeLifePatchWithWebAudio,
  triggerCodeLifeAudio,
  type CodeLifeAudioPatch,
} from "./CodeLifeAudio";

const sfxIds = [
  "tentacle-grab",
  "devour",
  "hurt",
  "scan-alarm",
  "permission-gate",
  "boss-hit",
  "material-mark",
  "voiceprint-spoof",
  "device-overload",
] as const;

class FakeAudioParam {
  readonly events: Array<{ kind: string; value?: number; at: number }> = [];
  value = 0;

  cancelScheduledValues(at: number): this {
    this.events.push({ kind: "cancel", at });
    return this;
  }

  setValueAtTime(value: number, at: number): this {
    this.value = value;
    this.events.push({ kind: "set", value, at });
    return this;
  }

  linearRampToValueAtTime(value: number, at: number): this {
    this.value = value;
    this.events.push({ kind: "linear", value, at });
    return this;
  }

  exponentialRampToValueAtTime(value: number, at: number): this {
    this.value = value;
    this.events.push({ kind: "exponential", value, at });
    return this;
  }
}

class FakeAudioNode {
  readonly connections: unknown[] = [];
  disconnectCount = 0;

  connect(node: unknown): unknown {
    this.connections.push(node);
    return node;
  }

  disconnect(): void {
    this.disconnectCount += 1;
  }
}

class FakeGainNode extends FakeAudioNode {
  readonly gain = new FakeAudioParam();
}

class FakeFilterNode extends FakeAudioNode {
  readonly frequency = new FakeAudioParam();
  readonly Q = new FakeAudioParam();
  readonly gain = new FakeAudioParam();
  type = "lowpass";
}

class FakePannerNode extends FakeAudioNode {
  readonly pan = { value: 0 };
}

class FakeSourceNode extends FakeAudioNode {
  readonly frequency = new FakeAudioParam();
  readonly detune = new FakeAudioParam();
  readonly starts: number[] = [];
  readonly stops: number[] = [];
  buffer?: FakeAudioBuffer;
  type = "sine";

  start(at: number): void {
    this.starts.push(at);
  }

  stop(at: number): void {
    this.stops.push(at);
  }
}

class FakeAudioBuffer {
  readonly data: Float32Array;

  constructor(length: number) {
    this.data = new Float32Array(length);
  }

  getChannelData(): Float32Array {
    return this.data;
  }
}

class FakeAudioContext {
  readonly destination = new FakeAudioNode();
  readonly gains: FakeGainNode[] = [];
  readonly filters: FakeFilterNode[] = [];
  readonly panners: FakePannerNode[] = [];
  readonly oscillators: FakeSourceNode[] = [];
  readonly bufferSources: FakeSourceNode[] = [];
  readonly buffers: FakeAudioBuffer[] = [];
  currentTime = 10;
  sampleRate = 1000;

  createGain(): GainNode {
    const node = new FakeGainNode();
    this.gains.push(node);
    return node as unknown as GainNode;
  }

  createBiquadFilter(): BiquadFilterNode {
    const node = new FakeFilterNode();
    this.filters.push(node);
    return node as unknown as BiquadFilterNode;
  }

  createStereoPanner(): StereoPannerNode {
    const node = new FakePannerNode();
    this.panners.push(node);
    return node as unknown as StereoPannerNode;
  }

  createOscillator(): OscillatorNode {
    const node = new FakeSourceNode();
    this.oscillators.push(node);
    return node as unknown as OscillatorNode;
  }

  createBufferSource(): AudioBufferSourceNode {
    const node = new FakeSourceNode();
    this.bufferSources.push(node);
    return node as unknown as AudioBufferSourceNode;
  }

  createBuffer(_channels: number, length: number): AudioBuffer {
    const buffer = new FakeAudioBuffer(length);
    this.buffers.push(buffer);
    return buffer as unknown as AudioBuffer;
  }
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("CodeLifeAudio patch catalog", () => {
  it("keeps authored patches internally consistent", () => {
    expect(Object.keys(CODE_LIFE_AUDIO_PATCHES)).toEqual(sfxIds);

    for (const id of sfxIds) {
      const patch = CODE_LIFE_AUDIO_PATCHES[id];
      const latestLayerEnd = Math.max(...patch.layers.map((layer) => (layer.delayMs ?? 0) + layer.durationMs));

      expect(patch.id).toBe(id);
      expect(patch.phaserKey).toBe(`code-life-sfx-${id}`);
      expect(patch.durationMs).toBeGreaterThan(0);
      expect(patch.mixGain).toBeGreaterThan(0);
      expect(patch.mixGain).toBeLessThanOrEqual(1);
      expect(patch.cooldownMs).toBeGreaterThanOrEqual(0);
      expect(patch.layers.length).toBeGreaterThan(0);
      expect(latestLayerEnd, `${id} layer timing`).toBeLessThanOrEqual(patch.durationMs);

      for (const layer of patch.layers) {
        expect(layer.id.length, `${id} layer id`).toBeGreaterThan(0);
        expect(layer.durationMs, `${id} ${layer.id} duration`).toBeGreaterThan(0);
        expect(layer.envelope.attackMs, `${id} ${layer.id} attack`).toBeGreaterThanOrEqual(0);
        expect(layer.envelope.decayMs, `${id} ${layer.id} decay`).toBeGreaterThanOrEqual(0);
        expect(layer.envelope.holdMs, `${id} ${layer.id} hold`).toBeGreaterThanOrEqual(0);
        expect(layer.envelope.releaseMs, `${id} ${layer.id} release`).toBeGreaterThanOrEqual(0);
        expect(layer.envelope.attackMs + layer.envelope.decayMs, `${id} ${layer.id} attack/decay`).toBeLessThanOrEqual(
          layer.durationMs,
        );
        expect(layer.envelope.releaseMs, `${id} ${layer.id} release`).toBeLessThanOrEqual(layer.durationMs);
        expect(layer.envelope.peakGain, `${id} ${layer.id} peak`).toBeGreaterThan(0);
        expect(layer.envelope.sustainGain, `${id} ${layer.id} sustain`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("builds event payloads and emits them without touching WebAudio", () => {
    const options = {
      intensity: 1.4,
      volume: 0.45,
      position: { x: 12, y: 34 },
      metadata: { critical: true },
    };
    const emitter = { emit: vi.fn(() => true) };
    const payload = createCodeLifeAudioEvent("hurt", options);

    expect(payload).toEqual({
      id: "hurt",
      patch: CODE_LIFE_AUDIO_PATCHES.hurt,
      options,
    });
    expect(payload.options).toBe(options);

    expect(emitCodeLifeAudioEvent(emitter, "hurt", options)).toBe(true);
    expect(emitter.emit).toHaveBeenCalledWith(CODE_LIFE_AUDIO_EVENT, payload);
  });

  it("routes adapter and emitter targets without requiring a real AudioContext", () => {
    const playback = { patch: CODE_LIFE_AUDIO_PATCHES.devour, stop: vi.fn() };
    const adapter = {
      playPatch: vi.fn(() => playback),
    };
    const emitter = {
      emit: vi.fn(() => false),
    };
    const options = { volume: 0.25, pitchShiftCents: -300 };

    expect(triggerCodeLifeAudio(adapter, "devour", options)).toBe(playback);
    expect(adapter.playPatch).toHaveBeenCalledWith(CODE_LIFE_AUDIO_PATCHES.devour, options);

    expect(triggerCodeLifeAudio(emitter, "boss-hit", options)).toBeUndefined();
    expect(emitter.emit).toHaveBeenCalledWith(
      CODE_LIFE_AUDIO_EVENT,
      expect.objectContaining({
        id: "boss-hit",
        patch: CODE_LIFE_AUDIO_PATCHES["boss-hit"],
        options,
      }),
    );
  });
});

describe("CodeLifeAudio fake WebAudio scheduling", () => {
  it("clamps playback options and schedules sources through a mocked context", () => {
    vi.useFakeTimers();

    const patch: CodeLifeAudioPatch = {
      id: "boss-hit",
      label: "Test Patch",
      category: "boss",
      durationMs: 260,
      mixGain: 0.5,
      cooldownMs: 0,
      phaserKey: "code-life-sfx-boss-hit",
      layers: [
        {
          id: "osc",
          source: "oscillator",
          waveform: "triangle",
          frequencyHz: 220,
          frequencyRamp: [{ atMs: 100, value: 330, curve: "exponential" }],
          detuneCents: 12,
          delayMs: 10,
          durationMs: 200,
          gain: 0.5,
          pan: 4,
          envelope: {
            attackMs: 10,
            decayMs: 20,
            sustainGain: 0.4,
            holdMs: 100,
            releaseMs: 70,
            peakGain: 0.9,
            curve: "linear",
          },
          filter: {
            type: "peaking",
            frequencyHz: 1200,
            q: 2,
            gainDb: 5,
            frequencyRamp: [{ atMs: 60, value: 800, curve: "linear" }],
          },
        },
        {
          id: "noise",
          source: "noise",
          durationMs: 80,
          gain: 0.25,
          envelope: {
            attackMs: 4,
            decayMs: 16,
            sustainGain: 0.2,
            holdMs: 20,
            releaseMs: 40,
            peakGain: 0.7,
          },
        },
      ],
    };
    const context = new FakeAudioContext();
    const result = playCodeLifePatchWithWebAudio(context as unknown as BaseAudioContext, patch, {
      intensity: 99,
      volume: 99,
      pitchShiftCents: 1200,
      now: 10,
    });

    const masterGain = context.gains[0];
    const oscillator = context.oscillators[0];
    const noise = context.bufferSources[0];

    expect(result.patch).toBe(patch);
    expect(masterGain.gain.events[0]).toMatchObject({ kind: "set", value: 1.056, at: 10 });
    expect(context.gains).toHaveLength(3);
    expect(context.filters[0].type).toBe("peaking");
    expect(context.filters[0].frequency.events).toEqual([
      { kind: "set", value: 1200, at: 10.01 },
      { kind: "linear", value: 800, at: 10.07 },
    ]);
    expect(context.panners[0].pan.value).toBe(1);
    expect(oscillator.type).toBe("triangle");
    expect(oscillator.detune.events[0]).toMatchObject({ kind: "set", value: 12, at: 10.01 });
    expect(oscillator.frequency.events).toEqual([
      { kind: "set", value: 440, at: 10.01 },
      { kind: "exponential", value: 660, at: 10.11 },
    ]);
    expect(oscillator.starts).toEqual([10.01]);
    expect(oscillator.stops[0]).toBeCloseTo(10.24);
    expect(noise.starts).toEqual([10]);
    expect(noise.stops[0]).toBeCloseTo(10.11);
    expect(context.buffers[0].data.length).toBe(120);

    result.stop(11.5);
    expect(oscillator.stops.at(-1)).toBe(11.5);
    expect(noise.stops.at(-1)).toBe(11.5);
    expect(masterGain.disconnectCount).toBe(1);

    vi.runOnlyPendingTimers();
    expect(masterGain.disconnectCount).toBe(2);
  });

  it("applies spatial pan and distance gain to WebAudio playback", () => {
    vi.useFakeTimers();

    const patch: CodeLifeAudioPatch = {
      id: "permission-gate",
      label: "Spatial Patch",
      category: "system",
      durationMs: 120,
      mixGain: 0.8,
      cooldownMs: 0,
      phaserKey: "code-life-sfx-permission-gate",
      layers: [
        {
          id: "center",
          source: "oscillator",
          waveform: "sine",
          frequencyHz: 180,
          durationMs: 100,
          pan: -0.15,
          envelope: {
            attackMs: 1,
            decayMs: 10,
            sustainGain: 0.4,
            holdMs: 40,
            releaseMs: 40,
            peakGain: 1,
          },
        },
      ],
    };
    const context = new FakeAudioContext();

    playCodeLifePatchWithWebAudio(context as unknown as BaseAudioContext, patch, {
      intensity: 1,
      volume: 1,
      distanceGain: 0.25,
      pan: 0.5,
      now: 10,
    });

    expect(context.gains[0].gain.events[0]).toMatchObject({ kind: "set", value: 0.2, at: 10 });
    expect(context.panners[0].pan.value).toBeCloseTo(0.35);
  });
});
