import React, { useLayoutEffect } from "react";
import { GameInStartedState, GoatPlayer } from "../common/game";
import { getPreparationTokenFliesTowardsPlayerAnimation } from "./animations";

type Props = {
  game?: GameInStartedState<"UI">;
  player?: GoatPlayer<"UI">;
  token: "TOKEN-1" | "TOKEN-2";
};

export const PreparationToken: React.FC<Props> = ({ token, player, game }) => {
  const animation =
    game && player
      ? getPreparationTokenFliesTowardsPlayerAnimation(game, player)
      : undefined;

  const ref = React.useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (ref.current && animation) {
      ref.current.animate(animation.keyframes, animation.timing);
    }
  }, [ref.current, animation?.uid]);

  return (
    <div id={token} ref={ref} className={"preparationToken " + token}>
      P
    </div>
  );
};
