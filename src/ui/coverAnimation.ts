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

const rackLights: RackLight[] = [
  { x: 38.3, y: 35.9, color: "red", delay: 0.0, duration: 2.1, size: 0.36 },
  { x: 40.1, y: 38.3, color: "red", delay: 0.5, duration: 3.0, size: 0.32 },
  { x: 43.9, y: 42.2, color: "red", delay: 0.9, duration: 2.5, size: 0.34 },
  { x: 37.2, y: 58.4, color: "yellow", delay: 0.2, duration: 3.4, size: 0.3 },
  { x: 40.4, y: 59.2, color: "red", delay: 1.1, duration: 2.7, size: 0.32 },
  { x: 44.1, y: 58.3, color: "red", delay: 1.7, duration: 3.2, size: 0.28 },
  { x: 38.6, y: 65.8, color: "green", delay: 0.8, duration: 2.8, size: 0.26 },
  { x: 42.9, y: 68.5, color: "red", delay: 1.4, duration: 3.8, size: 0.3 },
  { x: 39.7, y: 74.4, color: "yellow", delay: 2.0, duration: 3.1, size: 0.28 },
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

  rackLightLayer.replaceChildren(
    ...rackLights.map((light) => {
      const bulb = document.createElement("span");
      bulb.className = `rack-light rack-light--${light.color}`;
      bulb.style.setProperty("--x", `${light.x}%`);
      bulb.style.setProperty("--y", `${light.y}%`);
      bulb.style.setProperty("--size", `${light.size}%`);
      bulb.style.setProperty("--delay", `${light.delay}s`);
      bulb.style.setProperty("--duration", `${light.duration}s`);
      return bulb;
    }),
  );

  return {
    destroy(): void {
      rackLightLayer.replaceChildren();
    },
    setActive(active: boolean): void {
      stage.dataset.coverActive = String(active);
    },
  };
}
