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
    description: "Propel yourself forward and damage enemies you impact.",
    cooldown: 8.5,
    tags: ["movement", "burning", "initiation"],
    impact: "low",
  },
  ability2: {
    name: "Dancing Blaze",
    description: "Strike nearby enemies while dodging all damage.",
    cooldown: 8,
    tags: ["movement", "sustain", "burning", "areaOfEffect", "lifesteal"],
    impact: "low",
  },
} as const;

export const Ana = {
  name: "Ana",
  image: "ana.png",
  ability1: {
    name: "Sleep Dart",
    description:
      "Ana fires a dart from her sidearm, rendering an enemy unconscious (though any damage will rouse them).",
    cooldown: 14,
    tags: ["crowdControl", "sleep", "cleansable"],
    impact: "critical",
  },
  ability2: {
    name: "Biotic Grenade",
    description:
      "Ana tosses a biotic bomb that deals damage to enemies and heals allies in a small area of effect.",
    cooldown: 10,
    tags: ["antiHeal", "healing", "sustain", "areaOfEffect", "cleansable"],
    impact: "critical",
  },
} as const;

export const Ashe = {
  name: "Ashe",
  image: "ashe.png",
  ability1: {
    name: "Coach Gun",
    description:
      "Ashe blasts enemies in front of her, knocking them away and propelling herself backward for added mobility.",
    cooldown: 10,
    tags: ["movement", "knockback"],
    impact: "low",
  },
  ability2: {
    name: "Dynamite",
    description:
      "Ashe throws an explosive that detonates after a short delay or immediately when shot. The explosion also lights enemies on fire, dealing damage over time.",
    cooldown: 12,
    tags: ["damage", "burning", "areaOfEffect", "cleansable"],
    impact: "medium",
  },
} as const;

export const Baptiste = {
  name: "Baptiste",
  image: "baptiste.png",
  ability1: {
    name: "Regenerative Burst",
    description:
      "Activates an intense regenerative burst that heals nearby allies over time.",
    cooldown: 15,
    tags: ["healing", "sustain", "areaOfEffect", "tempo"],
    impact: "medium",
  },
  ability2: {
    name: "Immortality Field",
    description:
      "Creates a field that prevents allies from dying. The generator can be destroyed.",
    cooldown: 25,
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
    description:
      "Bastion transforms between its two primary combat modes to adapt to battlefield conditions.",
    cooldown: 12,
    tags: ["damage", "tempo", "initiation"],
    impact: "high",
  },
  ability2: {
    name: "Self-Repair",
    description:
      "Fire a bomb that bounces off walls and explodes when it hits enemies or the ground.",
    cooldown: 8,
    tags: ["sustain"],
    impact: "negligible",
  },
} as const;

export const Brigitte = {
  name: "Brigitte",
  image: "brigitte.png",
  ability1: {
    name: "Whip Shot",
    description:
      "Brigitte throws her flail forward to knock an enemy away from her.",
    cooldown: 4,
    tags: ["damage", "knockback", "crowdControl"],
    impact: "medium",
  },
  ability2: {
    name: "Repair Pack",
    description: "Brigitte throws a Repair Pack that can heal an ally.",
    cooldown: 6,
    tags: ["healing"],
    impact: "medium",
  },
} as const;

export const Cassidy = {
  name: "Cassidy",
  image: "cassidy.png",
  ability1: {
    name: "Combat Roll",
    description:
      "Cassidy dives in the direction he's moving, effortlessly reloading his Peacekeeper in the process.",
    cooldown: 6,
    tags: ["movement"],
    impact: "low",
  },
  ability2: {
    name: "Flashbang",
    description:
      "Hinders enemies in front of you, slowing them and disabling movement abilities.",
    cooldown: 12,
    tags: ["areaOfEffect", "crowdControl", "hinder"],
    impact: "medium",
  },
} as const;

export const Domina = {
  name: "Domina",
  image: "domina.png",
  ability1: {
    name: "Sonic Repulsors",
    description: "Push enemies back, stunning them if they hit a wall.",
    cooldown: 7,
    tags: ["damage", "knockback", "crowdControl", "hinder"],
    impact: "low",
  },
  ability2: {
    name: "Crystal Charge",
    description: "Project an explosive crystal and reactivate to detonate it.",
    cooldown: 8,
    tags: ["damage"],
    impact: "low",
  },
} as const;

export const Doomfist = {
  name: "Doomfist",
  image: "doomfist.png",
  ability1: {
    name: "Seismic Slam",
    description:
      "Doomfist leaps forward and smashes into the ground, knocking nearby enemies toward him.",
    cooldown: 6,
    tags: ["damage", "movement", "initiation"],
    impact: "low",
  },
  ability2: {
    name: "Power Block",
    description:
      "Doomfist blocks frontal attacks. Blocking heavy damage empowers Rocket Punch.",
    cooldown: 7,
    tags: ["sustain", "tempo"],
    impact: "low",
  },
} as const;

export const Dva = {
  name: "D.Va",
  image: "dva.png",
  ability1: {
    name: "Boosters",
    description:
      "D.Va's mech launches into the air, her momentum carrying her forward. She can turn and change directions or barrel through her enemies, knocking them back.",
    cooldown: 4,
    tags: ["movement", "initiation", "tempo"],
    impact: "negligible",
  },
  ability2: {
    name: "Micro Missiles",
    description:
      "D.Va launches a volley of explosive rockets that deal direct hit and splash damage to enemies.",
    cooldown: 8,
    tags: ["damage", "areaOfEffect"],
    impact: "medium",
  },
} as const;

export const Echo = {
  name: "Echo",
  image: "echo.png",
  ability1: {
    name: "Flight",
    description: "Echo surges forward quickly, then can fly freely.",
    cooldown: 6,
    tags: ["movement"],
    impact: "negligible",
  },
  ability2: {
    name: "Focusing Beam",
    description:
      "Echo channels a beam for a few seconds, dealing very high damage to targets with less than half health.",
    cooldown: 8,
    tags: ["damage"],
    impact: "low",
  },
} as const;

export const Emre = {
  name: "Emre",
  image: "emre.png",
  ability1: {
    name: "Siphon Blaster",
    description:
      "Temporarily wield a semi-automatic pistol with lifestealing explosive rounds. Move faster and jump higher while wielded.",
    cooldown: 11,
    tags: ["damage", "sustain"],
    impact: "low",
  },
  ability2: {
    name: "Cyber Frag",
    description: "Throw a grenade that detonates shortly after bouncing.",
    cooldown: 8,
    tags: ["damage", "areaOfEffect"],
    impact: "low",
  },
} as const;

export const Freja = {
  name: "Freja",
  image: "freja.png",
  ability1: {
    name: "Quick Dash",
    description: "Vault in the direction you're moving and refresh Take Aim.",
    cooldown: 4.5,
    tags: ["movement"],
    impact: "negligible",
  },
  ability2: {
    name: "Updraft",
    description: "Dash forward, pushing enemies back.",
    cooldown: 12,
    tags: ["movement"],
    impact: "negligible",
  },
} as const;

export const Genji = {
  name: "Genji",
  image: "genji.png",
  ability1: {
    name: "Swift Strike",
    description:
      "Genji darts forward, slicing with his katana and passing through foes. Resets if it eliminates a target.",
    cooldown: 8,
    tags: ["damage", "movement"],
    impact: "low",
  },
  ability2: {
    name: "Deflect",
    description:
      "Genji reflects oncoming projectiles and sends them rebounding towards opponents.",
    cooldown: 8,
    tags: ["sustain"],
    impact: "negligible",
  },
} as const;

export const Hanzo = {
  name: "Hanzo",
  image: "hanzo.png",
  ability1: {
    name: "Sonic Arrow",
    description:
      "Hanzo launches an arrow containing a sonar tracking device that marks enemies within its detection radius.",
    cooldown: 12,
    tags: ["damage"],
    impact: "low",
  },
  ability2: {
    name: "Storm Arrows",
    description:
      "Hanzo's next several arrows fire without charge-up time but at reduced damage.",
    cooldown: 10,
    tags: ["damage"],
    impact: "low",
  },
} as const;

export const Hazard = {
  name: "Hazard",
  image: "hazard.png",
  ability1: {
    name: "Violent Leap",
    description:
      "Lunge forward. Activate again to slash enemies, knocking them back.",
    cooldown: 6,
    tags: ["damage", "movement", "initiation"],
    impact: "low",
  },
  ability2: {
    name: "Jagged Wall",
    description:
      "Launch a spiked wall that damages and knocks back nearby enemies.",
    cooldown: 12,
    tags: ["damage", "deployable"],
    impact: "low",
  },
} as const;

export const Illari = {
  name: "Illari",
  image: "illari.png",
  ability1: {
    name: "Outburst",
    description:
      "Launches you in the direction you are moving, knocking back enemies. Hold jump to go higher.",
    cooldown: 7,
    tags: ["damage", "movement"],
    impact: "low",
  },
  ability2: {
    name: "Healing Pylon",
    description: "Deploy a pylon that heals allies.",
    cooldown: 8,
    tags: ["healing", "sustain", "deployable"],
    impact: "high",
  },
} as const;

export const JetpackCat = {
  name: "Jetpack Cat",
  image: "jetpackcat.png",
  ability1: {
    name: "Lifeline",
    description:
      "Toggle into transport mode, allowing an ally to be towed. Increases movement speed and heals your ally.",
    cooldown: 2,
    tags: ["movement"],
    impact: "negligible",
  },
  ability2: {
    name: "Purr",
    description:
      "Pulsing area heal that increases in frequency over time. Knockback nearby enemies when activated.",
    cooldown: 12,
    tags: ["damage", "areaOfEffect"],
    impact: "low",
  },
} as const;

export const JunkerQueen = {
  name: "Junker Queen",
  image: "junkerqueen.png",
  ability1: {
    name: "Commanding Shout",
    description: "Increases speed and health of nearby allies.",
    cooldown: 12,
    tags: ["sustain", "movement", "speedBoost", "initiation", "tempo"],
    impact: "high",
  },
  ability2: {
    name: "Carnage",
    description:
      "Axe swing wounds all enemies in the vicinity, dealing damage over time.",
    cooldown: 8,
    tags: ["damage", "lifesteal"],
    impact: "low",
  },
} as const;

export const Junkrat = {
  name: "Junkrat",
  image: "junkrat.png",
  ability1: {
    name: "Concussion Mine",
    description:
      "After placing a homemade mine, Junkrat can trigger it to damage enemies and send them flying or propel himself through the air.",
    cooldown: 8,
    tags: ["damage", "movement"],
    impact: "low",
  },
  ability2: {
    name: "Steel Trap",
    description:
      "Junkrat tosses out a metal-toothed trap that clamps on enemies, injuring and immobilizing them.",
    cooldown: 10,
    tags: ["damage", "deployable", "hinder"],
    impact: "low",
  },
} as const;

export const Juno = {
  name: "Juno",
  image: "juno.png",
  ability1: {
    name: "Glide Boost",
    description:
      "Glide horizontally with increased movement speed for enhanced mobility.",
    cooldown: 8,
    tags: ["movement"],
    impact: "negligible",
  },
  ability2: {
    name: "Hyper Ring",
    description:
      "Deploy a ring that increases movement speed of allies passing through it.",
    cooldown: 16,
    tags: ["speedBoost", "initiation"],
    impact: "critical",
  },
} as const;

export const Kiriko = {
  name: "Kiriko",
  image: "kiriko.png",
  ability1: {
    name: "Swift Step",
    description: "Teleport directly to an ally, even through walls.",
    cooldown: 8,
    tags: ["movement", "immortality"],
    impact: "high",
  },
  ability2: {
    name: "Protection Suzu",
    description:
      "Upon impact, allies in the area become briefly invulnerable and are cleansed of most negative effects.",
    cooldown: 15,
    tags: ["healing", "cleanse", "immortality", "tempo", "reactive"],
    impact: "critical",
  },
} as const;

export const Lifeweaver = {
  name: "Lifeweaver",
  image: "lifeweaver.png",
  ability1: {
    name: "Petal Platform",
    description: "Throw a platform that springs upwards when stepped on.",
    cooldown: 12,
    tags: ["deployable"],
    impact: "low",
  },
  ability2: {
    name: "Life Grip",
    description:
      "Pull an ally to your location, protecting them as they travel.",
    cooldown: 20,
    tags: ["healing", "sustain", "cleanse", "reactive"],
    impact: "high",
  },
} as const;

export const Lucio = {
  name: "Lúcio",
  image: "lucio.png",
  ability1: {
    name: "Crossfade",
    description:
      "Lúcio continuously energizes himself and nearby teammates with music. He can switch between two songs: one amplifies movement speed, while the other regenerates health.",
    cooldown: 0,
    tags: ["movement", "speedBoost", "healing"],
    impact: "negligible",
  },
  ability2: {
    name: "Amp It Up",
    description:
      "Lúcio increases the volume on his speakers, boosting the effects of his songs.",
    cooldown: 12,
    tags: ["speedBoost", "healing", "initiation", "tempo"],
    impact: "critical",
  },
} as const;

export const Mauga = {
  name: "Mauga",
  image: "mauga.png",
  ability1: {
    name: "Overrun",
    description:
      "Charge forward and stomp to launch enemies; unstoppable while charging.",
    cooldown: 6,
    tags: ["damage", "movement", "initiation"],
    impact: "high",
  },
  ability2: {
    name: "Cardiac Overdrive",
    description:
      "Nearby allies take reduced damage and heal by dealing damage.",
    cooldown: 12,
    tags: ["areaOfEffect", "lifesteal", "sustain", "tempo"],
    impact: "critical",
  },
} as const;

export const Mei = {
  name: "Mei",
  image: "mei.png",
  ability1: {
    name: "Cryo-Freeze",
    description: "Becomes invulnerable and heals while encased in ice.",
    cooldown: 12,
    tags: ["sustain", "healing"],
    impact: "negligible",
  },
  ability2: {
    name: "Ice Wall",
    description:
      "Generates an enormous ice wall that obstructs lines of sight, stops movement, and blocks attacks.",
    cooldown: 12,
    tags: ["crowdControl", "deployable"],
    impact: "high",
  },
} as const;

export const Mercy = {
  name: "Mercy",
  image: "mercy.png",
  ability1: {
    name: "Guardian Angel",
    description: "Flies towards a targeted ally to reach them quickly.",
    cooldown: 1.5,
    tags: ["movement"],
    impact: "negligible",
  },
  ability2: {
    name: "Resurrect",
    description: "Brings a dead ally back into the fight with full health.",
    cooldown: 30,
    tags: ["healing", "resurrect"],
    impact: "critical",
  },
} as const;

export const Mizuki = {
  name: "Mizuki",
  image: "mizuki.png",
  ability1: {
    name: "Katashiro Return",
    description:
      "Leap forward, leaving behind a paper doll. Reactivate to return and gain increased movement speed while active.",
    cooldown: 12,
    tags: ["movement"],
    impact: "negligible",
  },
  ability2: {
    name: "Binding Chain",
    description: "Launch a tethering chain that hinders the first enemy hit.",
    cooldown: 12,
    tags: ["crowdControl", "hinder"],
    impact: "high",
  },
} as const;

export const Moira = {
  name: "Moira",
  image: "moira.png",
  ability1: {
    name: "Fade",
    description: "Moira quickly teleports a short distance.",
    cooldown: 6,
    tags: ["movement"],
    impact: "negligible",
  },
  ability2: {
    name: "Biotic Orb",
    description:
      "Moira launches a rebounding biotic sphere; she can choose between a regeneration effect that heals allies or a decay effect that deals damage to enemies.",
    cooldown: 8,
    tags: ["healing", "sustain", "damage"],
    impact: "low",
  },
} as const;

export const Orisa = {
  name: "Orisa",
  image: "orisa.png",
  ability1: {
    name: "Fortify",
    description:
      "Gain temporary health, reducing all damage taken and becoming unstoppable.",
    cooldown: 15.5,
    tags: ["sustain"],
    impact: "medium",
  },
  ability2: {
    name: "Javelin Spin",
    description:
      "Spin your javelin to destroy projectiles and block melee attacks, while also pushing enemies and increasing forward speed.",
    cooldown: 8,
    tags: ["sustain"],
    impact: "low",
  },
} as const;

export const Pharah = {
  name: "Pharah",
  image: "pharah.png",
  ability1: {
    name: "Jump Jet",
    description:
      "Propelled by her suit's thrusters, Pharah soars high into the air.",
    cooldown: 10,
    tags: ["movement"],
    impact: "negligible",
  },
  ability2: {
    name: "Concussive Blast",
    description:
      "Pharah looses a wrist rocket that knocks back any enemies it strikes.",
    cooldown: 9,
    tags: ["damage", "areaOfEffect"],
    impact: "low",
  },
} as const;

export const Ramattra = {
  name: "Ramattra",
  image: "ramattra.png",
  ability1: {
    name: "Nemesis Form",
    description:
      "Transform into Nemesis Form, changing your attacks, gaining bonus armor, and gaining a speed boost.",
    cooldown: 8,
    tags: ["damage", "sustain", "tempo"],
    impact: "high",
  },
  ability2: {
    name: "Ravenous Vortex",
    description:
      "Fire a nano ball that explodes when it hits the ground, spreading a damaging field. Affected enemies are slowed and pulled downward.",
    cooldown: 12,
    tags: ["damage", "areaOfEffect", "sustain", "crowdControl"],
    impact: "low",
  },
} as const;

export const Reaper = {
  name: "Reaper",
  image: "reaper.png",
  ability1: {
    name: "Wraith Form",
    description:
      "Reaper becomes a shadow for a short period of time. While in this form, he takes no damage and can pass through enemies, but cannot fire his weapons or use other abilities.",
    cooldown: 8,
    tags: ["movement", "sustain"],
    impact: "low",
  },
  ability2: {
    name: "Shadow Step",
    description:
      "After marking a destination, Reaper disappears and reappears at that location.",
    cooldown: 10,
    tags: ["movement"],
    impact: "negligible",
  },
} as const;

export const Reinhardt = {
  name: "Reinhardt",
  image: "reinhardt.png",
  ability1: {
    name: "Charge",
    description:
      "Charges forth in a straight line, grabbing enemies in path. Colliding with walls causes extreme damage to carried foes.",
    cooldown: 10,
    tags: ["movement", "damage"],
    impact: "medium",
  },
  ability2: {
    name: "Firestrike",
    description:
      "Whips hammer forward, slinging a flaming projectile that pierces and damages any enemies it touches.",
    cooldown: 6,
    tags: ["damage", "areaOfEffect"],
    impact: "low",
  },
} as const;

export const Roadhog = {
  name: "Roadhog",
  image: "roadhog.png",
  ability1: {
    name: "Chain Hook",
    description:
      "Roadhog hurls his chain at a target; if it catches, he yanks them into close range.",
    cooldown: 8,
    tags: ["damage", "hinder", "crowdControl"],
    impact: "high",
  },
  ability2: {
    name: "Take a Breather",
    description:
      "Roadhog restores a chunk of his health over a brief period of time.",
    cooldown: 8,
    tags: ["sustain"],
    impact: "negligible",
  },
} as const;

export const Sierra = {
  name: "Sierra",
  image: "sierra.png",
  ability1: {
    name: "Anchor Drone",
    description: "Launch an Anchor Drone. Reactivate to launch towards it.",
    cooldown: 12,
    tags: ["movement"],
    impact: "negligible",
  },
  ability2: {
    name: "Tremor Charge",
    description: "Throw a charge that creates a shockwave on impact.",
    cooldown: 8.5,
    tags: ["damage", "areaOfEffect"],
    impact: "low",
  },
} as const;

export const Sigma = {
  name: "Sigma",
  image: "sigma.png",
  ability1: {
    name: "Kinetic Grasp",
    description:
      "Sigma freezes incoming projectiles in midair, converting them into shields.",
    cooldown: 12,
    tags: ["sustain"],
    impact: "low",
  },
  ability2: {
    name: "Accretion",
    description:
      "Sigma gathers a mass of debris and flings it at an enemy to knock them down.",
    cooldown: 10,
    tags: ["damage", "areaOfEffect", "hinder", "crowdControl"],
    impact: "medium",
  },
} as const;

export const Sojourn = {
  name: "Sojourn",
  image: "sojourn.png",
  ability1: {
    name: "Power Slide",
    description: "Ground slide that can cancel into a high jump.",
    cooldown: 6,
    tags: ["movement"],
    impact: "negligible",
  },
  ability2: {
    name: "Disruptor Shot",
    description:
      "Launch an energy shot that slows and deals damage to enemies within it.",
    cooldown: 15,
    tags: ["damage", "areaOfEffect"],
    impact: "low",
  },
} as const;

export const Soldier76 = {
  name: "Soldier: 76",
  image: "soldier76.png",
  ability1: {
    name: "Sprint",
    description:
      "Soldier: 76 can rush ahead in a burst of speed. His sprint ends if he takes an action other than charging forward.",
    cooldown: 0,
    tags: ["movement"],
    impact: "negligible",
  },
  ability2: {
    name: "Biotic Field",
    description:
      "Plants a biotic emitter that restores health to Soldier: 76 and squadmates within the field.",
    cooldown: 15,
    tags: ["healing", "sustain", "deployable"],
    impact: "negligible",
  },
} as const;

export const Sombra = {
  name: "Sombra",
  image: "sombra.png",
  ability1: {
    name: "Virus",
    description:
      "Sombra infects an enemy with a projectile that deals damage over time. Hacked enemies take increased damage from Virus.",
    cooldown: 6,
    tags: ["damage"],
    impact: "negligible",
  },
  ability2: {
    name: "Translocator",
    description:
      "Tosses a beacon that allows instant teleportation back to its location while active.",
    cooldown: 6,
    tags: ["movement"],
    impact: "negligible",
  },
} as const;

export const Symmetra = {
  name: "Symmetra",
  image: "symmetra.png",
  ability1: {
    name: "Sentry Turret",
    description:
      "Throws a turret that deploys and automatically fires damaging blasts at nearby enemies while reducing their movement speed.",
    cooldown: 10,
    tags: ["damage", "deployable"],
    impact: "negligible",
  },
  ability2: {
    name: "Teleporter",
    description:
      "Sets up two connected teleporters allowing allies to travel between them.",
    cooldown: 10,
    tags: ["movement", "tempo", "initiation"],
    impact: "critical",
  },
} as const;

export const Torbjorn = {
  name: "Torbjörn",
  image: "torbjorn.png",
  ability1: {
    name: "Deploy Turret",
    description:
      "Throws a self-building turret that automatically fires at enemies.",
    cooldown: 10,
    tags: ["damage", "deployable"],
    impact: "low",
  },
  ability2: {
    name: "Overload",
    description:
      "Temporary enhancement granting increased movement speed, attack speed, and bonus armor.",
    cooldown: 10,
    tags: ["sustain", "areaOfEffect"],
    impact: "low",
  },
} as const;

export const Tracer = {
  name: "Tracer",
  image: "tracer.png",
  ability1: {
    name: "Blink",
    description:
      "Tracer zips horizontally through space in the direction she's moving, reappearing several yards away. She stores up to three charges.",
    cooldown: 3,
    tags: ["movement"],
    impact: "negligible",
  },
  ability2: {
    name: "Recall",
    description:
      "Tracer bounds backward in time, returning her health, ammo and position on the map to where they were a few seconds before.",
    cooldown: 12,
    tags: ["movement", "sustain"],
    impact: "medium",
  },
} as const;

export const Vendetta = {
  name: "Vendetta",
  image: "vendetta.png",
  ability1: {
    name: "Whirlwind Dash",
    description: "Rush forward into a circular dash.",
    cooldown: 10,
    tags: ["movement", "damage"],
    impact: "medium",
  },
  ability2: {
    name: "Soaring Slice",
    description:
      "Hurl your sword in the direction you are facing and then fly into it.",
    cooldown: 6,
    tags: ["damage", "movement", "initiation"],
    impact: "medium",
  },
} as const;

export const Venture = {
  name: "Venture",
  image: "venture.png",
  ability1: {
    name: "Burrow",
    description:
      "Move underground and become invulnerable. Emerge to deal damage.",
    cooldown: 8,
    tags: ["movement"],
    impact: "negligible",
  },
  ability2: {
    name: "Smart Extender",
    description: "Dash forward, pushing enemies back.",
    cooldown: 8,
    tags: ["damage", "movement"],
    impact: "low",
  },
} as const;

export const Widowmaker = {
  name: "Widowmaker",
  image: "widowmaker.png",
  ability1: {
    name: "Grappling Hook",
    description:
      "Launches a hook toward a surface; when it connects, Widowmaker is drawn to that location.",
    cooldown: 12,
    tags: ["movement"],
    impact: "low",
  },
  ability2: {
    name: "Venom Mine",
    description:
      "Adheres a mine to a surface that detonates when enemies approach, delivering poison gas for damage over time.",
    cooldown: 15,
    tags: ["damage", "areaOfEffect"],
    impact: "low",
  },
} as const;

export const Winston = {
  name: "Winston",
  image: "winston.png",
  ability1: {
    name: "Jump Pack",
    description:
      "Winston lunges through the air, dealing damage and staggering nearby enemies upon landing.",
    cooldown: 6,
    tags: ["movement", "initiation"],
    impact: "medium",
  },
  ability2: {
    name: "Barrier Projector",
    description:
      "Extends a bubble-shaped protective field that absorbs damage. Allies within can attack from inside the shield.",
    cooldown: 13,
    tags: ["damage", "sustain", "deployable", "tempo"],
    impact: "high",
  },
} as const;

export const WreckingBall = {
  name: "Wrecking Ball",
  image: "wreckingball.png",
  ability1: {
    name: "Roll",
    description:
      "Transforms into a ball form that increases maximum movement speed.",
    cooldown: 0,
    tags: ["movement"],
    impact: "negligible",
  },
  ability2: {
    name: "Adaptive Shield",
    description:
      "Creates temporary personal shields based on nearby opponent count.",
    cooldown: 15,
    tags: ["sustain"],
    impact: "medium",
  },
} as const;

export const Wuyang = {
  name: "Wuyang",
  image: "wuyang.png",
  ability1: {
    name: "Rushing Torrent",
    description: "Ride water to move faster and jump higher.",
    cooldown: 7,
    tags: ["movement"],
    impact: "low",
  },
  ability2: {
    name: "Guardian Wave",
    description:
      "Send a water wave forward that increases healing received by allies and knocks back enemies.",
    cooldown: 12,
    tags: ["damage", "sustain", "knockback"],
    impact: "low",
  },
} as const;

export const Zarya = {
  name: "Zarya",
  image: "zarya.png",
  ability1: {
    name: "Particle Barrier",
    description:
      "Emits a personal barrier that shields Zarya against incoming attacks, redirecting energy to enhance weapon damage.",
    cooldown: 10,
    tags: ["sustain", "deployable", "tempo"],
    impact: "critical",
  },
  ability2: {
    name: "Projected Barrier",
    description:
      "Surrounds one teammate with an energy barrier that absorbs damage and boosts the power of Zarya's Particle Cannon.",
    cooldown: 8,
    tags: ["sustain", "deployable", "tempo"],
    impact: "critical",
  },
} as const;

export const Zenyatta = {
  name: "Zenyatta",
  image: "zenyatta.png",
  ability1: {
    name: "Orb of Harmony",
    description:
      "Casts an orb on an ally that restores health per second while Zenyatta remains alive.",
    cooldown: 0,
    tags: ["sustain", "healing"],
    impact: "negligible",
  },
  ability2: {
    name: "Orb of Discord",
    description:
      "Attaches an orb to an opponent, amplifying damage they receive while Zenyatta remains alive.",
    cooldown: 0,
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
  | typeof Sierra
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
    Sierra: "Damage",
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
    "Sierra",
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
    "Sierra",
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
  Sierra,
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
