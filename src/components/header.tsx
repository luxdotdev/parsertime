"use client";

import { Dialog } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export function Header() {
  const t = useTranslations("marketing.header");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation: { name: string; href: Route }[] = [
    { name: t("home"), href: "/" },
    { name: t("about"), href: "/about" },
    { name: t("pricing"), href: "/pricing" },
    { name: t("demo"), href: "/demo" },
    { name: t("docs"), href: "https://docs.parsertime.app" },
    { name: t("company"), href: "https://lux.dev" },
  ];

  return (
    <header className="absolute inset-x-0 top-0 z-50">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8"
        aria-label="Global"
      >
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5">
            <span className="sr-only">Parsertime</span>
            <Image
              className="h-12 w-auto dark:invert"
              height={48}
              width={48}
              src="/parsertime.png"
              alt="Parsertime Logo"
            />
          </Link>
        </div>
        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-600 dark:text-gray-400"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">{t("accessibility.open")}</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <div className="hidden lg:flex lg:gap-x-12">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm leading-6 font-semibold text-gray-900 dark:text-white"
            >
              {item.name}
            </Link>
          ))}
        </div>
        <div className="hidden lg:flex lg:flex-1 lg:justify-end">
          <Link
            href="/sign-in"
            className="text-sm leading-6 font-semibold text-gray-900 dark:text-white"
          >
            {t("logIn")} <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </nav>
      <Dialog
        as="div"
        className="lg:hidden"
        open={mobileMenuOpen}
        onClose={setMobileMenuOpen}
      >
        <div className="fixed inset-0 z-50" />
        <Dialog.Panel className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10 dark:bg-black dark:sm:ring-white/10">
          <div className="flex items-center justify-between">
            <Link href="/" className="-m-1.5 p-1.5">
              <span className="sr-only">Parsertime</span>
              <Image
                className="h-12 w-auto dark:invert"
                height={48}
                width={48}
                src="/parsertime.png"
                alt="Parsertime Logo"
              />
            </Link>
            <button
              type="button"
              className="-m-2.5 rounded-md p-2.5 text-gray-600 dark:text-gray-400"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="sr-only">{t("accessibility.close")}</span>
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-6 flow-root">
            <div className="-my-6 divide-y divide-gray-500/25">
              <div className="space-y-2 py-6">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="-mx-3 block rounded-lg px-3 py-2 text-base leading-7 font-semibold text-gray-900 hover:bg-gray-200 dark:text-white dark:hover:bg-black"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
              <div className="py-6">
                <Link
                  href="/sign-in"
                  className="-mx-3 block rounded-lg px-3 py-2.5 text-base leading-7 font-semibold text-gray-900 hover:bg-gray-200 dark:text-white dark:hover:bg-black"
                >
                  {t("logIn")}
                </Link>
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </Dialog>
    </header>
  );
}
