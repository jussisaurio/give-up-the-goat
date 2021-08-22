import { Game, GameAction, GameInStartedState } from "./game";

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
      type: "GAME_CREATED";
      payload: {
        code: string;
      };
    }
  | {
      type: "ASSIGN_NICKNAME";
      payload: { nickname: string };
    }
  | {
      type: "GAME_STATE_UPDATE";
      payload: {
        code: string;
        game: Game<"UI">;
      };
    };
