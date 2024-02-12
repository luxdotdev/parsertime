"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SparklesCore } from "@/components/ui/sparkles";
import Image from "next/image";
import { track } from "@vercel/analytics";

export default function HeroComponent() {
  return (
    <div className="h-[40rem] w-full bg-black flex flex-col items-center justify-center rounded-md">
      <Image
        src="/parsertime.png"
        alt="Parsertime"
        width={800}
        height={800}
        className="h-48 w-48 invert"
      />

      <h1 className="md:text-7xl text-3xl lg:text-9xl font-bold text-center text-white relative z-20">
        Parsertime
      </h1>
      <div className="w-[40rem] h-40 relative">
        {/* Gradients */}
        <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-[2px] w-3/4 blur-sm" />
        <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-px w-3/4" />
        <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-[5px] w-1/4 blur-sm" />
        <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-px w-1/4" />

        {/* Core component */}
        <SparklesCore
          background="transparent"
          minSize={0.4}
          maxSize={1}
          particleDensity={1200}
          className="w-full h-full"
          particleColor="#FFFFFF"
        />

        {/* Radial Gradient to prevent sharp edges */}
        <div className="absolute inset-0 w-full h-full bg-black [mask-image:radial-gradient(350px_200px_at_top,transparent_20%,white)]"></div>

        <div className="flex flex-col justify-center space-y-4 text-center">
          <div className="w-full max-w-sm space-y-2 mx-auto">
            <Button
              className="bg-white text-black p-2"
              type="submit"
              asChild
              onClick={() => track("Sign Up", { location: "Home" })}
            >
              <Link href="/sign-up">Sign Up</Link>
            </Button>
            <span className="px-2" />
            <Button variant="outline" className="text-zinc-100" type="submit">
              Use without Signing In
            </Button>
          </div>
          <div>
            <p className="text-white">
              Already have an account?{" "}
              <Link href="/sign-in" className="text-zinc-100 font-semibold">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
