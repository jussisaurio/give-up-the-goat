import express from "express";
import * as http from "http";
import * as path from "path";
import { Server } from "socket.io";
import session from "express-session";
import { activateGame, createGame, Game, playTurn } from "../common/game";
import { createRandomNickname } from "../common/nicknameCreator";
import { ClientEvent, ServerEvent } from "../common/eventTypes";
import { IncomingMessage, NextFunction } from "connect";
import { createGameCode } from "../common/toolbox";

// SERVER INIT
const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

// SESSIONS
const cookiemw = session({
  cookie: { httpOnly: true },
  saveUninitialized: true,
  resave: true,
  secret: process.env.COOKIE_SECRET ?? "SUPER_DUPER_SECRET"
});

app.use(cookiemw);

io.use((socket, next) => {
  cookiemw(socket.request as any, {} as any, next as NextFunction);
});

// IN MEMORY STATE
const games: Record<string, Game> = {};
const nicknames: Record<string, string> = {};

io.on("connection", (socket) => {
  const request = socket.request as IncomingMessage & {
    session: { id: string; save: () => any };
  };
  const uid = request.session.id;

  nicknames[uid] = nicknames[uid] ?? createRandomNickname();
  socket.emit("SERVER_EVENT", {
    type: "ASSIGN_NICKNAME",
    payload: { nickname: nicknames[uid] }
  });

  function broadcastGameEventToGame(gameCode: string, event: ServerEvent) {
    io.in(gameCode).emit("SERVER_EVENT", event);
  }

  function emitEventToUser(event: ServerEvent) {
    socket.emit("SERVER_EVENT", event);
  }

  function emitErrorToUser(error: string) {
    socket.emit("SERVER_ERROR", error);
  }

  socket.on("CLIENT_EVENT", (msg: ClientEvent) => {
    if (msg.type === "GAME_JOIN") {
      // TODO sometimes player gets registered twice
      // Check that can join game
      const game = games[msg.payload.code];
      if (!game) {
        return emitErrorToUser("GAME_DOESNT_EXIST");
      } else if (game.playerInfos.some((pi) => pi.id === uid)) {
        // Already joined
        // Add socket to Room corresponding to game code
        socket.join(msg.payload.code);

        // Broadcast message to room that user joined
        broadcastGameEventToGame(msg.payload.code, {
          type: "GAME_JOINED",
          payload: {
            code: msg.payload.code,
            game: games[msg.payload.code],
            nickname: msg.payload.nickname
          }
        });
        return;
      } else if (game.state !== "WAITING_FOR_PLAYERS") {
        return emitErrorToUser("GAME_NOT_WAITING_FOR_PLAYERS");
      } else if (game.playerInfos.length === 6) {
        return emitErrorToUser("GAME_FULL");
      }

      // Add player to in memory game
      games[msg.payload.code] = {
        ...game,
        playerInfos: [
          ...game.playerInfos,
          { id: uid, nickname: msg.payload.nickname }
        ]
      };

      // Add socket to Room corresponding to game code
      socket.join(msg.payload.code);

      // Broadcast message to room that user joined
      broadcastGameEventToGame(msg.payload.code, {
        type: "GAME_JOINED",
        payload: {
          code: msg.payload.code,
          game: games[msg.payload.code],
          nickname: msg.payload.nickname
        }
      });
    } else if (msg.type === "GAME_CREATE") {
      // Create code to be used in URL of game
      const code = createGameCode();

      // Store pending game in memory
      games[code] = createGame();

      // Let user know the game was created
      emitEventToUser({ type: "GAME_CREATED", payload: { code } });
    } else if (msg.type === "GAME_START") {
      const code = msg.payload.code;

      const game = games[code];

      if (!game) {
        return emitErrorToUser("GAME_DOESNT_EXIST");
      } else if (game.state !== "WAITING_FOR_PLAYERS") {
        return emitErrorToUser("GAME_NOT_WAITING_FOR_PLAYERS");
      } else if (game.playerInfos.length < 3) {
        return emitErrorToUser("GAME_NOT_ENOUGH_PLAYERS_TO_START");
      }

      const activatedGame = activateGame(game);

      games[code] = activatedGame;

      // TODO strip other players private info like cards in hand from other players
      broadcastGameEventToGame(code, {
        type: "GAME_STARTED",
        payload: { code, game: activatedGame }
      });

      // Tell everyone that active player needs to choose location
      return broadcastGameEventToGame(code, {
        type: "GAME_ACTION_EVENT",
        payload: {
          type: "AWAITING_MAIN_PLAYER_CHOOSE_LOCATION",
          code,
          game: activatedGame
        }
      });
    } else if (msg.type === "GAME_ACTION") {
      const game = games[msg.code];

      if (!game) {
        return emitErrorToUser("GAME_DOESNT_EXIST");
      } else if (game.state !== "ONGOING") {
        return emitErrorToUser("GAME_NOT_IN_PROGRESS");
      }

      const [ok, updatedGame] = playTurn(game, uid, msg.payload);

      if (!ok || updatedGame.state === "WAITING_FOR_PLAYERS") {
        return emitErrorToUser("INVALID_GAME_ACTION");
      }

      games[msg.code] = updatedGame;

      if (updatedGame.state !== "ONGOING") {
        if (updatedGame.state === "PAUSED_FOR_COPS_CHECK") {
          broadcastGameEventToGame(msg.code, {
            type: "GAME_ACTION_EVENT",
            payload: {
              type: "PAUSED_FOR_COPS_CHECK",
              code: msg.code,
              game: updatedGame
            }
          });

          setTimeout(() => {
            const finishedGame: Game = {
              ...updatedGame,
              state: "FINISHED",
              events: [
                ...game.events,
                `Player ${
                  updatedGame.players.find(
                    (p) => p.color === updatedGame.scapegoat
                  )!.playerInfo.nickname
                } has won the game after the cops were called!`
              ],
              winnerPlayerIds: [
                updatedGame.players.find(
                  (p) => p.color === updatedGame.scapegoat
                )!.playerInfo.id
              ]
            };

            games[msg.code] = finishedGame;
            broadcastGameEventToGame(msg.code, {
              type: "GAME_ACTION_EVENT",
              payload: {
                type: "GAME_FINISHED_COPS",
                code: msg.code,
                game: finishedGame,
                winnerPlayerIds: finishedGame.winnerPlayerIds,
                copCallerId:
                  finishedGame.players[finishedGame.activePlayer].playerInfo.id
              }
            });
          }, 3000);
          return;
        } else if (
          updatedGame.state === "PAUSED_FOR_FRAME_CHECK" &&
          updatedGame.substate.state === "AWAITING_FRAME_CHOOSE_CARDS"
        ) {
          broadcastGameEventToGame(msg.code, {
            type: "GAME_ACTION_EVENT",
            payload: {
              type: "PAUSED_FOR_FRAME_CHECK",
              code: msg.code,
              game: updatedGame,
              frameCards: updatedGame.substate.cards
            }
          });

          const chosenCards = updatedGame.substate.cards.map(
            ({ playerId, playerCardIndex }) => {
              const player = updatedGame.players.find(
                (p) => p.playerInfo.id === playerId
              )!;
              const card = player.cards[playerCardIndex];
              return card;
            }
          );

          const cardsWithScapegoatColor = chosenCards.filter((cc) => {
            if ("color" in cc && cc.color === updatedGame.scapegoat)
              return true;
            if ("colors" in cc && cc.colors.includes(updatedGame.scapegoat))
              return true;
            return cc.type === "joker";
          });

          const successfulFrame =
            cardsWithScapegoatColor.length >= updatedGame.players.length - 1;

          setTimeout(() => {
            if (successfulFrame) {
              const finishedGame: Game = {
                ...updatedGame,
                state: "FINISHED",
                events: [
                  ...game.events,
                  `The Scapegoat, ${
                    updatedGame.players.find(
                      (p) => p.color === updatedGame.scapegoat
                    )!.playerInfo.nickname
                  } , has been successfully framed and the other players win!`
                ],
                winnerPlayerIds: updatedGame.players
                  .filter((p) => p.color !== updatedGame.scapegoat)
                  .map((p) => p.playerInfo.id)
              };
              games[msg.code] = finishedGame;
              broadcastGameEventToGame(msg.code, {
                type: "GAME_ACTION_EVENT",
                payload: {
                  type: "GAME_FINISHED_FRAME",
                  code: msg.code,
                  game: finishedGame,
                  winnerPlayerIds: finishedGame.winnerPlayerIds
                }
              });
            } else {
              const continuingGame: Game = {
                ...updatedGame,
                state: "ONGOING",
                events: [
                  ...game.events,
                  "The frame attempt fails due to insufficient evidence!"
                ],
                substate: {
                  state: "AWAITING_EVIDENCE_SWAP",
                  location: "FRAME/STEAL"
                }
              };
              games[msg.code] = continuingGame;
              broadcastGameEventToGame(msg.code, {
                type: "GAME_ACTION_EVENT",
                payload: {
                  type: "FAILED_FRAME_ATTEMPT",
                  code: msg.code,
                  game: continuingGame
                }
              });
            }
          }, 3000);
          return;
        }
      }

      switch (updatedGame.substate.state) {
        case "AWAITING_MAIN_PLAYER_CHOOSE_LOCATION": {
          // Tell everyone that active player needs to choose location
          return broadcastGameEventToGame(msg.code, {
            type: "GAME_ACTION_EVENT",
            payload: {
              type: "AWAITING_MAIN_PLAYER_CHOOSE_LOCATION",
              code: msg.code,
              game: updatedGame
            }
          });
        }
        case "AWAITING_TRADE_CHOOSE_PLAYER": {
          // Tell everyone that active player needs to choose player to trade with
          return broadcastGameEventToGame(msg.code, {
            type: "GAME_ACTION_EVENT",
            payload: {
              type: "AWAITING_TRADE_CHOOSE_PLAYER",
              code: msg.code,
              game: updatedGame
            }
          });
        }

        case "AWAITING_TRADE_CHOOSE_CARDS": {
          // Tell everyone there are 1-2 players who need to choose a card now
          const waitingMainPlayer =
            updatedGame.substate.mainPlayerCardIndex === null;
          const waitingOtherPlayer =
            updatedGame.substate.otherPlayerCardIndex === null;
          const activePlayerId = updatedGame.players.find(
            (p, i) => i === updatedGame.activePlayer
          )!.playerInfo.id;

          return broadcastGameEventToGame(msg.code, {
            type: "GAME_ACTION_EVENT",
            payload: {
              type: "AWAITING_TRADE_CHOOSE_CARDS",
              code: msg.code,
              waitingForPlayers: [
                waitingMainPlayer && activePlayerId,
                waitingOtherPlayer && updatedGame.substate.otherPlayerId
              ].filter(Boolean) as string[],
              game: updatedGame
            }
          });
        }
        case "AWAITING_SPY_CHOOSE_PLAYER": {
          // Tell everyone that active player needs to choose a player to spy on
          return broadcastGameEventToGame(msg.code, {
            type: "GAME_ACTION_EVENT",
            payload: {
              type: "AWAITING_SPY_CHOOSE_PLAYER",
              code: msg.code,
              game: updatedGame
            }
          });
        }
        case "AWAITING_SPY_CONFIRM": {
          // Tell everyone that active player is looking at another player's hand
          // Privately send the other player's hand to the active player
          const otherPlayerId = updatedGame.substate.otherPlayerId;
          broadcastGameEventToGame(msg.code, {
            type: "GAME_ACTION_EVENT",
            payload: {
              type: "AWAITING_SPY_CONFIRM",
              code: msg.code,
              otherPlayerId,
              game: updatedGame
            }
          });

          const otherPlayer = updatedGame.players.find(
            (p) => p.playerInfo.id === otherPlayerId
          )!;

          socket.emit("SERVER_EVENT", {
            type: "GAME_ACTION_EVENT",
            payload: {
              type: "SPY_HAND",
              code: msg.code,
              otherPlayerId,
              hand: otherPlayer.cards,
              game: updatedGame
            }
          });
          return;
        }

        case "AWAITING_STASH_CHOOSE_CARD": {
          // Tell everyone that active player is looking at the stash
          return broadcastGameEventToGame(msg.code, {
            type: "GAME_ACTION_EVENT",
            payload: {
              type: "AWAITING_STASH_CHOOSE_CARD",
              code: msg.code,
              game: updatedGame
            }
          });
        }
        case "AWAITING_STASH_RETURN_CARD": {
          // Tell everyone that active player is picking card from hand to return to stash
          return broadcastGameEventToGame(msg.code, {
            type: "GAME_ACTION_EVENT",
            payload: {
              type: "AWAITING_STASH_RETURN_CARD",
              code: msg.code,
              stashCardIndex: updatedGame.substate.stashCardIndex,
              game: updatedGame
            }
          });
        }
        case "AWAITING_EVIDENCE_SWAP": {
          // Tell everyone that active player is picking a card to trade with the public evidence @ location
          broadcastGameEventToGame(msg.code, {
            type: "GAME_ACTION_EVENT",
            payload: {
              type: "AWAITING_EVIDENCE_SWAP",
              code: msg.code,
              game: updatedGame
            }
          });
          return;
        }
        case "AWAITING_STEAL_CHOOSE_PLAYER": {
          // Tell everyone active player is choosing a player to steal preparation token from
          broadcastGameEventToGame(msg.code, {
            type: "GAME_ACTION_EVENT",
            payload: {
              type: "AWAITING_STEAL_CHOOSE_PLAYER",
              code: msg.code,
              game: updatedGame
            }
          });
          return;
        }
        case "AWAITING_FRAME_CHOOSE_CARDS": {
          // Tell everyone they need to pick a card for framing
          const currentFrameCards = updatedGame.substate.cards;
          broadcastGameEventToGame(msg.code, {
            type: "GAME_ACTION_EVENT",
            payload: {
              type: "AWAITING_FRAME_CHOOSE_CARDS",
              game: updatedGame,
              code: msg.code,
              waitingFor: updatedGame.players
                .filter(
                  (p) =>
                    !currentFrameCards.some(
                      (fc) => fc.playerId === p.playerInfo.id
                    )
                )
                .map((p) => p.playerInfo.id)
            }
          });
          return;
        }
      }
    }
  });
});

const assetsDIR = path.resolve(__dirname, "..", "public", "assets");

app.use("/assets", express.static(assetsDIR));

const indexHTML = path.resolve(__dirname, "..", "public", "index.html");
app.get("*", (req, res) => {
  res.sendFile(indexHTML);
});

const PORT = Number.isInteger(Number(process.env.PORT))
  ? Number(process.env.PORT)
  : 3000;

httpServer.listen(PORT, () => {
  console.log(PORT);
});
