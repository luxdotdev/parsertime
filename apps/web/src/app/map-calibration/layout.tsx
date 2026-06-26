import { DashboardLayout } from "@/components/dashboard-layout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Map Calibration",
  description:
    "Calibrate map coordinate transforms for visualization overlays.",
};

export default function MapCalibrationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
