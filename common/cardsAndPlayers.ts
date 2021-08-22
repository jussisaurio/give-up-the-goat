export const PLAYER_COLORS = [
  "BLUE",
  "RED",
  "YELLOW",
  "GREEN",
  "ORANGE",
  "PURPLE"
] as const;

export type PlayerColor = typeof PLAYER_COLORS[number];

export type PlayerCount = 3 | 4 | 5 | 6;

export type CardRestriction =
  | { type: "MINIMUM"; playerCount: PlayerCount }
  | { type: "EXACT_SINGLE"; playerCount: PlayerCount }
  | { type: "EXACT_MANY"; playerCount: PlayerCount[] };

export type Card =
  | {
      type: "single";
      color: PlayerColor;
      restriction: CardRestriction;
    }
  | {
      type: "dual";
      colors: [PlayerColor, PlayerColor];
      restriction: CardRestriction;
    }
  | {
      type: "neutral";
      restriction: CardRestriction;
    }
  | {
      type: "joker";
      restriction: {
        type: "EXACT_SINGLE";
        playerCount: 6;
      };
    };

export const DECK: Card[] = [
  {
    type: "single",
    color: "BLUE",
    restriction: { type: "MINIMUM", playerCount: 3 }
  },
  {
    type: "single",
    color: "BLUE",
    restriction: { type: "MINIMUM", playerCount: 3 }
  },
  {
    type: "single",
    color: "BLUE",
    restriction: { type: "MINIMUM", playerCount: 3 }
  },
  {
    type: "single",
    color: "RED",
    restriction: { type: "MINIMUM", playerCount: 3 }
  },
  {
    type: "single",
    color: "RED",
    restriction: { type: "MINIMUM", playerCount: 3 }
  },
  {
    type: "single",
    color: "RED",
    restriction: { type: "MINIMUM", playerCount: 3 }
  },
  {
    type: "single",
    color: "YELLOW",
    restriction: { type: "MINIMUM", playerCount: 3 }
  },
  {
    type: "single",
    color: "YELLOW",
    restriction: { type: "MINIMUM", playerCount: 3 }
  },
  {
    type: "single",
    color: "YELLOW",
    restriction: { type: "MINIMUM", playerCount: 3 }
  },
  {
    type: "single",
    color: "GREEN",
    restriction: { type: "MINIMUM", playerCount: 4 }
  },
  {
    type: "single",
    color: "GREEN",
    restriction: { type: "MINIMUM", playerCount: 4 }
  },
  {
    type: "single",
    color: "GREEN",
    restriction: { type: "MINIMUM", playerCount: 4 }
  },
  {
    type: "single",
    color: "ORANGE",
    restriction: { type: "MINIMUM", playerCount: 5 }
  },
  {
    type: "single",
    color: "ORANGE",
    restriction: { type: "MINIMUM", playerCount: 5 }
  },
  {
    type: "single",
    color: "ORANGE",
    restriction: { type: "MINIMUM", playerCount: 5 }
  },
  {
    type: "single",
    color: "PURPLE",
    restriction: { type: "MINIMUM", playerCount: 6 }
  },
  {
    type: "single",
    color: "PURPLE",
    restriction: { type: "MINIMUM", playerCount: 6 }
  },
  {
    type: "single",
    color: "PURPLE",
    restriction: { type: "MINIMUM", playerCount: 6 }
  },
  {
    type: "dual",
    colors: ["BLUE", "RED"],
    restriction: { type: "MINIMUM", playerCount: 4 }
  },
  {
    type: "dual",
    colors: ["BLUE", "YELLOW"],
    restriction: { type: "MINIMUM", playerCount: 5 }
  },
  {
    type: "dual",
    colors: ["RED", "ORANGE"],
    restriction: { type: "EXACT_SINGLE", playerCount: 5 }
  },
  {
    type: "dual",
    colors: ["RED", "PURPLE"],
    restriction: { type: "EXACT_SINGLE", playerCount: 6 }
  },
  {
    type: "dual",
    colors: ["YELLOW", "GREEN"],
    restriction: { type: "MINIMUM", playerCount: 4 }
  },
  {
    type: "dual",
    colors: ["GREEN", "ORANGE"],
    restriction: { type: "MINIMUM", playerCount: 5 }
  },
  {
    type: "dual",
    colors: ["ORANGE", "PURPLE"],
    restriction: { type: "EXACT_SINGLE", playerCount: 6 }
  },
  { type: "neutral", restriction: { type: "EXACT_SINGLE", playerCount: 3 } },
  { type: "neutral", restriction: { type: "EXACT_MANY", playerCount: [3, 5] } },
  {
    type: "neutral",
    restriction: { type: "EXACT_MANY", playerCount: [3, 4, 5] }
  },
  { type: "neutral", restriction: { type: "EXACT_SINGLE", playerCount: 3 } },
  { type: "joker", restriction: { type: "EXACT_SINGLE", playerCount: 6 } }
];
