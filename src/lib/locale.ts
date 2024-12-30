/* eslint-disable @typescript-eslint/require-await */
"use server";

import { Locale, defaultLocale } from "@/i18n/config";
import { cookies } from "next/headers";

const COOKIE_NAME = "LOCALE";

export async function getUserLocale() {
  return cookies().get(COOKIE_NAME)?.value || defaultLocale;
}

export async function setUserLocale(locale: Locale) {
  cookies().set(COOKIE_NAME, locale);
}
