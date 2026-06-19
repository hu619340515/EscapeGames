import Phaser from "phaser";

export type GameKeyName = "w" | "a" | "s" | "d" | "j" | "k" | "l" | "q" | "e" | "v" | "n" | "b" | "esc" | "space";

export function createGameKeys(input: Phaser.Input.InputPlugin): Record<GameKeyName, Phaser.Input.Keyboard.Key> {
  const keyboard = input.keyboard;
  if (!keyboard) {
    throw new Error("Keyboard input is not available.");
  }

  return {
    w: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
    a: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
    s: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
    d: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    j: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J),
    k: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K),
    l: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L),
    q: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
    e: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
    v: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.V),
    n: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N),
    b: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B),
    esc: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
    space: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
  };
}
