import NoAuthCard from "@/components/auth/no-auth";
import Footer from "@/components/footer";
import { SelectedPlayerProvider } from "@/components/map/player-switcher";
import { isAuthedToViewScrim } from "@/lib/auth";

export default async function ScrimDashboardLayout(
  props: {
    children: React.ReactNode;
    params: Promise<{ team: string; scrimId: string }>;
  }
) {
  const params = await props.params;

  const {
    children
  } = props;

  const id = parseInt(params.scrimId);
  const isAuthed = await isAuthedToViewScrim(id);

  if (!isAuthed) {
    return <NoAuthCard />;
  }

  return (
    <SelectedPlayerProvider>
      {children}
      <Footer />
    </SelectedPlayerProvider>
  );
}
