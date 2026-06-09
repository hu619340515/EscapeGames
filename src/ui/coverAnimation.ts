interface CoverAnimation {
  destroy(): void;
  setActive(active: boolean): void;
}

interface PercentPoint {
  x: number;
  y: number;
}

interface RackLight extends PercentPoint {
  color: "green" | "yellow" | "red";
  delay: number;
  duration: number;
  size: number;
}

interface PanelIndicator extends PercentPoint {
  mode: "black-blink" | "red-green";
  delay: number;
  duration: number;
  size: number;
}

const rackLights: RackLight[] = [
  { x: 38.3, y: 35.9, color: "red", delay: 0.0, duration: 2.1, size: 0.36 },
  { x: 40.1, y: 38.3, color: "red", delay: 0.5, duration: 3.0, size: 0.32 },
  { x: 43.9, y: 42.2, color: "red", delay: 0.9, duration: 2.5, size: 0.34 },
  { x: 40.4, y: 59.2, color: "red", delay: 1.1, duration: 2.7, size: 0.32 },
  { x: 44.1, y: 58.3, color: "red", delay: 1.7, duration: 3.2, size: 0.28 },
  { x: 38.6, y: 65.8, color: "green", delay: 0.8, duration: 2.8, size: 0.26 },
  { x: 42.9, y: 68.5, color: "red", delay: 1.4, duration: 3.8, size: 0.3 },
  { x: 39.7, y: 74.4, color: "yellow", delay: 2.0, duration: 3.1, size: 0.28 },
];

const panelIndicators: PanelIndicator[] = [
  { x: 26.25, y: 75.41, mode: "red-green", delay: 0.2, duration: 1.65, size: 0.36 },
  { x: 26.25, y: 76.44, mode: "black-blink", delay: 0.55, duration: 1.45, size: 0.42 },
  { x: 26.24, y: 77.34, mode: "black-blink", delay: 0.95, duration: 1.8, size: 0.42 },
  { x: 26.23, y: 78.15, mode: "black-blink", delay: 1.25, duration: 1.55, size: 0.42 },
];

export function createCoverAnimation(stage: HTMLElement): CoverAnimation {
  const rackLightLayerElement = stage.querySelector<HTMLElement>('[data-ref="rackLightLayer"]');

  if (!rackLightLayerElement) {
    return {
      destroy: () => undefined,
      setActive: () => undefined,
    };
  }

  const rackLightLayer = rackLightLayerElement;

  const rackLightElements = rackLights.map((light) => {
    const bulb = document.createElement("span");
    bulb.className = `rack-light rack-light--${light.color}`;
    bulb.style.setProperty("--x", `${light.x}%`);
    bulb.style.setProperty("--y", `${light.y}%`);
    bulb.style.setProperty("--size", `${light.size}%`);
    bulb.style.setProperty("--delay", `${light.delay}s`);
    bulb.style.setProperty("--duration", `${light.duration}s`);
    return bulb;
  });

  const panelIndicatorElements = panelIndicators.flatMap((indicator) => {
    const base = document.createElement("span");
    base.className = "panel-indicator panel-indicator--black";
    base.style.setProperty("--x", `${indicator.x}%`);
    base.style.setProperty("--y", `${indicator.y}%`);
    base.style.setProperty("--size", `${indicator.size}%`);

    if (indicator.mode === "red-green") {
      const bulb = document.createElement("span");
      bulb.className = "panel-indicator panel-indicator--red-green";
      bulb.style.setProperty("--x", `${indicator.x}%`);
      bulb.style.setProperty("--y", `${indicator.y}%`);
      bulb.style.setProperty("--size", `${indicator.size * 0.72}%`);
      bulb.style.setProperty("--delay", `${indicator.delay}s`);
      bulb.style.setProperty("--duration", `${indicator.duration}s`);
      return [base, bulb];
    }

    base.classList.add("panel-indicator--black-blink");
    base.style.setProperty("--delay", `${indicator.delay}s`);
    base.style.setProperty("--duration", `${indicator.duration}s`);
    return [base];
  });

  rackLightLayer.replaceChildren(...rackLightElements, ...panelIndicatorElements);

  return {
    destroy(): void {
      rackLightLayer.replaceChildren();
    },
    setActive(active: boolean): void {
      stage.dataset.coverActive = String(active);
    },
  };
}
