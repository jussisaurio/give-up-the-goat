import React from "react";
import { NicknameEditor } from "./NicknameEditor";
import { TitleAndLogo } from "./TitleAndLogo";

type Props = {
  nickname: string;
  onCreateGameClick: (e: React.MouseEvent) => void;
  onChangeNickname: (n: string) => void;
};

export const HomeScreen: React.FC<Props> = ({
  nickname,
  onCreateGameClick,
  onChangeNickname
}) => {
  return (
    <main className="screen">
    <section className="fixedCenterContainer">
      <TitleAndLogo />
      <div className="lobbyDescription">
        <p>
          Give Up The Goat is a web-app implementation of the card game{" "}
          <a href="http://indieboardsandcards.com/index.php/our-games/scape-goat/">
            Scape Goat
          </a>{" "}
          by <a href="https://jonperry.com/scapegoat.html">Jon Perry</a>.{" "}
          <a href="https://www.amazon.com/Indie-Boards-Cards-Scape-Goat/dp/B08K3SD91K">
            Buy it here.
          </a>{" "}
        </p>
        <p>
          This game is an unofficial fan implementation that is not affiliated
          with the game author(s) or the publisher.
        </p>
      </div>
      {nickname && (
        <NicknameEditor onSubmit={onChangeNickname} current={nickname} />
      )}
      <button onClick={onCreateGameClick}>Create New Game</button>
      <div>
        If you want to join an existing game, get a link from your friend.
      </div>
    </section>
    </main>
  );
};
