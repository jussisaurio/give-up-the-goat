import { getRandomElement } from "./toolbox";

const ADVERBS = [
  "Very",
  "Extremely",
  "Faintly",
  "Tastefully",
  "Woefully",
  "Tactfully",
  "Profusely",
  "Ridiculously",
  "Wistfully",
  "Barely",
  "Defiantly"
];

const ADJECTIVES = [
  "Clueless",
  "Rabid",
  "Smart",
  "Enraged",
  "Possessed",
  "Large",
  "Small",
  "Loud",
  "Quiet",
  "Frantic",
  "Fussy",
  "Quaint",
  "Modern",
  "Belligerent",
  "Creepy",
  "Crafty",
  "Crusty",
  "Deliberate",
  "Drab",
  "Dull",
  "Tiresome",
  "Thick",
  "Slim",
  "Shredded",
  "Smelly",
  "Tasty",
  "Cool",
  "Hip",
  "Jazzy",
  "Nifty"
];

const NOUNS = [
  "Bear",
  "Boar",
  "Capybara",
  "Dinosaur",
  "Dragon",
  "Eagle",
  "Giraffe",
  "Guinea Pig",
  "Hamster",
  "Hippo",
  "Hound",
  "Jackal",
  "Kitten",
  "Lamb",
  "Mouse",
  "Narwhal",
  "Opossum",
  "Possum",
  "Pig",
  "Rat",
  "Rhino",
  "Shark",
  "Tit",
  "Whale"
];

export const createRandomNickname = () =>
  `${getRandomElement(ADVERBS)} ${getRandomElement(
    ADJECTIVES
  )} ${getRandomElement(NOUNS)}`;
