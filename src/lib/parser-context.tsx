"use client";

import { createContext, useState } from "react";
import { ParserData } from "../../types/parser";

type ParserDataContextType = {
  data: ParserData;
  setData: (data: ParserData) => void;
};

export const ParserDataContext = createContext<ParserDataContextType>({
  data: null as unknown as ParserData,
  setData: () => {},
});

export function ParserDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [data, setData] = useState<ParserData>(null as unknown as ParserData);

  return (
    <ParserDataContext.Provider value={{ data, setData }}>
      {children}
    </ParserDataContext.Provider>
  );
}
