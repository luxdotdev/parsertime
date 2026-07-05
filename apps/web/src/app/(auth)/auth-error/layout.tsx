import { Footer } from "@/components/footer";
import { getMetadataTranslations } from "@/lib/metadata-i18n";
import type { Metadata } from "next";

export function generateMetadata(): Metadata {
  const t = getMetadataTranslations("authError.metadata");
  return { title: t("title"), description: t("description") };
}

export default function AuthErrorLayout({
  children,
}: LayoutProps<"/auth-error">) {
  return (
    <>
      {children}
      <Footer />
    </>
  );
}
