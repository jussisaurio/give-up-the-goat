import React, { useState } from "react";
import { PlayerInfo } from "../common/game";
import { NicknameEditor } from "./NicknameEditor";
import { TitleAndLogo } from "./TitleAndLogo";

type Props = {
  onStartGame: (...args: any[]) => void;
  nickname: string;
  onChangeNickname: (n: string) => void;
  playerInfos: PlayerInfo[];
};

export const WaitGameStartScreen: React.FC<Props> = ({
  onStartGame,
  nickname,
  onChangeNickname,
  playerInfos
}) => {
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  const playerCount = playerInfos.length;

  return (
    <div className="fixedCenterContainer">
      <TitleAndLogo />
      <button
        disabled={copiedToClipboard}
        onClick={() => {
          navigator.clipboard.writeText(window.location.href).then(() => {
            setCopiedToClipboard(true);
          });
        }}
      >
        {copiedToClipboard ? "Link copied!" : "Copy game link to clipboard"}
      </button>
      <div>
        This game is waiting to be started and has the following {playerCount}{" "}
        players:
      </div>
      <ul>
        {playerInfos.map((pi) => (
          <div key={pi.id}>
            <strong>
              {pi.nickname}
              {pi.nickname === nickname ? "(you)" : ""}
            </strong>
          </div>
        ))}
      </ul>
      <NicknameEditor onSubmit={onChangeNickname} current={nickname} />
      {playerCount < 3 ? (
        <div>A minimum of 3 players required to start</div>
      ) : (
        <div>
          <div>
            You can either wait for more players to join or start the game
          </div>
          <button onClick={onStartGame}>Start game now</button>
        </div>
      )}
    </div>
  );
};
