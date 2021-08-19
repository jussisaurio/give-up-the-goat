import express from "express";
import * as http from "http";
import * as path from "path";
import { Server, Socket } from "socket.io";
import session from "express-session";
import {
  activateGame,
  createGame,
  Game,
  handleCopsCheck,
  handleFrameCheck,
  playTurn,
  stripSecretInfoFromGame
} from "../common/game";
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
const games: Record<string, Game<"SERVER">> = {};
const nicknames: Record<string, string> = {};
const sessionToSockets: Record<string, Set<Socket>> = {};

function addSocketToSession(sid: string, socket: Socket) {
  if (!sessionToSockets[sid]) {
    sessionToSockets[sid] = new Set();
  }

  sessionToSockets[sid].add(socket);
}

function removeSocketFromSession(sid: string, socket: Socket) {
  if (!sessionToSockets[sid]) {
    sessionToSockets[sid] = new Set();
  }

  sessionToSockets[sid].delete(socket);

  if (sessionToSockets[sid].size === 0) {
    delete sessionToSockets[sid];
  }
}

function getSocketsBySession(sid: string): Set<Socket> {
  return sessionToSockets[sid] ?? new Set();
}

function sendStrippedGameStateToEveryPlayerInGame(code: string) {
  const game = games[code];
  if (!game) {
    return;
  }
  for (const player of game.playerInfos) {
    const strippedState = stripSecretInfoFromGame(player.id, game);
    const sockets = getSocketsBySession(player.id);
    sockets.forEach((s) => {
      s.emit("SERVER_EVENT", {
        type: "GAME_ACTION_EVENT",
        payload: {
          type: "GAME_TICK",
          code,
          game: strippedState
        }
      });
    });
  }
}

io.on("connection", (socket) => {
  const request = socket.request as IncomingMessage & {
    session: { id: string; save: () => any };
  };
  const uid = request.session.id;

  addSocketToSession(uid, socket);

  socket.on("disconnect", (reason) => {
    removeSocketFromSession(uid, socket);
  });

  nicknames[uid] = nicknames[uid] ?? createRandomNickname();
  socket.emit("SERVER_EVENT", {
    type: "ASSIGN_NICKNAME",
    payload: { nickname: nicknames[uid] }
  });

  function emitEventToUser(event: ServerEvent) {
    socket.emit("SERVER_EVENT", event);
  }

  function emitErrorToUser(error: string) {
    socket.emit("SERVER_ERROR", error);
  }

  socket.on("CLIENT_EVENT", (msg: ClientEvent) => {
    // For some reason this leaks and disconnect events dont fire
    console.log(
      "Number of sessions with connected sockets: ",
      Object.keys(sessionToSockets).length
    );
    console.log(
      "Number of connected sockets: ",
      Object.values(sessionToSockets).reduce((a, b) => a + b.size, 0)
    );

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
          sendStrippedGameStateToEveryPlayerInGame(code);
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
        sendStrippedGameStateToEveryPlayerInGame(msg.payload.code);
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

      sendStrippedGameStateToEveryPlayerInGame(msg.payload.code);
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

      sendStrippedGameStateToEveryPlayerInGame(msg.payload.code);
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
      sendStrippedGameStateToEveryPlayerInGame(msg.payload.code);
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

      sendStrippedGameStateToEveryPlayerInGame(msg.code);

      switch (updatedGame.state) {
        case "FINISHED": {
          return console.error(
            "Game in FINISHED state immediately after playing turn, should not happen in current version of game logic"
          );
        }
        case "PAUSED_FOR_COPS_CHECK": {
          return handleCopsCheck(updatedGame, (finishedGame) => {
            games[msg.code] = finishedGame;
            sendStrippedGameStateToEveryPlayerInGame(msg.code);
          });
        }
        case "PAUSED_FOR_FRAME_CHECK": {
          return handleFrameCheck(updatedGame, (gameAfterCheck) => {
            games[msg.code] = gameAfterCheck;
            sendStrippedGameStateToEveryPlayerInGame(msg.code);
          });
        }
        case "ONGOING": {
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
