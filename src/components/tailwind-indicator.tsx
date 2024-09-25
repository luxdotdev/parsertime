"use client";

import { cn } from "@/lib/utils";
import { GeistMono } from "geist/font/mono";
import { useEffect, useState } from "react";

export function TailwindIndicator() {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    function updateDimensions() {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    return () => {
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);

  const { width, height } = dimensions;

  const hideTailwindIndicator = process.env.VERCEL_ENV === "production";

  // Hide the Tailwind indicator in production
  if (hideTailwindIndicator) return null;

  return (
    <div
      className={cn(
        "fixed bottom-5 right-16 z-50 flex items-center space-x-2 rounded-full bg-black px-2.5 py-1 font-mono text-xs font-medium text-primary-foreground dark:bg-white",
        GeistMono.className
      )}
    >
      <span>
        {width.toLocaleString()} x {height.toLocaleString()}
      </span>
      <div className="h-4 w-px bg-gray-800" />
      <span className="sm:hidden">XS</span>
      <span className="hidden sm:inline md:hidden">SM</span>
      <span className="hidden md:inline lg:hidden">MD</span>
      <span className="hidden lg:inline xl:hidden">LG</span>
      <span className="hidden xl:inline 2xl:hidden">XL</span>
      <span className="hidden 2xl:inline">2XL</span>
    </div>
  );
}
