"use client";

import type { CardComponentProps } from "nextstepjs";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function CardStep({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  skipTour,
  arrow,
}: CardComponentProps) {
  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {step.icon && <span>{step.icon}</span>}
          {step.title}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="mb-2">{step.content}</div>
        {arrow}
      </CardContent>

      <CardFooter className="flex justify-between">
        <div className="text-muted-foreground text-sm">
          {currentStep + 1} / {totalSteps}
        </div>

        <div className="flex gap-2">
          {currentStep > 0 && (
            <Button variant="outline" size="sm" onClick={prevStep}>
              Previous
            </Button>
          )}
          <Button
            size="sm"
            onClick={async () => {
              nextStep();
              await new Promise((resolve) => setTimeout(resolve, 0));
              nextStep();
            }}
          >
            {currentStep === totalSteps - 1 ? "Finish" : "Next"}
          </Button>

          {step.showSkip && (
            <Button variant="ghost" size="sm" onClick={skipTour}>
              Skip
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
