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

const NICKNAME_REGEX = /^(\w|[0-9 äöå])+$/;

type NicknameValidationError = "EMPTY" | "TOO_SHORT" | "INVALID_CHARACTERS";
export type NicknameValidationResult =
  | { ok: true }
  | { ok: false; reason: NicknameValidationError };

export const validateNickname = (n: string): NicknameValidationResult => {
  if (n.length === 0) return { ok: false, reason: "EMPTY" };
  if (n.length < 3) return { ok: false, reason: "TOO_SHORT" };

  return NICKNAME_REGEX.test(n)
    ? { ok: true }
    : { ok: false, reason: "INVALID_CHARACTERS" };
};
