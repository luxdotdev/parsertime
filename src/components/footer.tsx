import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-800">
      <div className="container flex flex-col items-center justify-between px-6 py-8 mx-auto lg:flex-row">
        <Link href="/">
          <Image
            src="/parsertime.png"
            alt=""
            width={50}
            height={50}
            className="w-auto h-7 dark:invert"
          />
        </Link>

        <div className="flex flex-wrap items-center justify-center gap-4 mt-6 lg:gap-6 lg:mt-0">
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 transition-colors duration-300 dark:text-gray-300 hover:text-black dark:hover:text-white"
          >
            Dashboard
          </Link>
          <Link
            href="/team"
            className="text-sm text-gray-600 transition-colors duration-300 dark:text-gray-300 hover:text-black dark:hover:text-white"
          >
            Teams
          </Link>
          <Link
            href="mailto:help@parsertime.app"
            className="text-sm text-gray-600 transition-colors duration-300 dark:text-gray-300 hover:text-black dark:hover:text-white"
          >
            Contact
          </Link>
        </div>

        <p className="mt-6 text-sm text-gray-500 lg:mt-0 dark:text-gray-400">
          © Copyright 2024 lux.dev.{" "}
        </p>
      </div>
    </footer>
  );
}
