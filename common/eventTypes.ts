import { Game, GameAction, DealtCard, GameInStartedState } from "./game";

export type GameActionEvent =
  | {
      type: "AWAITING_MAIN_PLAYER_CHOOSE_LOCATION";
      game: GameInStartedState;
    }
  | {
      type: "AWAITING_TRADE_CHOOSE_PLAYER";
      game: GameInStartedState;
    }
  | {
      type: "AWAITING_TRADE_CHOOSE_CARDS";
      waitingForPlayers: string[];
      game: GameInStartedState;
    }
  | {
      type: "AWAITING_SPY_CHOOSE_PLAYER";
      game: GameInStartedState;
    }
  | {
      type: "AWAITING_SPY_CONFIRM";
      otherPlayerId: string;
      game: GameInStartedState;
    }
  | {
      type: "SPY_HAND";
      otherPlayerId: string;
      hand: DealtCard[];
      game: GameInStartedState;
    }
  | {
      type: "AWAITING_STASH_CHOOSE_CARD";
      game: GameInStartedState;
    }
  | {
      type: "AWAITING_STASH_RETURN_CARD";
      stashCardIndex: number;
      game: GameInStartedState;
    }
  | {
      type: "AWAITING_EVIDENCE_SWAP";
      game: GameInStartedState;
    }
  | {
      type: "PAUSED_FOR_COPS_CHECK";
      game: GameInStartedState;
    }
  | {
      type: "PAUSED_FOR_FRAME_CHECK";
      frameCards: { playerId: string; playerCardIndex: number }[];
      game: GameInStartedState;
    }
  | {
      type: "AWAITING_FRAME_CHOOSE_CARDS";
      game: GameInStartedState;
      waitingFor: string[];
    }
  | {
      type: "AWAITING_STEAL_CHOOSE_PLAYER";
      game: GameInStartedState;
    }
  | {
      type: "GAME_FINISHED_COPS";
      winnerPlayerIds: string[];
      copCallerId: string;
      game: GameInStartedState;
    }
  | {
      type: "GAME_FINISHED_FRAME";
      winnerPlayerIds: string[];
      game: GameInStartedState;
    }
  | {
      type: "FAILED_FRAME_ATTEMPT";
      game: GameInStartedState;
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

export type GameActionEventWithCode = GameActionEvent & { code: string };

export type ServerEvent =
  | {
      type: "GAME_JOINED";
      payload: { game: Game; code: string; nickname: string };
    }
  | {
      type: "GAME_CREATED";
      payload: {
        code: string;
      };
    }
  | { type: "GAME_STARTED"; payload: { code: string; game: Game } }
  | {
      type: "ASSIGN_NICKNAME";
      payload: { nickname: string };
    }
  | {
      type: "GAME_ACTION_EVENT";
      payload: GameActionEventWithCode;
    };
