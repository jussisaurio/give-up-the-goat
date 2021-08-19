import express from "express";
import * as http from "http";
import * as path from "path";
import { Server } from "socket.io";
import session from "express-session";
import { activateGame, createGame, Game, playTurn } from "../common/game";
import { createRandomNickname } from "../common/nicknameCreator";
import { ClientEvent, ServerEvent } from "../common/eventTypes";
import { IncomingMessage, NextFunction } from "connect";
import { createGameCode, validateNickname } from "../common/toolbox";

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
    if (msg.type === "CHANGE_NICKNAME") {
      if (validateNickname(msg.nickname).ok) {
        nicknames[uid] = msg.nickname;
        Object.keys(games).forEach((code) => {
          const game = games[code];
          if (
            game.state !== "WAITING_FOR_PLAYERS" ||
            game.playerInfos.every((pi) => pi.id !== uid)
          )
            return;
          game.playerInfos = game.playerInfos.map((pi) => {
            if (pi.id !== uid) return pi;
            return { id: pi.id, nickname: msg.nickname };
          });
          broadcastGameEventToGame(code, {
            type: "GAME_JOINED",
            payload: {
              code,
              game,
              nickname: msg.nickname
            }
          });
        });
        socket.emit("SERVER_EVENT", {
          type: "ASSIGN_NICKNAME",
          payload: { nickname: msg.nickname }
        });
      }
      return;
    } else if (msg.type === "GAME_JOIN") {
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

      return broadcastGameEventToGame(code, {
        type: "GAME_ACTION_EVENT",
        payload: {
          type: "GAME_TICK",
          code,
          game: activatedGame
        }
      });
    } else if (msg.type === "GAME_REMAKE") {
      const { code } = msg.payload;
      const game = games[msg.payload.code];
      if (!game) {
        return emitErrorToUser("GAME_DOESNT_EXIST");
      } else if (game.state !== "FINISHED") {
        return emitErrorToUser("GAME_NOT_FINISHED");
      } else if (!game.playerInfos.some((pi) => pi.id === uid)) {
        return emitErrorToUser("USER_NOT_IN_GAME");
      }

      const newGame = activateGame(createGame(game.playerInfos));
      games[msg.payload.code] = newGame;
      broadcastGameEventToGame(code, {
        type: "GAME_STARTED",
        payload: { code, game: newGame }
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

      broadcastGameEventToGame(msg.code, {
        type: "GAME_ACTION_EVENT",
        payload: {
          type: "GAME_TICK",
          code: msg.code,
          game: updatedGame
        }
      });

      if (updatedGame.state !== "ONGOING") {
        if (updatedGame.state === "PAUSED_FOR_COPS_CHECK") {
          setTimeout(() => {
            const finishedGame: Game = {
              ...updatedGame,
              state: "FINISHED",
              events: [
                ...game.events,
                { event: "COPS_CALLED", ts: Date.now() }
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
                type: "GAME_TICK",
                code: msg.code,
                game: finishedGame
              }
            });
          }, 3000);
          return;
        } else if (
          updatedGame.state === "PAUSED_FOR_FRAME_CHECK" &&
          updatedGame.substate.expectedAction === "FRAME_CHOOSE_CARD"
        ) {
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
                  { event: "FRAME_SUCCESS", ts: Date.now() }
                ],
                winnerPlayerIds: updatedGame.players
                  .filter((p) => p.color !== updatedGame.scapegoat)
                  .map((p) => p.playerInfo.id)
              };
              games[msg.code] = finishedGame;
              broadcastGameEventToGame(msg.code, {
                type: "GAME_ACTION_EVENT",
                payload: {
                  type: "GAME_TICK",
                  code: msg.code,
                  game: finishedGame
                }
              });
            } else {
              const continuingGame: Game = {
                ...updatedGame,
                state: "ONGOING",
                events: [
                  ...game.events,
                  { event: "FRAME_FAILURE", ts: Date.now() }
                ],
                substate: {
                  expectedAction: "SWAP_EVIDENCE",
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

      const substate = updatedGame.substate;

      if (substate.expectedAction === "SPY_ON_PLAYER_CONFIRM") {
        const otherPlayer = updatedGame.players.find(
          (p) => p.playerInfo.id === substate.otherPlayerId
        )!;
        emitEventToUser({
          type: "GAME_ACTION_EVENT",
          payload: {
            type: "SPY_HAND",
            code: msg.code,
            otherPlayerId: substate.otherPlayerId,
            hand: otherPlayer.cards,
            game: updatedGame
          }
        });
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
