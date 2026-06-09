import coverMusicUrl from "../../背景音乐/首页/首页背景音.wav";
import keyboardClickUrl from "../../背景音乐/首页/键盘点击2.wav";

export interface CoverMusicController {
  setActive(active: boolean): void;
  setKeyboardActive(active: boolean): void;
}

type WindowWithCoverMusicCleanup = Window & {
  __coverMusicCleanup?: () => void;
};

export function createCoverMusicController(): CoverMusicController {
  (window as WindowWithCoverMusicCleanup).__coverMusicCleanup?.();

  const audio = new Audio(coverMusicUrl);
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 0.5;

  const keyboardClick = new Audio(keyboardClickUrl);
  keyboardClick.preload = "auto";
  keyboardClick.volume = 0.035;
  const keyboardClickMs = 420;

  let shouldPlay = false;
  let shouldPlayKeyboard = false;
  let canPlayEffects = false;
  let keyboardClickTimer = 0;

  function playKeyboardClick(): void {
    keyboardClick.currentTime = 0;
    void keyboardClick.play().catch(() => {
      canPlayEffects = false;
      stopKeyboardClicks();
    });
  }

  function startKeyboardClicks(): void {
    if (keyboardClickTimer || !shouldPlay || !shouldPlayKeyboard || !canPlayEffects) {
      return;
    }

    playKeyboardClick();
    keyboardClickTimer = window.setInterval(playKeyboardClick, keyboardClickMs);
  }

  function stopKeyboardClicks(): void {
    window.clearInterval(keyboardClickTimer);
    keyboardClickTimer = 0;
    keyboardClick.pause();
    keyboardClick.currentTime = 0;
  }

  async function attemptPlay(): Promise<void> {
    if (!shouldPlay) {
      return;
    }

    try {
      await audio.play();
      canPlayEffects = true;
      startKeyboardClicks();
    } catch {
      // Browsers may block autoplay until the first user interaction.
    }
  }

  function handleInteraction(): void {
    void attemptPlay();
  }

  window.addEventListener("pointerdown", handleInteraction, { passive: true });
  window.addEventListener("keydown", handleInteraction);

  (window as WindowWithCoverMusicCleanup).__coverMusicCleanup = () => {
    shouldPlay = false;
    shouldPlayKeyboard = false;
    audio.pause();
    audio.currentTime = 0;
    stopKeyboardClicks();
    window.removeEventListener("pointerdown", handleInteraction);
    window.removeEventListener("keydown", handleInteraction);
  };

  return {
    setActive(active: boolean): void {
      if (shouldPlay === active) {
        return;
      }

      shouldPlay = active;

      if (shouldPlay) {
        void attemptPlay();
        return;
      }

      audio.pause();
      audio.currentTime = 0;
      stopKeyboardClicks();
    },
    setKeyboardActive(active: boolean): void {
      if (shouldPlayKeyboard === active) {
        return;
      }

      shouldPlayKeyboard = active;

      if (shouldPlayKeyboard) {
        startKeyboardClicks();
        return;
      }

      stopKeyboardClicks();
    },
  };
}
