import { getActivePlayer, playerCanGoToTheCops } from "./logicHelpers";
import { getRandomElement } from "./toolbox";

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
      action: "TRADE_CHOOSE_PLAYER";
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

export type EnrichedGameAction =
  | GameAction
  | (GameAction & { action: "SWAP_EVIDENCE"; takenCard: DealtCard });

export type UserFacingGameEvent = { ts: number } & (
  | (EnrichedGameAction & {
      actionPlayerId: string;
    })
  | { event: "FRAME_FAILURE" }
  | { event: "FRAME_SUCCESS" }
  | { event: "COPS_CALLED" }
);

const addEventToGameEvents = (
  events: UserFacingGameEvent[],
  a: EnrichedGameAction,
  actionPlayerId: string
): UserFacingGameEvent[] => [
  ...events,
  {
    ...a,
    actionPlayerId,
    ts: Date.now()
  }
];

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
      expectedAction: "GO_TO_LOCATION";
    }
  | {
      expectedAction: "TRADE_CHOOSE_PLAYER";
    }
  | {
      expectedAction: "TRADE_CHOOSE_CARD";
      otherPlayerId: string;
      mainPlayerCardIndex: number | null;
      otherPlayerCardIndex: number | null;
    }
  | {
      expectedAction: "SPY_ON_PLAYER";
    }
  | {
      expectedAction: "SPY_ON_PLAYER_CONFIRM";
      otherPlayerId: string;
    }
  | {
      expectedAction: "STASH_CHOOSE_CARD";
    }
  | {
      expectedAction: "STASH_RETURN_CARD";
      stashCardIndex: number;
    }
  | {
      expectedAction: "SWAP_EVIDENCE";
      location: Omit<LocationName, "COPS">;
    }
  | {
      expectedAction: "FRAME_CHOOSE_CARD";
      cards: { playerId: string; playerCardIndex: number }[];
    }
  | {
      expectedAction: "STEAL_CHOOSE_PLAYER";
    };

export type StartedGame = {
  substate: SubState;
  id: string;
  activePlayer: number;
  players: GoatPlayer[];
  scapegoat: PlayerColor;
  preparationTokens: 0 | 1 | 2;
  locations: LocationArea[];
  playerInfos: PlayerInfo[];
  events: UserFacingGameEvent[];
};

export type StartedState =
  | "ONGOING"
  | "PAUSED_FOR_COPS_CHECK"
  | "PAUSED_FOR_FRAME_CHECK"
  | "FINISHED";

export type GameInStartedState = Game & { state: StartedState };

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

const STARTING_LOCATIONS_BY_PLAYER_COUNT: Record<number, LocationName[]> = {
  3: ["PREPARE", "TRADE", "SPY"],
  4: ["PREPARE", "TRADE", "SPY", "STASH"],
  5: ["PREPARE", "PREPARE", "TRADE", "SPY", "STASH"],
  6: ["PREPARE", "PREPARE", "TRADE", "TRADE", "SPY", "STASH"]
};

export const placePlayersInLocations = (
  players: DealtInGoatPlayer[],
  locations: LocationArea[]
): GoatPlayer[] => {
  return players.map((pl, i) => ({
    ...pl,
    location: STARTING_LOCATIONS_BY_PLAYER_COUNT[players.length][i]
  }));
};

export const createGame = (playerInfos: PlayerInfo[] = []): Game => {
  return {
    state: "WAITING_FOR_PLAYERS",
    id: Math.random().toString(36).slice(2),
    playerInfos
  };
};

export const activateGame = (game: Game): Game & { state: "ONGOING" } => {
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
    substate: { expectedAction: "GO_TO_LOCATION" },
    activePlayer: 0,
    players: finalPlayers,
    locations,
    preparationTokens: 2,
    scapegoat,
    events: []
  };
};

export const isExpectedAction = <T extends GameAction>(
  game: Game,
  action: T
): game is Game & { substate: { expectedAction: T["action"] } } => {
  return "substate" in game && game.substate.expectedAction === action.action;
};

export const playTurn = (
  game: Game,
  playerId: string,
  action: GameAction
): [boolean, Game] => {
  if (game.state !== "ONGOING") {
    console.error(
      "Invalid action by " + playerId + ", game not in ONGOING state"
    );
    console.error(JSON.stringify(action, null, 2));
    console.error(JSON.stringify(game, null, 2));
    return [false, game];
  }

  const logAndFail = (
    reason: string = `Expecting ${game.substate.expectedAction}, got ${action.action}`
  ) => {
    console.error("Invalid action by " + playerId + ", " + reason);
    console.error(JSON.stringify(action, null, 2));
    console.error(JSON.stringify(game, null, 2));
    return [false, game] as [boolean, Game];
  };

  const activePlayer = getActivePlayer(game);
  const playerWhoSentTheEvent = game.players.find(
    (p) => p.playerInfo.id === playerId
  );

  if (!playerWhoSentTheEvent) {
    return logAndFail("Player is not participant in game");
  }

  const activePlayerSentTheEvent = activePlayer === playerWhoSentTheEvent;

  // Generally only the active player with turn can perform an action. There are three exceptions:
  // 1. Player is going to the cops in a 6-player game out of turn, on the turn of the player 3 seats to their left.
  // 2. Player is choosing a card for the Trade action that someone else initiated with them.
  // 3. Player is choosing a card for the Frame action that someone else initiated.
  const goingToCopsOutOfTurn =
    !activePlayerSentTheEvent &&
    action.action === "GO_TO_LOCATION" &&
    action.location === "COPS" &&
    playerCanGoToTheCops(playerWhoSentTheEvent, game);

  const isValidTradeParticipant =
    !activePlayerSentTheEvent &&
    game.substate.expectedAction === "TRADE_CHOOSE_CARD" &&
    game.substate.otherPlayerId === playerId &&
    game.substate.otherPlayerCardIndex === null;

  const isValidFrameParticipant =
    !activePlayerSentTheEvent &&
    game.substate.expectedAction === "FRAME_CHOOSE_CARD";

  if (
    !activePlayerSentTheEvent &&
    !goingToCopsOutOfTurn &&
    !isValidFrameParticipant &&
    !isValidTradeParticipant
  ) {
    return logAndFail("Illegally moving out of turn");
  }

  // MOVE TO LOCATION
  if (action.action === "GO_TO_LOCATION") {
    if (!goingToCopsOutOfTurn && !isExpectedAction(game, action)) {
      return logAndFail("Expecting GO_TO_LOCATION from active player");
    }

    if (action.location === playerWhoSentTheEvent.location) {
      return logAndFail("Cannot move to same location where already is");
    }

    switch (action.location) {
      case "COPS": {
        return [
          true,
          {
            ...game,
            events: addEventToGameEvents(game.events, action, playerId),
            state: "PAUSED_FOR_COPS_CHECK"
          }
        ];
      }
      case "FRAME/STEAL": {
        if (game.preparationTokens > 0) {
          return logAndFail(
            "Cannot move to FRAME/STEAL when there are still " +
              game.preparationTokens +
              " tokens left"
          );
        }

        if (activePlayer.preparationTokens > 0) {
          return [
            true,
            {
              ...game,
              events: addEventToGameEvents(game.events, action, playerId),
              players: game.players.map((p) => {
                if (p !== activePlayer) return p;
                return {
                  ...p,
                  location: "FRAME/STEAL"
                };
              }),
              substate: { expectedAction: "FRAME_CHOOSE_CARD", cards: [] }
            }
          ];
        } else {
          return [
            true,
            {
              ...game,
              events: addEventToGameEvents(game.events, action, playerId),
              players: game.players.map((p) => {
                if (p !== activePlayer) return p;
                return {
                  ...p,
                  location: "FRAME/STEAL"
                };
              }),
              substate: { expectedAction: "STEAL_CHOOSE_PLAYER" }
            }
          ];
        }
      }
      case "PREPARE": {
        if (game.preparationTokens === 0) {
          return logAndFail(
            `Cannot move to PREPARE when there are no preparation tokens left`
          );
        } else if (game.preparationTokens === 1) {
          return [
            true,
            {
              ...game,
              events: addEventToGameEvents(game.events, action, playerId),
              substate: {
                expectedAction: "SWAP_EVIDENCE",
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
              events: addEventToGameEvents(game.events, action, playerId),
              substate: {
                expectedAction: "SWAP_EVIDENCE",
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
            events: addEventToGameEvents(game.events, action, playerId),
            players: game.players.map((p) => {
              if (p.playerInfo.id !== playerId) return p;
              return {
                ...p,
                location: "SPY"
              };
            }),
            substate: { expectedAction: "SPY_ON_PLAYER" }
          }
        ];
      }
      case "STASH": {
        return [
          true,
          {
            ...game,
            events: addEventToGameEvents(game.events, action, playerId),
            players: game.players.map((p) => {
              if (p.playerInfo.id !== playerId) return p;
              return {
                ...p,
                location: "STASH"
              };
            }),
            substate: { expectedAction: "STASH_CHOOSE_CARD" }
          }
        ];
      }
      case "TRADE": {
        return [
          true,
          {
            ...game,
            events: addEventToGameEvents(game.events, action, playerId),
            players: game.players.map((p) => {
              if (p.playerInfo.id !== playerId) return p;
              return {
                ...p,
                location: "TRADE"
              };
            }),
            substate: { expectedAction: "TRADE_CHOOSE_PLAYER" }
          }
        ];
      }
      default:
        return logAndFail(
          "Trying to move to unknown location " + action.location
        );
    }
  }

  // CHOOSE PLAYER TO TRADE WITH
  if (action.action === "TRADE_CHOOSE_PLAYER") {
    if (!isExpectedAction(game, action)) return logAndFail();

    const otherPlayer = game.players.find(
      (p) => p.playerInfo.id !== playerId && p.color === action.playerColor
    );
    if (!otherPlayer) {
      return logAndFail("Trying to trade with nonexistent player");
    }

    return [
      true,
      {
        ...game,
        events: addEventToGameEvents(game.events, action, playerId),
        substate: {
          expectedAction: "TRADE_CHOOSE_CARD",
          otherPlayerId: otherPlayer.playerInfo.id,
          mainPlayerCardIndex: null,
          otherPlayerCardIndex: null
        }
      }
    ];
  }

  // CHOOSE CARD TO TRADE -- requires two different players to perform the same action to move on
  if (action.action === "TRADE_CHOOSE_CARD") {
    if (!isExpectedAction(game, action)) return logAndFail();
    const { otherPlayerId } = game.substate;

    const otherPlayer = game.players.find(
      (p, i) => p.playerInfo.id === otherPlayerId
    )!;

    if (
      playerWhoSentTheEvent !== activePlayer &&
      playerWhoSentTheEvent !== otherPlayer
    ) {
      return logAndFail("Player is not either of the Trade participants");
    }

    const isActivePlayer = playerWhoSentTheEvent === activePlayer;

    if (
      (isActivePlayer && game.substate.mainPlayerCardIndex !== null) ||
      (!isActivePlayer && game.substate.otherPlayerCardIndex !== null)
    ) {
      return logAndFail("Player has already chosen card");
    }

    const chosenCardIndex = (
      isActivePlayer ? activePlayer : otherPlayer
    ).cards.findIndex((c, i) => i === action.playerCardIndex);

    if (chosenCardIndex === -1) {
      return logAndFail(
        "Player has chosen a card index out of bounds: " +
          action.playerCardIndex
      );
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
          events: addEventToGameEvents(game.events, action, playerId),
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
        events: addEventToGameEvents(game.events, action, playerId),
        substate: { expectedAction: "SWAP_EVIDENCE", location: "TRADE" },
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
    if (!isExpectedAction(game, action)) return logAndFail();

    const otherPlayer = game.players.find(
      (p) => p.playerInfo.id !== playerId && p.color === action.playerColor
    );
    if (!otherPlayer) {
      return logAndFail("Trying to spy on nonexistent player");
    }

    return [
      true,
      {
        ...game,
        events: addEventToGameEvents(game.events, action, playerId),
        substate: {
          expectedAction: "SPY_ON_PLAYER_CONFIRM",
          otherPlayerId: otherPlayer.playerInfo.id
        }
      }
    ];
  }

  // CHOOSE PLAYER TO SPY ON
  if (action.action === "SPY_ON_PLAYER_CONFIRM") {
    if (!isExpectedAction(game, action)) return logAndFail();
    return [
      true,
      {
        ...game,
        substate: { expectedAction: "SWAP_EVIDENCE", location: "SPY" }
      }
    ];
  }

  if (action.action === "STASH_CHOOSE_CARD") {
    if (!isExpectedAction(game, action)) return logAndFail();

    const stash = game.locations.find(
      (l) => l.name === "STASH"
    )! as LocationArea & { name: "STASH" };

    const stashCard = stash.stash[action.stashCardIndex];

    if (!stashCard) {
      return logAndFail(
        "Player has chosen a Stash card index out of bounds: " +
          action.stashCardIndex
      );
    }

    return [
      true,
      {
        ...game,
        events: addEventToGameEvents(game.events, action, playerId),
        substate: {
          expectedAction: "STASH_RETURN_CARD",
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
    if (!isExpectedAction(game, action)) return logAndFail();

    const stashCardIndex = game.substate.stashCardIndex;

    const playerCard = activePlayer.cards[action.playerCardIndex];

    if (!playerCard) {
      return logAndFail(
        "Player has chosen a card out of bounds: " + action.playerCardIndex
      );
    }

    return [
      true,
      {
        ...game,
        events: addEventToGameEvents(game.events, action, playerId),
        substate: { expectedAction: "SWAP_EVIDENCE", location: "STASH" },
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
    if (!isExpectedAction(game, action)) return logAndFail();

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
      return logAndFail(
        "Player card doesnt exist, swap location doesnt exist, or swap location does not have a card"
      );
    }

    return [
      true,
      {
        ...game,
        events: addEventToGameEvents(
          game.events,
          { ...action, takenCard: swapLocationCard },
          playerId
        ),
        activePlayer: (game.activePlayer + 1) % game.players.length,
        substate: { expectedAction: "GO_TO_LOCATION" },
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
    if (!isExpectedAction(game, action)) return logAndFail();

    const otherPlayer = game.players.find(
      (p) => p.color === action.playerColor
    );

    if (
      !otherPlayer ||
      otherPlayer.color === activePlayer.color ||
      otherPlayer.preparationTokens === 0
    ) {
      return logAndFail(
        "Player doesnt exist, or player trying to steal from self or a player with no tokens"
      );
    }

    return [
      true,
      {
        ...game,
        events: addEventToGameEvents(game.events, action, playerId),
        substate: { expectedAction: "SWAP_EVIDENCE", location: "FRAME/STEAL" },
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
    if (!isExpectedAction(game, action)) return logAndFail();

    if (
      game.substate.cards.some(
        (c) => c.playerId === playerWhoSentTheEvent.playerInfo.id
      )
    ) {
      return logAndFail("Player has already chosen a card for Frame");
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
          events: addEventToGameEvents(game.events, action, playerId),
          substate: { expectedAction: "FRAME_CHOOSE_CARD", cards }
        }
      ];
    }

    return [
      true,
      {
        ...game,
        events: addEventToGameEvents(game.events, action, playerId),
        substate: { expectedAction: "FRAME_CHOOSE_CARD", cards },
        state: "PAUSED_FOR_FRAME_CHECK",
        frameCards: cards
      }
    ];
  }

  // unexpected
  return logAndFail("Something unexpected happened");
};
