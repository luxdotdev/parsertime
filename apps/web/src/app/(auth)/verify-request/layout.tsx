import { Footer } from "@/components/footer";
import { getMetadataTranslations } from "@/lib/metadata-i18n";
import type { Metadata } from "next";

export function generateMetadata(): Metadata {
  const t = getMetadataTranslations("verifyRequest.metadata");
  return { title: t("title"), description: t("description") };
}

export default function RequestLayout({
  children,
}: LayoutProps<"/verify-request">) {
  return (
    <>
      {children}
      <Footer />
    </>
  );
}
