import React from "react";
import { PlayerColor } from "../common/game";
import { mapPlayerColorToUIColor } from "./format";

type Props = { backgroundColor: PlayerColor; playerId: string };

export const PlayerToken: React.FC<Props> = ({ backgroundColor, playerId }) => {
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
