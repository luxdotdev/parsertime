import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { defaultLocale } from "@/i18n/config";
import { getMetadataTranslations } from "@/lib/metadata-i18n";
import type { Metadata } from "next";

export function generateMetadata(): Metadata {
  const t = getMetadataTranslations("privacyPage.metadata");

  return {
    title: t("title"),
    description: t("description"),
    metadataBase: new URL("https://parsertime.app"),
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

export default function PrivacyLayout({ children }: LayoutProps<"/privacy">) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
