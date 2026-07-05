import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { defaultLocale } from "@/i18n/config";
import { getMetadataTranslations } from "@/lib/metadata-i18n";
import type { Metadata } from "next";

export function generateMetadata(): Metadata {
  const t = getMetadataTranslations("termsPage.metadata");

  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: "/",
      type: "website",
      siteName: "Sightline",
      images: [
        {
          url: "/opengraph-image.png",
          width: 1200,
          height: 630,
        },
      ],
      locale: defaultLocale,
    },
  };
}

export default function TermsLayout({
  children,
}: LayoutProps<"/terms-of-service">) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
