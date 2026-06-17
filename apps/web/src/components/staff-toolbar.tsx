"use client";

import { VercelToolbar } from "@vercel/toolbar/next";

export function StaffToolbar() {
  const isDevEnvironment = process.env.NODE_ENV === "development";
  return isDevEnvironment ? <VercelToolbar /> : null;
}
