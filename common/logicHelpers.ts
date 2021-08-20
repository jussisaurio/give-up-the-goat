import { GameInStartedState, GoatPlayer, StateType } from "./game";

export const isChoosingCard = <S extends StateType>(
  player: GoatPlayer<S>,
  game: GameInStartedState<S>
) => {
  const substate = game.substate;
  if (substate.expectedAction === "TRADE_CHOOSE_CARD") {
    const activePlayer = getActivePlayer(game);
    const otherPlayer = game.players.find(
      (p) => substate.otherPlayerId === p.playerInfo.id
    )!;

    if (player !== activePlayer && player !== otherPlayer) return false;
    if (player === activePlayer && substate.mainPlayerCardIndex !== null)
      return false;
    if (player === otherPlayer && substate.otherPlayerCardIndex !== null)
      return false;

    return true;
  } else if (substate.expectedAction === "FRAME_CHOOSE_CARD") {
    if (substate.cards.some((fc) => fc.playerId === player.playerInfo.id)) {
      return false;
    }
    return true;
  } else if (
    substate.expectedAction === "SWAP_EVIDENCE" ||
    substate.expectedAction === "STASH_RETURN_CARD"
  ) {
    return (
      game.state === "ONGOING" &&
      player === game.players.find((p, i) => i === game.activePlayer)!
    );
  }

  return false;
};

export const playerCanGoToTheCops = <S extends StateType>(
  player: GoatPlayer<S>,
  game: GameInStartedState<S>
) => {
  if (game.state !== "ONGOING") return false;

  const isMyTurn = game.players.indexOf(player) === game.activePlayer;

  const iAmChoosingLocation =
    isMyTurn && game.substate.expectedAction === "GO_TO_LOCATION";
  // Special rule in 6-player game where player can go to cops if the player 3 spots to their left is playing
  const isSixPlayerGameAndTurnIsThreeToMyLeft =
    game.players.length === 6 &&
    (game.players.indexOf(player) + 3) % 6 === game.activePlayer;

  return iAmChoosingLocation || isSixPlayerGameAndTurnIsThreeToMyLeft;
};

export const getActivePlayer = <S extends StateType>(
  game: GameInStartedState<S>
) => game.players.find((p, i) => i === game.activePlayer)!;

export const getMe = (
  game: GameInStartedState<"UI">
): GoatPlayer<"UI"> & { me: true } => {
  for (const player of game.players) {
    if (player.me) {
      return player;
    }
  }
  throw Error("'Me' should always be found in player list");
};

export const isFrameCard = (
  player: GoatPlayer<"UI">,
  cardIndex: number,
  game: GameInStartedState<"UI">
) => {
  return (
    "frameCards" in game &&
    game.frameCards.some(
      (fc) =>
        fc.playerId === player.playerInfo.id && fc.playerCardIndex === cardIndex
    )
  );
};
