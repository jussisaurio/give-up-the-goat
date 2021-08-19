import { Game, GameAction, Card, GameInStartedState } from "./game";

export type GameActionEvent = {
  type: "GAME_TICK";
  code: string;
  game: GameInStartedState<"UI">;
};

export type ClientEvent =
  | { type: "CHANGE_NICKNAME"; nickname: string }
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

export type ServerEvent =
  | {
      type: "GAME_JOINED";
      payload: { game: Game<"UI">; code: string; nickname: string };
    }
  | {
      type: "GAME_CREATED";
      payload: {
        code: string;
      };
    }
  | {
      type: "GAME_STARTED";
      payload: { code: string; game: GameInStartedState<"UI"> };
    }
  | {
      type: "ASSIGN_NICKNAME";
      payload: { nickname: string };
    }
  | {
      type: "GAME_ACTION_EVENT";
      payload: GameActionEvent;
    };
