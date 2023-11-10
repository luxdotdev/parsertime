"use client";

import { CreateScrimButton } from "@/components/dashboard/create-scrim";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function EmptyScrimList() {
  return (
    <Card>
      <div className="flex flex-col items-center justify-center space-y-2 h-screen">
        <h2 className="text-2xl font-bold tracking-tight">No Scrims</h2>
        <p className="text-gray-500">Create a new scrim to get started.</p>
        <CreateScrimButton />
      </div>
    </Card>
  );
}
