import Footer from "@/components/footer";

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
