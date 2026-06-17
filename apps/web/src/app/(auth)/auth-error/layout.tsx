import { Footer } from "@/components/footer";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("authError.metadata");
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
