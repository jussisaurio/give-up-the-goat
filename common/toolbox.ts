// It's not as bad if you don't call it helpers.ts or utils.ts

import { DealtCard } from "./game";

export const createGameCode = () =>
  Math.random().toString(36).slice(2, 8).toUpperCase();

export const getRandomElement = <T>(arr: T[]) =>
  arr[Math.floor(Math.random() * arr.length)];

export const formatCardColor = (c: DealtCard) => {
  if ("color" in c) return c.color;
  if ("colors" in c) return c.colors.join("/");
  if (c.type === "neutral") return "GREY";
  return "RAINBOW";
};
