"use client";

import { useAppSettings } from "@/components/settings/app-settings-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Logger } from "@/lib/logger";
import { $Enums } from "@prisma/client";
import { Loader2 } from "lucide-react";
import React from "react";

const colorblindModeOptions = [
  {
    value: $Enums.ColorblindMode.OFF,
    label: "Off",
    description: "Standard colors",
  },
  {
    value: $Enums.ColorblindMode.DEUTERANOPIA,
    label: "Deuteranopia",
    description: "Red-green colorblind (green-weak)",
  },
  {
    value: $Enums.ColorblindMode.PROTANOPIA,
    label: "Protanopia",
    description: "Red-green colorblind (red-weak)",
  },
  {
    value: $Enums.ColorblindMode.TRITANOPIA,
    label: "Tritanopia",
    description: "Blue-yellow colorblind",
  },
];

export function ColorblindModeSelector() {
  const { appSettings, isLoading, error, updateColorblindMode } =
    useAppSettings();
  const [isUpdating, setIsUpdating] = React.useState(false);

  const handleModeChange = async (value: string) => {
    try {
      setIsUpdating(true);
      await updateColorblindMode(value as $Enums.ColorblindMode);
    } catch (error) {
      Logger.error("Failed to update colorblind mode:", error);
      // You could show a toast notification here
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Accessibility Settings</CardTitle>
          <CardDescription>
            Configure colorblind accessibility options
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Accessibility Settings</CardTitle>
          <CardDescription>
            Configure colorblind accessibility options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-destructive">
            Error loading settings: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accessibility Settings</CardTitle>
        <CardDescription>
          Configure colorblind accessibility options to improve your experience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-base font-medium">Colorblind Mode</Label>
          <RadioGroup
            value={appSettings?.colorblindMode ?? $Enums.ColorblindMode.OFF}
            onValueChange={handleModeChange}
            disabled={isUpdating}
            className="mt-2"
          >
            {colorblindModeOptions.map((option) => (
              <div key={option.value} className="flex items-start space-x-2">
                <RadioGroupItem
                  value={option.value}
                  id={option.value}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label
                    htmlFor={option.value}
                    className="cursor-pointer font-medium"
                  >
                    {option.label}
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    {option.description}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div
                        className="border-border bg-team-1-off size-4 rounded-sm border"
                        style={{
                          backgroundColor: `var(--team-1-${option.value.toLowerCase()})`,
                        }}
                      />
                      <span className="text-muted-foreground text-xs">
                        Team 1
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div
                        className="border-border size-4 rounded-sm border"
                        style={{
                          backgroundColor: `var(--team-2-${option.value.toLowerCase()})`,
                        }}
                      />
                      <span className="text-muted-foreground text-xs">
                        Team 2
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>

        {isUpdating && (
          <div className="text-muted-foreground flex items-center space-x-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Updating settings...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
