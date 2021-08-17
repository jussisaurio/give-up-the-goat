import React from "react";
import { Socket } from "socket.io-client";
import { TitleAndLogo } from "./TitleAndLogo";

type Props = {
  nickname: String;
  onCreateGameClick: (e: React.MouseEvent) => void;
};

export const HomeScreen = ({ nickname, onCreateGameClick }: Props) => {
  return (
    <section className="fixedCenterContainer">
      <TitleAndLogo />
      <div className="lobbyDescription">
        Give Up The Goat is a web-app implementation of the card game{" "}
        <a href="http://indieboardsandcards.com/index.php/our-games/scape-goat/">
          Scape Goat
        </a>{" "}
        by <a href="https://jonperry.com/scapegoat.html">Jon Perry</a>.{" "}
        <a href="https://www.amazon.com/Indie-Boards-Cards-Scape-Goat/dp/B08K3SD91K">
          Buy it here.
        </a>{" "}
        This game is an unofficial fan implementation that is not affiliated
        with the game author(s) or the publisher.
      </div>
      {nickname && (
        <div>
          Your autogenerated nickname for this session is{" "}
          <strong>{nickname}</strong>
        </div>
      )}
      <button onClick={onCreateGameClick}>Create New Game</button>
      <div>
        If you want to join an existing game, get a link from your friend.
      </div>
    </section>
  );
};