"use client";

import { createContext, useState } from "react";
import { ParserData } from "../../types/parser";

type ParserDataContextType = {
  data: ParserData | null;
  setData: (data: ParserData | null) => void;
};

export const ParserDataContext = createContext<ParserDataContextType>({
  data: null,
  setData: () => {},
});

export function ParserDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [data, setData] = useState<ParserData | null>(null);

  return (
    <ParserDataContext.Provider value={{ data, setData }}>
      {children}
    </ParserDataContext.Provider>
  );
}