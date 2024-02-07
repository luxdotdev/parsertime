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
        <div className="flex flex-col items-center justify-center space-y-2 h-[36rem]">
          <Skeleton className="w-28 h-8" />
          <Skeleton className="w-96 h-5" />
          <Skeleton className="w-64 h-8" />
          <Skeleton className="w-24 h-8" />
        </div>
      </Card>
    );

  return (
    <Card className="border-dashed">
      <CardDescription>
        <div className="flex flex-col items-center justify-center space-y-2 h-[36rem]">
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
