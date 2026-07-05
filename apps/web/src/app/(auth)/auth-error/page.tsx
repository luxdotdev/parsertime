import { SUPPORT_EMAIL } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getStaticTranslations } from "@/lib/metadata-i18n";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense } from "react";

type Error =
  | "Configuration"
  | "AccessDenied"
  | "Verification"
  | "AuthorizedCallbackError"
  | "AdapterError"
  | "Default";

// Static shell: the page frame and heading prerender (default-locale title via
// the cookie-free translator); the searchParams-derived error message streams
// into ONE boundary whose fallback mirrors the loaded content's layout.
export default function AuthErrorPage(props: PageProps<"/auth-error">) {
  const t = getStaticTranslations("authError");

  return (
    <div className="flex h-[90vh] flex-col items-center justify-center space-y-6 p-6 text-center">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <Suspense fallback={<AuthErrorSkeleton />}>
        <AuthErrorContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function AuthErrorContent({
  searchParams,
}: {
  searchParams: PageProps<"/auth-error">["searchParams"];
}) {
  const [params, t] = await Promise.all([
    searchParams,
    getTranslations("authError"),
  ]);

  const errorMessages: Record<Error, string> = {
    Configuration: t("errors.configuration"),
    AccessDenied: t("errors.accessDenied"),
    AuthorizedCallbackError: t("errors.authorizedCallbackError"),
    Verification: t("errors.verification"),
    AdapterError: t("errors.adapterError"),
    Default: t("errors.default"),
  };
  const rawError = params.error;
  const error: Error =
    typeof rawError === "string" && Object.hasOwn(errorMessages, rawError)
      ? (rawError as Error)
      : "Default";

  return (
    <>
      <p className="max-w-[600px] text-gray-500 dark:text-gray-400">
        <span className="font-bold">{t("error")}</span>{" "}
        {errorMessages[error] ?? errorMessages.Default}
      </p>
      <p className="max-w-[600px] text-gray-500 dark:text-gray-400">
        {t.rich("description", {
          email: SUPPORT_EMAIL,
          link: (chunks) => (
            <Link href={`mailto:${SUPPORT_EMAIL}`} className="underline">
              {chunks}
            </Link>
          ),
        })}
      </p>
      <div className="flex space-x-4">
        <Button className="mx-auto" variant="outline" asChild>
          <Link href="/">{t("back")}</Link>
        </Button>
        <Button className="mx-auto" asChild>
          <Link href="/sign-in">{t("signIn")}</Link>
        </Button>
      </div>
    </>
  );
}

// Mirrors the loaded content: two message lines and the button row.
function AuthErrorSkeleton() {
  return (
    <>
      <Skeleton className="h-4 w-[500px] max-w-full" />
      <Skeleton className="h-4 w-[440px] max-w-full" />
      <div className="flex space-x-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </>
  );
}
