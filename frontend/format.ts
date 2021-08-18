import {
  DealtCard,
  GameInStartedState,
  GoatPlayer,
  LocationArea,
  PlayerColor,
  StartedGame,
  UserFacingGameEvent
} from "../common/game";
import { NicknameValidationResult } from "../common/toolbox";
import { isChoosingCard } from "../common/logicHelpers";

export function formatNickname(p: GoatPlayer) {
  return `${p.playerInfo.nickname} (${p.color})`;
}

export const mapPlayerColorToUIColor = (color: PlayerColor) => {
  return (color.toUpperCase() === "ORANGE" ? "chocolate" : color).toLowerCase();
};

type LogChunk = { text: string; color?: string; bold?: boolean };

const splitCardToChunks = (c: DealtCard) => {
  switch (c.type) {
    case "dual": {
      return [
        { text: c.colors[0], color: c.colors[0] },
        { text: "/" },
        { text: c.colors[1], color: c.colors[1] }
      ];
    }
    case "joker": {
      return [
        "RED",
        "ORANGE",
        "YELLOW",
        "GREEN",
        "BLUE",
        "INDIGO",
        "VIOLET"
      ].map((color) => ({ text: color[0], color }));
    }
    case "neutral": {
      return [{ text: "GREY", color: "grey" }];
    }
    case "single": {
      return [{ text: c.color, color: c.color }];
    }
  }
};

export const formatLogEntry = (
  e: UserFacingGameEvent,
  game: StartedGame
): LogChunk[] => {
  if ("event" in e) {
    switch (e.event) {
      case "COPS_CALLED": {
        const scapegoat = game.players.find((p) => p.color === game.scapegoat)!;
        const copCaller = game.players.find((p, i) => i === game.activePlayer)!;
        return scapegoat === copCaller
          ? [
              { text: "The scapegoat" },
              { text: formatNickname(scapegoat), color: scapegoat.color },
              { text: "wins the game by calling the cops!" }
            ]
          : [
              { text: formatNickname(copCaller), color: copCaller.color },
              { text: "gets paranoid and calls the cops! The scapegoat" },
              { text: formatNickname(scapegoat), color: scapegoat.color },
              { text: "wins the game!" }
            ];
      }
      case "FRAME_FAILURE":
        return [
          { text: "The frame attempt fails due to insufficient evidence!" }
        ];
      case "FRAME_SUCCESS": {
        const scapegoat = game.players.find((p) => p.color === game.scapegoat)!;
        return [
          { text: "The scapegoat" },
          { text: formatNickname(scapegoat), color: scapegoat.color },
          { text: "has been successfully framed and the other players win!" }
        ];
      }
    }
  }
  const player = game.players.find((p) => p.playerInfo.id === e.actionPlayerId);
  if (!player) {
    console.warn(
      "Cannot print log entry, player doesnt exist: " + e.actionPlayerId
    );
    return [{ text: "" }];
  }

  switch (e.action) {
    case "FRAME_CHOOSE_CARD": {
      return [
        { text: formatNickname(player), color: player.color },
        { text: " has chosen a card for the Frame Attempt" }
      ];
    }
    case "GO_TO_LOCATION": {
      const location = game.locations.find((l) => l.name === e.location);
      if (!location && e.location === "PREPARE") {
        return [
          { text: formatNickname(player), color: player.color },
          { text: " goes to location Prepare to Frame (Frame/Steal)" }
        ];
      } else if (!location) {
        return [{ text: "" }]; // bug
      }

      return [
        { text: formatNickname(player), color: player.color },
        { text: " goes to location " },
        { text: location.userFacingName, bold: true }
      ];
    }
    case "SPY_ON_PLAYER": {
      const otherPlayer = game.players.find((p) => p.color === e.playerColor)!;
      return [
        { text: formatNickname(player), color: player.color },
        { text: " is looking at the hand of " },
        { text: formatNickname(otherPlayer), color: otherPlayer.color }
      ];
    }
    case "SPY_ON_PLAYER_CONFIRM": {
      return [
        { text: formatNickname(player), color: player.color },
        { text: " has finished looking at the hand" }
      ];
    }
    case "STASH_CHOOSE_CARD": {
      return [
        { text: formatNickname(player), color: player.color },
        { text: " takes the card at slot " },
        { text: "#" + (e.stashCardIndex + 1) },
        { text: " from the Stash" }
      ];
    }
    case "STASH_RETURN_CARD": {
      return [
        { text: formatNickname(player), color: player.color },
        { text: " returns a card to the same slot in the stash" }
      ];
    }
    case "STEAL_CHOOSE_PLAYER": {
      const otherPlayer = game.players.find((p) => p.color === e.playerColor)!;
      return [
        { text: formatNickname(player), color: player.color },
        { text: " steals a preparation token from " },
        { text: formatNickname(otherPlayer), color: otherPlayer.color }
      ];
    }
    case "SWAP_EVIDENCE": {
      const playerLocation = game.locations.find(
        (l) => l.name === player.location
      ) as LocationArea & { card: DealtCard };

      return [
        { text: formatNickname(player), color: player.color },
        { text: " takes the " },
        ...("takenCard" in e ? splitCardToChunks(e.takenCard) : [{ text: "" }]),
        { text: " evidence card from " },
        { text: playerLocation.userFacingName, bold: true },
        { text: " and puts back a " },
        ...splitCardToChunks(playerLocation.card),
        { text: " card" }
      ];
    }
    case "TRADE_CHOOSE_CARD": {
      return [
        { text: formatNickname(player), color: player.color },
        { text: " has chosen a card to trade" }
      ];
    }
    case "TRADE_WITH_PLAYER": {
      const otherPlayer = game.players.find((p) => p.color === e.playerColor)!;
      return [
        { text: formatNickname(player), color: player.color },
        { text: " chooses to trade with " },
        { text: formatNickname(otherPlayer), color: otherPlayer.color }
      ];
    }
  }

  return [{ text: "" }];
};

export function formatPlayerActionText(
  game: GameInStartedState,
  player: GoatPlayer
) {
  const substate = game.substate;
  const activePlayer = game.players.find((p, i) => i === game.activePlayer)!;

  switch (substate.state) {
    case "AWAITING_EVIDENCE_SWAP": {
      if (player !== activePlayer) return "";
      const location = game.locations.find((l) => l.name === substate.location);
      return `Choose a card from hand to swap with the face-up card at ${location?.userFacingName}.`;
    }
    case "AWAITING_FRAME_CHOOSE_CARDS": {
      return isChoosingCard(player, game)
        ? "Choose a card for Frame Attempt!"
        : "";
    }
    case "AWAITING_MAIN_PLAYER_CHOOSE_LOCATION": {
      if (player !== activePlayer) return "";
      return "Choose location to go to.";
    }
    case "AWAITING_SPY_CHOOSE_PLAYER": {
      if (player !== activePlayer) return "";
      return "Choose a player whose hand to look at.";
    }
    case "AWAITING_SPY_CONFIRM": {
      const otherPlayer = game.players.find(
        (p) => p.playerInfo.id === substate.otherPlayerId
      )!;
      if (player !== activePlayer) return "";
      return `Looking at ${formatNickname(otherPlayer)}'s hand...`;
    }
    case "AWAITING_STASH_CHOOSE_CARD": {
      if (player !== activePlayer) return "";
      return "Choose a face-down card from Stash.";
    }
    case "AWAITING_STASH_RETURN_CARD": {
      if (player !== activePlayer) return "";
      return `Choose a card from hand to return to slot #${
        substate.stashCardIndex + 1
      } in Stash.`;
    }
    case "AWAITING_STEAL_CHOOSE_PLAYER": {
      if (player !== activePlayer) return "";
      return "Choose a player to steal a preparation token from.";
    }
    case "AWAITING_TRADE_CHOOSE_CARDS": {
      const otherPlayer = game.players.find(
        (p) => substate.otherPlayerId === p.playerInfo.id
      )!;

      return isChoosingCard(player, game)
        ? `Choose a card from hand to trade with ${formatNickname(
            player === activePlayer ? otherPlayer : activePlayer
          )}.`
        : "";
    }
    case "AWAITING_TRADE_CHOOSE_PLAYER": {
      if (player !== activePlayer) return "";
      return "Choose a player to trade with.";
    }
  }
}

export const formatNicknameValidationError = (
  e: NicknameValidationResult & { ok: false }
) => {
  switch (e.reason) {
    case "EMPTY":
      return "";
    case "TOO_SHORT":
      return "Nickname must be at least 3 chars long";
    case "INVALID_CHARACTERS":
      return "Nickname contains invalid characters";
  }
};
