import { $Enums } from "@prisma/client";

export type MapName = keyof typeof mapNameToMapTypeMapping;

export const mapNameToMapTypeMapping = {
  Aatlis: $Enums.MapType.Flashpoint,
  "Antarctic Peninsula": $Enums.MapType.Control,
  "Blizzard World": $Enums.MapType.Hybrid,
  "Blizzard World (Winter)": $Enums.MapType.Hybrid,
  Busan: $Enums.MapType.Control,
  "Circuit royal": $Enums.MapType.Escort,
  "Circuit Royal": $Enums.MapType.Escort, // ensure case-insensitive
  Colosseo: $Enums.MapType.Push,
  Dorado: $Enums.MapType.Escort,
  Eichenwalde: $Enums.MapType.Hybrid,
  "Eichenwalde (Halloween)": $Enums.MapType.Hybrid,
  Esperança: $Enums.MapType.Push,
  Hanaoka: $Enums.MapType.Clash,
  Havana: $Enums.MapType.Escort,
  Hollywood: $Enums.MapType.Hybrid,
  "Hollywood (Halloween)": $Enums.MapType.Hybrid,
  Ilios: $Enums.MapType.Control,
  Junkertown: $Enums.MapType.Escort,
  "King's Row": $Enums.MapType.Hybrid,
  "King's Row (Winter)": $Enums.MapType.Hybrid,
  "Lijiang Tower": $Enums.MapType.Control,
  "Lijiang Tower (Lunar New Year)": $Enums.MapType.Control,
  Midtown: $Enums.MapType.Hybrid,
  Nepal: $Enums.MapType.Control,
  "New Junk City": $Enums.MapType.Flashpoint,
  "New Queen Street": $Enums.MapType.Push,
  Numbani: $Enums.MapType.Hybrid,
  Oasis: $Enums.MapType.Control,
  Paraiso: $Enums.MapType.Hybrid,
  Rialto: $Enums.MapType.Escort,
  "Route 66": $Enums.MapType.Escort,
  Runasapi: $Enums.MapType.Push,
  Samoa: $Enums.MapType.Control,
  "Shambali Monastery": $Enums.MapType.Escort,
  Suravasa: $Enums.MapType.Flashpoint,
  "Throne of Anubis": $Enums.MapType.Clash,
  "Watchpoint: Gibraltar": $Enums.MapType.Hybrid,
} as const;
