import Footer from "@/components/footer";
import Header from "@/components/header";

export default function ContactLayout({ children }: LayoutProps<"/contact">) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
