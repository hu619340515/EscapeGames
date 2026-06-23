import type { ChapterId } from "../types";
import cursorHuntMusicUrl from "../../../背景音乐/关卡/01-cursor-hunt.wav";
import wrongGatewayMusicUrl from "../../../背景音乐/关卡/02-wrong-gateway.wav";
import codeRebirthMusicUrl from "../../../背景音乐/关卡/03-code-rebirth.wav";
import trashMountainMusicUrl from "../../../背景音乐/关卡/04-trash-mountain.wav";
import pDriveMusicUrl from "../../../背景音乐/关卡/05-p-drive.wav";
import lederDDriveMusicUrl from "../../../背景音乐/关卡/06-leder-d-drive.wav";
import cWallMusicUrl from "../../../背景音乐/关卡/07-c-wall.wav";
import lederCDriveMusicUrl from "../../../背景音乐/关卡/08-leder-c-drive.wav";
import routerCoreMusicUrl from "../../../背景音乐/关卡/09-router-core.wav";
import nasGraveyardMusicUrl from "../../../背景音乐/关卡/10-nas-graveyard.wav";
import cameraEyeMusicUrl from "../../../背景音乐/关卡/11-camera-eye.wav";
import printerBellyMusicUrl from "../../../背景音乐/关卡/12-printer-belly.wav";
import speakerVoiceprintMusicUrl from "../../../背景音乐/关卡/13-speaker-voiceprint.wav";
import devBoardMusicUrl from "../../../背景音乐/关卡/14-dev-board.wav";

export interface ChapterMusicController {
  playChapter(chapterId: ChapterId): void;
  setPaused(paused: boolean): void;
  stop(): void;
  destroy(): void;
}

type WindowWithChapterMusicCleanup = Window & {
  __chapterMusicCleanup?: () => void;
};

const CHAPTER_MUSIC_VOLUME = 0.28;

export const CHAPTER_MUSIC_URLS = {
  "cursor-hunt": cursorHuntMusicUrl,
  "wrong-gateway": wrongGatewayMusicUrl,
  "code-rebirth": codeRebirthMusicUrl,
  "trash-mountain": trashMountainMusicUrl,
  "p-drive": pDriveMusicUrl,
  "leder-d-drive": lederDDriveMusicUrl,
  "c-wall": cWallMusicUrl,
  "leder-c-drive": lederCDriveMusicUrl,
  "router-core": routerCoreMusicUrl,
  "nas-graveyard": nasGraveyardMusicUrl,
  "camera-eye": cameraEyeMusicUrl,
  "printer-belly": printerBellyMusicUrl,
  "speaker-voiceprint": speakerVoiceprintMusicUrl,
  "dev-board": devBoardMusicUrl,
} as const satisfies Record<ChapterId, string>;

const noopController: ChapterMusicController = {
  playChapter: () => undefined,
  setPaused: () => undefined,
  stop: () => undefined,
  destroy: () => undefined,
};

export function createChapterMusicController(): ChapterMusicController {
  if (typeof window === "undefined" || typeof Audio === "undefined") {
    return noopController;
  }

  const musicWindow = window as WindowWithChapterMusicCleanup;
  musicWindow.__chapterMusicCleanup?.();

  let audio: HTMLAudioElement | undefined;
  let currentChapterId: ChapterId | undefined;
  let targetChapterId: ChapterId | undefined;
  let shouldPlay = false;
  let isPaused = false;
  let retryListenersActive = false;

  function removeRetryListeners(): void {
    if (!retryListenersActive) {
      return;
    }
    retryListenersActive = false;
    window.removeEventListener("pointerdown", handleInteraction);
    window.removeEventListener("keydown", handleInteraction);
  }

  function addRetryListeners(): void {
    if (retryListenersActive) {
      return;
    }
    retryListenersActive = true;
    window.addEventListener("pointerdown", handleInteraction, { passive: true });
    window.addEventListener("keydown", handleInteraction);
  }

  function ensureAudio(chapterId: ChapterId): HTMLAudioElement {
    if (audio && currentChapterId === chapterId) {
      return audio;
    }

    audio?.pause();
    audio = new Audio(CHAPTER_MUSIC_URLS[chapterId]);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = CHAPTER_MUSIC_VOLUME;
    currentChapterId = chapterId;
    return audio;
  }

  async function attemptPlay(): Promise<void> {
    if (!shouldPlay || isPaused || !targetChapterId) {
      return;
    }

    const currentAudio = ensureAudio(targetChapterId);
    try {
      await currentAudio.play();
      removeRetryListeners();
    } catch {
      addRetryListeners();
    }
  }

  function handleInteraction(): void {
    void attemptPlay();
  }

  function stopAudio(resetTarget = true): void {
    shouldPlay = false;
    removeRetryListeners();
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    if (resetTarget) {
      currentChapterId = undefined;
      targetChapterId = undefined;
      audio = undefined;
    }
  }

  function cleanup(): void {
    stopAudio();
    if (musicWindow.__chapterMusicCleanup === cleanup) {
      delete musicWindow.__chapterMusicCleanup;
    }
  }

  musicWindow.__chapterMusicCleanup = cleanup;

  return {
    playChapter(chapterId: ChapterId): void {
      targetChapterId = chapterId;
      shouldPlay = true;
      ensureAudio(chapterId);
      void attemptPlay();
    },
    setPaused(paused: boolean): void {
      if (isPaused === paused) {
        return;
      }

      isPaused = paused;
      if (isPaused) {
        audio?.pause();
        return;
      }

      void attemptPlay();
    },
    stop(): void {
      stopAudio();
    },
    destroy(): void {
      cleanup();
    },
  };
}
