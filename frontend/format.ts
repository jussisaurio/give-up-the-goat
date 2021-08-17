import {
  DealtCard,
  GameInStartedState,
  GoatPlayer,
  LocationArea,
  PlayerColor,
  StartedGame,
  UserFacingGameEvent
} from "../common/game";
import { formatCardColor } from "../common/toolbox";
import { isChoosingCard } from "../common/logicHelpers";

export function formatNickname(p: GoatPlayer) {
  return `${p.playerInfo.nickname}(${p.color})`;
}

export const mapPlayerColorToUIColor = (color: PlayerColor) => {
  return color.toUpperCase() === "ORANGE" ? "chocolate" : color;
};

export const formatLogEntry = (e: UserFacingGameEvent, game: StartedGame) => {
  if ("event" in e) {
    switch (e.event) {
      case "COPS_CALLED":
        const scapegoat = game.players.find((p) => p.color === game.scapegoat)!;
        const copCaller = game.players.find((p, i) => i === game.activePlayer)!;
        return scapegoat === copCaller
          ? `The scapegoat ${formatNickname(
              scapegoat
            )} wins the game by calling the cops!`
          : `${formatNickname(
              copCaller
            )} gets paranoid and calls the cops! The scapegoat ${formatNickname(
              scapegoat
            )} wins the game!`;
      case "FRAME_FAILURE":
        return "The frame attempt fails due to insufficient evidence!";
      case "FRAME_SUCCESS":
        return `The Scapegoat, ${
          game.players.find((p) => p.color === game.scapegoat)!.playerInfo
            .nickname
        } , has been successfully framed and the other players win!`;
    }
  }
  const player = game.players.find((p) => p.playerInfo.id === e.actionPlayerId);
  if (!player) {
    console.warn(
      "Cannot print log entry, player doesnt exist: " + e.actionPlayerId
    );
    return "";
  }

  switch (e.action) {
    case "FRAME_CHOOSE_CARD": {
      return `${formatNickname(
        player
      )} has chosen a card for the Frame Attempt.`;
    }
    case "GO_TO_LOCATION": {
      const location = game.locations.find((l) => l.name === e.location);
      if (!location && e.location === "PREPARE") {
        return `${formatNickname(
          player
        )} goes to location Prepare (Frame/Steal).`;
      } else if (!location) {
        return ""; // bug
      }

      return `${formatNickname(player)} goes to location ${
        location.userFacingName
      }.`;
    }
    case "SPY_ON_PLAYER": {
      const otherPlayer = game.players.find((p) => p.color === e.playerColor)!;
      return `${formatNickname(
        player
      )} is looking at the hand of ${formatNickname(otherPlayer)}`;
    }
    case "SPY_ON_PLAYER_CONFIRM": {
      return `${formatNickname(player)} has finished looking at the hand.`;
    }
    case "STASH_CHOOSE_CARD": {
      return `${formatNickname(player)} takes the card at slot #${
        e.stashCardIndex + 1
      } from the Stash.`;
    }
    case "STASH_RETURN_CARD": {
      return `${formatNickname(
        player
      )} returns a card to the same slot in the Stash.`;
    }
    case "STEAL_CHOOSE_PLAYER": {
      const otherPlayer = game.players.find((p) => p.color === e.playerColor)!;
      return `${formatNickname(
        player
      )} steals a preparation token from ${formatNickname(otherPlayer)}!`;
    }
    case "SWAP_EVIDENCE": {
      const playerLocation = game.locations.find(
        (l) => l.name === player.location
      ) as LocationArea & { card: DealtCard };

      return `${formatNickname(player)} swaps out the ${
        "takenCard" in e ? formatCardColor(e.takenCard) : ""
      } evidence card at ${
        playerLocation.userFacingName
      } for a ${formatCardColor(playerLocation.card)} card.`;
    }
    case "TRADE_CHOOSE_CARD": {
      return `${formatNickname(player)} has chosen a card to trade.`;
    }
    case "TRADE_WITH_PLAYER": {
      const otherPlayer = game.players.find((p) => p.color === e.playerColor)!;
      return `${formatNickname(player)} chooses to trade with ${formatNickname(
        otherPlayer
      )}!.`;
    }
  }

  return "<unknown event>:" + JSON.stringify(e);
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
