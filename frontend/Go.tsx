import React from "react";
import { GoatPlayer } from "../common/game";
import { formatNickname, mapPlayerColorToUIColor } from "./format";

export const Go = ({ player }: { player: GoatPlayer<"UI"> & { me: true } }) => (
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
