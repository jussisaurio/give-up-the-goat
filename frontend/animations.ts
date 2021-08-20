import {
  GameInStartedState,
  GoatPlayer,
  LocationArea,
  LocationName
} from "../common/game";
import { getActivePlayer } from "../common/logicHelpers";

let dimensionsCache: WeakMap<Element, DOMRect> = new WeakMap();

window.addEventListener("resize", () => {
  dimensionsCache = new WeakMap();
});

const getClientRect = (el: Element, force = false) => {
  if (!dimensionsCache.get(el) || force) {
    dimensionsCache.set(el, el.getBoundingClientRect());
  }

  return dimensionsCache.get(el)!;
};

const getPreparationTokenEl = (token: "TOKEN-1" | "TOKEN-2") => {
  const el = document.getElementById(token);
  return el;
};

export function ensurePreparationTokenLocations(force = false) {
  const t1 = getPreparationTokenEl("TOKEN-1");
  const t2 = getPreparationTokenEl("TOKEN-2");
  if (t1 && t2) {
    getClientRect(t1, force);
    getClientRect(t2, force);
  }
}

const getPlayerCardEl = (player: GoatPlayer<"UI">, cardIndex: number) => {
  const id = `player-${player.playerInfo.id}-slot-${cardIndex + 1}`;
  const el = document.getElementById(id);
  return el;
};

const getPlayerAreaEl = (player: GoatPlayer<"UI">) => {
  const id = "player-area-" + player.playerInfo.id;
  return document.getElementById(id);
};

const getLocationAreaEl = (locationName: LocationName) =>
  document.getElementById("location-" + locationName);

const getLocationCardEl = (location: LocationName) =>
  document.getElementById(location + "-card");

const getStashCardEl = (i: number) =>
  document.getElementById("stash-slot-" + (i + 1));

export type GameAnimation = {
  uid: number;
  keyframes: Keyframe[];
  timing: EffectTiming;
};

const createMoveAnimationFromElements = (
  source: Element,
  target: Element
): GameAnimation => {
  const el1Rect = getClientRect(source);
  const el2Rect = getClientRect(target);

  return createMoveAnimationFromDOMRects(el1Rect, el2Rect);
};

const createMoveAnimationFromDOMRects = (source: DOMRect, target: DOMRect) => {
  const xDiff = source.x - target.x;
  const yDiff = source.y - target.y;
  return {
    uid: Math.random(),
    keyframes: [
      {
        transform: `translateX(${Math.round(xDiff)}px) translateY(${Math.round(
          yDiff
        )}px)`,
        boxShadow:
          "0 9px 18px rgba(0, 0, 0, 0.16), 0 9px 18px rgba(0, 0, 0, 0.23)"
      },
      {
        offset: 1,
        transform: "translate(0,0)"
      }
    ],
    timing: {
      duration: 400,
      easing: "ease-out",
      iterations: 1
    }
  };
};

export const getCardFlyTowardsPlayerAnimation = (
  game: GameInStartedState<"UI">,
  player: GoatPlayer<"UI">,
  i: number
) => {
  if (
    game.substate.expectedAction === "SWAP_EVIDENCE" &&
    game.substate.location === "TRADE"
  ) {
    const [ev1, ev2] = game.events.slice(-2);
    if (
      ev1 &&
      ev2 &&
      "action" in ev1 &&
      "action" in ev2 &&
      ev1.action === "TRADE_CHOOSE_CARD" &&
      ev2.action === "TRADE_CHOOSE_CARD" &&
      [ev1, ev2].some(
        (e) =>
          e.actionPlayerId === player.playerInfo.id && e.playerCardIndex === i
      )
    ) {
      const opponentsTrade = [ev1, ev2].find(
        (e) => e.actionPlayerId !== player.playerInfo.id
      )!;
      const myTrade = [ev1, ev2].find(
        (e) => e.actionPlayerId === player.playerInfo.id
      );
      if (opponentsTrade && myTrade) {
        const oppEl = getPlayerCardEl(
          game.players.find(
            (p) => p.playerInfo.id === opponentsTrade.actionPlayerId
          )!,
          opponentsTrade.playerCardIndex
        );
        const myEl = getPlayerCardEl(
          game.players.find((p) => p.playerInfo.id === myTrade.actionPlayerId)!,
          myTrade.playerCardIndex
        );
        if (oppEl && myEl) {
          return createMoveAnimationFromElements(oppEl, myEl);
        }
      }
    }
  } else if (game.substate.expectedAction === "GO_TO_LOCATION") {
    if (game.events.length < 1) return;
    const [ev] = game.events.slice(-1);
    if (
      ev &&
      "action" in ev &&
      ev.action === "SWAP_EVIDENCE" &&
      ev.actionPlayerId === player.playerInfo.id &&
      ev.playerCardIndex === i
    ) {
      const locationCardEl = getLocationCardEl(player.location);
      const myEl = getPlayerCardEl(player, ev.playerCardIndex);

      if (locationCardEl && myEl) {
        return createMoveAnimationFromElements(locationCardEl, myEl);
      }
    }
  } else if (game.substate.expectedAction === "STASH_RETURN_CARD") {
    if (game.events.length < 1) return;
    if (i !== player.cards.length - 1) return; // stash card always goes to rightmost slot
    const [ev] = game.events.slice(-1);
    if (
      ev &&
      "action" in ev &&
      ev.action === "STASH_CHOOSE_CARD" &&
      ev.actionPlayerId === player.playerInfo.id
    ) {
      const locationCardEl = getStashCardEl(ev.stashCardIndex);
      const myEl = getPlayerCardEl(player, i);

      if (locationCardEl && myEl) {
        return createMoveAnimationFromElements(locationCardEl, myEl);
      }
    }
  }
};

export const getCardFlyTowardsLocationAnimation = (
  game: GameInStartedState<"UI">,
  location: LocationArea<"UI">
) => {
  if (game.substate.expectedAction === "GO_TO_LOCATION") {
    if (game.events.length < 1) return;
    const [ev] = game.events.slice(-1);

    if (ev && "action" in ev) {
      if (ev.action !== "SWAP_EVIDENCE") {
        return;
      }

      const player = (() => {
        let prevPlayer = game.activePlayer - 1;
        if (prevPlayer < 0) {
          prevPlayer = game.players.length - 1;
        }

        return game.players.find((p, i) => i === prevPlayer)!;
      })();

      if (player.location !== location.name) {
        return;
      }

      const locationCardEl = getLocationCardEl(player.location);
      const playerEl = getPlayerCardEl(player, ev.playerCardIndex);

      if (locationCardEl && playerEl) {
        return createMoveAnimationFromElements(playerEl, locationCardEl);
      }
    }
  }
};

export const getCardFlyTowardsStashAnimation = (
  game: GameInStartedState<"UI">,
  stashCardIndex: number
) => {
  if (game.substate.expectedAction === "SWAP_EVIDENCE") {
    if (game.events.length < 2) return;
    const [ev1, ev2] = game.events.slice(-2);

    if (
      ev1 &&
      ev2 &&
      "action" in ev1 &&
      "action" in ev2 &&
      ev1.action === "STASH_CHOOSE_CARD" &&
      ev2.action === "STASH_RETURN_CARD"
    ) {
      if (stashCardIndex !== ev1.stashCardIndex) return;

      const player = game.players.find((p, i) => i === game.activePlayer)!;

      if (player.location !== "STASH") {
        return;
      }

      const locationCardEl = getStashCardEl(stashCardIndex);
      const playerEl = getPlayerCardEl(player, ev2.playerCardIndex);

      if (locationCardEl && playerEl) {
        const id = "STASH";
        return createMoveAnimationFromElements(playerEl, locationCardEl);
      }
    }
  }
};

export const getPreparationTokenFliesTowardsPlayerAnimation = (
  game: GameInStartedState<"UI">,
  player: GoatPlayer<"UI">
) => {
  if (game.events.length < 1) return;
  if (game.substate.expectedAction !== "SWAP_EVIDENCE") return;
  const activePlayer = getActivePlayer(game);
  if (player !== activePlayer || player.preparationTokens.length === 0) return;
  const [ev] = game.events.slice(-1);
  if (!ev || !("action" in ev)) {
    return;
  }

  if (
    (player.location === "PREPARE" &&
      ev.action === "GO_TO_LOCATION" &&
      ev.location === "PREPARE") ||
    (player.location === "FRAME/STEAL" &&
      ev.action === "GO_TO_LOCATION" &&
      ev.location === "PREPARE") ||
    ev.action === "STEAL_CHOOSE_PLAYER"
  ) {
    const thiefPlayerEl = getPlayerAreaEl(player);
    if (!thiefPlayerEl) return;

    const otherPlayerOrLocationEl =
      ev.action === "STEAL_CHOOSE_PLAYER"
        ? getPlayerAreaEl(game.players.find((p) => p.color === ev.playerColor)!)
        : getLocationAreaEl(ev.location);

    if (!otherPlayerOrLocationEl) return;

    const oldLocation = getClientRect(otherPlayerOrLocationEl);
    const newLocation = getClientRect(thiefPlayerEl);

    if (oldLocation && newLocation) {
      return createMoveAnimationFromDOMRects(oldLocation, newLocation);
    }
  }
};
