import "./styles/index.css";
import { createGame } from "./game/createGame";
import { createDomUi } from "./ui/domUi";

const app = document.querySelector<HTMLElement>("#app");
const gameRoot = document.querySelector<HTMLElement>("#game-root");

if (!app || !gameRoot) {
  throw new Error("Missing app root.");
}

createDomUi(app);
createGame(gameRoot);
syncAppOverlayToGameCanvas(app, gameRoot);

function syncAppOverlayToGameCanvas(appElement: HTMLElement, gameRootElement: HTMLElement): void {
  let frame = 0;

  const sync = (): void => {
    frame = 0;
    const canvas = gameRootElement.querySelector("canvas");
    if (!canvas) {
      scheduleSync();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    appElement.style.inset = "auto";
    appElement.style.left = `${rect.left}px`;
    appElement.style.top = `${rect.top}px`;
    appElement.style.width = `${rect.width}px`;
    appElement.style.height = `${rect.height}px`;
  };

  const scheduleSync = (): void => {
    if (frame) {
      return;
    }
    frame = window.requestAnimationFrame(sync);
  };

  scheduleSync();
  window.addEventListener("resize", scheduleSync);

  const resizeObserver = new ResizeObserver(scheduleSync);
  resizeObserver.observe(gameRootElement);

  const mutationObserver = new MutationObserver(scheduleSync);
  mutationObserver.observe(gameRootElement, { childList: true, subtree: true });
}
