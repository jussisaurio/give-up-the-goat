import { GameInStartedState, GoatPlayer } from "../common/game";

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
