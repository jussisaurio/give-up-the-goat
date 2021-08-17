import { Game, GameAction, DealtCard } from "./game";

export type StartedState =
  | "ONGOING"
  | "PAUSED_FOR_COPS_CHECK"
  | "PAUSED_FOR_FRAME_CHECK"
  | "FINISHED";

export type StartedGame = Game & {
  state: StartedState;
};

export type GameActionEvent =
  | {
      type: "AWAITING_MAIN_PLAYER_CHOOSE_LOCATION";
      game: StartedGame;
    }
  | {
      type: "AWAITING_TRADE_CHOOSE_PLAYER";
      game: StartedGame;
    }
  | {
      type: "AWAITING_TRADE_CHOOSE_CARDS";
      waitingForPlayers: string[];
      game: StartedGame;
    }
  | {
      type: "AWAITING_SPY_CHOOSE_PLAYER";
      game: StartedGame;
    }
  | {
      type: "AWAITING_SPY_CONFIRM";
      otherPlayerId: string;
      game: StartedGame;
    }
  | {
      type: "SPY_HAND";
      otherPlayerId: string;
      hand: DealtCard[];
      game: StartedGame;
    }
  | {
      type: "AWAITING_STASH_CHOOSE_CARD";
      game: StartedGame;
    }
  | {
      type: "AWAITING_STASH_RETURN_CARD";
      stashCardIndex: number;
      game: StartedGame;
    }
  | {
      type: "AWAITING_EVIDENCE_SWAP";
      game: StartedGame;
    }
  | {
      type: "PAUSED_FOR_COPS_CHECK";
      game: StartedGame;
    }
  | {
      type: "PAUSED_FOR_FRAME_CHECK";
      frameCards: { playerId: string; playerCardIndex: number }[];
      game: StartedGame;
    }
  | {
      type: "AWAITING_FRAME_CHOOSE_CARDS";
      game: StartedGame;
      waitingFor: string[];
    }
  | {
      type: "AWAITING_STEAL_CHOOSE_PLAYER";
      game: StartedGame;
    }
  | {
      type: "GAME_FINISHED_COPS";
      winnerPlayerIds: string[];
      copCallerId: string;
      game: StartedGame;
    }
  | {
      type: "GAME_FINISHED_FRAME";
      winnerPlayerIds: string[];
      game: StartedGame;
    }
  | {
      type: "FAILED_FRAME_ATTEMPT";
      game: StartedGame;
    };

export type ClientEvent =
  | {
      type: "GAME_JOIN";
      payload: { code: string; nickname: string };
    }
  | {
      type: "GAME_CREATE";
      payload: { nickname: string };
    }
  | {
      type: "GAME_START";
      payload: { code: string };
    }
  | {
      type: "GAME_ACTION";
      code: string;
      payload: GameAction;
    };

export type ServerEvent =
  | {
      type: "GAME_JOINED";
      payload: { game: Game; nickname: string };
    }
  | {
      type: "GAME_CREATED";
      payload: {
        code: string;
      };
    }
  | { type: "GAME_STARTED"; payload: { game: Game } }
  | {
      type: "ASSIGN_NICKNAME";
      payload: { nickname: string };
    }
  | {
      type: "GAME_ACTION_EVENT";
      payload: GameActionEvent;
    };
