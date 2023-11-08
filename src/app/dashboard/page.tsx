"use client";

import PlayerSwitcher from "@/components/dashboard/player-switcher";
import { ParserDataContext } from "@/lib/parser-context";
import { useContext } from "react";

export default function Data() {
  const { data } = useContext(ParserDataContext);
  console.log(data);

  return (
    <main>
      <PlayerSwitcher />
    </main>
  );
}
