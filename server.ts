import express from "express";
import * as http from "http";
import * as path from "path";
import { Server } from "socket.io";
import session from "express-session";
import {
  activateGame,
  createGame,
  DealtCard,
  Game,
  LocationArea,
  playTurn
} from "./game";
import { createRandomNickname } from "./nicknameCreator";
import { ClientEvent } from "./common";
import { IncomingMessage, NextFunction } from "connect";

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

const games: Record<string, Game> = {};

const createGameCode = () =>
  Math.random().toString(36).slice(2, 8).toUpperCase();

const nicknames: Record<string, string> = {};

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

  socket.on("CLIENT_EVENT", (msg: ClientEvent) => {
    if (msg.type === "GAME_JOIN") {
      // TODO sometimes player gets registered twice
      // Check that can join game
      const game = games[msg.payload.code];
      if (!game) {
        return socket.emit("SERVER_ERROR", "GAME_DOESNT_EXIST");
      } else if (game.playerInfos.some((pi) => pi.id === uid)) {
        // Already joined
        // Add socket to Room corresponding to game code
        socket.join(msg.payload.code);

        // Broadcast message to room that user joined
        io.in(msg.payload.code).emit("SERVER_EVENT", {
          type: "GAME_JOINED",
          payload: {
            game: games[msg.payload.code],
            nickname: msg.payload.nickname
          }
        });
        return;
      } else if (game.state !== "WAITING_FOR_PLAYERS") {
        return socket.emit("SERVER_ERROR", "GAME_NOT_WAITING_FOR_PLAYERS");
      } else if (game.playerInfos.length === 6) {
        return socket.emit("SERVER_ERROR", "GAME_FULL");
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
      io.in(msg.payload.code).emit("SERVER_EVENT", {
        type: "GAME_JOINED",
        payload: {
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
      socket.emit("SERVER_EVENT", { type: "GAME_CREATED", payload: { code } });
    } else if (msg.type === "GAME_START") {
      const code = msg.payload.code;

      const game = games[code];

      if (!game) {
        return socket.emit("SERVER_ERROR", "GAME_DOESNT_EXIST");
      } else if (game.state !== "WAITING_FOR_PLAYERS") {
        return socket.emit("SERVER_ERROR", "GAME_NOT_WAITING_FOR_PLAYERS");
      } else if (game.playerInfos.length < 3) {
        return socket.emit("SERVER_ERROR", "GAME_NOT_ENOUGH_PLAYERS_TO_START");
      }

      games[code] = activateGame(game);

      // TODO strip other players private info like cards in hand from other players
      io.in(code).emit("SERVER_EVENT", {
        type: "GAME_STARTED",
        payload: { game: games[code] }
      });

      // Tell everyone that active player needs to choose location
      return io.in(code).emit("SERVER_EVENT", {
        type: "GAME_ACTION_EVENT",
        payload: {
          type: "AWAITING_MAIN_PLAYER_CHOOSE_LOCATION",
          game: games[code]
        }
      });
    } else if (msg.type === "GAME_ACTION") {
      const game = games[msg.code];

      if (!game) {
        return socket.emit("SERVER_ERROR", "GAME_DOESNT_EXIST");
      } else if (game.state !== "ONGOING") {
        return socket.emit("SERVER_ERROR", "GAME_NOT_IN_PROGRESS");
      }

      const [ok, updatedGame] = playTurn(game, uid, msg.payload);

      if (!ok || updatedGame.state === "WAITING_FOR_PLAYERS") {
        return socket.emit("SERVER_ERROR", "INVALID_GAME_ACTION");
      }

      games[msg.code] = updatedGame;

      if (updatedGame.state !== "ONGOING") {
        if (updatedGame.state === "PAUSED_FOR_COPS_CHECK") {
          io.in(msg.code).emit("SERVER_EVENT", {
            type: "GAME_ACTION_EVENT",
            payload: {
              type: "PAUSED_FOR_COPS_CHECK",
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
            io.in(msg.code).emit("SERVER_EVENT", {
              type: "GAME_ACTION_EVENT",
              payload: {
                type: "GAME_FINISHED_COPS",
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
          io.in(msg.code).emit("SERVER_EVENT", {
            type: "GAME_ACTION_EVENT",
            payload: {
              type: "PAUSED_FOR_FRAME_CHECK",
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

          console.log({ cardsWithScapegoatColor });

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
              io.in(msg.code).emit("SERVER_EVENT", {
                type: "GAME_ACTION_EVENT",
                payload: {
                  type: "GAME_FINISHED_FRAME",
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
              io.in(msg.code).emit("SERVER_EVENT", {
                type: "GAME_ACTION_EVENT",
                payload: {
                  type: "FAILED_FRAME_ATTEMPT",
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
          return io.in(msg.code).emit("SERVER_EVENT", {
            type: "GAME_ACTION_EVENT",
            payload: {
              type: "AWAITING_MAIN_PLAYER_CHOOSE_LOCATION",
              game: updatedGame
            }
          });
        }
        case "AWAITING_TRADE_CHOOSE_PLAYER": {
          // Tell everyone that active player needs to choose player to trade with
          return io.in(msg.code).emit("SERVER_EVENT", {
            type: "GAME_ACTION_EVENT",
            payload: {
              type: "AWAITING_TRADE_CHOOSE_PLAYER",
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

          return io.in(msg.code).emit("SERVER_EVENT", {
            type: "GAME_ACTION_EVENT",
            payload: {
              type: "AWAITING_TRADE_CHOOSE_CARDS",
              waitingForPlayers: [
                waitingMainPlayer && activePlayerId,
                waitingOtherPlayer && updatedGame.substate.otherPlayerId
              ].filter(Boolean),
              game: updatedGame
            }
          });
        }
        case "AWAITING_SPY_CHOOSE_PLAYER": {
          // Tell everyone that active player needs to choose a player to spy on
          return io.in(msg.code).emit("SERVER_EVENT", {
            type: "GAME_ACTION_EVENT",
            payload: {
              type: "AWAITING_SPY_CHOOSE_PLAYER",
              game: updatedGame
            }
          });
        }
        case "AWAITING_SPY_CONFIRM": {
          // Tell everyone that active player is looking at another player's hand
          // Privately send the other player's hand to the active player
          const otherPlayerId = updatedGame.substate.otherPlayerId;
          io.in(msg.code).emit("SERVER_EVENT", {
            type: "GAME_ACTION_EVENT",
            payload: {
              type: "AWAITING_SPY_CONFIRM",
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
              otherPlayerId,
              hand: otherPlayer.cards,
              game: updatedGame
            }
          });
          return;
        }

        case "AWAITING_STASH_CHOOSE_CARD": {
          // Tell everyone that active player is looking at the stash
          return io.in(msg.code).emit("SERVER_EVENT", {
            type: "GAME_ACTION_EVENT",
            payload: {
              type: "AWAITING_STASH_CHOOSE_CARD",
              game: updatedGame
            }
          });
        }
        case "AWAITING_STASH_RETURN_CARD": {
          // Tell everyone that active player is picking card from hand to return to stash
          return io.in(msg.code).emit("SERVER_EVENT", {
            type: "GAME_ACTION_EVENT",
            payload: {
              type: "AWAITING_STASH_RETURN_CARD",
              stashCardIndex: updatedGame.substate.stashCardIndex,
              game: updatedGame
            }
          });
        }
        case "AWAITING_EVIDENCE_SWAP": {
          // Tell everyone that active player is picking a card to trade with the public evidence @ location
          io.in(msg.code).emit("SERVER_EVENT", {
            type: "GAME_ACTION_EVENT",
            payload: {
              type: "AWAITING_EVIDENCE_SWAP",
              game: updatedGame
            }
          });
          return;
        }
        case "AWAITING_STEAL_CHOOSE_PLAYER": {
          // Tell everyone active player is choosing a player to steal preparation token from
          io.in(msg.code).emit("SERVER_EVENT", {
            type: "GAME_ACTION_EVENT",
            payload: {
              type: "AWAITING_STEAL_CHOOSE_PLAYER",
              game: updatedGame
            }
          });
          return;
        }
        case "AWAITING_FRAME_CHOOSE_CARDS": {
          // Tell everyone they need to pick a card for framing
          const currentFrameCards = updatedGame.substate.cards;
          io.in(msg.code).emit("SERVER_EVENT", {
            type: "GAME_ACTION_EVENT",
            payload: {
              type: "AWAITING_FRAME_CHOOSE_CARDS",
              game: updatedGame,
              waitingFor: updatedGame.players.filter(
                (p) =>
                  !currentFrameCards.some(
                    (fc) => fc.playerId === p.playerInfo.id
                  )
              )
            }
          });
          return;
        }
      }
    }
  });
});

app.use("/assets", express.static("dist/assets"));

app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "dist", "index.html"));
});

const PORT = Number.isInteger(Number(process.env.PORT))
  ? Number(process.env.PORT)
  : 3000;

httpServer.listen(PORT, () => {
  console.log(PORT);
});
