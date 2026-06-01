import { allHeroes } from "@/types/heroes";
import { mapNameToMapTypeMapping } from "@/types/map";
import {
  escapeRegExp,
  normalize,
} from "@/lib/query-builder/natural-language-text";

export const FILLER_WORDS = new Set([
  "a",
  "about",
  "all",
  "and",
  "are",
  "as",
  "at",
  "by",
  "data",
  "decrease",
  "each",
  "eight",
  "enemy",
  "every",
  "find",
  "five",
  "for",
  "four",
  "from",
  "goal",
  "goals",
  "has",
  "have",
  "he",
  "her",
  "hero",
  "heroes",
  "his",
  "i",
  "increase",
  "in",
  "it",
  "is",
  "know",
  "least",
  "less",
  "map",
  "maps",
  "me",
  "minimum",
  "more",
  "need",
  "nine",
  "number",
  "of",
  "on",
  "one",
  "our",
  "over",
  "damage",
  "player",
  "players",
  "role",
  "target",
  "targets",
  "scrim",
  "scrims",
  "seven",
  "six",
  "support",
  "stat",
  "stats",
  "tank",
  "team",
  "the",
  "their",
  "them",
  "three",
  "time",
  "to",
  "two",
  "type",
  "than",
  "ten",
  "ult",
  "ults",
  "ultimate",
  "ultimates",
  "under",
  "up",
  "us",
  "versus",
  "vs",
  "we",
  "what",
  "when",
  "which",
  "who",
  "with",
  "you",
  "zero",
]);

const NON_HERO_ABILITY_ALIAS_WORDS = new Set(["charge"]);

export const HERO_BY_NORMALIZED = new Map(
  allHeroes.flatMap((hero) => {
    const base = normalize(hero.name);
    const abilityAliases = [hero.ability1.name, hero.ability2.name].flatMap(
      (name) => {
        const normalized = normalize(name);
        if (NON_HERO_ABILITY_ALIAS_WORDS.has(normalized)) return [];
        return [
          normalized,
          ...normalized
            .split(/\s+/)
            .filter(
              (word) =>
                word.length > 3 &&
                !FILLER_WORDS.has(word) &&
                !NON_HERO_ABILITY_ALIAS_WORDS.has(word)
            ),
        ];
      }
    );
    const aliases = [base, ...abilityAliases];
    if (base === "soldier 76") aliases.push("soldier", "soldier76");
    if (base === "wrecking ball") aliases.push("ball", "hammond");
    if (base === "junker queen") aliases.push("jq");
    if (base === "widowmaker") aliases.push("widow");
    return aliases.map((alias) => [alias, hero.name] as const);
  })
);

const ABILITY_BY_NORMALIZED = new Map(
  allHeroes.flatMap((hero) =>
    [hero.ability1.name, hero.ability2.name].flatMap((name) => {
      const normalized = normalize(name);
      return [
        [normalized, name] as const,
        ...normalized
          .split(/\s+/)
          .filter((word) => word.length > 3 && !FILLER_WORDS.has(word))
          .map((word) => [word, name] as const),
      ];
    })
  )
);

const ULTIMATE_HERO_ALIASES: Array<[string, string[]]> = [
  ["Ana", ["nano boost", "nano"]],
  ["Ashe", ["b o b", "bob"]],
  ["Baptiste", ["amplification matrix", "amp matrix", "window"]],
  ["Bastion", ["configuration artillery", "artillery"]],
  ["Brigitte", ["rally"]],
  ["Cassidy", ["deadeye", "high noon"]],
  ["Doomfist", ["meteor strike", "meteor"]],
  ["D.Va", ["self destruct", "self-destruct", "bomb", "dva bomb"]],
  ["Echo", ["duplicate", "copy"]],
  ["Genji", ["dragonblade", "blade", "blades", "blading"]],
  ["Hanzo", ["dragonstrike", "dragon strike", "dragons"]],
  ["Hazard", ["downpour"]],
  ["Illari", ["captive sun", "sun"]],
  ["Junker Queen", ["rampage"]],
  ["Junkrat", ["rip tire", "riptire", "tire"]],
  ["Juno", ["orbital ray", "ray"]],
  ["Kiriko", ["kitsune rush", "kitsune", "rush"]],
  ["Lifeweaver", ["tree of life", "tree"]],
  ["Lúcio", ["sound barrier", "beat", "barrier"]],
  ["Mauga", ["cage fight", "cage"]],
  ["Mei", ["blizzard"]],
  ["Mercy", ["valkyrie", "valk"]],
  ["Moira", ["coalescence", "coal"]],
  ["Orisa", ["terra surge", "surge"]],
  ["Pharah", ["barrage"]],
  ["Ramattra", ["annihilation"]],
  ["Reaper", ["death blossom", "blossom"]],
  ["Reinhardt", ["earthshatter", "shatter"]],
  ["Roadhog", ["whole hog"]],
  ["Sigma", ["gravitic flux", "flux"]],
  ["Sojourn", ["overclock"]],
  ["Soldier: 76", ["tactical visor", "visor"]],
  ["Sombra", ["emp"]],
  ["Symmetra", ["photon barrier", "sym wall"]],
  ["Torbjörn", ["molten core", "molten"]],
  ["Tracer", ["pulse bomb", "pulse"]],
  ["Venture", ["tectonic shock"]],
  ["Widowmaker", ["infra sight", "infra-sight", "infrasight", "walls"]],
  ["Winston", ["primal rage", "primal"]],
  ["Wrecking Ball", ["minefield", "mines"]],
  ["Zarya", ["graviton surge", "grav"]],
  ["Zenyatta", ["transcendence", "trans"]],
];

const ULTIMATE_HERO_BY_NORMALIZED = new Map(
  ULTIMATE_HERO_ALIASES.flatMap(([hero, aliases]) =>
    aliases.flatMap((alias) => {
      const normalized = normalize(alias);
      if (normalized.endsWith("s")) return [[normalized, hero] as const];
      return [[normalized, hero] as const, [`${normalized}s`, hero] as const];
    })
  )
);

export const MAP_BY_NORMALIZED = new Map(
  Object.keys(mapNameToMapTypeMapping).map(
    (mapName) => [normalize(mapName), mapName] as const
  )
);

export type HeroMention = {
  hero: string;
  index: number;
  aliasLength: number;
};

export type AbilityMention = {
  ability: string;
  index: number;
  aliasLength: number;
};

export type MapMention = {
  map: string;
  index: number;
  aliasLength: number;
};

function findPhraseIndex(haystack: string, phrase: string): number {
  const normalized = normalize(phrase);
  const match = new RegExp(`(^|\\s)${escapeRegExp(normalized)}(?=\\s|$)`).exec(
    haystack
  );
  if (!match) return -1;
  return match.index + (match[1] ? match[1].length : 0);
}

export function mentionsOverlap(a: HeroMention, b: HeroMention): boolean {
  return a.index < b.index + b.aliasLength && b.index < a.index + a.aliasLength;
}

export function findHeroMentions(question: string): HeroMention[] {
  const normalized = normalize(question);
  const matches = Array.from(HERO_BY_NORMALIZED.entries())
    .map(([alias, hero]) => ({
      hero,
      index: findPhraseIndex(normalized, alias),
      aliasLength: alias.length,
    }))
    .filter((mention) => mention.index >= 0)
    .sort((a, b) => a.index - b.index || b.aliasLength - a.aliasLength);
  const seen = new Set<string>();
  const mentions: HeroMention[] = [];
  for (const mention of matches) {
    if (seen.has(mention.hero)) continue;
    seen.add(mention.hero);
    mentions.push(mention);
  }
  return mentions;
}

export function findUltimateHeroMentions(question: string): HeroMention[] {
  const normalized = normalize(question);
  const matches = Array.from(ULTIMATE_HERO_BY_NORMALIZED.entries())
    .map(([alias, hero]) => ({
      hero,
      index: findPhraseIndex(normalized, alias),
      aliasLength: alias.length,
    }))
    .filter((mention) => mention.index >= 0)
    .sort((a, b) => a.index - b.index || b.aliasLength - a.aliasLength);
  const seen = new Set<string>();
  const mentions: HeroMention[] = [];
  for (const mention of matches) {
    if (seen.has(mention.hero)) continue;
    seen.add(mention.hero);
    mentions.push(mention);
  }
  return mentions;
}

export function findAbility(question: string): string | null {
  return findAbilityMentions(question)[0]?.ability ?? null;
}

export function findAbilityMentions(question: string): AbilityMention[] {
  const normalized = normalize(question);
  const matches = Array.from(ABILITY_BY_NORMALIZED.entries())
    .map(([alias, ability]) => ({
      ability,
      index: findPhraseIndex(normalized, alias),
      aliasLength: alias.length,
    }))
    .filter((mention) => mention.index >= 0)
    .sort((a, b) => a.index - b.index || b.aliasLength - a.aliasLength);
  const seen = new Set<string>();
  const mentions: AbilityMention[] = [];
  for (const mention of matches) {
    if (seen.has(mention.ability)) continue;
    seen.add(mention.ability);
    mentions.push(mention);
  }
  return mentions;
}

export function findMapName(question: string): string | null {
  return findMapMentions(question)[0]?.map ?? null;
}

export function findMapMentions(question: string): MapMention[] {
  const normalized = normalize(question);
  const matches = Array.from(MAP_BY_NORMALIZED.entries())
    .map(([alias, map]) => ({
      map,
      index: findPhraseIndex(normalized, alias),
      aliasLength: alias.length,
    }))
    .filter((mention) => mention.index >= 0)
    .sort((a, b) => a.index - b.index || b.aliasLength - a.aliasLength);
  const seen = new Set<string>();
  const mentions: MapMention[] = [];
  for (const mention of matches) {
    if (seen.has(mention.map)) continue;
    seen.add(mention.map);
    mentions.push(mention);
  }
  return mentions;
}
