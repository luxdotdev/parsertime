import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function HeroComponent() {
  return (
    <div className="container px-4 md:px-6">
      <div className="grid gap-6 items-center">
        <div className="flex flex-col justify-center space-y-4 text-center">
          <div className="space-y-2 ">
            <h1 className="invert dark:invert-0 text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
              Revolutionize Your Overwatch Scrim Experience
            </h1>
            <p className="max-w-[600px] text-zinc-900 md:text-xl dark:text-zinc-100 mx-auto">
              Track your data, see your progress, and improve your team&apos;s
              performance.
            </p>
          </div>
          <div className="w-full max-w-sm space-y-2 mx-auto">
            <Button
              className="bg-black dark:bg-white text-white dark:text-black p-2"
              type="submit"
              asChild
            >
              <Link href="/sign-up">Sign Up</Link>
            </Button>
            <span className="px-2" />
            <Button variant="outline" type="submit">
              Use without Signing In
            </Button>
          </div>
          <div>
            <p>
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="text-zinc-900 dark:text-zinc-100 font-semibold"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
