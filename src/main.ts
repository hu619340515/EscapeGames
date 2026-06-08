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
