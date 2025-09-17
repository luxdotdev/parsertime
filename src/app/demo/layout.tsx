import DemoBanner from "@/components/demo/banner";
import Footer from "@/components/footer";
import { SelectedPlayerProvider } from "@/components/map/player-switcher";

export default function MapDashboardLayout({ children }: LayoutProps<"/demo">) {
  return (
    <>
      <DemoBanner />
      <SelectedPlayerProvider>{children}</SelectedPlayerProvider>
      <Footer />
    </>
  );
}
