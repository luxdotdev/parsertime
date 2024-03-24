import { Metadata } from "next";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { UserAuthForm } from "@/components/auth/user-auth-form";
import Image from "next/image";

export const metadata: Metadata = {
  title: `Sign Up | Parsertime`,
  description: `Sign up for an account. Parsertime is a tool for analyzing Overwatch scrims.`,
  openGraph: {
    title: `Sign In | Parsertime`,
    description: `Sign up for an account. Parsertime is a tool for analyzing Overwatch scrims.`,
    url: "https://parsertime.app",
    type: "website",
    siteName: "Parsertime",
    images: [
      {
        url: `https://parsertime.app/opengraph-image.png`,
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_US",
  },
};

export default function AuthenticationPage() {
  return (
    <div className="container relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <Link href="/" className="md:hidden">
        <div className="relative right-4 top-2 z-20 flex items-center text-lg font-medium md:right-8 md:top-8">
          <Image
            src="/parsertime.png"
            alt=""
            width={50}
            height={50}
            className="dark:invert"
          />
          Parsertime
        </div>
      </Link>
      <Link
        href="/sign-in"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "absolute right-4 top-4 md:right-8 md:top-8"
        )}
      >
        Login
      </Link>
      <div className="relative hidden h-full flex-col bg-muted p-10 text-black dark:border-r dark:text-white lg:flex">
        <div className="bg-topography dark:bg-dark-topography absolute inset-0" />
        <Link href="/">
          <div className="relative z-20 flex items-center text-lg font-medium">
            <Image
              src="/parsertime.png"
              alt=""
              width={50}
              height={50}
              className="dark:invert"
            />
            Parsertime
          </div>
        </Link>
        <div className="relative z-20 mt-auto">
          <p className="space-y-2 text-lg">Made with ❤️ by lux.dev</p>
        </div>
      </div>
      <div className="pt-20 lg:p-8 lg:pt-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Create an account
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your email below to create your account
            </p>
          </div>
          <UserAuthForm />
        </div>
      </div>
    </div>
  );
}
