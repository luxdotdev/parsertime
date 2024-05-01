import { CreateScrimButton } from "@/components/dashboard/create-scrim";
import { Card, CardDescription } from "@/components/ui/card";
import { Link } from "@/components/ui/link";

export function EmptyScrimList() {
  return (
    <Card className="border-dashed">
      <CardDescription>
        <div className="flex h-[36rem] flex-col items-center justify-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white">
            No Scrims
          </h2>
          <p className="text-gray-500">Click the button to create a scrim.</p>
          <p className="p-2 text-gray-500">
            Unsure how to get the data for a scrim?{" "}
            <Link href="https://docs.parsertime.app" target="_blank" external>
              Check out our documentation here.
            </Link>
          </p>
          <CreateScrimButton />
        </div>
      </CardDescription>
    </Card>
  );
}
