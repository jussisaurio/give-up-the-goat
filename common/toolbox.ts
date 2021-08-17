// It's not as bad if you don't call it helpers.ts or utils.ts

export const createGameCode = () =>
  Math.random().toString(36).slice(2, 8).toUpperCase();

export const getRandomElement = <T>(arr: T[]) =>
  arr[Math.floor(Math.random() * arr.length)];
