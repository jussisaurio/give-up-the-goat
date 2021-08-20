import React, { useEffect, useLayoutEffect, useState } from "react";
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
  Game,
  GameAction,
  GameInStartedState,
  GoatPlayer,
  PlayerColor,
  PlayerCount
} from "../common/game";
import "./App.css";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
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
  getCardFlyTowardsStashAnimation,
  getPreparationTokenFliesTowardsPlayerAnimation
} from "./animations";

const noop = () => {};

type PlayerTokenProps = { backgroundColor: PlayerColor; playerId: string };
const PlayerToken = ({ backgroundColor, playerId }: PlayerTokenProps) => {
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

function usePrevious<T>(value: T): T | undefined {
  const ref = React.useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

const PreparationToken = ({
  token,
  player,
  game
}: {
  game?: GameInStartedState<"UI">;
  player?: GoatPlayer<"UI">;
  token: "TOKEN-1" | "TOKEN-2";
}) => {
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

type GameScreenProps = {
  game: Game<"UI"> | null;
  onStartGame: (e: React.MouseEvent) => void;
  onRemake: (e: React.MouseEvent) => void;
  onChangeNickname: (e: string) => void;
  nickname: string;
  dispatch: (e: GameAction) => void;
};

const GameScreen = ({
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

  function renderEmptyPlayer(playerNumber: number) {
    return (
      <div key={playerNumber} className={`player-area player-${playerNumber}`}>
        <small style={{ color: "grey" }}>(empty seat)</small>
      </div>
    );
  }

  function renderPlayer(
    player: GoatPlayer<"UI">,
    game: Game<"UI">,
    playerNumber: number
  ) {
    if (game.state === "WAITING_FOR_PLAYERS") return null;
    const classN =
      "playerInfo" +
      (player === playerWithTurn || isChoosingCard(player, game)
        ? " turnAnimation"
        : "");

    const playerNameText = formatNickname(player);
    const playerActionText = formatPlayerActionText(game, player);

    function onOpponentHandClick(game: GameInStartedState<"UI">) {
      if (!me) {
        console.warn("User is not one of the players in the game?");
        return;
      }
      if (
        game.substate.expectedAction !== "SPY_ON_PLAYER" &&
        game.substate.expectedAction !== "TRADE_CHOOSE_PLAYER" &&
        game.substate.expectedAction !== "STEAL_CHOOSE_PLAYER"
      )
        return;
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
    }

    const isActivePlayer =
      game.state === "ONGOING" &&
      game.players.find((p, i) => i === game.activePlayer)! === me;
    const spyingThisPlayer =
      game.state === "ONGOING" &&
      game.substate.expectedAction === "SPY_ON_PLAYER_CONFIRM" &&
      isActivePlayer &&
      game.substate.otherPlayerId === player.playerInfo.id;

    function onSpyConfirm() {
      const isActivePlayer =
        game.state === "ONGOING" &&
        game.players.find((p, i) => i === game.activePlayer)! === me;
      const spying =
        game.state === "ONGOING" &&
        game.substate.expectedAction === "SPY_ON_PLAYER_CONFIRM" &&
        isActivePlayer;

      if (!spying) return;

      dispatch({
        action: "SPY_ON_PLAYER_CONFIRM"
      });
    }

    const isChoosing = isChoosingCard(player, game);

    const iThinkThisPlayerIsTheScapegoat = me.suspect === player.color;

    const highlightCards =
      isMyTurn &&
      (game.substate.expectedAction === "SPY_ON_PLAYER" ||
        game.substate.expectedAction === "STEAL_CHOOSE_PLAYER" ||
        game.substate.expectedAction === "TRADE_CHOOSE_PLAYER");

    return (
      <div
        id={"player-area-" + player.playerInfo.id}
        key={playerNumber}
        style={{
          border: `2px solid ${mapPlayerColorToUIColor(player.color)}`
        }}
        className={`player-area player-${playerNumber}`}
      >
        {(player === playerWithTurn || isChoosing) && (
          <div className="loader"></div>
        )}
        <div
          style={{ color: mapPlayerColorToUIColor(player.color) }}
          className={classN}
        >
          {playerNameText}
        </div>
        <div className="smallerText">{playerActionText}</div>
        {iThinkThisPlayerIsTheScapegoat && (
          <div className="smallerText">They're the scapegoat. Trust me.</div>
        )}
        <div
          onClick={() => onOpponentHandClick(game)}
          className="cardsContainer"
        >
          {Array(game.players.length > 4 ? 4 : 3)
            .fill(null)
            .map((_, i) => {
              const card = player.cards[i];
              if (card) {
                const tradeAnimation = getCardFlyTowardsPlayerAnimation(
                  game,
                  player,
                  i
                );

                const cardIsChosenFrameCard = isFrameCard(player, i, game);

                const id = `player-${player.playerInfo.id}-slot-${i + 1}`;

                return (
                  <PlayingCard
                    id={id}
                    animation={tradeAnimation}
                    className={highlightCards ? " highlightCard" : ""}
                    onClick={noop}
                    key={player.playerInfo.id + "-" + i}
                    style={{
                      marginRight: "5px",
                      ...(cardIsChosenFrameCard && {
                        transform: "scale(2)",
                        transition: "transform 200ms"
                      })
                    }}
                    card={card.face === "UP" ? card : { face: "DOWN" }}
                  />
                );
              } else
                return (
                  <div
                    key={player.playerInfo.id + "-" + i}
                    id={`player-${player.playerInfo.id}-slot-${i + 1}`}
                    className="cardPlaceholder"
                  />
                );
            })}
          {spyingThisPlayer && (
            <button className="spyConfirmButton" onClick={onSpyConfirm}>
              OK, got it
            </button>
          )}
        </div>
        {player.preparationTokens.length > 0 && (
          <div className="preparationTokenContainer">
            {player.preparationTokens.some((t) => t === "TOKEN-1") && (
              <PreparationToken game={game} player={player} token={"TOKEN-1"} />
            )}
            {player.preparationTokens.some((t) => t === "TOKEN-2") && (
              <PreparationToken game={game} player={player} token={"TOKEN-2"} />
            )}
          </div>
        )}
      </div>
    );
  }

  const isMyTurn =
    game.players.findIndex((p) => p === me) === game.activePlayer;

  const iHaveCardOfOwnColor = me.cards.some(({ card }) => {
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

  const requiresMyAction = me === playerWithTurn || isChoosingCard(me, game);

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
          <div>{formatPlayerActionText(game, me)}</div>.
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
                  game.substate.expectedAction === "FRAME_CHOOSE_CARD"
                ) {
                  dispatch({
                    action: "FRAME_CHOOSE_CARD",
                    playerCardIndex: i
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
            return renderPlayer(
              otherPlayersClockwiseFromMe[seat],
              game,
              playerNumber
            );
          }
        });
      })()}
      <div className="common">
        {game.locations
          .filter((l) => l.name !== "COPS")
          .map((l, i) => {
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

            function onLocationClick(
              game: Game<"UI">,
              myself: GoatPlayer<"UI">
            ) {
              if (game.state !== "ONGOING") return;
              if (game.substate.expectedAction !== "GO_TO_LOCATION") return;
              const activePlayer = getActivePlayer(game);
              if (activePlayer.color !== myself.color) return;
              if (myself.location === l.name) return;

              dispatch({
                action: "GO_TO_LOCATION",
                location: l.name
              });
            }

            function onStashCardClick(
              game: Game<"UI">,
              myself: GoatPlayer<"UI"> & { me: true },
              stashCardIndex: number
            ) {
              if (
                game.state !== "ONGOING" ||
                game.substate.expectedAction !== "STASH_CHOOSE_CARD"
              )
                return;
              const activePlayer = getActivePlayer(game);
              if (activePlayer?.color !== myself.color) return;

              dispatch({
                action: "STASH_CHOOSE_CARD",
                stashCardIndex
              });
            }

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

const App = () => {
  const history = useHistory();
  const location = useLocation();
  const [nickname, setNickname] = useState("");
  const [game, setGame] = useState<Game<"UI"> | null>(null);
  const [socket] = useState<Socket<DefaultEventsMap, DefaultEventsMap>>(
    io({ transports: ["websocket"] })
  );

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

    SOUNDS.TICK.play().catch(() => {});

    if (!("action" in lastEvent)) {
      switch (lastEvent.event) {
        case "FRAME_FAILURE":
          SOUNDS.FRAME_FAILURE.play().catch(() => {});
          return;
      }
      return;
    }

    switch (lastEvent.action) {
      case "FRAME_CHOOSE_CARD": {
        game.state !== "PAUSED_FOR_FRAME_CHECK" &&
          SOUNDS.PAGE_FLIP.play().catch(() => {});
        return;
      }
      case "GO_TO_LOCATION": {
        if (
          lastEvent.location === "FRAME/STEAL" &&
          game.substate.expectedAction === "FRAME_CHOOSE_CARD"
        ) {
          SOUNDS.FRAME_ATTEMPT.play().catch(() => {});
        } else if (
          lastEvent.location === "FRAME/STEAL" &&
          game.substate.expectedAction === "STEAL_CHOOSE_PLAYER"
        ) {
        }
        return;
      }
      case "SPY_ON_PLAYER": {
        SOUNDS.CARD.play().catch(() => {});
        return;
      }
      case "SPY_ON_PLAYER_CONFIRM": {
        SOUNDS.CARD.play().catch(() => {});
      }
      case "STASH_CHOOSE_CARD": {
        SOUNDS.PAGE_FLIP.play().catch(() => {});
        return;
      }
      case "STASH_RETURN_CARD": {
        SOUNDS.PAGE_FLIP.play().catch(() => {});
        return;
      }
      case "STEAL_CHOOSE_PLAYER": {
        SOUNDS.STEAL.play().catch(() => {});
      }
      case "SWAP_EVIDENCE": {
        SOUNDS.PAGE_FLIP.play().catch(() => {});
        return;
      }
      case "TRADE_CHOOSE_CARD": {
        SOUNDS.PAGE_FLIP.play().catch(() => {});
        return;
      }
      case "TRADE_CHOOSE_PLAYER": {
        SOUNDS.GOAT.play().catch(() => {});
        return;
      }
    }
  }, [lastEventTimestamp]);

  useEffect(() => {
    if (!game) return;

    switch (game.state) {
      case "ONGOING": {
        SOUNDS.GOAT.play();
        return;
      }
      case "PAUSED_FOR_FRAME_CHECK": {
        SOUNDS.FRAME_CHECK.play().catch(() => {});
        return;
      }
      case "PAUSED_FOR_COPS_CHECK": {
        SOUNDS.COPS.play().catch(() => {});
        return;
      }
      case "FINISHED": {
        const me = getMe(game);
        const activePlayer = getActivePlayer(game);
        const scapegoat = game.players.find((p) => p.color === game.scapegoat)!;

        const framed = activePlayer.location === "FRAME/STEAL";

        if (framed) {
          SOUNDS.FRAME_SUCCESS.play().catch(() => {});
        } else {
          if (me === scapegoat) {
            // I called the cops successfully
            SOUNDS.STEAL.play().catch(() => {});
          } else {
            // Someone else called cops
            SOUNDS.GOAT.play().catch(() => {});
          }
        }
        return;
      }
      default:
        return;
    }
  }, [game?.state]);

  function handleGameActionEvent(e: { game: Game<"UI"> }) {
    setGame(e.game);
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
        SOUNDS.GOAT.play().catch(() => {});
        if (msg.payload.code !== codeFromURL) return;
        setGame(msg.payload.game);
      } else if (msg.type === "GAME_ACTION_EVENT") {
        if (msg.payload.code !== codeFromURL) return;
        setGame(msg.payload.game);
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
