import coverMusicUrl from "../../背景音乐/首页/首页背景音.wav";
import keyboardClickUrl from "../../背景音乐/首页/键盘点击.wav";

export interface CoverMusicController {
  setActive(active: boolean): void;
  setKeyboardActive(active: boolean): void;
}

export function createCoverMusicController(): CoverMusicController {
  const audio = new Audio(coverMusicUrl);
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 0.5;

  const keyboardClicks = Array.from({ length: 4 }, () => {
    const click = new Audio(keyboardClickUrl);
    click.preload = "auto";
    click.volume = 0.14;
    return click;
  });
  const keyboardClickMs = 420;

  let shouldPlay = false;
  let shouldPlayKeyboard = false;
  let canPlayEffects = false;
  let keyboardClickTimer = 0;
  let keyboardClickIndex = 0;

  function playKeyboardClick(): void {
    const click = keyboardClicks[keyboardClickIndex];
    keyboardClickIndex = (keyboardClickIndex + 1) % keyboardClicks.length;
    click.currentTime = 0;
    void click.play().catch(() => {
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
    keyboardClicks.forEach((click) => {
      click.pause();
      click.currentTime = 0;
    });
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
