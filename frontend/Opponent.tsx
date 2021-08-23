import React from "react";
import { GameInStartedState, GoatPlayer } from "../common/game";
import { isChoosingCard, isFrameCard } from "../common/logicHelpers";
import { noop } from "../common/toolbox";
import { getCardFlyTowardsPlayerAnimation } from "./animations";
import { PlayingCard } from "./Card";
import {
  formatNickname,
  formatPlayerActionText,
  mapPlayerColorToUIColor
} from "./format";
import { PreparationToken } from "./PreparationToken";

type Props = {
  me: GoatPlayer<"UI"> & { me: true };
  connected: boolean;
  player: GoatPlayer<"UI">;
  playerNumber: number;
  game: GameInStartedState<"UI">;
  onOpponentHandClick: (player: GoatPlayer<"UI">) => void;
  onSpyConfirm: () => void;
};

export const Opponent: React.FC<Props> = ({
  connected,
  me,
  player,
  playerNumber,
  game,
  onOpponentHandClick,
  onSpyConfirm
}) => {
  const meHasTurn = game.players.indexOf(me) === game.activePlayer;
  const opponentHasTurn = game.players.indexOf(player) === game.activePlayer;
  const isChoosing = isChoosingCard(player, game);
  const iThinkThisPlayerIsTheScapegoat = me.suspect === player.color;

  const classN =
    "playerInfo" + (opponentHasTurn || isChoosing ? " turnAnimation" : "");

  const playerNameText = formatNickname(player);
  const playerActionText = formatPlayerActionText(game, player);

  const highlightCards =
    meHasTurn &&
    (game.substate.expectedAction === "SPY_ON_PLAYER" ||
      game.substate.expectedAction === "STEAL_CHOOSE_PLAYER" ||
      game.substate.expectedAction === "TRADE_CHOOSE_PLAYER");

  const spyingThisPlayer =
    game.state === "ONGOING" &&
    game.substate.expectedAction === "SPY_ON_PLAYER_CONFIRM" &&
    meHasTurn &&
    game.substate.otherPlayerId === player.playerInfo.id;

  return (
    <div
      id={"player-area-" + player.playerInfo.id}
      key={playerNumber}
      style={{
        border: `2px solid ${mapPlayerColorToUIColor(player.color)}`,
        opacity: !connected ? 0.5 : 1
      }}
      className={`player-area player-${playerNumber}`}
    >
      {!connected && <div className="connectionSpinner" />}
      {!connected && <div className="disconnectionText">disconnected</div>}
      {(opponentHasTurn || isChoosing) && <div className="loader"></div>}
      <div
        style={{ color: mapPlayerColorToUIColor(player.color) }}
        className={classN}
      >
        {playerNameText}
      </div>
      <div className="smallerText">{playerActionText}</div>
      {iThinkThisPlayerIsTheScapegoat && (
        <div className="smallerText">They're the scapegoat. Trust me.</div>
      )}
      <div
        onClick={() => onOpponentHandClick(player)}
        className="cardsContainer"
      >
        {Array(game.players.length > 4 ? 4 : 3)
          .fill(null)
          .map((_, i) => {
            const card = player.cards[i];
            if (card) {
              const tradeAnimation = getCardFlyTowardsPlayerAnimation(
                game,
                player,
                i
              );

              const cardIsChosenFrameCard = isFrameCard(player, i, game);

              const id = `player-${player.playerInfo.id}-slot-${i + 1}`;

              return (
                <PlayingCard
                  id={id}
                  animation={tradeAnimation}
                  className={highlightCards ? " highlightCard" : ""}
                  onClick={noop}
                  key={player.playerInfo.id + "-" + i}
                  style={{
                    marginRight: "5px",
                    ...(cardIsChosenFrameCard && {
                      transform: "scale(2)",
                      transition: "transform 200ms"
                    })
                  }}
                  card={card.face === "UP" ? card : { face: "DOWN" }}
                />
              );
            } else
              return (
                <div
                  key={player.playerInfo.id + "-" + i}
                  id={`player-${player.playerInfo.id}-slot-${i + 1}`}
                  className="cardPlaceholder"
                />
              );
          })}
        {spyingThisPlayer && (
          <button className="spyConfirmButton" onClick={onSpyConfirm}>
            OK, got it
          </button>
        )}
      </div>
      {player.preparationTokens.length > 0 && (
        <div className="preparationTokenContainer">
          {player.preparationTokens.some((t) => t === "TOKEN-1") && (
            <PreparationToken game={game} player={player} token={"TOKEN-1"} />
          )}
          {player.preparationTokens.some((t) => t === "TOKEN-2") && (
            <PreparationToken game={game} player={player} token={"TOKEN-2"} />
          )}
        </div>
      )}
    </div>
  );
};
