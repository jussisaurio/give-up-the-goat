import { GameInStartedState, GoatPlayer } from "./game";

export const isChoosingCard = (
  player: GoatPlayer,
  game: GameInStartedState
) => {
  const substate = game.substate;
  if (substate.state === "AWAITING_TRADE_CHOOSE_CARDS") {
    const activePlayer = game.players.find((p, i) => i === game.activePlayer)!;
    const otherPlayer = game.players.find(
      (p) => substate.otherPlayerId === p.playerInfo.id
    )!;

    if (player !== activePlayer && player !== otherPlayer) return false;
    if (player === activePlayer && substate.mainPlayerCardIndex !== null)
      return false;
    if (player === otherPlayer && substate.otherPlayerCardIndex !== null)
      return false;

    return true;
  } else if (substate.state === "AWAITING_FRAME_CHOOSE_CARDS") {
    if (substate.cards.some((fc) => fc.playerId === player.playerInfo.id)) {
      return false;
    }
    return true;
  } else if (
    substate.state === "AWAITING_EVIDENCE_SWAP" ||
    substate.state === "AWAITING_STASH_RETURN_CARD"
  ) {
    return (
      game.state === "ONGOING" &&
      player === game.players.find((p, i) => i === game.activePlayer)!
    );
  }

  return false;
};

export const playerCanGoToTheCops = (
  player: GoatPlayer,
  game: GameInStartedState
) => {
  if (game.state !== "ONGOING") return false;

  const isMyTurn = game.players.indexOf(player) === game.activePlayer;

  const iAmChoosingLocation =
    isMyTurn && game.substate.state === "AWAITING_MAIN_PLAYER_CHOOSE_LOCATION";
  // Special rule in 6-player game where player can go to cops if the player 3 spots to their left is playing
  const isSixPlayerGameAndTurnIsThreeToMyLeft =
    game.players.length === 6 &&
    (game.players.indexOf(player) + 3) % 6 === game.activePlayer;

  return iAmChoosingLocation || isSixPlayerGameAndTurnIsThreeToMyLeft;
};
