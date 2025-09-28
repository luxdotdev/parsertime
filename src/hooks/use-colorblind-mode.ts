import { useAppSettings } from "@/components/settings/app-settings-provider";
import { $Enums } from "@prisma/client";

export function useColorblindMode() {
  const { appSettings } = useAppSettings();

  switch (appSettings?.colorblindMode) {
    case $Enums.ColorblindMode.OFF:
      return {
        team1: "var(--team-1-off)",
        team2: "var(--team-2-off)",
      };
    case $Enums.ColorblindMode.DEUTERANOPIA:
      return {
        team1: "var(--team-1-deuteranopia)",
        team2: "var(--team-2-deuteranopia)",
      };
    case $Enums.ColorblindMode.PROTANOPIA:
      return {
        team1: "var(--team-1-protanopia)",
        team2: "var(--team-2-protanopia)",
      };
    case $Enums.ColorblindMode.TRITANOPIA:
      return {
        team1: "var(--team-1-tritanopia)",
        team2: "var(--team-2-tritanopia)",
      };
    default:
      return {
        team1: "var(--team-1-off)",
        team2: "var(--team-2-off)",
      };
  }
}
