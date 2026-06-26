import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mt-8 space-y-12">
      <dl className="border-border grid grid-cols-2 divide-x divide-y divide-[var(--border)] border-y sm:grid-cols-2 lg:grid-cols-4 lg:divide-y-0">
        {["tank", "damage", "support", "best"].map((k) => (
          <div key={k} className="flex flex-col gap-1 px-4 py-3">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="mt-0.5 h-7 w-20" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </dl>

      <section className="space-y-4">
        <div>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-6 w-48" />
        </div>
        <div className="border-border overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                {["stat", "tank-h", "damage-h", "support-h"].map((k) => (
                  <th key={k} className="px-4 py-2 text-left">
                    <Skeleton className="h-2.5 w-12" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"].map((k) => (
                <tr key={k}>
                  {["p", "q", "r", "s"].map((c) => (
                    <td key={c} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-6 w-48" />
          <Skeleton className="mt-1 h-4 w-80" />
        </div>
        <div className="border-border overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                {[
                  "rank-h",
                  "roster-h",
                  "games-h",
                  "record-h",
                  "wr-h",
                  "toggle-h",
                ].map((k) => (
                  <th key={k} className="px-4 py-2 text-left">
                    <Skeleton className="h-2.5 w-10" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {["a", "b", "c", "d", "e"].map((k) => (
                <tr key={k}>
                  {["v", "w", "x", "y", "z", "u"].map((c) => (
                    <td key={c} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
