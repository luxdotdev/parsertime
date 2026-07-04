import { SelectedPlayerProvider } from "@/components/map/player-switcher";

// No auth gate here: gating the subtree in the layout forces a chrome-less
// fallback ABOVE every child route's own loading design (an extra skeleton
// phase on every scrim/map navigation). Each child route enforces access
// itself as the first step of its Suspense-wrapped content component
// (isAuthedToViewScrim / isAuthedToViewMap → <NoAuthCard />), so the check
// resolves inside the route's single loading state instead.
export default function ScrimDashboardLayout(
  props: LayoutProps<"/[team]/scrim/[scrimId]">
) {
  return <SelectedPlayerProvider>{props.children}</SelectedPlayerProvider>;
}
