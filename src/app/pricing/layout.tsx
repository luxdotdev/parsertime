import { Header } from "@/components/header";

export default function PricingLayout({ children }: LayoutProps<"/pricing">) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {children}
    </div>
  );
}
