import { Game, GameAction, DealtCard, GameInStartedState } from "./game";

export type GameActionEvent =
  | {
      type: "GAME_TICK";
      code: string;
      game: GameInStartedState;
    }
  | {
      type: "SPY_HAND";
      code: string;
      game: GameInStartedState;
      otherPlayerId: string;
      hand: DealtCard[];
    }
  | {
      type: "FAILED_FRAME_ATTEMPT";
      code: string;
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
      type: "GAME_REMAKE";
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
