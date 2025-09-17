import Footer from "@/components/footer";
import Header from "@/components/header";

export default function PricingLayout({ children }: LayoutProps<"/pricing">) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
