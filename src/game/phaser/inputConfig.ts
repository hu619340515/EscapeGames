import Phaser from "phaser";

export type GameKeyName = "w" | "a" | "d" | "j" | "k" | "l" | "q" | "e" | "n" | "b" | "esc" | "space";

export function createGameKeys(input: Phaser.Input.InputPlugin): Record<GameKeyName, Phaser.Input.Keyboard.Key> {
  const keyboard = input.keyboard;
  if (!keyboard) {
    throw new Error("Keyboard input is not available.");
  }

  return {
    w: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
    a: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
    d: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    j: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J),
    k: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K),
    l: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L),
    q: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
    e: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
    n: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N),
    b: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B),
    esc: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
    space: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
  };
}
