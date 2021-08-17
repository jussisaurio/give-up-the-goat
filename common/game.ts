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

export type DealtCard = Card & { id: string };

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
  }, // ok
  {
    type: "dual",
    colors: ["BLUE", "YELLOW"],
    restriction: { type: "MINIMUM", playerCount: 5 }
  }, // ok
  {
    type: "dual",
    colors: ["RED", "ORANGE"],
    restriction: { type: "EXACT_SINGLE", playerCount: 5 }
  }, // ok
  {
    type: "dual",
    colors: ["RED", "PURPLE"],
    restriction: { type: "EXACT_SINGLE", playerCount: 6 }
  }, // ok
  {
    type: "dual",
    colors: ["YELLOW", "GREEN"],
    restriction: { type: "MINIMUM", playerCount: 4 }
  }, // ok
  {
    type: "dual",
    colors: ["GREEN", "ORANGE"],
    restriction: { type: "MINIMUM", playerCount: 5 }
  }, // ok
  {
    type: "dual",
    colors: ["ORANGE", "PURPLE"],
    restriction: { type: "EXACT_SINGLE", playerCount: 6 }
  }, // ok
  { type: "neutral", restriction: { type: "EXACT_SINGLE", playerCount: 3 } },
  { type: "neutral", restriction: { type: "EXACT_MANY", playerCount: [3, 5] } },
  {
    type: "neutral",
    restriction: { type: "EXACT_MANY", playerCount: [3, 4, 5] }
  },
  { type: "neutral", restriction: { type: "EXACT_SINGLE", playerCount: 3 } },
  { type: "joker", restriction: { type: "EXACT_SINGLE", playerCount: 6 } }
];

export type GameAction =
  | {
      action: "GO_TO_LOCATION";
      location: LocationName;
    }
  | {
      action: "TRADE_WITH_PLAYER";
      playerColor: PlayerColor;
    }
  | {
      action: "TRADE_CHOOSE_CARD";
      playerCardIndex: number;
    }
  | {
      action: "SPY_ON_PLAYER";
      playerColor: PlayerColor;
    }
  | {
      action: "SPY_ON_PLAYER_CONFIRM";
    }
  | {
      action: "STASH_CHOOSE_CARD";
      stashCardIndex: number;
    }
  | {
      action: "STASH_RETURN_CARD";
      playerCardIndex: number;
    }
  | {
      action: "SWAP_EVIDENCE";
      playerCardIndex: number;
    }
  | {
      action: "FRAME_CHOOSE_CARD";
      playerCardIndex: number;
    }
  | {
      action: "STEAL_CHOOSE_PLAYER";
      playerColor: PlayerColor;
    };

export const EARLY_GAME_LOCATION_NAMES = [
  "PREPARE",
  "TRADE",
  "SPY",
  "STASH",
  "COPS"
] as const;
export const LATE_GAME_LOCATION_NAMES = [
  "FRAME/STEAL",
  "TRADE",
  "SPY",
  "STASH",
  "COPS"
] as const;

export type EarlyGameLocationName = typeof EARLY_GAME_LOCATION_NAMES[number];
export type LateGameLocationName = typeof LATE_GAME_LOCATION_NAMES[number];
export type LocationName = EarlyGameLocationName | LateGameLocationName;

// human player, not tied to specific game
export type PlayerInfo = {
  id: string;
  nickname: string;
};

// tied to specific game
export type InitialGoatPlayer = {
  playerInfo: PlayerInfo;
  color: PlayerColor;
  suspect: PlayerColor;
  preparationTokens: number;
};

export type DealtInGoatPlayer = InitialGoatPlayer & {
  cards: DealtCard[];
};

export type GoatPlayer = DealtInGoatPlayer & {
  location: LocationName;
};

export type LocationArea =
  | {
      name: "PREPARE" | "FRAME/STEAL" | "SPY" | "TRADE";
      userFacingName: string;
      card: DealtCard;
    }
  | {
      name: "STASH";
      userFacingName: "Stash";
      card: DealtCard;
      stash: DealtCard[];
    }
  | {
      name: "COPS";
      userFacingName: "Go to the Cops";
    };

export type SubState =
  | {
      state: "AWAITING_MAIN_PLAYER_CHOOSE_LOCATION";
    }
  | {
      state: "AWAITING_TRADE_CHOOSE_PLAYER";
    }
  | {
      state: "AWAITING_TRADE_CHOOSE_CARDS";
      otherPlayerId: string;
      mainPlayerCardIndex: number | null;
      otherPlayerCardIndex: number | null;
    }
  | {
      state: "AWAITING_SPY_CHOOSE_PLAYER";
    }
  | {
      state: "AWAITING_SPY_CONFIRM";
      otherPlayerId: string;
    }
  | {
      state: "AWAITING_STASH_CHOOSE_CARD";
    }
  | {
      state: "AWAITING_STASH_RETURN_CARD";
      stashCardIndex: number;
    }
  | {
      state: "AWAITING_EVIDENCE_SWAP";
      location: Omit<LocationName, "COPS">;
    }
  | {
      state: "AWAITING_FRAME_CHOOSE_CARDS";
      cards: { playerId: string; playerCardIndex: number }[];
    }
  | {
      state: "AWAITING_STEAL_CHOOSE_PLAYER";
    };

type StartedGame = {
  substate: SubState;
  id: string;
  activePlayer: number;
  players: GoatPlayer[];
  scapegoat: PlayerColor;
  preparationTokens: 0 | 1 | 2;
  locations: LocationArea[];
  playerInfos: PlayerInfo[];
  events: string[];
};

export type Game =
  | (StartedGame & {
      state: "ONGOING";
    })
  | (StartedGame & {
      state: "PAUSED_FOR_FRAME_CHECK";
      frameCards: { playerId: string; playerCardIndex: number }[];
    })
  | (StartedGame & {
      state: "PAUSED_FOR_COPS_CHECK";
    })
  | (StartedGame & { state: "FINISHED"; winnerPlayerIds: string[] })
  | {
      state: "WAITING_FOR_PLAYERS";
      id: string;
      playerInfos: PlayerInfo[];
    };

export const getRandomElement = <T>(arr: T[]) =>
  arr[Math.floor(Math.random() * arr.length)];

export const createInitialPlayers = (
  playerInfos: PlayerInfo[],
  playerColors: PlayerColor[],
  scapegoat: PlayerColor
): InitialGoatPlayer[] => {
  return playerColors.map((color, i) => {
    const playerInfo = playerInfos[i];
    return {
      playerInfo,
      color,
      suspect:
        color === scapegoat
          ? getRandomElement(playerColors.filter((c) => c !== scapegoat))
          : scapegoat,
      preparationTokens: 0
    };
  });
};

export const dealInitialHands = (
  deck: DealtCard[],
  initialPlayers: InitialGoatPlayer[]
): DealtInGoatPlayer[] => {
  const handSize = deck.length / initialPlayers.length;

  const dealtInPlayers = initialPlayers.map((pl, i) => ({
    ...pl,
    cards: deck.slice(i * handSize, i * handSize + handSize)
  }));

  return dealtInPlayers;
};

export const shuffle = <T>(arr: T[]) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const createLocations = (
  deck: DealtCard[]
): [DealtCard[], LocationArea[]] => {
  const [
    prepare,
    trade,
    spy,
    stashPublic,
    stashHidden1,
    stashHidden2,
    stashHidden3,
    ...rest
  ] = deck;

  return [
    rest,
    [
      {
        name: "PREPARE",
        userFacingName: "Prepare to Frame",
        card: prepare
      },
      {
        name: "TRADE",
        userFacingName: "Trade",
        card: trade
      },
      {
        name: "SPY",
        userFacingName: "Spy",
        card: spy
      },
      {
        name: "STASH",
        userFacingName: "Stash",
        card: stashPublic,
        stash: [stashHidden1, stashHidden2, stashHidden3]
      },
      {
        name: "COPS",
        userFacingName: "Go to the Cops"
      }
    ]
  ];
};

export const placePlayersInLocations = (
  players: DealtInGoatPlayer[],
  locations: LocationArea[]
): GoatPlayer[] => {
  let currLoc = 0;
  return players.map((pl) => ({
    ...pl,
    location: locations[currLoc++ % locations.length].name
  }));
};

export const createGame = (): Game => {
  return {
    state: "WAITING_FOR_PLAYERS",
    id: Math.random().toString(36).slice(2),
    playerInfos: []
  };
};

export const activateGame = (game: Game): Game => {
  if (game.state !== "WAITING_FOR_PLAYERS") {
    throw Error(
      `Cannot activate game ${game.id} when its state is ${game.state}`
    );
  }

  const unverifiedPlayerCount = game.playerInfos.length;

  if (unverifiedPlayerCount < 3 || unverifiedPlayerCount > 6) {
    throw Error("Invalid number of players");
  }

  shuffle(game.playerInfos);

  const playerCount = unverifiedPlayerCount as PlayerCount;

  const deck = shuffle(
    DECK.filter(({ restriction }) => {
      if (restriction.type === "MINIMUM") {
        return playerCount >= restriction.playerCount;
      } else if (restriction.type === "EXACT_SINGLE") {
        return playerCount === restriction.playerCount;
      } else {
        return restriction.playerCount.includes(playerCount);
      }
    })
  ).map((c) => ({ ...c, id: Math.random().toString(36).slice(2) }));

  const playerColors = shuffle(PLAYER_COLORS.slice(0, playerCount));

  const scapegoat = getRandomElement(playerColors);

  const initialPlayers = createInitialPlayers(
    game.playerInfos,
    playerColors,
    scapegoat
  );

  const [deckAfterPublicDeal, locations] = createLocations(deck);

  const dealtInPlayers = dealInitialHands(deckAfterPublicDeal, initialPlayers);

  const finalPlayers = placePlayersInLocations(
    dealtInPlayers,
    locations.filter((l) => l.name !== "COPS")
  );

  return {
    ...game,
    state: "ONGOING",
    substate: { state: "AWAITING_MAIN_PLAYER_CHOOSE_LOCATION" },
    activePlayer: 0,
    players: finalPlayers,
    locations,
    preparationTokens: 2,
    scapegoat,
    events: []
  };
};

export const playTurn = (
  game: Game,
  playerId: string,
  action: GameAction
): [boolean, Game] => {
  if (game.state !== "ONGOING") {
    throw Error(
      `Cannot play turn in ${game.id} when its state is ${game.state}`
    );
  }

  const activePlayer = game.players.find((p, i) => game.activePlayer === i)!;

  if (activePlayer.playerInfo.id !== playerId) {
    const isValidTradeParticipant =
      game.substate.state === "AWAITING_TRADE_CHOOSE_CARDS" &&
      game.substate.otherPlayerId === playerId &&
      game.substate.otherPlayerCardIndex === null;

    const isValidFrameParticipant =
      game.substate.state === "AWAITING_FRAME_CHOOSE_CARDS";

    if (!isValidTradeParticipant && !isValidFrameParticipant) {
      console.error("Invalid action by " + playerId);
      console.error(JSON.stringify(action, null, 2));
      console.error(JSON.stringify(game, null, 2));
      return [false, game];
    }
  }

  // MOVE TO LOCATION
  if (action.action === "GO_TO_LOCATION") {
    if (game.substate.state !== "AWAITING_MAIN_PLAYER_CHOOSE_LOCATION") {
      console.error("Invalid action by " + playerId);
      console.error(JSON.stringify(action, null, 2));
      console.error(JSON.stringify(game, null, 2));
      return [false, game];
    }

    switch (action.location) {
      case "COPS": {
        return [
          true,
          {
            ...game,
            events: [
              ...game.events,
              `Player ${activePlayer.playerInfo.nickname} has called the cops!`
            ],
            state: "PAUSED_FOR_COPS_CHECK"
          }
        ];
      }
      case "FRAME/STEAL": {
        if (game.preparationTokens > 0) {
          console.error(
            "Invalid FRAME/STEAL action by " +
              playerId +
              ", there are still preparation tokens on table"
          );
          console.error(JSON.stringify(action, null, 2));
          console.error(JSON.stringify(game, null, 2));
          return [false, game];
        }

        if (activePlayer.preparationTokens > 0) {
          return [
            true,
            {
              ...game,
              events: [
                ...game.events,
                `Player ${activePlayer.playerInfo.nickname} has initiated a frame attempt!`
              ],
              players: game.players.map((p) => {
                if (p !== activePlayer) return p;
                return {
                  ...p,
                  location: "FRAME/STEAL"
                };
              }),
              substate: { state: "AWAITING_FRAME_CHOOSE_CARDS", cards: [] }
            }
          ];
        } else {
          return [
            true,
            {
              ...game,
              events: [
                ...game.events,
                `Player ${activePlayer.playerInfo.nickname} is picking a player to steal a preparation token from`
              ],
              players: game.players.map((p) => {
                if (p !== activePlayer) return p;
                return {
                  ...p,
                  location: "FRAME/STEAL"
                };
              }),
              substate: { state: "AWAITING_STEAL_CHOOSE_PLAYER" }
            }
          ];
        }
      }
      case "PREPARE": {
        if (game.preparationTokens === 0) {
          console.error("Invalid action by " + playerId);
          console.error(JSON.stringify(action, null, 2));
          console.error(JSON.stringify(game, null, 2));
          return [false, game];
        } else if (game.preparationTokens === 1) {
          return [
            true,
            {
              ...game,
              events: [
                ...game.events,
                `Player ${activePlayer.playerInfo.nickname} has taken the second preparation token. Framing/stealing is now possible.`
              ],
              substate: {
                state: "AWAITING_EVIDENCE_SWAP",
                location: "FRAME/STEAL"
              },
              preparationTokens: 0,
              locations: game.locations.map((l) => {
                if (l.name !== "PREPARE") return l;
                return {
                  name: "FRAME/STEAL",
                  userFacingName: "Frame / Steal",
                  card: l.card
                };
              }),
              players: game.players.map((p) => {
                if (p !== activePlayer && p.location !== "PREPARE") return p;
                return {
                  ...p,
                  location: "FRAME/STEAL",
                  preparationTokens:
                    p === activePlayer
                      ? p.preparationTokens + 1
                      : p.preparationTokens
                };
              })
            }
          ];
        } else if (game.preparationTokens === 2) {
          return [
            true,
            {
              ...game,
              events: [
                ...game.events,
                `Player ${activePlayer.playerInfo.nickname} has taken the first preparation token`
              ],
              substate: {
                state: "AWAITING_EVIDENCE_SWAP",
                location: "PREPARE"
              },
              preparationTokens: 1,
              players: game.players.map((p) => {
                if (p.playerInfo.id !== playerId) return p;
                return {
                  ...p,
                  location: "PREPARE",
                  preparationTokens: p.preparationTokens + 1
                };
              })
            }
          ];
        }
      }
      case "SPY": {
        return [
          true,
          {
            ...game,
            events: [
              ...game.events,
              `Player ${activePlayer.playerInfo.nickname} is choosing a player to spy on`
            ],
            players: game.players.map((p) => {
              if (p.playerInfo.id !== playerId) return p;
              return {
                ...p,
                location: "SPY"
              };
            }),
            substate: { state: "AWAITING_SPY_CHOOSE_PLAYER" }
          }
        ];
      }
      case "STASH": {
        return [
          true,
          {
            ...game,
            events: [
              ...game.events,
              `Player ${activePlayer.playerInfo.nickname} is looking at the stash`
            ],
            players: game.players.map((p) => {
              if (p.playerInfo.id !== playerId) return p;
              return {
                ...p,
                location: "STASH"
              };
            }),
            substate: { state: "AWAITING_STASH_CHOOSE_CARD" }
          }
        ];
      }
      case "TRADE": {
        return [
          true,
          {
            ...game,
            events: [
              ...game.events,
              `Player ${activePlayer.playerInfo.nickname} is choosing a player to trade with`
            ],
            players: game.players.map((p) => {
              if (p.playerInfo.id !== playerId) return p;
              return {
                ...p,
                location: "TRADE"
              };
            }),
            substate: { state: "AWAITING_TRADE_CHOOSE_PLAYER" }
          }
        ];
      }
      default:
        return [false, game];
    }
  }

  // CHOOSE PLAYER TO TRADE WITH
  if (action.action === "TRADE_WITH_PLAYER") {
    const otherPlayer = game.players.find(
      (p) => p.playerInfo.id !== playerId && p.color === action.playerColor
    );
    if (
      !otherPlayer ||
      game.substate.state !== "AWAITING_TRADE_CHOOSE_PLAYER"
    ) {
      console.error("Invalid action by " + playerId);
      console.error(JSON.stringify(action, null, 2));
      console.error(JSON.stringify(game, null, 2));
      return [false, game];
    }

    return [
      true,
      {
        ...game,
        events: [
          ...game.events,
          `Player ${activePlayer.playerInfo.nickname} will trade cards with ${otherPlayer.playerInfo.nickname}`
        ],
        substate: {
          state: "AWAITING_TRADE_CHOOSE_CARDS",
          otherPlayerId: otherPlayer.playerInfo.id,
          mainPlayerCardIndex: null,
          otherPlayerCardIndex: null
        }
      }
    ];
  }

  // CHOOSE CARD TO TRADE -- requires two different players to perform the same action to move on
  if (action.action === "TRADE_CHOOSE_CARD") {
    if (game.substate.state !== "AWAITING_TRADE_CHOOSE_CARDS") {
      console.error(
        "Invalid action by " +
          playerId +
          ", not in AWAITING_TRADE_CHOOSE_CARDS state"
      );
      console.error(JSON.stringify(action, null, 2));
      console.error(JSON.stringify(game, null, 2));
      return [false, game];
    }

    const { otherPlayerId } = game.substate;

    const player = game.players.find((p) => p.playerInfo.id === playerId);
    const activePlayer = game.players.find((p, i) => game.activePlayer === i)!;
    const otherPlayer = game.players.find(
      (p, i) => p.playerInfo.id === otherPlayerId
    )!;

    if (!player || (player !== activePlayer && player !== otherPlayer)) {
      console.error(
        "Invalid action by " +
          playerId +
          ", player is not either of involved parties"
      );
      console.error(JSON.stringify(action, null, 2));
      console.error(JSON.stringify(game, null, 2));
      return [false, game];
    }

    const isActivePlayer = player === activePlayer;

    if (
      (isActivePlayer && game.substate.mainPlayerCardIndex !== null) ||
      (!isActivePlayer && game.substate.otherPlayerCardIndex !== null)
    ) {
      console.error(
        "Invalid action by " + playerId + ", has already chosen card"
      );
      console.error(JSON.stringify(action, null, 2));
      console.error(JSON.stringify(game, null, 2));
      return [false, game];
    }

    const chosenCardIndex = (
      isActivePlayer ? activePlayer : otherPlayer
    ).cards.findIndex((c, i) => i === action.playerCardIndex);

    if (chosenCardIndex === -1) {
      console.error(
        "Invalid action by " + playerId + ", chosen card not found"
      );
      console.error(JSON.stringify(action, null, 2));
      console.error(JSON.stringify(game, null, 2));
      return [false, game];
    }

    const activePlayerIndex = isActivePlayer
      ? chosenCardIndex
      : game.substate.mainPlayerCardIndex;
    const otherPlayerIndex = !isActivePlayer
      ? chosenCardIndex
      : game.substate.otherPlayerCardIndex;

    if (activePlayerIndex === null || otherPlayerIndex === null) {
      return [
        true,
        {
          ...game,
          substate: {
            ...game.substate,
            mainPlayerCardIndex: activePlayerIndex,
            otherPlayerCardIndex: otherPlayerIndex
          }
        }
      ];
    }

    const activePlayerCard = activePlayer.cards.find(
      (c, i) => i === activePlayerIndex
    )!;
    const otherPlayerCard = otherPlayer.cards.find(
      (c, i) => i === otherPlayerIndex
    )!;

    return [
      true,
      {
        ...game,
        substate: { state: "AWAITING_EVIDENCE_SWAP", location: "TRADE" },
        players: game.players.map((p) => {
          if (p === activePlayer) {
            return {
              ...p,
              cards: [
                ...p.cards.slice(0, activePlayerIndex),
                otherPlayerCard,
                ...p.cards.slice(activePlayerIndex + 1)
              ]
            };
          } else if (p === otherPlayer) {
            return {
              ...p,
              cards: [
                ...p.cards.slice(0, otherPlayerIndex),
                activePlayerCard,
                ...p.cards.slice(otherPlayerIndex + 1)
              ]
            };
          }

          return p;
        })
      }
    ];
  }

  // CHOOSE PLAYER TO SPY ON
  if (action.action === "SPY_ON_PLAYER") {
    if (game.substate.state !== "AWAITING_SPY_CHOOSE_PLAYER") {
      console.error("Invalid action by " + playerId);
      console.error(JSON.stringify(action, null, 2));
      console.error(JSON.stringify(game, null, 2));
      return [false, game];
    }

    const otherPlayer = game.players.find(
      (p) => p.playerInfo.id !== playerId && p.color === action.playerColor
    );
    if (!otherPlayer) {
      console.error("Invalid action by " + playerId);
      console.error(JSON.stringify(action, null, 2));
      console.error(JSON.stringify(game, null, 2));
      return [false, game];
    }

    return [
      true,
      {
        ...game,
        events: [
          ...game.events,
          `Player ${activePlayer.playerInfo.nickname} is looking at ${otherPlayer.playerInfo.nickname}'s hand`
        ],
        substate: {
          state: "AWAITING_SPY_CONFIRM",
          otherPlayerId: otherPlayer.playerInfo.id
        }
      }
    ];
  }

  // CHOOSE PLAYER TO SPY ON
  if (action.action === "SPY_ON_PLAYER_CONFIRM") {
    if (game.substate.state !== "AWAITING_SPY_CONFIRM") {
      console.error("Invalid action by " + playerId);
      console.error(JSON.stringify(action, null, 2));
      console.error(JSON.stringify(game, null, 2));
      return [false, game];
    }
    return [
      true,
      {
        ...game,
        substate: { state: "AWAITING_EVIDENCE_SWAP", location: "SPY" }
      }
    ];
  }

  if (action.action === "STASH_CHOOSE_CARD") {
    if (game.substate.state !== "AWAITING_STASH_CHOOSE_CARD") {
      console.error("Invalid action by " + playerId);
      console.error(JSON.stringify(action, null, 2));
      console.error(JSON.stringify(game, null, 2));
      return [false, game];
    }

    const stash = game.locations.find(
      (l) => l.name === "STASH"
    )! as LocationArea & { name: "STASH" };

    const stashCard = stash.stash[action.stashCardIndex];

    if (!stashCard) {
      console.error(
        "Invalid action by " +
          playerId +
          ", stash card index out of bounds: " +
          action.stashCardIndex
      );
      console.error(JSON.stringify(action, null, 2));
      console.error(JSON.stringify(game, null, 2));
      return [false, game];
    }

    return [
      true,
      {
        ...game,
        events: [
          ...game.events,
          `Player ${activePlayer.playerInfo.nickname} has taken card #${
            action.stashCardIndex + 1
          } from Stash`
        ],
        substate: {
          state: "AWAITING_STASH_RETURN_CARD",
          stashCardIndex: action.stashCardIndex
        },
        locations: game.locations.map((l) => {
          if (l.name !== "STASH") return l;
          return {
            ...l,
            stash: [...l.stash.filter((c) => c !== stashCard)]
          };
        }),
        players: game.players.map((p) => {
          if (p !== activePlayer) return p;
          return {
            ...p,
            cards: [...p.cards, stashCard]
          };
        })
      }
    ];
  }

  if (action.action === "STASH_RETURN_CARD") {
    if (game.substate.state !== "AWAITING_STASH_RETURN_CARD") {
      console.error(
        "Invalid action by " +
          playerId +
          ", not expecting STASH_RETURN_CARD, expecting " +
          game.substate.state
      );
      console.error(JSON.stringify(action, null, 2));
      console.error(JSON.stringify(game, null, 2));
      return [false, game];
    }

    const stashCardIndex = game.substate.stashCardIndex;

    const playerCard = activePlayer.cards[action.playerCardIndex];

    if (!playerCard) {
      console.error(
        "Invalid STASH_RETURN_CARD action by " +
          playerId +
          ", card not found at index " +
          action.playerCardIndex
      );
      console.error(JSON.stringify(action, null, 2));
      console.error(JSON.stringify(game, null, 2));
      return [false, game];
    }

    return [
      true,
      {
        ...game,
        events: [
          ...game.events,
          `Player ${activePlayer.playerInfo.nickname} has returned a card to slot #2 in Stash`
        ],
        substate: { state: "AWAITING_EVIDENCE_SWAP", location: "STASH" },
        locations: game.locations.map((l) => {
          if (l.name !== "STASH") return l;
          return {
            ...l,
            stash: [
              ...l.stash.slice(0, stashCardIndex),
              playerCard,
              ...l.stash.slice(stashCardIndex)
            ]
          };
        }),
        players: game.players.map((p) => {
          if (p !== activePlayer) return p;
          return {
            ...p,
            cards: [...p.cards.filter((c) => c !== playerCard)]
          };
        })
      }
    ];
  }

  if (action.action === "SWAP_EVIDENCE") {
    if (game.substate.state !== "AWAITING_EVIDENCE_SWAP") {
      console.error("Invalid action by " + playerId);
      console.error(JSON.stringify(action, null, 2));
      console.error(JSON.stringify(game, null, 2));
      return [false, game];
    }

    const swapLocationName = game.substate.location;

    const playerCard = activePlayer.cards.find(
      (c, i) => i === action.playerCardIndex
    );
    const swapLocation = game.locations.find(
      (l) => l.name === swapLocationName
    );
    const swapLocationCard =
      swapLocation && "card" in swapLocation && swapLocation.card;

    if (!playerCard || !swapLocationCard || !swapLocation) {
      console.error("Invalid action by " + playerId);
      console.error(JSON.stringify(action, null, 2));
      console.error(JSON.stringify(game, null, 2));
      return [false, game];
    }

    function formatCardColor(c: DealtCard) {
      if ("color" in c) return c.color;
      if ("colors" in c) return c.colors.join("/");
      if (c.type === "neutral") return "GREY";
      return "RAINBOW";
    }

    return [
      true,
      {
        ...game,
        events: [
          ...game.events,
          `Player ${
            activePlayer.playerInfo.nickname
          } has taken the face-up ${formatCardColor(
            swapLocationCard
          )} card from ${
            swapLocation.userFacingName
          } and replaced it with ${formatCardColor(playerCard)}`
        ],
        activePlayer: (game.activePlayer + 1) % game.players.length,
        substate: { state: "AWAITING_MAIN_PLAYER_CHOOSE_LOCATION" },
        locations: game.locations.map((l) => {
          if (l !== swapLocation) return l;
          return {
            ...l,
            card: playerCard
          };
        }),
        players: game.players.map((p) => {
          if (p !== activePlayer) return p;
          return {
            ...p,
            cards: [
              ...p.cards.slice(0, action.playerCardIndex),
              swapLocationCard,
              ...p.cards.slice(action.playerCardIndex + 1)
            ]
          };
        })
      }
    ];
  }

  if (action.action === "STEAL_CHOOSE_PLAYER") {
    if (game.substate.state !== "AWAITING_STEAL_CHOOSE_PLAYER") {
      console.error(
        "Invalid STEAL_CHOOSE_PLAYER action by " +
          playerId +
          ", expecting " +
          game.substate.state
      );
      console.error(JSON.stringify(action, null, 2));
      console.error(JSON.stringify(game, null, 2));
      return [false, game];
    }

    const otherPlayer = game.players.find(
      (p) => p.color === action.playerColor
    );

    if (!otherPlayer) {
      console.error(
        "Invalid STEAL_CHOOSE_PLAYER action by " +
          playerId +
          ", invalid color " +
          action.playerColor
      );
      console.error(JSON.stringify(action, null, 2));
      console.error(JSON.stringify(game, null, 2));
      return [false, game];
    }

    if (otherPlayer.color === activePlayer.color) {
      console.error(
        "Invalid STEAL action by " + playerId + ", cant steal from self"
      );
      console.error(JSON.stringify(action, null, 2));
      console.error(JSON.stringify(game, null, 2));
      return [false, game];
    }

    if (otherPlayer.preparationTokens === 0) {
      console.error(
        "Invalid STEAL action by " +
          playerId +
          ", " +
          otherPlayer.color +
          " has no preparation tokens"
      );
      console.error(JSON.stringify(action, null, 2));
      console.error(JSON.stringify(game, null, 2));
      return [false, game];
    }

    return [
      true,
      {
        ...game,
        events: [
          ...game.events,
          `Player ${activePlayer.playerInfo.nickname} steals a preparation token from ${otherPlayer.playerInfo.nickname}`
        ],
        substate: { state: "AWAITING_EVIDENCE_SWAP", location: "FRAME/STEAL" },
        players: game.players.map((p) => {
          if (p !== otherPlayer && p !== activePlayer) return p;
          return {
            ...p,
            preparationTokens:
              p === otherPlayer
                ? p.preparationTokens - 1
                : p.preparationTokens + 1
          };
        })
      }
    ];
  }

  if (action.action === "FRAME_CHOOSE_CARD") {
    if (game.substate.state !== "AWAITING_FRAME_CHOOSE_CARDS") {
      console.error(
        "Invalid FRAME_CHOOSE_CARD action by " +
          playerId +
          ", expecting " +
          game.substate.state
      );
      console.error(JSON.stringify(action, null, 2));
      console.error(JSON.stringify(game, null, 2));
      return [false, game];
    }

    const player = game.players.find((p) => p.playerInfo.id === playerId);
    if (!player) {
      console.error(
        "Invalid FRAME_CHOOSE_CARD - Player not in game:" + playerId
      );
      console.error(JSON.stringify(action, null, 2));
      console.error(JSON.stringify(game, null, 2));
      return [false, game];
    }

    if (game.substate.cards.some((c) => c.playerId === player.playerInfo.id)) {
      console.error(
        "Invalid FRAME_CHOOSE_CARD - player has already chosen card:" + playerId
      );
      console.error(JSON.stringify(action, null, 2));
      console.error(JSON.stringify(game, null, 2));
      return [false, game];
    }

    const cards = [
      ...game.substate.cards,
      { playerId, playerCardIndex: action.playerCardIndex }
    ];

    if (cards.length < game.players.length) {
      return [
        true,
        {
          ...game,
          events: [
            ...game.events,
            `Player ${player.playerInfo.nickname} has chosen a card for the Frame Attempt`
          ],
          substate: { state: "AWAITING_FRAME_CHOOSE_CARDS", cards }
        }
      ];
    }

    return [
      true,
      {
        ...game,
        events: [
          ...game.events,
          `Player ${player.playerInfo.nickname} has chosen a card for the Frame Attempt`
        ],
        substate: { state: "AWAITING_FRAME_CHOOSE_CARDS", cards },
        state: "PAUSED_FOR_FRAME_CHECK",
        frameCards: cards
      }
    ];
  }

  // MISSING: FRAME/STEAL, GO TO COPS
  console.error("Unknown action by " + playerId);
  console.error(JSON.stringify(action, null, 2));
  console.error(JSON.stringify(game, null, 2));
  return [false, game];
};
