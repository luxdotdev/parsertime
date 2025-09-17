import { UserAuthForm } from "@/components/auth/user-auth-form";
import { Link } from "@/components/ui/link";
import { auth } from "@/lib/auth";
import type { PagePropsWithLocale } from "@/types/next";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { redirect } from "next/navigation";

export async function generateMetadata(
  props: PagePropsWithLocale<"/sign-in">
): Promise<Metadata> {
  const params = await props.params;

  const { locale } = params;

  const t = await getTranslations({
    locale,
    namespace: "signInPage.metadataSignIn",
  });

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
      locale,
    },
  };
}

export default async function AuthenticationPage() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  const t = await getTranslations("signInPage");

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
        <UserAuthForm />
      </div>
    </div>
  );
}
