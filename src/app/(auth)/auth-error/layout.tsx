import Footer from "@/components/footer";

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
