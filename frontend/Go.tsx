import React from "react";
import { GoatPlayer } from "../common/game";
import { formatNickname, mapPlayerColorToUIColor } from "./format";

type Props = { player: GoatPlayer<"UI"> & { me: true } };

export const Go: React.FC<Props> = ({ player }) => (
  <div className="go">
    <div>The game starts!</div>
    <div>
      You are{" "}
      <span style={{ color: mapPlayerColorToUIColor(player.color) }}>
        {formatNickname(player)}
      </span>
    </div>
    <div>
      You <em>think</em> the scapegoat is{" "}
      <span style={{ color: mapPlayerColorToUIColor(player.suspect) }}>
        {player.suspect}
      </span>
    </div>
  </div>
);
