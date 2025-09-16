import { UserAuthForm } from "@/components/auth/user-auth-form";
import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { PagePropsWithLocale } from "@/types/next";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
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
    <div className="relative container h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <Link href="/" className="md:hidden">
        <div className="relative top-2 right-4 z-20 flex items-center text-lg font-medium md:top-8 md:right-8">
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
        href="/sign-up"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "absolute top-4 right-4 md:top-8 md:right-8"
        )}
      >
        {t("signUp")}
      </Link>
      <div className="bg-muted relative hidden h-full flex-col p-10 text-black lg:flex dark:border-r dark:text-white">
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
          <p className="space-y-2 text-lg">{t("madeBy")}</p>
        </div>
      </div>
      <div className="pt-20 lg:p-8 lg:pt-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("signIn")}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t("enterEmailSignIn")}
            </p>
          </div>
          <UserAuthForm />
        </div>
      </div>
    </div>
  );
}
