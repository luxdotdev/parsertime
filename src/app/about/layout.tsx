import { Header } from "@/components/header";

export default function AboutPageLayout({ children }: LayoutProps<"/about">) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {children}
    </div>
  );
}
