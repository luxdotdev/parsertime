import { Skeleton } from "@/components/ui/skeleton";

const tankKeys = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
];
const damageKeys = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
];
const supportKeys = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
];

export default function Loading() {
  return (
    <div className="flex-1 px-6 pt-6 pb-12 md:px-8">
      <div className="mb-6 flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <section className="flex flex-col gap-3">
          <Skeleton className="h-3 w-12" />
          <div className="ring-foreground/10 bg-card flex-1 overflow-hidden rounded-xl shadow-xs ring-1">
            <div className="bg-border grid grid-cols-3 gap-px sm:grid-cols-4 md:grid-cols-3">
              {tankKeys.map((k) => (
                <div
                  key={k}
                  className="bg-card flex flex-col items-center gap-2 px-3 py-4"
                >
                  <Skeleton className="size-14 rounded-md" />
                  <Skeleton className="h-3 w-10" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <Skeleton className="h-3 w-16" />
          <div className="ring-foreground/10 bg-card flex-1 overflow-hidden rounded-xl shadow-xs ring-1">
            <div className="bg-border grid grid-cols-3 gap-px sm:grid-cols-4 md:grid-cols-3">
              {damageKeys.map((k) => (
                <div
                  key={k}
                  className="bg-card flex flex-col items-center gap-2 px-3 py-4"
                >
                  <Skeleton className="size-14 rounded-md" />
                  <Skeleton className="h-3 w-10" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <Skeleton className="h-3 w-16" />
          <div className="ring-foreground/10 bg-card flex-1 overflow-hidden rounded-xl shadow-xs ring-1">
            <div className="bg-border grid grid-cols-3 gap-px sm:grid-cols-4 md:grid-cols-3">
              {supportKeys.map((k) => (
                <div
                  key={k}
                  className="bg-card flex flex-col items-center gap-2 px-3 py-4"
                >
                  <Skeleton className="size-14 rounded-md" />
                  <Skeleton className="h-3 w-10" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
