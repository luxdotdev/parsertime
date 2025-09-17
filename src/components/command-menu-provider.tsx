"use client";

import React, { createContext } from "react";

export const CommandMenuContext = createContext({
  open: false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setOpen: (open: boolean) => {
    // empty
  },
});

export function CommandMenuProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    }

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, setOpen]);

  const value = React.useMemo(() => ({ open, setOpen }), [open, setOpen]);

  return <CommandMenuContext value={value}>{children}</CommandMenuContext>;
}
