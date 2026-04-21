"use client";

import { Type, AlignJustify } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  useReadingPrefs,
  type FontSize,
  type LineHeight,
} from "@/lib/hooks/useReadingPrefs";
import { cn } from "@/lib/utils";

const FONT_OPTIONS: Array<{ value: FontSize; label: string; sample: string }> = [
  { value: "sm", label: "小", sample: "A" },
  { value: "md", label: "中", sample: "A" },
  { value: "lg", label: "大", sample: "A" },
];

const LINE_OPTIONS: Array<{ value: LineHeight; label: string }> = [
  { value: "compact", label: "紧凑" },
  { value: "normal", label: "标准" },
  { value: "relaxed", label: "宽松" },
];

const FONT_SAMPLE_CLASS: Record<FontSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

export function ReadingPrefs() {
  const { fontSize, lineHeight, setFontSize, setLineHeight } = useReadingPrefs();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="阅读偏好"
          className="fixed bottom-6 right-6 z-30 size-11 rounded-full bg-surface/95 backdrop-blur-lg shadow-lg border-border/60"
        >
          <Type className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="top"
        sideOffset={8}
        className="w-64 space-y-4"
      >
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Type className="size-3.5" />
            字号
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {FONT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFontSize(opt.value)}
                aria-pressed={fontSize === opt.value}
                aria-label={`字号 ${opt.label}`}
                className={cn(
                  "h-12 rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-colors",
                  fontSize === opt.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface text-muted-foreground hover:bg-muted"
                )}
              >
                <span className={cn("font-prose", FONT_SAMPLE_CLASS[opt.value])}>
                  {opt.sample}
                </span>
                <span className="text-[10px]">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <AlignJustify className="size-3.5" />
            行距
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {LINE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLineHeight(opt.value)}
                aria-pressed={lineHeight === opt.value}
                aria-label={`行距 ${opt.label}`}
                className={cn(
                  "h-9 rounded-lg border text-xs transition-colors",
                  lineHeight === opt.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface text-muted-foreground hover:bg-muted"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
