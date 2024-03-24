"use client";

import { CreateScrimButton } from "@/components/dashboard/create-scrim";
import { Card, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";

export function EmptyScrimList() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient)
    return (
      <Card className="border-dashed">
        <div className="flex h-[36rem] flex-col items-center justify-center space-y-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-5 w-96" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-8 w-24" />
        </div>
      </Card>
    );

  return (
    <Card className="border-dashed">
      <CardDescription>
        <div className="flex h-[36rem] flex-col items-center justify-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white">
            No Scrims
          </h2>
          <p className="text-gray-500">Click the button to create a scrim.</p>
          <CreateScrimButton />
        </div>
      </CardDescription>
    </Card>
  );
}
