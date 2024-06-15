import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  useLocation,
  useHistory
} from "react-router-dom";
import { io } from "socket.io-client";
import {
  Game,
  GameAction,
  GameInStartedState,
  GoatPlayer
} from "../common/game";
import "./App.css";
import { ServerEvent } from "../common/eventTypes";
import { PlayingCard } from "./Card";
import { HomeScreen } from "./HomeScreen";
import { WaitGameStartScreen } from "./WaitGameStartScreen";
import {
  formatLogEntry,
  formatNickname,
  formatPlayerActionText,
  mapPlayerColorToUIColor
} from "./format";
import {
  getActivePlayer,
  getMe,
  isChoosingCard,
  isFrameCard,
  playerCanGoToTheCops
} from "../common/logicHelpers";
import { EndGameScreenContent } from "./EndGameScreen";
import { Go } from "./Go";
import { getSeatingDesignation } from "./seating";
import {
  getCardFlyTowardsLocationAnimation,
  getCardFlyTowardsPlayerAnimation,
  getCardFlyTowardsStashAnimation
} from "./animations";
import { PreparationToken } from "./PreparationToken";
import { Opponent } from "./Opponent";
import { noop } from "../common/toolbox";
import { PlayerToken } from "./PlayerToken";
import { PlayerCount } from "../common/cardsAndPlayers";

function usePrevious<T>(value: T): T | undefined {
  const ref = React.useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

type GameScreenProps = {
  game: Game<"UI"> | null;
  onStartGame: (e: React.MouseEvent) => void;
  onRemake: (e: React.MouseEvent) => void;
  onChangeNickname: (e: string) => void;
  nickname: string;
  dispatch: (e: GameAction) => void;
  connectedPlayers: string[];
};

const GameScreen = ({
  connectedPlayers,
  game,
  onStartGame,
  nickname,
  onChangeNickname,
  onRemake,
  dispatch
}: GameScreenProps) => {
  const prevGame = usePrevious(game);
  const [startOverlay, setStartOverlay] = useState(false);
  useEffect(() => {
    if (
      (prevGame?.state === "FINISHED" ||
        prevGame?.state === "WAITING_FOR_PLAYERS") &&
      game?.state === "ONGOING"
    ) {
      setStartOverlay(true);
      setTimeout(() => {
        setStartOverlay(false);
      }, 4000);
    }
  }, [game, prevGame]);

  if (!game) return null;

  if (game.state === "WAITING_FOR_PLAYERS") {
    return (
      <WaitGameStartScreen
        playerInfos={game.playerInfos}
        onChangeNickname={onChangeNickname}
        nickname={nickname}
        onStartGame={onStartGame}
      />
    );
  }

  const playerCount = game.players.length;
  const me = getMe(game);

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

  const renderEmptyPlayer = (playerNumber: number) => {
    return (
      <div key={playerNumber} className={`player-area player-${playerNumber}`}>
        <small style={{ color: "grey" }}>(empty seat)</small>
      </div>
    );
  };

  const onOpponentHandClick = (player: GoatPlayer<"UI">) => {
    if (
      game.substate.expectedAction !== "SPY_ON_PLAYER" &&
      game.substate.expectedAction !== "TRADE_CHOOSE_PLAYER" &&
      game.substate.expectedAction !== "STEAL_CHOOSE_PLAYER"
    ) {
      return;
    }
    const activePlayer = getActivePlayer(game);
    if (activePlayer.color !== me.color || player.color === me.color) return;

    if (game.substate.expectedAction === "SPY_ON_PLAYER") {
      dispatch({
        action: "SPY_ON_PLAYER",
        playerColor: player.color
      });
    } else if (game.substate.expectedAction === "TRADE_CHOOSE_PLAYER") {
      dispatch({
        action: "TRADE_CHOOSE_PLAYER",
        playerColor: player.color
      });
    } else if (
      game.substate.expectedAction === "STEAL_CHOOSE_PLAYER" &&
      player.preparationTokens.length > 0
    ) {
      dispatch({
        action: "STEAL_CHOOSE_PLAYER",
        playerColor: player.color
      });
    }
  };

  const onSpyConfirm = () =>
    dispatch({
      action: "SPY_ON_PLAYER_CONFIRM"
    });

  const isMyTurn =
    game.players.findIndex((p) => p === me) === game.activePlayer;

  const iHaveCardOfOwnColor = me.cards.some(({ card }) => {
    const cardColors =
      "color" in card ? [card.color] : "colors" in card ? card.colors : [];
    return cardColors.includes(me.color) || card.type === "joker";
  });

  const onCopsClick = () =>
    dispatch({
      action: "GO_TO_LOCATION",
      location: "COPS"
    });

  const canGoToCops = playerCanGoToTheCops(me, game);

  const classNameMyArea = "player-area player-self";

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
      <div
        id={"player-area-" + me.playerInfo.id}
        style={{
          border: `2px solid ${mapPlayerColorToUIColor(me.color)}`
        }}
        className={classNameMyArea}
      >
        <div className="playerInfo">
          <div style={{ color: mapPlayerColorToUIColor(me.color) }}>
            You are {formatNickname(me)}
          </div>
          <div className={me === playerWithTurn ? "turnAnimation" : ""}>
            {formatPlayerActionText(game, me)}
          </div>
          <div className="smallerText">
            You think the scapegoat is{" "}
            <span style={{ color: me.suspect }}>
              {formatNickname(
                game.players.find((p) => p.color === me.suspect)!
              )}
            </span>
          </div>
        </div>
        <div className="cardsContainer">
          {Array(game.players.length > 4 ? 4 : 3)
            .fill(null)
            .map((_, i) => {
              const card = me.cards[i];
              if (!card) {
                return (
                  <div
                    key={me.playerInfo.id + i}
                    id={`player-${me.playerInfo.id}-slot-${i + 1}`}
                    className="cardPlaceholder"
                  />
                );
              }

              const cardIsChosenFrameCard = isFrameCard(me, i, game);

              const tradeAnimation = getCardFlyTowardsPlayerAnimation(
                game,
                me,
                i
              );

              const id = `player-${me.playerInfo.id}-slot-${i + 1}`;

              function onOwnCardClick(
                game: GameInStartedState<"UI">,
                myself: GoatPlayer<"UI"> & { me: true }
              ) {
                if (
                  game.state !== "ONGOING" ||
                  !(
                    game.substate.expectedAction === "SWAP_EVIDENCE" ||
                    game.substate.expectedAction === "TRADE_CHOOSE_CARD" ||
                    game.substate.expectedAction === "STASH_RETURN_CARD" ||
                    game.substate.expectedAction === "FRAME_CHOOSE_CARD"
                  )
                )
                  return;
                const activePlayer = getActivePlayer(game);

                if (game.substate.expectedAction === "SWAP_EVIDENCE") {
                  if (activePlayer.color !== myself.color) return;
                  return dispatch({
                    action: "SWAP_EVIDENCE",
                    playerCardIndex: i
                  });
                } else if (
                  game.substate.expectedAction === "TRADE_CHOOSE_CARD"
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
                } else if (
                  game.substate.expectedAction === "STASH_RETURN_CARD"
                ) {
                  dispatch({
                    action: "STASH_RETURN_CARD",
                    playerCardIndex: i
                  });
                } else if (
                  game.substate.expectedAction === "FRAME_CHOOSE_CARD" &&
                  !game.substate.cards.some(
                    (c) => c.playerId === myself.playerInfo.id
                  )
                ) {
                  dispatch({
                    action: "FRAME_CHOOSE_CARD",
                    playerCardIndex: i,
                  });
                }
              }

              const cardColors =
                "color" in card.card
                  ? [card.card.color]
                  : "colors" in card.card
                  ? card.card.colors
                  : [];

              const disabled =
                game.substate.expectedAction === "SWAP_EVIDENCE" &&
                isMyTurn &&
                iHaveCardOfOwnColor &&
                !cardColors.includes(me.color) &&
                card.card.type !== "joker";

              const selectable =
                !disabled &&
                isChoosingCard(me, game) &&
                game.substate.expectedAction !== "STASH_CHOOSE_CARD";
              return (
                <PlayingCard
                  id={id}
                  animation={tradeAnimation}
                  className={selectable ? "highlightCard" : ""}
                  onClick={() => onOwnCardClick(game, me)}
                  disabled={disabled}
                  selectable={selectable}
                  key={me.playerInfo.id + i}
                  style={{
                    marginRight: "5px",
                    ...(cardIsChosenFrameCard && {
                      transform: "scale(2)",
                      transition: "transform 200ms"
                    })
                  }}
                  card={card}
                />
              );
            })}
        </div>
        {me.preparationTokens.length > 0 && (
          <div className="absolutePositionedPreparationTokenContainer">
            {me.preparationTokens.some((t) => t === "TOKEN-1") && (
              <PreparationToken game={game} player={me} token={"TOKEN-1"} />
            )}
            {me.preparationTokens.some((t) => t === "TOKEN-2") && (
              <PreparationToken game={game} player={me} token={"TOKEN-2"} />
            )}
          </div>
        )}
      </div>
      {(() => {
        const seatingDesignation = getSeatingDesignation(
          game.players.length as PlayerCount
        );
        return [0, 1, 2, 3, 4].map((otherPlayerIndex) => {
          const playerNumber = otherPlayerIndex + 2; // index 0 is player #2 etc -- hero is always player #1
          const seat = seatingDesignation[otherPlayerIndex];
          if (seat === "EMPTY") {
            return renderEmptyPlayer(playerNumber);
          } else {
            const player = otherPlayersClockwiseFromMe[seat];
            return (
              <Opponent
                connected={connectedPlayers.includes(player.playerInfo.id)}
                key={playerNumber}
                me={me}
                game={game}
                player={player}
                onSpyConfirm={onSpyConfirm}
                onOpponentHandClick={onOpponentHandClick}
                playerNumber={playerNumber}
              />
            );
          }
        });
      })()}
      <div className="common">
        {game.locations
          .filter((l) => l.name !== "COPS")
          .map((l) => {
            const myLocation = me.location === l.name;
            const myTurn =
              game.players.findIndex((p) => p === me) === game.activePlayer;

            const style = (() => {
              const choosingLocationDisableSameLocation =
                myLocation &&
                myTurn &&
                game.substate.expectedAction === "GO_TO_LOCATION";

              const doingSomethingElseDisableOtherLocations =
                myTurn &&
                !myLocation &&
                game.substate.expectedAction !== "GO_TO_LOCATION";
              if (
                choosingLocationDisableSameLocation ||
                doingSomethingElseDisableOtherLocations
              ) {
                return {
                  opacity: "50%",
                  filter: "brightness(20%)",
                  cursor: "initial"
                };
              }

              if (myLocation && myTurn) {
                return { filter: "brightness(150%)" };
              }

              return {};
            })();

            const onLocationClick = (
              game: GameInStartedState<"UI">,
              myself: GoatPlayer<"UI">
            ) => {
              if (game.substate.expectedAction !== "GO_TO_LOCATION") return;
              const activePlayer = getActivePlayer(game);
              if (activePlayer.color !== myself.color) return;
              if (myself.location === l.name) return;

              dispatch({
                action: "GO_TO_LOCATION",
                location: l.name
              });
            };

            const onStashCardClick = (
              game: GameInStartedState<"UI">,
              myself: GoatPlayer<"UI"> & { me: true },
              stashCardIndex: number
            ) => {
              if (game.substate.expectedAction !== "STASH_CHOOSE_CARD") return;
              const activePlayer = getActivePlayer(game);
              if (activePlayer?.color !== myself.color) return;

              dispatch({
                action: "STASH_CHOOSE_CARD",
                stashCardIndex
              });
            };

            const shouldHighlightLocation =
              isMyTurn &&
              game.substate.expectedAction === "GO_TO_LOCATION" &&
              l.name !== me.location;

            const locationClassName =
              "locationCard" +
              (shouldHighlightLocation ? " highlightElement" : "");

            const cardFlyAnimation = getCardFlyTowardsLocationAnimation(
              game,
              l
            );

            return (
              <div
                id={"location-" + l.name}
                onClick={() => onLocationClick(game, me)}
                key={l.name}
                style={style}
                className={locationClassName}
              >
                <div className="locationTitle">{l.userFacingName}</div>
                <div className="locationContent">
                  {l.name !== "COPS" && (
                    <PlayingCard
                      id={l.name + "-card"}
                      animation={cardFlyAnimation}
                      onClick={noop}
                      key={l.name}
                      className="locationDealtCard"
                      card={l.card}
                    />
                  )}
                  {l.name === "STASH" &&
                    (() => {
                      const selectable =
                        isMyTurn &&
                        game.substate.expectedAction === "STASH_CHOOSE_CARD";

                      const stashCardClassName =
                        "locationDealtCard stashCard" +
                        (selectable ? " highlightCard" : "");
                      return (
                        <div className="stashContainer">
                          {l.stash.map((c, i) => {
                            const cardFlyStashAnim =
                              getCardFlyTowardsStashAnimation(game, i);

                            return (
                              <PlayingCard
                                id={"stash-slot-" + (i + 1)}
                                animation={cardFlyStashAnim}
                                onClick={() => onStashCardClick(game, me, i)}
                                selectable={
                                  isMyTurn &&
                                  game.substate.expectedAction ===
                                    "STASH_CHOOSE_CARD"
                                }
                                key={"stash-" + i}
                                className={stashCardClassName}
                                card={{ face: "DOWN" }}
                              />
                            );
                          })}
                        </div>
                      );
                    })()}
                  {game.players.filter((p) => p.location === l.name).length >
                    0 && (
                    <div className="playerTokenContainer">
                      {game.players
                        .filter((p) => p.location === l.name)
                        .map((p) => (
                          <PlayerToken
                            playerId={p.playerInfo.id}
                            key={p.playerInfo.id}
                            backgroundColor={p.color}
                          />
                        ))}
                    </div>
                  )}
                  {l.name === "PREPARE" && game.preparationTokens.length > 0 && (
                    <div className="absolutePositionedPreparationTokenContainer">
                      {game.preparationTokens.some((t) => t === "TOKEN-1") && (
                        <PreparationToken token={"TOKEN-1"} />
                      )}
                      {game.preparationTokens.some((t) => t === "TOKEN-2") && (
                        <PreparationToken token={"TOKEN-2"} />
                      )}
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
                {formatLogEntry(e, game).map((entry) => (
                  <span
                    key={entry.text + e.ts}
                    style={{
                      fontWeight: entry.bold ? "bold" : undefined,
                      color: entry.color ?? "black",
                      filter: "brightness(80%)"
                    }}
                  >
                    {entry.text}
                  </span>
                ))}
                .
              </div>
            ))}
        </div>
      }
      {(game.state === "FINISHED" || startOverlay) && (
        <>
          <div className="darkOverlay"></div>
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
              {game.state === "FINISHED" ? (
                <EndGameScreenContent game={game} onRemake={onRemake} />
              ) : (
                <Go player={me} />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const SOUNDS = {
  COPS: new Audio("/assets/cops.mp3"),
  CARD: new Audio("/assets/card.mp3"),
  PAGE_FLIP: new Audio("/assets/page_flip.mp3"),
  GOAT: new Audio("/assets/goat.mp3"),
  FRAME_ATTEMPT: new Audio("/assets/frame_attempt.mp3"),
  FRAME_CHECK: new Audio("/assets/frame_check.mp3"),
  FRAME_SUCCESS: new Audio("/assets/frame_success.mp3"),
  FRAME_FAILURE: new Audio("/assets/frame_failure.mp3"),
  STEAL: new Audio("/assets/steal.mp3"),
  TICK: new Audio("/assets/tick.mp3")
};

const socket = io({ transports: ["websocket"] });

const App = () => {
  const history = useHistory();
  const location = useLocation();
  const [nickname, setNickname] = useState("");
  const [game, setGame] = useState<Game<"UI"> | null>(null);
  const [connectedPlayers, setConnectedPlayers] = useState<string[]>([]);

  const lastEventTimestamp =
    game && "events" in game && game.events.length > 0
      ? game.events[game.events.length - 1].ts
      : 0;

  useEffect(() => {
    if (lastEventTimestamp === 0) {
      return;
    }

    if (!game || !("events" in game) || game.events.length === 0) return;

    const lastEvent = game.events[game.events.length - 1];

    SOUNDS.TICK.play().catch(noop);

    if (!("action" in lastEvent)) {
      switch (lastEvent.event) {
        case "FRAME_FAILURE":
          SOUNDS.FRAME_FAILURE.play().catch(noop);
          return;
      }
      return;
    }

    switch (lastEvent.action) {
      case "FRAME_CHOOSE_CARD": {
        game.state !== "PAUSED_FOR_FRAME_CHECK" &&
          SOUNDS.PAGE_FLIP.play().catch(noop);
        return;
      }
      case "GO_TO_LOCATION": {
        if (
          lastEvent.location === "FRAME/STEAL" &&
          game.substate.expectedAction === "FRAME_CHOOSE_CARD"
        ) {
          SOUNDS.FRAME_ATTEMPT.play().catch(noop);
        }
        return;
      }
      case "SPY_ON_PLAYER": {
        SOUNDS.CARD.play().catch(noop);
        return;
      }
      case "SPY_ON_PLAYER_CONFIRM": {
        SOUNDS.CARD.play().catch(noop);
        return;
      }
      case "STASH_CHOOSE_CARD": {
        SOUNDS.PAGE_FLIP.play().catch(noop);
        return;
      }
      case "STASH_RETURN_CARD": {
        SOUNDS.PAGE_FLIP.play().catch(noop);
        return;
      }
      case "STEAL_CHOOSE_PLAYER": {
        SOUNDS.STEAL.play().catch(noop);
        return;
      }
      case "SWAP_EVIDENCE": {
        SOUNDS.PAGE_FLIP.play().catch(noop);
        return;
      }
      case "TRADE_CHOOSE_CARD": {
        SOUNDS.PAGE_FLIP.play().catch(noop);
        return;
      }
      case "TRADE_CHOOSE_PLAYER": {
        SOUNDS.GOAT.play().catch(noop);
        return;
      }
    }
  }, [lastEventTimestamp]);

  useEffect(() => {
    if (!game) return;

    switch (game.state) {
      case "ONGOING": {
        SOUNDS.GOAT.play().catch(noop);
        return;
      }
      case "PAUSED_FOR_FRAME_CHECK": {
        SOUNDS.FRAME_CHECK.play().catch(noop);
        return;
      }
      case "PAUSED_FOR_COPS_CHECK": {
        SOUNDS.COPS.play().catch(noop);
        return;
      }
      case "FINISHED": {
        const me = getMe(game);
        const activePlayer = getActivePlayer(game);
        const scapegoat = game.players.find((p) => p.color === game.scapegoat)!;

        const framed = activePlayer.location === "FRAME/STEAL";

        if (framed) {
          SOUNDS.FRAME_SUCCESS.play().catch(noop);
        } else {
          if (me === scapegoat) {
            // I called the cops successfully
            SOUNDS.STEAL.play().catch(noop);
          } else {
            // Someone else called cops
            SOUNDS.GOAT.play().catch(noop);
          }
        }
        return;
      }
      default:
        return;
    }
  }, [game?.state]);

  useEffect(() => {
    const eventListener = (msg: ServerEvent) => {
      const codeFromURL = location.pathname.split("/").pop() ?? null;
      if (msg.type === "ASSIGN_NICKNAME") {
        setNickname(msg.payload.nickname);
      } else if (msg.type === "GAME_CREATED") {
        history.push("/game/" + msg.payload.code);
      } else if (msg.type === "GAME_STATE_UPDATE") {
        if (msg.payload.code !== codeFromURL) return;
        setGame(msg.payload.game);
      } else if (msg.type === "GAME_CONNECTED_PLAYERS") {
        if (msg.payload.code !== codeFromURL) return;
        setConnectedPlayers(msg.payload.playerIds ?? []);
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
  }

  function onRemake() {
    if (game?.state !== "FINISHED") return;
    const codeFromURL = location.pathname.split("/").pop() ?? null;
    if (!codeFromURL) return;
    socket.emit("CLIENT_EVENT", {
      type: "GAME_REMAKE",
      payload: {
        code: codeFromURL
      }
    });
  }

  const onChangeNickname = (nickname: string) => {
    socket.emit("CLIENT_EVENT", { type: "CHANGE_NICKNAME", nickname });
  };

  const onCreateGameClick = (e: React.MouseEvent) => {
    e.preventDefault();
    socket.emit("CLIENT_EVENT", { type: "GAME_CREATE", payload: { nickname } });
  };

  return socket.connected ? (
    <Switch>
      <Route exact path="/">
        <HomeScreen
          onChangeNickname={onChangeNickname}
          nickname={nickname}
          onCreateGameClick={onCreateGameClick}
        />
      </Route>
      <Route path="/game">
        <GameScreen
          connectedPlayers={connectedPlayers}
          nickname={nickname}
          onChangeNickname={onChangeNickname}
          onStartGame={onStartGame}
          game={game}
          onRemake={onRemake}
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
