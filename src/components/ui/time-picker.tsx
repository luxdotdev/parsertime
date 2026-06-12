"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { TimePickerInput } from "@/components/ui/time-picker-input";

type TimePickerProps = {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
};

function TimePicker({ date, setDate }: TimePickerProps) {
  const minuteRef = React.useRef<HTMLInputElement>(null);
  const hourRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-2">
      <Clock className="text-muted-foreground size-4" aria-hidden="true" />
      <div className="flex items-center gap-1">
        <TimePickerInput
          picker="hours"
          date={date}
          ref={hourRef}
          setDate={setDate}
          onRightFocus={() => minuteRef.current?.focus()}
          aria-label="Hours"
        />
        <span className="text-muted-foreground select-none" aria-hidden="true">
          :
        </span>
        <TimePickerInput
          picker="minutes"
          date={date}
          ref={minuteRef}
          setDate={setDate}
          onLeftFocus={() => hourRef.current?.focus()}
          aria-label="Minutes"
        />
      </div>
    </div>
  );
}

export { TimePicker };
export type { TimePickerProps };
