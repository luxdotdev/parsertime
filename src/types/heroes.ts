export type Hero = Support | Tank | DPS;

export type HeroName = Hero["name"];

export type AbilityImpact =
  | "negligible"
  | "low"
  | "medium"
  | "high"
  | "critical";

export const Anran = {
  name: "Anran",
  image: "anran.png",
  ability1: {
    name: "Inferno Rush",
    tags: ["movement", "burning", "initiation"],
    impact: "low",
  },
  ability2: {
    name: "Dancing Blaze",
    tags: ["movement", "sustain", "burning", "areaOfEffect", "lifesteal"],
    impact: "low",
  },
} as const;

export const Ana = {
  name: "Ana",
  image: "ana.png",
  ability1: {
    name: "Sleep Dart",
    tags: ["crowdControl", "sleep", "cleansable"],
    impact: "critical",
  },
  ability2: {
    name: "Biotic Grenade",
    tags: ["antiHeal", "healing", "sustain", "areaOfEffect", "cleansable"],
    impact: "critical",
  },
} as const;

export const Ashe = {
  name: "Ashe",
  image: "ashe.png",
  ability1: {
    name: "Coach Gun",
    tags: ["movement", "knockback"],
    impact: "low",
  },
  ability2: {
    name: "Dynamite",
    tags: ["damage", "burning", "areaOfEffect", "cleansable"],
    impact: "medium",
  },
} as const;

export const Baptiste = {
  name: "Baptiste",
  image: "baptiste.png",
  ability1: {
    name: "Regenerative Burst",
    tags: ["healing", "sustain", "areaOfEffect", "tempo"],
    impact: "medium",
  },
  ability2: {
    name: "Immortality Field",
    tags: [
      "healing",
      "sustain",
      "areaOfEffect",
      "immortality",
      "tempo",
      "reactive",
    ],
    impact: "critical",
  },
} as const;

export const Bastion = {
  name: "Bastion",
  image: "bastion.png",
  ability1: {
    name: "Reconfigure",
    tags: ["damage", "tempo", "initiation"],
    impact: "high",
  },
  ability2: {
    name: "Self-Repair",
    tags: ["sustain"],
    impact: "negligible",
  },
} as const;

export const Brigitte = {
  name: "Brigitte",
  image: "brigitte.png",
  ability1: {
    name: "Whip Shot",
    tags: ["damage", "knockback", "crowdControl"],
    impact: "medium",
  },
  ability2: {
    name: "Repair Pack",
    tags: ["healing"],
    impact: "medium",
  },
} as const;

export const Cassidy = {
  name: "Cassidy",
  image: "cassidy.png",
  ability1: {
    name: "Combat Roll",
    tags: ["movement"],
    impact: "low",
  },
  ability2: {
    name: "Flashbang",
    tags: ["areaOfEffect", "crowdControl", "hinder"],
    impact: "medium",
  },
} as const;

export const Domina = {
  name: "Domina",
  image: "domina.png",
  ability1: {
    name: "Sonic Repulsors",
    tags: ["damage", "knockback", "crowdControl", "hinder"],
    impact: "low",
  },
  ability2: {
    name: "Crystal Charge",
    tags: ["damage"],
    impact: "low",
  },
} as const;

export const Doomfist = {
  name: "Doomfist",
  image: "doomfist.png",
  ability1: {
    name: "Seismic Slam",
    tags: ["damage", "movement", "initiation"],
    impact: "low",
  },
  ability2: {
    name: "Power Block",
    tags: ["sustain", "tempo"],
    impact: "low",
  },
} as const;

export const Dva = {
  name: "D.Va",
  image: "dva.png",
  ability1: {
    name: "Boosters",
    tags: ["movement", "initiation", "tempo"],
    impact: "negligible",
  },
  ability2: {
    name: "Micro Missiles",
    tags: ["damage", "areaOfEffect"],
    impact: "medium",
  },
} as const;

export const Echo = {
  name: "Echo",
  image: "echo.png",
  ability1: {
    name: "Flight",
    tags: ["movement"],
    impact: "negligible",
  },
  ability2: {
    name: "Focusing Beam",
    tags: ["damage"],
    impact: "low",
  },
} as const;

export const Emre = {
  name: "Emre",
  image: "emre.png",
  ability1: {
    name: "Siphon Blaster",
    tags: ["damage", "sustain"],
    impact: "low",
  },
  ability2: {
    name: "Cyber Frag",
    tags: ["damage", "areaOfEffect"],
    impact: "low",
  },
} as const;

export const Freja = {
  name: "Freja",
  image: "freja.png",
  ability1: {
    name: "Quick Dash",
    tags: ["movement"],
    impact: "negligible",
  },
  ability2: {
    name: "Updraft",
    tags: ["movement"],
    impact: "negligible",
  },
} as const;

export const Genji = {
  name: "Genji",
  image: "genji.png",
  ability1: {
    name: "Swift Strike",
    tags: ["damage", "movement"],
    impact: "low",
  },
  ability2: {
    name: "Deflect",
    tags: ["sustain"],
    impact: "negligible",
  },
} as const;

export const Hanzo = {
  name: "Hanzo",
  image: "hanzo.png",
  ability1: {
    name: "Sonic Arrow",
    tags: ["damage"],
    impact: "low",
  },
  ability2: {
    name: "Storm Arrows",
    tags: ["damage"],
    impact: "low",
  },
} as const;

export const Hazard = {
  name: "Hazard",
  image: "hazard.png",
  ability1: {
    name: "Violent Leap",
    tags: ["damage", "movement", "initiation"],
    impact: "low",
  },
  ability2: {
    name: "Jagged Wall",
    tags: ["damage", "deployable"],
    impact: "low",
  },
} as const;

export const Illari = {
  name: "Illari",
  image: "illari.png",
  ability1: {
    name: "Outburst",
    tags: ["damage", "movement"],
    impact: "low",
  },
  ability2: {
    name: "Healing Pylon",
    tags: ["healing", "sustain", "deployable"],
    impact: "high",
  },
} as const;

export const JetpackCat = {
  name: "Jetpack Cat",
  image: "jetpackcat.png",
  ability1: {
    name: "Lifeline",
    tags: ["movement"],
    impact: "negligible",
  },
  ability2: {
    name: "Purr",
    tags: ["damage", "areaOfEffect"],
    impact: "low",
  },
} as const;

export const JunkerQueen = {
  name: "Junker Queen",
  image: "junkerqueen.png",
  ability1: {
    name: "Commanding Shout",
    tags: ["sustain", "movement", "speedBoost", "initiation", "tempo"],
    impact: "high",
  },
  ability2: {
    name: "Carnage",
    tags: ["damage", "lifesteal"],
    impact: "low",
  },
} as const;

export const Junkrat = {
  name: "Junkrat",
  image: "junkrat.png",
  ability1: {
    name: "Concussion Mine",
    tags: ["damage", "movement"],
    impact: "low",
  },
  ability2: {
    name: "Steel Trap",
    tags: ["damage", "deployable", "hinder"],
    impact: "low",
  },
} as const;

export const Juno = {
  name: "Juno",
  image: "juno.png",
  ability1: {
    name: "Glide Boost",
    tags: ["movement"],
    impact: "negligible",
  },
  ability2: {
    name: "Hyper Ring",
    tags: ["speedBoost", "initiation"],
    impact: "critical",
  },
} as const;

export const Kiriko = {
  name: "Kiriko",
  image: "kiriko.png",
  ability1: {
    name: "Swift Step",
    tags: ["movement", "immortality"],
    impact: "high",
  },
  ability2: {
    name: "Protection Suzu",
    tags: ["healing", "cleanse", "immortality", "tempo", "reactive"],
    impact: "critical",
  },
} as const;

export const Lifeweaver = {
  name: "Lifeweaver",
  image: "lifeweaver.png",
  ability1: {
    name: "Petal Platform",
    tags: ["deployable"],
    impact: "low",
  },
  ability2: {
    name: "Life Grip",
    tags: ["healing", "sustain", "cleanse", "reactive"],
    impact: "high",
  },
} as const;

export const Lucio = {
  name: "Lúcio",
  image: "lucio.png",
  ability1: {
    name: "Crossfade",
    tags: ["movement", "speedBoost", "healing"],
    impact: "negligible",
  },
  ability2: {
    name: "Amp It Up",
    tags: ["speedBoost", "healing", "initiation", "tempo"],
    impact: "critical",
  },
} as const;

export const Mauga = {
  name: "Mauga",
  image: "mauga.png",
  ability1: {
    name: "Overrun",
    tags: ["damage", "movement", "initiation"],
    impact: "high",
  },
  ability2: {
    name: "Cardiac Overdrive",
    tags: ["areaOfEffect", "lifesteal", "sustain", "tempo"],
    impact: "critical",
  },
} as const;

export const Mei = {
  name: "Mei",
  image: "mei.png",
  ability1: {
    name: "Cryo-Freeze",
    tags: ["sustain", "healing"],
    impact: "negligible",
  },
  ability2: {
    name: "Ice Wall",
    tags: ["crowdControl", "deployable"],
    impact: "high",
  },
} as const;

export const Mercy = {
  name: "Mercy",
  image: "mercy.png",
  ability1: {
    name: "Guardian Angel",
    tags: ["movement"],
    impact: "negligible",
  },
  ability2: {
    name: "Resurrect",
    tags: ["healing", "resurrect"],
    impact: "critical",
  },
} as const;

export const Mizuki = {
  name: "Mizuki",
  image: "mizuki.png",
  ability1: {
    name: "Katashiro Return",
    tags: ["movement"],
    impact: "negligible",
  },
  ability2: {
    name: "Binding Chain",
    tags: ["crowdControl", "hinder"],
    impact: "high",
  },
} as const;

export const Moira = {
  name: "Moira",
  image: "moira.png",
  ability1: {
    name: "Fade",
    tags: ["movement"],
    impact: "negligible",
  },
  ability2: {
    name: "Biotic Orb",
    tags: ["healing", "sustain", "damage"],
    impact: "low",
  },
} as const;

export const Orisa = {
  name: "Orisa",
  image: "orisa.png",
  ability1: {
    name: "Fortify",
    tags: ["sustain"],
    impact: "medium",
  },
  ability2: {
    name: "Javelin Spin",
    tags: ["sustain"],
    impact: "low",
  },
} as const;

export const Pharah = {
  name: "Pharah",
  image: "pharah.png",
  ability1: {
    name: "Jump Jet",
    tags: ["movement"],
    impact: "negligible",
  },
  ability2: {
    name: "Concussive Blast",
    tags: ["damage", "areaOfEffect"],
    impact: "low",
  },
} as const;

export const Ramattra = {
  name: "Ramattra",
  image: "ramattra.png",
  ability1: {
    name: "Nemesis Form",
    tags: ["damage", "sustain", "tempo"],
    impact: "high",
  },
  ability2: {
    name: "Ravenous Vortex",
    tags: ["damage", "areaOfEffect", "sustain", "crowdControl"],
    impact: "low",
  },
} as const;

export const Reaper = {
  name: "Reaper",
  image: "reaper.png",
  ability1: {
    name: "Wraith Form",
    tags: ["movement", "sustain"],
    impact: "low",
  },
  ability2: {
    name: "Shadow Step",
    tags: ["movement"],
    impact: "negligible",
  },
} as const;

export const Reinhardt = {
  name: "Reinhardt",
  image: "reinhardt.png",
  ability1: {
    name: "Charge",
    tags: ["movement", "damage"],
    impact: "medium",
  },
  ability2: {
    name: "Firestrike",
    tags: ["damage", "areaOfEffect"],
    impact: "low",
  },
} as const;

export const Roadhog = {
  name: "Roadhog",
  image: "roadhog.png",
  ability1: {
    name: "Chain Hook",
    tags: ["damage", "hinder", "crowdControl"],
    impact: "high",
  },
  ability2: {
    name: "Take a Breather",
    tags: ["sustain"],
    impact: "negligible",
  },
} as const;

export const Sigma = {
  name: "Sigma",
  image: "sigma.png",
  ability1: {
    name: "Kinetic Grasp",
    tags: ["sustain"],
    impact: "low",
  },
  ability2: {
    name: "Accretion",
    tags: ["damage", "areaOfEffect", "hinder", "crowdControl"],
    impact: "medium",
  },
} as const;

export const Sojourn = {
  name: "Sojourn",
  image: "sojourn.png",
  ability1: {
    name: "Power Slide",
    tags: ["movement"],
    impact: "negligible",
  },
  ability2: {
    name: "Disruptor Shot",
    tags: ["damage", "areaOfEffect"],
    impact: "low",
  },
} as const;

export const Soldier76 = {
  name: "Soldier: 76",
  image: "soldier76.png",
  ability1: {
    name: "Sprint",
    tags: ["movement"],
    impact: "negligible",
  },
  ability2: {
    name: "Biotic Field",
    tags: ["healing", "sustain", "deployable"],
    impact: "negligible",
  },
} as const;

export const Sombra = {
  name: "Sombra",
  image: "sombra.png",
  ability1: {
    name: "Virus",
    tags: ["damage"],
    impact: "negligible",
  },
  ability2: {
    name: "Translocator",
    tags: ["movement"],
    impact: "negligible",
  },
} as const;

export const Symmetra = {
  name: "Symmetra",
  image: "symmetra.png",
  ability1: {
    name: "Sentry Turret",
    tags: ["damage", "deployable"],
    impact: "negligible",
  },
  ability2: {
    name: "Teleporter",
    tags: ["movement", "tempo", "initiation"],
    impact: "critical",
  },
} as const;

export const Torbjorn = {
  name: "Torbjörn",
  image: "torbjorn.png",
  ability1: {
    name: "Deploy Turret",
    tags: ["damage", "deployable"],
    impact: "low",
  },
  ability2: {
    name: "Overload",
    tags: ["sustain", "areaOfEffect"],
    impact: "low",
  },
} as const;

export const Tracer = {
  name: "Tracer",
  image: "tracer.png",
  ability1: {
    name: "Blink",
    tags: ["movement"],
    impact: "negligible",
  },
  ability2: {
    name: "Recall",
    tags: ["movement", "sustain"],
    impact: "medium",
  },
} as const;

export const Vendetta = {
  name: "Vendetta",
  image: "vendetta.png",
  ability1: {
    name: "Whirlwind Dash",
    tags: ["movement", "damage"],
    impact: "medium",
  },
  ability2: {
    name: "Soaring Slice",
    tags: ["damage", "movement", "initiation"],
    impact: "medium",
  },
} as const;

export const Venture = {
  name: "Venture",
  image: "venture.png",
  ability1: {
    name: "Burrow",
    tags: ["movement"],
    impact: "negligible",
  },
  ability2: {
    name: "Smart Extender",
    tags: ["damage", "movement"],
    impact: "low",
  },
} as const;

export const Widowmaker = {
  name: "Widowmaker",
  image: "widowmaker.png",
  ability1: {
    name: "Grappling Hook",
    tags: ["movement"],
    impact: "low",
  },
  ability2: {
    name: "Venom Mine",
    tags: ["damage", "areaOfEffect"],
    impact: "low",
  },
} as const;

export const Winston = {
  name: "Winston",
  image: "winston.png",
  ability1: {
    name: "Jump Pack",
    tags: ["movement", "initiation"],
    impact: "medium",
  },
  ability2: {
    name: "Barrier Projector",
    tags: ["damage", "sustain", "deployable", "tempo"],
    impact: "high",
  },
} as const;

export const WreckingBall = {
  name: "Wrecking Ball",
  image: "wreckingball.png",
  ability1: {
    name: "Roll",
    tags: ["movement"],
    impact: "negligible",
  },
  ability2: {
    name: "Adaptive Shield",
    tags: ["sustain"],
    impact: "medium",
  },
} as const;

export const Wuyang = {
  name: "Wuyang",
  image: "wuyang.png",
  ability1: {
    name: "Rushing Torrent",
    tags: ["movement"],
    impact: "low",
  },
  ability2: {
    name: "Guardian Wave",
    tags: ["damage", "sustain", "knockback"],
    impact: "low",
  },
} as const;

export const Zarya = {
  name: "Zarya",
  image: "zarya.png",
  ability1: {
    name: "Particle Barrier",
    tags: ["sustain", "deployable", "tempo"],
    impact: "critical",
  },
  ability2: {
    name: "Projected Barrier",
    tags: ["sustain", "deployable", "tempo"],
    impact: "critical",
  },
} as const;

export const Zenyatta = {
  name: "Zenyatta",
  image: "zenyatta.png",
  ability1: {
    name: "Orb of Harmony",
    tags: ["sustain", "healing"],
    impact: "negligible",
  },
  ability2: {
    name: "Orb of Discord",
    tags: ["damage"],
    impact: "low",
  },
} as const;

export type Tank =
  | typeof Dva
  | typeof Domina
  | typeof Doomfist
  | typeof Hazard
  | typeof JunkerQueen
  | typeof Mauga
  | typeof Orisa
  | typeof Ramattra
  | typeof Reinhardt
  | typeof Roadhog
  | typeof Sigma
  | typeof Winston
  | typeof WreckingBall
  | typeof Zarya;
export type DPS =
  | typeof Anran
  | typeof Ashe
  | typeof Bastion
  | typeof Cassidy
  | typeof Echo
  | typeof Emre
  | typeof Freja
  | typeof Genji
  | typeof Hanzo
  | typeof Junkrat
  | typeof Mei
  | typeof Pharah
  | typeof Reaper
  | typeof Sojourn
  | typeof Soldier76
  | typeof Sombra
  | typeof Symmetra
  | typeof Torbjorn
  | typeof Tracer
  | typeof Vendetta
  | typeof Venture
  | typeof Widowmaker;
export type Support =
  | typeof Ana
  | typeof Baptiste
  | typeof Brigitte
  | typeof Illari
  | typeof JetpackCat
  | typeof Juno
  | typeof Kiriko
  | typeof Lifeweaver
  | typeof Lucio
  | typeof Mercy
  | typeof Mizuki
  | typeof Moira
  | typeof Wuyang
  | typeof Zenyatta;

export const heroRoleMapping: Record<HeroName, "Tank" | "Damage" | "Support"> =
  {
    Anran: "Damage",
    Ana: "Support",
    Ashe: "Damage",
    Baptiste: "Support",
    Bastion: "Damage",
    Brigitte: "Support",
    Cassidy: "Damage",
    Domina: "Tank",
    Doomfist: "Tank",
    "D.Va": "Tank",
    Echo: "Damage",
    Emre: "Damage",
    Freja: "Damage",
    Genji: "Damage",
    Hanzo: "Damage",
    Hazard: "Tank",
    Illari: "Support",
    "Jetpack Cat": "Support",
    "Junker Queen": "Tank",
    Junkrat: "Damage",
    Juno: "Support",
    Kiriko: "Support",
    Lifeweaver: "Support",
    Lúcio: "Support",
    Mauga: "Tank",
    Mei: "Damage",
    Mercy: "Support",
    Mizuki: "Support",
    Moira: "Support",
    Orisa: "Tank",
    Pharah: "Damage",
    Ramattra: "Tank",
    Reaper: "Damage",
    Reinhardt: "Tank",
    Roadhog: "Tank",
    Sigma: "Tank",
    Sojourn: "Damage",
    "Soldier: 76": "Damage",
    Sombra: "Damage",
    Symmetra: "Damage",
    Torbjörn: "Damage",
    Tracer: "Damage",
    Vendetta: "Damage",
    Venture: "Damage",
    Widowmaker: "Damage",
    Winston: "Tank",
    "Wrecking Ball": "Tank",
    Wuyang: "Support",
    Zarya: "Tank",
    Zenyatta: "Support",
  };

export const roleHeroMapping: Record<
  "Tank" | "Damage" | "Support",
  HeroName[]
> = {
  Tank: [
    "D.Va",
    "Domina",
    "Doomfist",
    "Hazard",
    "Junker Queen",
    "Mauga",
    "Orisa",
    "Ramattra",
    "Reinhardt",
    "Roadhog",
    "Sigma",
    "Winston",
    "Wrecking Ball",
    "Zarya",
  ],
  Damage: [
    "Anran",
    "Ashe",
    "Bastion",
    "Cassidy",
    "Echo",
    "Emre",
    "Freja",
    "Genji",
    "Hanzo",
    "Junkrat",
    "Mei",
    "Pharah",
    "Reaper",
    "Sojourn",
    "Soldier: 76",
    "Sombra",
    "Symmetra",
    "Torbjörn",
    "Tracer",
    "Vendetta",
    "Venture",
    "Widowmaker",
  ],
  Support: [
    "Ana",
    "Baptiste",
    "Brigitte",
    "Illari",
    "Jetpack Cat",
    "Juno",
    "Kiriko",
    "Lifeweaver",
    "Lúcio",
    "Mercy",
    "Mizuki",
    "Moira",
    "Wuyang",
    "Zenyatta",
  ],
};

export const subroleHeroMapping: Record<
  | "HitscanDamage"
  | "FlexDamage"
  | "GroundTank"
  | "DiveTank"
  | "FlexSupport"
  | "MainSupport",
  HeroName[]
> = {
  HitscanDamage: [
    "Ashe",
    "Bastion",
    "Cassidy",
    "Emre",
    "Hanzo",
    "Freja",
    "Sojourn",
    "Soldier: 76",
    "Tracer",
    "Widowmaker",
  ],
  FlexDamage: [
    "Anran",
    "Echo",
    "Genji",
    "Hanzo",
    "Junkrat",
    "Mei",
    "Pharah",
    "Reaper",
    "Sombra",
    "Symmetra",
    "Torbjörn",
    "Tracer",
    "Vendetta",
    "Venture",
  ],
  GroundTank: [
    "Domina",
    "Junker Queen",
    "Mauga",
    "Orisa",
    "Ramattra",
    "Reinhardt",
    "Roadhog",
    "Sigma",
    "Zarya",
  ],
  DiveTank: ["D.Va", "Doomfist", "Hazard", "Winston", "Wrecking Ball"],
  FlexSupport: [
    "Ana",
    "Baptiste",
    "Illari",
    "Kiriko",
    "Mizuki",
    "Moira",
    "Wuyang",
    "Zenyatta",
  ],
  MainSupport: [
    "Brigitte",
    "Juno",
    "Lifeweaver",
    "Lúcio",
    "Mercy",
    "Jetpack Cat",
  ],
};

export const heroPriority = {
  Damage: 1,
  Tank: 2,
  Support: 3,
};

export type SubroleName = keyof typeof subroleHeroMapping;

export type RoleName = "Tank" | "Damage" | "Support";

export const SUBROLE_DISPLAY_NAMES: Record<SubroleName, string> = {
  HitscanDamage: "Hitscan DPS",
  FlexDamage: "Flex DPS",
  GroundTank: "Ground Tank",
  DiveTank: "Dive Tank",
  FlexSupport: "Flex Support",
  MainSupport: "Main Support",
};

export const SUBROLE_ORDER: SubroleName[] = [
  "GroundTank",
  "DiveTank",
  "HitscanDamage",
  "FlexDamage",
  "FlexSupport",
  "MainSupport",
];

export const ROLE_SUBROLES: Record<RoleName, SubroleName[]> = {
  Tank: ["GroundTank", "DiveTank"],
  Damage: ["HitscanDamage", "FlexDamage"],
  Support: ["FlexSupport", "MainSupport"],
};

export function getHeroSubrole(
  hero: string,
  role: RoleName
): SubroleName | null {
  for (const subrole of ROLE_SUBROLES[role]) {
    if ((subroleHeroMapping[subrole] as string[]).includes(hero)) {
      return subrole;
    }
  }
  return null;
}

export function getHeroRole(hero: string): RoleName {
  return heroRoleMapping[hero as HeroName] ?? "Damage";
}

export const allHeroes = [
  Ana,
  Anran,
  Ashe,
  Baptiste,
  Bastion,
  Brigitte,
  Cassidy,
  Domina,
  Doomfist,
  Dva,
  Echo,
  Emre,
  Freja,
  Genji,
  Hanzo,
  Hazard,
  Illari,
  JetpackCat,
  JunkerQueen,
  Junkrat,
  Juno,
  Kiriko,
  Lifeweaver,
  Lucio,
  Mauga,
  Mei,
  Mercy,
  Mizuki,
  Moira,
  Orisa,
  Pharah,
  Ramattra,
  Reaper,
  Reinhardt,
  Roadhog,
  Sigma,
  Sojourn,
  Soldier76,
  Sombra,
  Symmetra,
  Torbjorn,
  Tracer,
  Vendetta,
  Venture,
  Widowmaker,
  Winston,
  WreckingBall,
  Wuyang,
  Zarya,
  Zenyatta,
] as const;

export const heroAbilityMapping: Record<
  HeroName,
  { ability1Name: string; ability2Name: string }
> = Object.fromEntries(
  allHeroes.map((h) => [
    h.name,
    { ability1Name: h.ability1.name, ability2Name: h.ability2.name },
  ])
) as Record<HeroName, { ability1Name: string; ability2Name: string }>;
