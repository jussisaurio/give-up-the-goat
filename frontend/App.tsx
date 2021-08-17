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
  GameInStartedState,
  GoatPlayer,
  PlayerColor
} from "../common/game";
import "./App.css";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { GameActionEventWithCode, ServerEvent } from "../common/eventTypes";
import { PlayingCard } from "./Card";
import { HomeScreen } from "./HomeScreen";
import { WaitGameStartScreen } from "./WaitGameStartScreen";
import {
  formatLogEntry,
  formatNickname,
  formatPlayerActionText,
  mapPlayerColorToUIColor
} from "./format";
import { isChoosingCard, playerCanGoToTheCops } from "../common/logicHelpers";

const noop = () => {};

type PlayerTokenProps = { backgroundColor: PlayerColor };
const PlayerToken = ({ backgroundColor }: PlayerTokenProps) => {
  return (
    <div
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

const PreparationToken = () => {
  return <div className="preparationToken">P</div>;
};

type GameScreenProps = {
  game: Game | null;
  onStartGame: (e: React.MouseEvent) => void;
  nickname: string;
  secretState: SecretState | null;
  dispatch: (e: GameAction) => void;
};

const GameScreen = ({
  game,
  onStartGame,
  nickname,
  secretState,
  dispatch
}: GameScreenProps) => {
  if (!game) return null;

  if (game.state === "WAITING_FOR_PLAYERS") {
    return (
      <WaitGameStartScreen
        playerInfos={game.playerInfos}
        nickname={nickname}
        onStartGame={onStartGame}
      />
    );
  }

  const playerCount = game.players.length;
  const me = game.players.find((p) => p.playerInfo.nickname === nickname);

  if (!me) {
    throw Error("Bug alert - user is not one of the players in the game");
  }

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

  function renderPlayer(player: GoatPlayer, game: Game) {
    if (game.state === "WAITING_FOR_PLAYERS") return null;
    const classN =
      "playerInfo" + (player === playerWithTurn ? " turnAnimation" : "");

    const playerText = `${formatNickname(player)} - ${formatPlayerActionText(
      game,
      player
    )}`;

    const cards = (() => {
      if (secretState?.type === "SPY_HAND") {
        return player === secretState.player
          ? secretState.hand.map((card) => ({ card, face: "UP" as const }))
          : player.cards.map((card) => ({ card, face: "DOWN" as const }));
      }

      return player.cards.map((c, i) => {
        if (
          game.state === "PAUSED_FOR_FRAME_CHECK" &&
          game.frameCards.some(
            (fc) =>
              fc.playerId === player.playerInfo.id && fc.playerCardIndex === i
          )
        ) {
          return { card: c, face: "UP" as const };
        }

        return { card: c, face: "DOWN" as const };
      });
    })();

    function onOpponentHandClick(game: GameInStartedState) {
      if (!me) {
        console.warn("User is not one of the players in the game?");
        return;
      }
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

    const isTrading = isChoosingCard(player, game);
    return (
      <>
        {(player === playerWithTurn || isTrading) && (
          <div className="loader"></div>
        )}
        <div
          style={{ color: mapPlayerColorToUIColor(player.color) }}
          className={classN}
        >
          {playerText}
        </div>
        <div
          onClick={() => onOpponentHandClick(game)}
          className="cardsContainer"
        >
          {cards.map((card) => (
            <PlayingCard
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
    return cardColors.includes(me.color) || card.type === "joker";
  });

  function onCopsClick() {
    dispatch({
      action: "GO_TO_LOCATION",
      location: "COPS"
    });
  }

  const myLocation = game.locations.find((l) => l.name === me.location);

  if (!myLocation) {
    throw Error("User is at nonexistent location " + me.location);
  }

  const canGoToCops = playerCanGoToTheCops(me, game);

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
        <div
          style={{ color: mapPlayerColorToUIColor(me.color) }}
          className={classNameMe}
        >
          {`You are ${formatNickname(me)}. `}
          {playerWithTurn === me ? "It's your turn! " : ""}
          {formatPlayerActionText(game, me)}
          You suspect the scapegoat is {me.suspect}. You are at '
          {myLocation.userFacingName}'.
        </div>
        <div className="cardsContainer">
          {me.cards.map((card, i) => {
            function onOwnCardClick(
              game: GameInStartedState,
              myself: GoatPlayer
            ) {
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
                if (activePlayer.color !== myself.color) return;
                return dispatch({
                  action: "SWAP_EVIDENCE",
                  playerCardIndex: i
                });
              } else if (
                game.substate.state === "AWAITING_TRADE_CHOOSE_CARDS"
              ) {
                if (
                  activePlayer.playerInfo.id === myself.playerInfo.id &&
                  game.substate.mainPlayerCardIndex === null
                ) {
                  dispatch({
                    action: "TRADE_CHOOSE_CARD",
                    playerCardIndex: i
                  });
                } else if (
                  game.substate.otherPlayerId === myself.playerInfo.id &&
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

            const disabled =
              game.substate.state === "AWAITING_EVIDENCE_SWAP" &&
              isMyTurn &&
              iHaveCardOfOwnColor &&
              !cardColors.includes(me.color) &&
              card.type !== "joker";
            return (
              <PlayingCard
                onClick={() => onOwnCardClick(game, me)}
                disabled={disabled}
                selectable={isMyTurn && isChoosingCard(me, game) && !disabled}
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
          return renderPlayer(otherPlayersClockwiseFromMe[0], game);
        })()}
      </div>
      <div className="player-area player-3">
        {(() => {
          if (playerCount < 5)
            return renderPlayer(otherPlayersClockwiseFromMe[0], game);
          return renderPlayer(otherPlayersClockwiseFromMe[1], game);
        })()}
      </div>
      <div className="player-area player-4">
        {(() => {
          if (playerCount < 4) return "(empty seat)";
          if (playerCount === 4)
            return renderPlayer(otherPlayersClockwiseFromMe[1], game);
          return renderPlayer(otherPlayersClockwiseFromMe[2], game);
        })()}
      </div>
      <div className="player-area player-5">
        {(() => {
          if (playerCount === 3)
            return renderPlayer(otherPlayersClockwiseFromMe[1], game);
          if (playerCount === 4)
            return renderPlayer(otherPlayersClockwiseFromMe[2], game);
          if (playerCount === 5)
            return renderPlayer(otherPlayersClockwiseFromMe[3], game);
          if (playerCount === 6)
            return renderPlayer(otherPlayersClockwiseFromMe[3], game);
        })()}
      </div>
      <div className="player-area player-6">
        {(() => {
          if (playerCount < 6) return "(empty seat)";
          return renderPlayer(otherPlayersClockwiseFromMe[4], game);
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

            function onLocationClick(game: Game, myself: GoatPlayer) {
              if (game.state !== "ONGOING") return;
              if (
                game.substate.state !== "AWAITING_MAIN_PLAYER_CHOOSE_LOCATION"
              )
                return;
              const activePlayer = game.players.find(
                (p, i) => i === game.activePlayer
              )!;
              if (activePlayer.color !== myself.color) return;
              if (myself.location === l.name) return;

              dispatch({
                action: "GO_TO_LOCATION",
                location: l.name
              });
            }

            function onStashCardClick(
              game: Game,
              myself: GoatPlayer,
              stashCardIndex: number
            ) {
              if (
                game.state !== "ONGOING" ||
                game.substate.state !== "AWAITING_STASH_CHOOSE_CARD"
              )
                return;
              const activePlayer = game.players.find(
                (p, i) => i === game.activePlayer
              );
              if (activePlayer?.color !== myself.color) return;

              dispatch({
                action: "STASH_CHOOSE_CARD",
                stashCardIndex
              });
            }

            return (
              <div
                onClick={() => onLocationClick(game, me)}
                style={style}
                className="locationCard"
              >
                <div className="locationTitle">{l.userFacingName}</div>
                <div className="locationContent">
                  {l.name !== "COPS" && (
                    <PlayingCard
                      onClick={noop}
                      key={l.card.id}
                      className="locationDealtCard"
                      card={{ face: "UP", card: l.card }}
                    />
                  )}
                  {l.name === "STASH" && (
                    <div className="stashContainer">
                      {l.stash.map((c, i) => (
                        <PlayingCard
                          onClick={() => onStashCardClick(game, me, i)}
                          selectable={
                            isMyTurn &&
                            game.substate.state === "AWAITING_STASH_CHOOSE_CARD"
                          }
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
        onClick={canGoToCops ? onCopsClick : noop}
        className={canGoToCops ? "cops" : "cops cops-disabled"}
      >
        GO TO THE COPS
      </div>
      {
        <div className="gameLog">
          {[...(game.events || [])]
            .sort((a, b) => b.ts - a.ts)
            .map((e) => (
              <div key={e.ts} className="gameLogEntry">
                {formatLogEntry(e, game)}
              </div>
            ))}
        </div>
      }
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
                        <span
                          style={{
                            color: mapPlayerColorToUIColor(game.scapegoat)
                          }}
                        >
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
                        <span
                          style={{
                            color: mapPlayerColorToUIColor(copCaller.color)
                          }}
                        >
                          {" "}
                          {copCaller.playerInfo.nickname}{" "}
                        </span>
                        <span>
                          caused them to run to the cops and ruin it for the
                          rest of them!
                        </span>
                        <span
                          style={{
                            color: mapPlayerColorToUIColor(game.scapegoat)
                          }}
                        >
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
                        <span
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
                          game.players.find((p) => p.color === game.scapegoat)!
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

type SecretState = {
  type: "SPY_HAND";
  player: GoatPlayer;
  hand: DealtCard[];
};

const SOUNDS = {
  COPS: new Audio("/assets/cops.wav"),
  CARD: new Audio("/assets/card.wav"),
  PAGE_FLIP: new Audio("/assets/page_flip.wav"),
  GOAT: new Audio("/assets/goat.wav"),
  FRAME_CHECK: new Audio("/assets/frame_check.wav"),
  FRAME_SUCCESS: new Audio("/assets/frame_success.wav"),
  FRAME_FAILURE: new Audio("/assets/frame_failure.wav"),
  STEAL: new Audio("/assets/steal.wav"),
  TICK: new Audio("/assets/tick.wav")
};

const App = () => {
  const history = useHistory();
  const location = useLocation();
  const [nickname, setNickname] = useState("");
  const [game, setGame] = useState<Game | null>(null);
  const [secretState, setSecretState] = useState<SecretState | null>(null);
  const [socket, setSocket] = useState<
    Socket<DefaultEventsMap, DefaultEventsMap>
  >(io());

  const lastEventTimestamp =
    game && "events" in game && game.events.length > 0
      ? game.events[game.events.length - 1].ts
      : 0;

  useEffect(() => {
    if (lastEventTimestamp === 0) return;

    if (!game || !("events" in game) || game.events.length === 0) return;

    const lastEvent = game.events[game.events.length - 1];

    SOUNDS.TICK.play();

    if (!("action" in lastEvent)) {
      switch (lastEvent.event) {
        case "FRAME_FAILURE":
          SOUNDS.FRAME_FAILURE.play();
          return;
        case "FRAME_SUCCESS":
          SOUNDS.FRAME_SUCCESS.play();
          return;
      }
      return;
    }

    switch (lastEvent.action) {
      case "FRAME_CHOOSE_CARD": {
        game.state !== "PAUSED_FOR_FRAME_CHECK" && SOUNDS.PAGE_FLIP.play();
        return;
      }
      case "GO_TO_LOCATION": {
        // play some sound
        return;
      }
      case "SPY_ON_PLAYER": {
        SOUNDS.CARD.play();
        return;
      }
      case "SPY_ON_PLAYER_CONFIRM": {
        SOUNDS.CARD.play();
      }
      case "STASH_CHOOSE_CARD": {
        SOUNDS.PAGE_FLIP.play();
        return;
      }
      case "STASH_RETURN_CARD": {
        SOUNDS.PAGE_FLIP.play();
        return;
      }
      case "STEAL_CHOOSE_PLAYER": {
        SOUNDS.STEAL.play();
      }
      case "SWAP_EVIDENCE": {
        SOUNDS.PAGE_FLIP.play();
        return;
      }
      case "TRADE_CHOOSE_CARD": {
        SOUNDS.PAGE_FLIP.play();
        return;
      }
      case "TRADE_WITH_PLAYER": {
        SOUNDS.GOAT.play();
        return;
      }
    }
  }, [lastEventTimestamp]);

  useEffect(() => {
    if (!game) return;

    switch (game.state) {
      case "PAUSED_FOR_FRAME_CHECK": {
        SOUNDS.FRAME_CHECK.play();
        return;
      }
      case "PAUSED_FOR_COPS_CHECK": {
        SOUNDS.COPS.play();
        return;
      }
      case "FINISHED": {
        const activePlayer = game.players.find(
          (p, i) => i === game.activePlayer
        )!;
        const scapegoat = game.players.find((p) => p.color === game.scapegoat)!;

        const framed = activePlayer.location === "FRAME/STEAL";

        if (framed) {
          SOUNDS.FRAME_SUCCESS.play();
        } else {
          if (activePlayer === scapegoat) {
            // Scapegoat correctly called cops
            SOUNDS.STEAL.play();
          } else {
            // Someone else called cops
            SOUNDS.GOAT.play();
          }
        }
      }
      default:
        return;
    }
  }, [game?.state]);

  function handleGameActionEvent(e: GameActionEventWithCode) {
    const activeGame = e.game;
    if (!activeGame) {
      console.error("Got event for game not in progress....?");
      return;
    }

    setGame(activeGame);

    const activePlayer = activeGame.players.find(
      (p, i) => i === activeGame.activePlayer
    );

    if (!activePlayer) {
      throw Error("Bug alert - game doesnt have designated active player");
    }

    switch (e.type) {
      case "FAILED_FRAME_ATTEMPT": {
        setGame(e.game);
        SOUNDS.FRAME_FAILURE.play();
        const location = activeGame.locations.find(
          (l) => l.name === activePlayer.location
        );
        if (!location) {
          throw Error("Bug alert - player is at nonexistent location");
        }
        return setSecretState(null);
      }
      case "SPY_HAND": {
        const otherPlayer = activeGame.players.find(
          (p) => p.playerInfo.id === e.otherPlayerId
        );
        if (!otherPlayer) {
          throw Error("Bug alert - trying to spy on nonexistent player");
        }
        return setSecretState({
          type: "SPY_HAND",
          player: otherPlayer,
          hand: e.hand
        });
      }
      default: {
        setSecretState(null);
      }
    }
  }

  useEffect(() => {
    const eventListener = (msg: ServerEvent) => {
      const codeFromURL = location.pathname.split("/").pop() ?? null;
      if (msg.type === "ASSIGN_NICKNAME") {
        setNickname(msg.payload.nickname);
      } else if (msg.type === "GAME_CREATED") {
        history.push("/game/" + msg.payload.code);
      } else if (msg.type === "GAME_JOINED") {
        const game = msg.payload.game;
        setGame(game);
      } else if (msg.type === "GAME_STARTED") {
        if (msg.payload.code !== codeFromURL) return;
        setGame(msg.payload.game);
      } else if (msg.type === "GAME_ACTION_EVENT") {
        if (msg.payload.code !== codeFromURL) return;
        handleGameActionEvent(msg.payload);
      }
    };

    const errorListener = (e: string) => {
      if (e === "GAME_DOESNT_EXIST") {
        history.push("/");
      }
    };

    socket.on("SERVER_EVENT", eventListener);

    socket.on("SERVER_ERROR", errorListener);

    return () => {
      socket.off("SERVER_EVENT", eventListener);
      socket.off("SERVER_ERROR", errorListener);
    };
  }, [socket, location]);

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
    if (game?.state !== "ONGOING") return;
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

  const onCreateGameClick = (e: React.MouseEvent) => {
    e.preventDefault();
    socket.emit("CLIENT_EVENT", { type: "GAME_CREATE", payload: { nickname } });
  };

  return socket.connected ? (
    <Switch>
      <Route exact path="/">
        <HomeScreen nickname={nickname} onCreateGameClick={onCreateGameClick} />
      </Route>
      <Route path="/game">
        <GameScreen
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
