import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  useLocation,
  useHistory
} from "react-router-dom";
import { io, Socket } from "socket.io-client";
import {
  Card,
  DealtCard,
  Game,
  GameAction,
  GoatPlayer,
  PlayerColor
} from "./game";
import "./App.css";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { ClientEvent, GameActionEvent, ServerEvent } from "./common";

type UICard =
  | {
      face: "DOWN";
    }
  | {
      face: "UP";
      card: Card;
    };

const noop = () => {};

type PlayerTokenProps = { backgroundColor: PlayerColor };
const PlayerToken = ({ backgroundColor }: PlayerTokenProps) => {
  return (
    <div style={{ backgroundColor }} className="playerToken">
      <img
        style={{ width: "75%", height: "auto" }}
        src="/assets/Stylized-Goat-Line-Art.svg"
      ></img>
    </div>
  );
};

const PreparationToken = () => {
  return <div className="preparationToken">P</div>;
};

const CardComponent = ({
  card,
  className,
  style,
  disabled = false,
  onClick
}: {
  card: UICard;
  className?: string;
  style?: any;
  disabled?: boolean;
  onClick: (...args: any) => void;
}) => {
  const classN = "card" + (className ? " " + className : "");

  if (card.face === "DOWN") {
    return (
      <div
        onClick={disabled ? noop : onClick}
        className={classN}
        style={{
          ...(disabled && { opacity: "50%", cursor: "initial" }),
          backgroundColor: "#654321",
          ...style
        }}
      >
        <span style={{ color: "white", fontSize: "2rem" }}>?</span>
      </div>
    );
  }

  if (card.card.type === "dual") {
    const [firstColor, secondColor] = card.card.colors;
    return (
      <div
        onClick={disabled ? noop : onClick}
        className={classN}
        style={{
          ...(disabled && { opacity: "50%", cursor: "initial" }),
          backgroundImage: `linear-gradient(115deg, ${firstColor} 50%, ${secondColor} 50%)`,
          ...style
        }}
      >
        <img
          style={{ width: "75%", height: "auto" }}
          src="/assets/Stylized-Goat-Line-Art.svg"
        ></img>
      </div>
    );
  } else if (card.card.type === "single") {
    return (
      <div
        onClick={disabled ? noop : onClick}
        className={classN}
        style={{
          ...(disabled && { opacity: "50%", cursor: "initial" }),
          backgroundColor: card.card.color,
          ...style
        }}
      >
        <img
          style={{ width: "75%", height: "auto" }}
          src="/assets/Stylized-Goat-Line-Art.svg"
        ></img>
      </div>
    );
  } else if (card.card.type === "neutral") {
    return (
      <div
        onClick={disabled ? noop : onClick}
        className={classN}
        style={{
          ...(disabled && { opacity: "50%", cursor: "initial" }),
          backgroundColor: "grey",
          ...style
        }}
      >
        <img
          style={{ width: "75%", height: "auto" }}
          src="/assets/Neutral.svg"
        ></img>
      </div>
    );
  }
};

type GameScreenProps = {
  game: Game | null;
  onStartGame: (e: React.MouseEvent) => void;
  nickname: string;
  publicState: PublicState | null;
  secretState: SecretState | null;
  dispatch: (e: GameAction) => void;
};

const GameScreen = ({
  game,
  onStartGame,
  nickname,
  publicState,
  secretState,
  dispatch
}: GameScreenProps) => {
  if (!game) return null;

  if (game.state === "WAITING_FOR_PLAYERS") {
    const playerCount = game.playerInfos.length;
    return (
      <div>
        <div>
          This game is waiting to be started and has the following {playerCount}{" "}
          players:
        </div>
        <ul>
          {game.playerInfos.map((pi) => (
            <div key={pi.id}>{pi.nickname}</div>
          ))}
        </ul>
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
  }

  const playerCount = game.players.length;
  const me = game.players.find((p) => p.playerInfo.nickname === nickname);
  const meIndex = game.players.findIndex(
    (p) => p.playerInfo.nickname === nickname
  );

  const otherPlayersClockwiseFromMe = Array(playerCount)
    .fill(null)
    .map((_, index) => {
      return game.players[(meIndex + index) % playerCount];
    })
    .slice(1);

  const playerWithTurn = game.players.find((p, i) => i === game.activePlayer);

  function renderPlayer(player: GoatPlayer) {
    const classN =
      "playerInfo" + (player === playerWithTurn ? " turnAnimation" : "");

    const playerText = publicState?.players.includes(player)
      ? `${player.playerInfo.nickname} ${publicState.message}`
      : player.playerInfo.nickname;

    const cards = (() => {
      if (!secretState) {
        return player.cards.map((card) => ({ card, face: "DOWN" as const }));
      }

      if (secretState.type === "SPY_HAND") {
        return player === secretState.player
          ? secretState.hand.map((card) => ({ card, face: "UP" as const }))
          : player.cards.map((card) => ({ card, face: "DOWN" as const }));
      }

      return player.cards.map((c, i) => {
        if (
          secretState.frameCards.some(
            (fc) =>
              fc.playerId === player.playerInfo.id && fc.playerCardIndex === i
          )
        ) {
          return { card: c, face: "UP" as const };
        }

        return { card: c, face: "DOWN" as const };
      });
    })();

    function onOpponentHandClick() {
      if (game.state !== "ONGOING") return;
      if (
        game.substate.state !== "AWAITING_SPY_CHOOSE_PLAYER" &&
        game.substate.state !== "AWAITING_TRADE_CHOOSE_PLAYER" &&
        game.substate.state !== "AWAITING_STEAL_CHOOSE_PLAYER"
      )
        return;
      const activePlayer = game.players.find(
        (p, i) => i === game.activePlayer
      )!;
      if (activePlayer.color !== me.color || player.color === me.color) return;

      if (game.substate.state === "AWAITING_SPY_CHOOSE_PLAYER") {
        dispatch({
          action: "SPY_ON_PLAYER",
          playerColor: player.color
        });
      } else if (game.substate.state === "AWAITING_TRADE_CHOOSE_PLAYER") {
        dispatch({
          action: "TRADE_WITH_PLAYER",
          playerColor: player.color
        });
      } else if (
        game.substate.state === "AWAITING_STEAL_CHOOSE_PLAYER" &&
        player.preparationTokens > 0
      ) {
        dispatch({
          action: "STEAL_CHOOSE_PLAYER",
          playerColor: player.color
        });
      }
    }

    const isActivePlayer =
      game.state === "ONGOING" &&
      game.players.find((p, i) => i === game.activePlayer)! === me;
    const spyingThisPlayer =
      game.state === "ONGOING" &&
      game.substate.state === "AWAITING_SPY_CONFIRM" &&
      isActivePlayer &&
      game.substate.otherPlayerId === player.playerInfo.id;

    function onSpyConfirm() {
      const isActivePlayer =
        game.state === "ONGOING" &&
        game.players.find((p, i) => i === game.activePlayer)! === me;
      const spying =
        game.state === "ONGOING" &&
        game.substate.state === "AWAITING_SPY_CONFIRM" &&
        isActivePlayer;

      if (!spying) return;

      dispatch({
        action: "SPY_ON_PLAYER_CONFIRM"
      });
    }

    const isTrading =
      publicState?.type === "AWAITING_TRADE_CHOOSE_CARDS" &&
      publicState.players.includes(player);
    return (
      <>
        {(player === playerWithTurn || isTrading) && (
          <div className="loader"></div>
        )}
        <div style={{ color: player.color }} className={classN}>
          {playerText}
        </div>
        <div onClick={onOpponentHandClick} className="cardsContainer">
          {cards.map((card) => (
            <CardComponent
              onClick={noop}
              key={card.card.id}
              style={{ marginRight: "5px" }}
              card={card.face === "UP" ? card : { face: "DOWN" }}
            />
          ))}
          {spyingThisPlayer && (
            <button onClick={onSpyConfirm}>OK, got it</button>
          )}
        </div>
        {player.preparationTokens > 0 && (
          <div className="preparationTokenContainer">
            {Array(player.preparationTokens)
              .fill(null)
              .map((_, i) => {
                return <PreparationToken key={i} />;
              })}
          </div>
        )}
      </>
    );
  }

  const classNameMe =
    "playerInfo" + (me === playerWithTurn ? " turnAnimation" : "");

  const isMyTurn =
    game.players.findIndex((p) => p === me) === game.activePlayer;

  const iHaveCardOfOwnColor = me.cards.some((card) => {
    const cardColors =
      "color" in card ? [card.color] : "colors" in card ? card.colors : [];
    return cardColors.includes(me.color);
  });

  function onCopsClick() {
    dispatch({
      action: "GO_TO_LOCATION",
      location: "COPS"
    });
  }

  return (
    <div
      style={{
        padding: "1vh 1vw 1vw 1vh",
        width: "100vw",
        maxWidth: "100vw",
        height: "100vh",
        maxHeight: "100vh"
      }}
      className="container"
    >
      <div className="player-area player-self">
        <div style={{ color: me.color }} className={classNameMe}>
          {playerWithTurn === me ? "Your turn. " : ""}
          {publicState && publicState.players.includes(me)
            ? publicState.message + ". "
            : ""}
          You suspect the scapegoat is {me.suspect}. You are at '
          {game.locations.find((l) => l.name === me.location).userFacingName}'.
        </div>
        <div className="cardsContainer">
          {me.cards.map((card, i) => {
            function onOwnCardClick() {
              if (
                game.state !== "ONGOING" ||
                !(
                  game.substate.state === "AWAITING_EVIDENCE_SWAP" ||
                  game.substate.state === "AWAITING_TRADE_CHOOSE_CARDS" ||
                  game.substate.state === "AWAITING_STASH_RETURN_CARD" ||
                  game.substate.state === "AWAITING_FRAME_CHOOSE_CARDS"
                )
              )
                return;
              const activePlayer = game.players.find(
                (p, i) => i === game.activePlayer
              )!;

              if (game.substate.state === "AWAITING_EVIDENCE_SWAP") {
                if (activePlayer.color !== me.color) return;
                return dispatch({
                  action: "SWAP_EVIDENCE",
                  playerCardIndex: i
                });
              } else if (
                game.substate.state === "AWAITING_TRADE_CHOOSE_CARDS"
              ) {
                if (
                  activePlayer.playerInfo.id === me.playerInfo.id &&
                  game.substate.mainPlayerCardIndex === null
                ) {
                  dispatch({
                    action: "TRADE_CHOOSE_CARD",
                    playerCardIndex: i
                  });
                } else if (
                  game.substate.otherPlayerId === me.playerInfo.id &&
                  game.substate.otherPlayerCardIndex === null
                ) {
                  dispatch({
                    action: "TRADE_CHOOSE_CARD",
                    playerCardIndex: i
                  });
                }
              } else if (game.substate.state === "AWAITING_STASH_RETURN_CARD") {
                dispatch({
                  action: "STASH_RETURN_CARD",
                  playerCardIndex: i
                });
              } else if (
                game.substate.state === "AWAITING_FRAME_CHOOSE_CARDS"
              ) {
                dispatch({
                  action: "FRAME_CHOOSE_CARD",
                  playerCardIndex: i
                });
              }
            }

            const cardColors =
              "color" in card
                ? [card.color]
                : "colors" in card
                ? card.colors
                : [];
            return (
              <CardComponent
                onClick={onOwnCardClick}
                disabled={
                  game.substate.state === "AWAITING_EVIDENCE_SWAP" &&
                  isMyTurn &&
                  iHaveCardOfOwnColor &&
                  !cardColors.includes(me.color)
                }
                key={card.id}
                style={{ marginRight: "5px" }}
                card={{ face: "UP", card }}
              />
            );
          })}
        </div>
        {me.preparationTokens > 0 && (
          <div className="preparationTokenContainer">
            {Array(me.preparationTokens)
              .fill(null)
              .map((_, i) => {
                return <PreparationToken key={i} />;
              })}
          </div>
        )}
      </div>
      <div className="player-area player-2">
        {(() => {
          if (playerCount < 5) return "(empty seat)";
          return renderPlayer(otherPlayersClockwiseFromMe[0]);
        })()}
      </div>
      <div className="player-area player-3">
        {(() => {
          if (playerCount < 5)
            return renderPlayer(otherPlayersClockwiseFromMe[0]);
          return renderPlayer(otherPlayersClockwiseFromMe[1]);
        })()}
      </div>
      <div className="player-area player-4">
        {(() => {
          if (playerCount < 4) return "(empty seat)";
          if (playerCount === 4)
            return renderPlayer(otherPlayersClockwiseFromMe[1]);
          return renderPlayer(otherPlayersClockwiseFromMe[2]);
        })()}
      </div>
      <div className="player-area player-5">
        {(() => {
          if (playerCount === 3)
            return renderPlayer(otherPlayersClockwiseFromMe[1]);
          if (playerCount === 4)
            return renderPlayer(otherPlayersClockwiseFromMe[2]);
          if (playerCount === 5)
            return renderPlayer(otherPlayersClockwiseFromMe[3]);
          if (playerCount === 6)
            return renderPlayer(otherPlayersClockwiseFromMe[3]);
        })()}
      </div>
      <div className="player-area player-6">
        {(() => {
          if (playerCount < 6) return "(empty seat)";
          return renderPlayer(otherPlayersClockwiseFromMe[4]);
        })()}
      </div>
      <div className="common">
        {game.locations
          .filter((l) => l.name !== "COPS")
          .map((l) => {
            const myLocation = me.location === l.name;
            const myTurn =
              game.players.findIndex((p) => p === me) === game.activePlayer;
            const style =
              myLocation &&
              myTurn &&
              game.substate.state === "AWAITING_MAIN_PLAYER_CHOOSE_LOCATION"
                ? { opacity: "50%", cursor: "initial" }
                : {};

            function onLocationClick() {
              if (game.state !== "ONGOING") return;
              if (
                game.substate.state !== "AWAITING_MAIN_PLAYER_CHOOSE_LOCATION"
              )
                return;
              const activePlayer = game.players.find(
                (p, i) => i === game.activePlayer
              )!;
              if (activePlayer.color !== me.color) return;
              if (me.location === l.name) return;

              dispatch({
                action: "GO_TO_LOCATION",
                location: l.name
              });
            }

            function onStashCardClick(stashCardIndex: number) {
              if (
                game.state !== "ONGOING" ||
                game.substate.state !== "AWAITING_STASH_CHOOSE_CARD"
              )
                return;
              const activePlayer = game.players.find(
                (p, i) => i === game.activePlayer
              )!;
              if (activePlayer.color !== me.color) return;

              dispatch({
                action: "STASH_CHOOSE_CARD",
                stashCardIndex
              });
            }

            return (
              <div
                onClick={onLocationClick}
                style={style}
                className="locationCard"
              >
                <div className="locationTitle">{l.userFacingName}</div>
                <div className="locationContent">
                  {l.name !== "COPS" && (
                    <CardComponent
                      onClick={noop}
                      key={l.card.id}
                      className="locationDealtCard"
                      card={{ face: "UP", card: l.card }}
                    />
                  )}
                  {l.name === "STASH" && (
                    <div className="stashContainer">
                      {l.stash.map((c, i) => (
                        <CardComponent
                          onClick={() => onStashCardClick(i)}
                          key={c.id}
                          className="locationDealtCard stashCard"
                          card={{ face: "DOWN" }}
                        />
                      ))}
                    </div>
                  )}
                  {game.players.filter((p) => p.location === l.name).length >
                    0 && (
                    <div className="playerTokenContainer">
                      {game.players
                        .filter((p) => p.location === l.name)
                        .map((p) => (
                          <PlayerToken
                            key={p.playerInfo.id}
                            backgroundColor={p.color}
                          />
                        ))}
                    </div>
                  )}
                  {l.name === "PREPARE" && game.preparationTokens > 0 && (
                    <div className="preparationTokenContainer">
                      {Array(game.preparationTokens)
                        .fill(null)
                        .map((_, i) => {
                          return <PreparationToken key={i} />;
                        })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>
      <div
        onClick={isMyTurn ? onCopsClick : noop}
        className={isMyTurn ? "cops" : "cops cops-disabled"}
      >
        GO TO THE COPS
      </div>
      {game.state === "FINISHED" && (
        <>
          <div className="finishedOverlay"></div>
          <div className="finishedContent">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                flex: 1,
                height: "100vh"
              }}
            >
              {(() => {
                const players = game.winnerPlayerIds.map(
                  (id) => game.players.find((p) => p.playerInfo.id === id)!
                );
                if (players.length === 1) {
                  if (
                    game.players.findIndex((p) => p === players[0]) ===
                    game.activePlayer
                  ) {
                    return (
                      <>
                        <span>The spidey senses of scapegoat </span>
                        <span style={{ color: game.scapegoat }}>
                          {players[0].playerInfo.nickname}
                        </span>
                        <span>
                          {" "}
                          correctly led them to run to the cops and win the
                          game!
                        </span>
                        <button onClick={() => window.location.replace("/")}>
                          Back to lobby
                        </button>
                      </>
                    );
                  } else {
                    const copCaller = game.players.find(
                      (p, i) => i === game.activePlayer
                    )!;
                    return (
                      <>
                        <span>The unwarranted paranoia of</span>
                        <span style={{ color: copCaller.color }}>
                          {" "}
                          {copCaller.playerInfo.nickname}{" "}
                        </span>
                        <span>
                          caused them to run to the cops and ruin it for the
                          rest of them!
                        </span>
                        <span style={{ color: game.scapegoat }}>
                          {" "}
                          {players[0].playerInfo.nickname} the scapegoat{" "}
                        </span>
                        <span>wins the game!</span>
                        <button onClick={() => window.location.replace("/")}>
                          Back to lobby
                        </button>
                      </>
                    );
                  }
                } else {
                  return (
                    <>
                      <span>Players </span>
                      {players.map((p) => (
                        <span style={{ color: p.color }}>
                          {p.playerInfo.nickname}{" "}
                        </span>
                      ))}
                      <span>have successfully framed the scapegoat: </span>
                      <span style={{ color: game.scapegoat }}>
                        {
                          game.players.find((p) => p.color === game.scapegoat)
                            .playerInfo.nickname
                        }
                      </span>
                      <button onClick={() => window.location.replace("/")}>
                        Back to lobby
                      </button>
                    </>
                  );
                }
              })()}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

type HomeProps = {
  nickname: String;
  socket: Socket;
};

const Home = ({ nickname, socket }: HomeProps) => {
  const onCreateGameClick = (e: React.MouseEvent) => {
    e.preventDefault();
    socket.emit("CLIENT_EVENT", { type: "GAME_CREATE", payload: { nickname } });
  };
  return (
    <section>
      <div>Scape Goat Online Version</div>
      {nickname && <div>Your autogenerated name is {nickname}</div>}
      <button onClick={onCreateGameClick}>Create New Game</button>
      <div>
        If you want to join an existing game, get a link from your friend.
      </div>
    </section>
  );
};

type PublicState = {
  type: string;
  players: GoatPlayer[];
  message: string;
};

type SecretState =
  | {
      type: "SPY_HAND";
      player: GoatPlayer;
      hand: DealtCard[];
    }
  | {
      type: "FRAME_CHECK";
      frameCards: { playerId: string; playerCardIndex: number }[];
    };

const SOUNDS = {
  COPS: new Audio("/assets/cops.wav"),
  CARD: new Audio("/assets/card.wav"),
  PAGE_FLIP: new Audio("/assets/page_flip.wav"),
  GOAT: new Audio("/assets/goat.wav"),
  FRAME_CHECK: new Audio("/assets/frame_check.wav"),
  FRAME_SUCCESS: new Audio("/assets/frame_success.wav"),
  FRAME_FAILURE: new Audio("/assets/frame_failure.wav"),
  STEAL: new Audio("/assets/steal.wav")
};

const App = () => {
  const history = useHistory();
  const location = useLocation();
  const [nickname, setNickname] = useState("");
  const [game, setGame] = useState<Game | null>(null);
  const [publicState, setPublicState] = useState<PublicState | null>(null);
  const [secretState, setSecretState] = useState<SecretState | null>(null);
  const [socket, setSocket] = useState<
    Socket<DefaultEventsMap, DefaultEventsMap>
  >(io());

  function handleGameActionEvent(e: GameActionEvent) {
    const activeGame = e.game;
    if (!activeGame) {
      console.error("Got event for game not in progress....?");
      return;
    }

    setGame(activeGame);

    const activePlayer = activeGame.players.find(
      (p, i) => i === activeGame.activePlayer
    );

    switch (e.type) {
      case "PAUSED_FOR_COPS_CHECK": {
        setGame(e.game);
        SOUNDS.COPS.play();
        return;
      }
      case "PAUSED_FOR_FRAME_CHECK": {
        setGame(e.game);
        setSecretState({
          type: "FRAME_CHECK",
          frameCards: e.frameCards
        });
        SOUNDS.FRAME_CHECK.play();
        return;
      }
      case "FAILED_FRAME_ATTEMPT": {
        setGame(e.game);
        setSecretState(null);
        const location = activeGame.locations.find(
          (l) => l.name === activePlayer.location
        );
        SOUNDS.FRAME_FAILURE.play();
        return setPublicState({
          type: e.type,
          players: [activePlayer],
          message: `choose card to swap with face up card at '${location.userFacingName}'`
        });
      }
      case "GAME_FINISHED_COPS": {
        setGame(e.game);
        if (e.copCallerId === e.winnerPlayerIds[0]) {
          SOUNDS.STEAL.play();
        } else {
          SOUNDS.GOAT.play();
        }
        return;
      }
      case "GAME_FINISHED_FRAME": {
        setGame(e.game);
        SOUNDS.FRAME_SUCCESS.play();
        return;
      }
      case "AWAITING_FRAME_CHOOSE_CARDS": {
        SOUNDS.PAGE_FLIP.play();
        setGame(e.game);
        setPublicState({
          type: "AWAITING_FRAME_CHOOSE_CARDS",
          players: e.game.players.filter(
            (p) =>
              e.game.substate.state === "AWAITING_FRAME_CHOOSE_CARDS" &&
              e.game.substate.cards.every((c) => c.playerId !== p.playerInfo.id)
          ),
          message: "choose a card for Frame Attempt!"
        });
        return;
      }
      case "AWAITING_STEAL_CHOOSE_PLAYER": {
        setGame(e.game);
        SOUNDS.STEAL.play();
        setPublicState({
          type: "AWAITING_STEAL_CHOOSE_PLAYER",
          players: [activePlayer],
          message: "choose a player to Steal preparation token from"
        });
        return;
      }
      case "AWAITING_MAIN_PLAYER_CHOOSE_LOCATION": {
        SOUNDS.GOAT.play();
        return setPublicState({
          type: e.type,
          players: [activePlayer],
          message: "choose location"
        });
      }
      case "AWAITING_TRADE_CHOOSE_PLAYER": {
        return setPublicState({
          type: e.type,
          players: [activePlayer],
          message: "choose player to trade with"
        });
      }
      case "AWAITING_TRADE_CHOOSE_CARDS": {
        SOUNDS.PAGE_FLIP.play();
        const players = activeGame.players.filter((p) =>
          e.waitingForPlayers.some((id) => p.playerInfo.id === id)
        );
        return setPublicState({
          type: e.type,
          players,
          message: "choose card to trade"
        });
      }
      case "AWAITING_SPY_CHOOSE_PLAYER": {
        return setPublicState({
          type: e.type,
          players: [activePlayer],
          message: "choose player whose hand to look at"
        });
      }
      case "AWAITING_SPY_CONFIRM": {
        SOUNDS.CARD.play();
        const otherPlayer = activeGame.players.find(
          (p) => p.playerInfo.id === e.otherPlayerId
        )!.color;
        return setPublicState({
          type: e.type,
          players: [activePlayer],
          message: `Looking at ${otherPlayer}'s hand`
        });
      }
      case "SPY_HAND": {
        return setSecretState({
          type: "SPY_HAND",
          player: activeGame.players.find(
            (p) => p.playerInfo.id === e.otherPlayerId
          ),
          hand: e.hand
        });
      }
      case "AWAITING_STASH_CHOOSE_CARD": {
        return setPublicState({
          type: e.type,
          players: [activePlayer],
          message: "choose a card from stash"
        });
      }
      case "AWAITING_STASH_RETURN_CARD": {
        SOUNDS.CARD.play();
        return setPublicState({
          type: e.type,
          players: [activePlayer],
          message: `choose a card from hand to return to stash slot #${
            e.stashCardIndex + 1
          }`
        });
      }
      case "AWAITING_EVIDENCE_SWAP": {
        const location = activeGame.locations.find(
          (l) => l.name === activePlayer.location
        );
        return setPublicState({
          type: e.type,
          players: [activePlayer],
          message: `choose card to swap with face up card at '${location.userFacingName}'`
        });
      }
    }
  }

  useEffect(() => {
    socket.on("SERVER_EVENT", (msg: ServerEvent) => {
      if (msg.type === "ASSIGN_NICKNAME") {
        setNickname(msg.payload.nickname);
      } else if (msg.type === "GAME_CREATED") {
        history.push("/game/" + msg.payload.code);
      } else if (msg.type === "GAME_JOINED") {
        const game = msg.payload.game;
        setGame(game);
      } else if (msg.type === "GAME_STARTED") {
        setGame(msg.payload.game);
      } else if (msg.type === "GAME_ACTION_EVENT") {
        handleGameActionEvent(msg.payload);
      }
    });

    socket.on("SERVER_ERROR", (e: string) => {
      if (e === "GAME_DOESNT_EXIST") {
        history.push("/");
      }
    });
  }, [socket]);

  useEffect(() => {
    const connectedAndGameURL =
      socket.connected && nickname && location.pathname.startsWith("/game/");

    if (connectedAndGameURL) {
      const codeFromURL = location.pathname.split("/").pop() ?? null;
      if (codeFromURL) {
        socket.emit("CLIENT_EVENT", {
          type: "GAME_JOIN",
          payload: { code: codeFromURL, nickname }
        });
      }
    }
  }, [nickname, location.pathname, socket.connected]);

  const onStartGame = (e: React.MouseEvent) => {
    e.preventDefault();
    const codeFromURL = location.pathname.split("/").pop() ?? null;
    if (codeFromURL) {
      socket.emit("CLIENT_EVENT", {
        type: "GAME_START",
        payload: { code: codeFromURL }
      });
    }
  };

  function dispatch(payload: GameAction) {
    if (game.state !== "ONGOING") return;
    const codeFromURL = location.pathname.split("/").pop() ?? null;
    if (!codeFromURL) return;

    socket.emit("CLIENT_EVENT", {
      type: "GAME_ACTION",
      code: codeFromURL,
      payload
    });

    if (payload.action === "SPY_ON_PLAYER_CONFIRM") {
      setSecretState(null);
    }
  }

  return socket.connected ? (
    <Switch>
      <Route exact path="/">
        <Home nickname={nickname} socket={socket} />
      </Route>
      <Route path="/game">
        <GameScreen
          publicState={publicState}
          secretState={secretState}
          nickname={nickname}
          onStartGame={onStartGame}
          game={game}
          dispatch={dispatch}
        />
      </Route>
    </Switch>
  ) : null;
};

ReactDOM.render(
  <Router>
    <App></App>
  </Router>,
  document.getElementById("app")
);
