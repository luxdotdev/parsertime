"use client";

import { ParserDataContext } from "@/lib/parser-context";
import { useContext } from "react";

export default function Data() {
  const { data } = useContext(ParserDataContext);
  console.log(data);

  return <main>Hello world</main>;
}
