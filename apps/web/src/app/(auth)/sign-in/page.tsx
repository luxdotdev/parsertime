import { UserAuthForm } from "@/components/auth/user-auth-form";
import { Link } from "@/components/ui/link";
import { Skeleton } from "@/components/ui/skeleton";
import { auth } from "@/lib/auth";
import { defaultLocale } from "@/i18n/config";
import {
  getMetadataTranslations,
  getStaticTranslations,
} from "@/lib/metadata-i18n";
import type { Metadata, Route } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export function generateMetadata(): Metadata {
  const t = getMetadataTranslations("signInPage.metadataSignIn");

  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
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
      locale: defaultLocale,
    },
  };
}

const APP_ORIGIN = "https://parsertime.app";

function hasUnsafeRedirectChars(value: string) {
  return [...value].some((char) => {
    const code = char.charCodeAt(0);
    return char === "\\" || code <= 31 || code === 127;
  });
}

function getSafeCallbackUrl(callbackUrl: string | undefined): string {
  if (!callbackUrl || hasUnsafeRedirectChars(callbackUrl)) {
    return "/dashboard";
  }

  try {
    const url = new URL(callbackUrl, APP_ORIGIN);
    if (url.origin === APP_ORIGIN) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    // Fall through to the default dashboard path.
  }

  return "/dashboard";
}

// Static shell: the page frame and logo link prerender (default-locale text
// via the cookie-free translator), and the session/searchParams-derived form
// streams into ONE boundary whose fallback mirrors UserAuthForm's layout.
export default function AuthenticationPage(props: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const t = getStaticTranslations("signInPage");

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 self-center font-medium"
        >
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <Image
              className="invert dark:invert-0"
              src="/parsertime.png"
              alt="Parsertime Logo"
              width={24}
              height={24}
            />
          </div>
          {t("parsertime")}
        </Link>
        <Suspense fallback={<AuthFormSkeleton />}>
          <SignInContent searchParams={props.searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function SignInContent(props: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const [session, searchParams] = await Promise.all([
    auth(),
    props.searchParams,
  ]);
  const safeCallbackUrl = getSafeCallbackUrl(searchParams.callbackUrl);

  if (session) {
    redirect(safeCallbackUrl as Route);
  }

  return <UserAuthForm callbackUrl={safeCallbackUrl} />;
}

// Mirrors UserAuthForm's pending layout (card with centered header, three
// provider buttons, separator, email field, submit, footer links) so the
// streamed form replaces this in place with no jump.
function AuthFormSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="ring-foreground/10 bg-card flex flex-col gap-6 rounded-xl py-6 shadow-xs ring-1">
        <div className="flex flex-col items-center gap-1 px-6 text-center">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="px-6">
          <div className="grid gap-6">
            <div className="flex flex-col gap-4">
              {["discord", "google", "github"].map((k) => (
                <Skeleton key={k} className="h-9 w-full rounded-md" />
              ))}
            </div>
            <div className="flex h-5 items-center">
              <Skeleton className="h-px w-full" />
            </div>
            <div className="grid gap-6">
              <div className="grid gap-2">
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="mx-auto h-5 w-48" />
            </div>
          </div>
        </div>
      </div>
      <Skeleton className="mx-auto h-3 w-64" />
    </div>
  );
}
