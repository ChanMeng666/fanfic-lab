"use client";

import { useState } from "react";
import { Settings, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Constraints {
  length: "short" | "medium" | "long";
  rating: string;
  ending: "happy" | "sad" | "open";
  pov: "first" | "third";
  language: "en" | "zh";
}

interface ConstraintPanelProps {
  constraints: Constraints;
  onChange: (constraints: Constraints) => void;
}

const LENGTH_OPTIONS = [
  { value: "short" as const, label: "Short", desc: "~1,000 words" },
  { value: "medium" as const, label: "Medium", desc: "~3,000 words" },
  { value: "long" as const, label: "Long", desc: "~6,000 words" },
];

const RATING_OPTIONS = ["General", "Teen", "Mature"];

const ENDING_OPTIONS = [
  { value: "happy" as const, label: "Happy Ending" },
  { value: "sad" as const, label: "Sad Ending" },
  { value: "open" as const, label: "Open Ending" },
];

const POV_OPTIONS = [
  { value: "third" as const, label: "Third Person" },
  { value: "first" as const, label: "First Person" },
];

const LANGUAGE_OPTIONS = [
  { value: "en" as const, label: "English" },
  { value: "zh" as const, label: "Chinese" },
];

export function ConstraintPanel({ constraints, onChange }: ConstraintPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const update = (partial: Partial<Constraints>) => {
    onChange({ ...constraints, ...partial });
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Settings className="size-4" />
          <span>Story Options</span>
          <Badge variant="secondary" className="text-xs">
            {constraints.length} / {constraints.ending} / {constraints.language.toUpperCase()}
          </Badge>
        </div>
        {isExpanded ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-3">
          {/* Length */}
          <OptionRow label="Length">
            {LENGTH_OPTIONS.map((opt) => (
              <OptionBadge
                key={opt.value}
                selected={constraints.length === opt.value}
                onClick={() => update({ length: opt.value })}
              >
                {opt.label}
                <span className="text-xs opacity-60 ml-1">({opt.desc})</span>
              </OptionBadge>
            ))}
          </OptionRow>

          {/* Rating */}
          <OptionRow label="Rating">
            {RATING_OPTIONS.map((rating) => (
              <OptionBadge
                key={rating}
                selected={constraints.rating === rating}
                onClick={() => update({ rating })}
              >
                {rating}
              </OptionBadge>
            ))}
          </OptionRow>

          {/* Ending */}
          <OptionRow label="Ending">
            {ENDING_OPTIONS.map((opt) => (
              <OptionBadge
                key={opt.value}
                selected={constraints.ending === opt.value}
                onClick={() => update({ ending: opt.value })}
              >
                {opt.label}
              </OptionBadge>
            ))}
          </OptionRow>

          {/* POV */}
          <OptionRow label="POV">
            {POV_OPTIONS.map((opt) => (
              <OptionBadge
                key={opt.value}
                selected={constraints.pov === opt.value}
                onClick={() => update({ pov: opt.value })}
              >
                {opt.label}
              </OptionBadge>
            ))}
          </OptionRow>

          {/* Language */}
          <OptionRow label="Language">
            {LANGUAGE_OPTIONS.map((opt) => (
              <OptionBadge
                key={opt.value}
                selected={constraints.language === opt.value}
                onClick={() => update({ language: opt.value })}
              >
                {opt.label}
              </OptionBadge>
            ))}
          </OptionRow>
        </div>
      )}
    </div>
  );
}

function OptionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function OptionBadge({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Badge
      variant={selected ? "default" : "outline"}
      className="cursor-pointer text-xs px-3 py-1"
      onClick={onClick}
    >
      {children}
    </Badge>
  );
}
