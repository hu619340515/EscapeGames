import type { CodeLifeHazardKind } from "./CodeLifeChapterConfig";

export type CodeLifeBossDeviceCue =
  | "roller-rip"
  | "lens-overload"
  | "voiceprint-desync"
  | "firmware-short"
  | "firewall-vent"
  | "sync-ground";

export interface CodeLifeDeviceBossInteraction {
  readonly damage: number;
  readonly force: number;
  readonly ignoresArmor: boolean;
  readonly cue?: CodeLifeBossDeviceCue;
  readonly note?: string;
}

const DEFAULT_BOSS_HAZARD_INTERACTION: CodeLifeDeviceBossInteraction = {
  damage: 22,
  force: 48,
  ignoresArmor: false,
};

const DEFAULT_MINION_HAZARD_INTERACTION: CodeLifeDeviceBossInteraction = {
  damage: 99,
  force: 190,
  ignoresArmor: true,
};

const DEVICE_WEAKNESS: Readonly<Record<string, Partial<Record<CodeLifeHazardKind, CodeLifeDeviceBossInteraction>>>> = {
  "print-queue-beast": {
    "printer-roller": {
      damage: 58,
      force: 190,
      ignoresArmor: false,
      cue: "roller-rip",
      note: "Printer roller hooks into the queue-beast shell. Armor window torn open.",
    },
    shredder: {
      damage: 34,
      force: 110,
      ignoresArmor: false,
      cue: "roller-rip",
    },
  },
  "lens-keeper": {
    "optic-burn": {
      damage: 40,
      force: 140,
      ignoresArmor: false,
      cue: "lens-overload",
      note: "Optic burn reflects through the lens-keeper. Its iris shell desyncs.",
    },
    "delete-scan": {
      damage: 30,
      force: 120,
      ignoresArmor: false,
      cue: "lens-overload",
    },
  },
  "wake-word-guard": {
    "audio-feedback": {
      damage: 44,
      force: 154,
      ignoresArmor: false,
      cue: "voiceprint-desync",
      note: "Feedback folds the wake-word guard into its own command buffer.",
    },
  },
  "firmware-burner": {
    "firmware-flash": {
      damage: 46,
      force: 160,
      ignoresArmor: false,
      cue: "firmware-short",
      note: "Firmware flash shorts the burner shield. Bite while the bootloader is open.",
    },
  },
  "firewall-heart": {
    "firewall-pulse": {
      damage: 44,
      force: 150,
      ignoresArmor: false,
      cue: "firewall-vent",
      note: "Firewall pulse opens the heart valves. Lash the orange vent while the armor is down.",
    },
    "delete-scan": {
      damage: 28,
      force: 104,
      ignoresArmor: false,
      cue: "firewall-vent",
    },
  },
  "sync-mother": {
    "sync-storm": {
      damage: 36,
      force: 130,
      ignoresArmor: false,
      cue: "sync-ground",
    },
  },
  "gateway-warden": {
    "permission-laser": {
      damage: 32,
      force: 118,
      ignoresArmor: false,
      cue: "sync-ground",
    },
  },
};

export function getCodeLifeDeviceBossInteraction(input: {
  readonly bossId?: string;
  readonly hazardKind?: CodeLifeHazardKind;
  readonly isBoss: boolean;
}): CodeLifeDeviceBossInteraction {
  if (!input.isBoss) {
    return DEFAULT_MINION_HAZARD_INTERACTION;
  }

  const specific = input.bossId && input.hazardKind ? DEVICE_WEAKNESS[input.bossId]?.[input.hazardKind] : undefined;
  return specific ?? DEFAULT_BOSS_HAZARD_INTERACTION;
}

export function getCodeLifeDeviceWeaknesses(
  bossId: string | undefined,
): readonly CodeLifeHazardKind[] {
  return bossId ? (Object.keys(DEVICE_WEAKNESS[bossId] ?? {}) as CodeLifeHazardKind[]) : [];
}

export function getCodeLifeDeviceCueColor(cue: CodeLifeBossDeviceCue | undefined): number {
  switch (cue) {
    case "roller-rip":
      return 0xfff06a;
    case "lens-overload":
      return 0x7affea;
    case "voiceprint-desync":
      return 0xe3a9ff;
    case "firmware-short":
      return 0x73ff8a;
    case "firewall-vent":
      return 0xff7a47;
    case "sync-ground":
      return 0x8ab4ff;
    default:
      return 0x7affea;
  }
}
