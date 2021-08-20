import {
  GameInStartedState,
  GoatPlayer,
  LocationArea,
  LocationName
} from "../common/game";

const getPlayerCardEl = (player: GoatPlayer<"UI">, cardIndex: number) => {
  const id = `player-${player.playerInfo.id}-slot-${cardIndex + 1}`;
  const el = document.getElementById(id);
  return el;
};

const getLocationCardEl = (location: LocationName) =>
  document.getElementById(location + "-card");

const getStashCardEl = (i: number) =>
  document.getElementById("stash-slot-" + (i + 1));

const createMoveAnimation = (source: Element, target: Element, id: string) => {
  const el1Rect = source.getBoundingClientRect();
  const el2Rect = target.getBoundingClientRect();
  const xDiff = el1Rect.x - el2Rect.x;
  const yDiff = el1Rect.y - el2Rect.y;
  const coordinateDiff = {
    xDiff,
    yDiff
  };

  if (coordinateDiff) {
    const css = window.document.styleSheets[0];
    const ruleIdx = css.cssRules.length;
    css.insertRule(
      `
          @keyframes cardfly-${id} {
            0%   { 
                transform: translate(${coordinateDiff.xDiff}px, ${coordinateDiff.yDiff}px);
                box-shadow: 0 9px 18px rgba(0, 0, 0, 0.16), 0 9px 18px rgba(0, 0, 0, 0.23);
            }
            100% { transform: translate(0, 0) }
          }`,
      ruleIdx
    );

    setTimeout(() => {
      css.removeRule(Math.min(ruleIdx, css.cssRules.length - 1));
    }, 2000);
  }

  return coordinateDiff
    ? { ...coordinateDiff, animationId: `cardfly-${id}` }
    : undefined;
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
          const id = `player-${player.playerInfo.id}-slot-${i + 1}`;
          return createMoveAnimation(oppEl, myEl, id);
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
        const id = `player-${player.playerInfo.id}-slot-${i + 1}`;
        return createMoveAnimation(locationCardEl, myEl, id);
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
        const id = `player-${player.playerInfo.id}-slot-${i + 1}`;
        return createMoveAnimation(locationCardEl, myEl, id);
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
        const id = location.name.replace("/", "-");
        return createMoveAnimation(playerEl, locationCardEl, id);
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
        return createMoveAnimation(playerEl, locationCardEl, id);
      }
    }
  }
};
