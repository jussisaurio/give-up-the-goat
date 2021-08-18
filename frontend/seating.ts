// The game always has 6 seats, and the player is always in the bottom seat.
// Fill or leave blank the other 5 seats conditionally,
// starting from the left of the player.

import { PlayerCount } from "../common/game";

type SeatingDesignation = "EMPTY" | number;

export const SEATING_BY_PLAYER_COUNT: Record<
  PlayerCount,
  SeatingDesignation[]
> = {
  3: ["EMPTY", 0, "EMPTY", 1, "EMPTY"],
  4: ["EMPTY", 0, 1, 2, "EMPTY"],
  5: [0, 1, 2, 3, "EMPTY"],
  6: [0, 1, 2, 3, 4]
};

export const getSeatingDesignation = (n: PlayerCount) =>
  SEATING_BY_PLAYER_COUNT[n];
