import React from "react";
import { PlayerColor } from "../common/game";
import { mapPlayerColorToUIColor } from "./format";

type PlayerTokenProps = { backgroundColor: PlayerColor; playerId: string };
export const PlayerToken = ({
  backgroundColor,
  playerId
}: PlayerTokenProps) => {
  return (
    <div
      id={"playerToken-" + playerId}
      style={{ backgroundColor: mapPlayerColorToUIColor(backgroundColor) }}
      className="playerToken"
    >
      <img
        style={{ width: "75%", height: "auto" }}
        src="/assets/Stylized-Goat-Line-Art.svg"
      ></img>
    </div>
  );
};
