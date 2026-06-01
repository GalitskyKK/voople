"use client";

import { useState } from "react";

import { getMoodEmoji } from "@/lib/constants/mood";
import { Slider } from "@/components/ui/Slider";

type MoodSliderProps = {
  value?: number | null;
  onChange?: (value: number) => void;
  readOnly?: boolean;
};

export function MoodSlider({ value: controlled = 5, onChange, readOnly = false }: MoodSliderProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(controlled ?? 5);
  const value = controlled ?? uncontrolledValue;

  return (
    <Slider
      min={1}
      max={10}
      value={value}
      readOnly={readOnly}
      thumb={<span aria-hidden>{getMoodEmoji(value)}</span>}
      onChange={
        readOnly
          ? undefined
          : (v) => {
              if (controlled == null) setUncontrolledValue(v);
              onChange?.(v);
            }
      }
    />
  );
}
