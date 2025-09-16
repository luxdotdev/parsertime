import { Button } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

type Error =
  | "Configuration"
  | "AccessDenied"
  | "Verification"
  | "AuthorizedCallbackError"
  | "Default";

export default async function AuthErrorPage(props: PageProps<"/auth-error">) {
  const searchParams = await props.searchParams;
  const t = await getTranslations("authError");

  const error = searchParams.error as Error;

  const errorMessages = {
    Configuration: t("errors.configuration"),
    AccessDenied: t("errors.accessDenied"),
    AuthorizedCallbackError: t("errors.authorizedCallbackError"),
    Verification: t("errors.verification"),
    AdapterError: t("errors.adapterError"),
    Default: t("errors.default"),
  };

  return (
    <div className="flex h-[90vh] flex-col items-center justify-center space-y-6 p-6 text-center">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="max-w-[600px] text-gray-500 dark:text-gray-400">
        <span className="font-bold">{t("error")}</span>{" "}
        {errorMessages[error] ?? errorMessages.Default}
      </p>
      <p className="max-w-[600px] text-gray-500 dark:text-gray-400">
        {t.rich("description", {
          link: (chunks) => (
            <Link href="mailto:help@parsertime.app" className="underline">
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
    </div>
  );
}
