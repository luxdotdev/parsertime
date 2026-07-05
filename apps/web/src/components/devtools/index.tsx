import { ClientVercelToolbar } from "@/components/devtools/client-vercel-toolbar";
import { ReactScan } from "@/components/devtools/react-scan";
import { TailwindIndicator } from "@/components/devtools/tailwind-indicator";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

export function DevTools() {
  const isProd = process.env.NEXT_PUBLIC_VERCEL_ENV === "production";
  if (isProd) return null;

  return (
    <>
      <ReactScan />
      <TailwindIndicator />
      <ReactQueryDevtools />
      <ClientVercelToolbar />
    </>
  );
}
