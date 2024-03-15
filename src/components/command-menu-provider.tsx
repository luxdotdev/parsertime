"use client";

import React from "react";
import { createContext } from "react";

export const CommandMenuContext = createContext({
  open: false,
  setOpen: (open: boolean) => {},
});

export function CommandMenuProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, setOpen]);

  return (
    <CommandMenuContext.Provider value={{ open, setOpen }}>
      {children}
    </CommandMenuContext.Provider>
  );
}
