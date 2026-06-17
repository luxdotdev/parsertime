import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contactPage.metadata");
  const locale = await getLocale();

  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: "https://parsertime.app/contact",
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

export default function ContactLayout({ children }: LayoutProps<"/contact">) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
