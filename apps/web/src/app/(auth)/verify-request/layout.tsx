import { Footer } from "@/components/footer";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("verifyRequest.metadata");
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
