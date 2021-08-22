import React from "react";
import { Game } from "../common/game";
import { getMe } from "../common/logicHelpers";
import { mapPlayerColorToUIColor } from "./format";

type Props = {
  game: Game<"UI"> & { state: "FINISHED" };
  onRemake: (e: React.MouseEvent) => void;
};

export const EndGameScreenContent: React.FC<Props> = ({ game, onRemake }) => {
  const backToLobbyButton = (
    <button className="endButton" onClick={() => window.location.replace("/")}>
      Back to lobby
    </button>
  );
  const remakeButton = (
    <button className="endButton" onClick={onRemake}>
      Remake game
    </button>
  );
  const winners = game.winnerPlayerIds.map(
    (id) => game.players.find((p) => p.playerInfo.id === id)!
  );

  const me = getMe(game);

  const youText = winners.includes(me) ? "You win!" : "You lose!";

  if (winners.length === 1) {
    if (game.players.findIndex((p) => p === winners[0]) === game.activePlayer) {
      return (
        <>
          <h1 style={{ color: mapPlayerColorToUIColor(me.color) }}>
            {youText}
          </h1>
          <span>The spidey senses of scapegoat </span>
          <span
            style={{
              color: mapPlayerColorToUIColor(game.scapegoat)
            }}
          >
            {winners[0].playerInfo.nickname}
          </span>
          <span> correctly led them to run to the cops and win the game!</span>
          {remakeButton}
          {backToLobbyButton}
        </>
      );
    } else {
      const copCaller = game.players.find((p, i) => i === game.activePlayer)!;
      return (
        <>
          <h1 style={{ color: mapPlayerColorToUIColor(me.color) }}>
            {youText}
          </h1>
          <span>The unwarranted paranoia of</span>
          <span
            style={{
              color: mapPlayerColorToUIColor(copCaller.color)
            }}
          >
            {" "}
            {copCaller.playerInfo.nickname}{" "}
          </span>
          <span>
            caused them to run to the cops and ruin it for the rest of them!
          </span>
          <span
            style={{
              color: mapPlayerColorToUIColor(game.scapegoat)
            }}
          >
            {" "}
            {winners[0].playerInfo.nickname} the scapegoat{" "}
          </span>
          <span>wins the game!</span>
          {remakeButton}
          {backToLobbyButton}
        </>
      );
    }
  } else {
    return (
      <>
        <h1 style={{ color: mapPlayerColorToUIColor(me.color) }}>{youText}</h1>
        <span>Players </span>
        {winners.map((p) => (
          <span
            key={p.color}
            style={{ color: mapPlayerColorToUIColor(p.color) }}
          >
            {p.playerInfo.nickname}{" "}
          </span>
        ))}
        <span>have successfully framed the scapegoat: </span>
        <span
          style={{
            color: mapPlayerColorToUIColor(game.scapegoat)
          }}
        >
          {
            game.players.find((p) => p.color === game.scapegoat)!.playerInfo
              .nickname
          }
        </span>
        {remakeButton}
        {backToLobbyButton}
      </>
    );
  }
};
