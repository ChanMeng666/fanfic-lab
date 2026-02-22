"use client";

import { useState } from "react";
import { Users, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface CPOption {
  names: string[];
  description: string;
}

interface CPMenuProps {
  options: CPOption[];
  onSelect: (cp: string[]) => void;
  fandom?: string;
}

export function CPMenu({ options, onSelect, fandom }: CPMenuProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [customPairing, setCustomPairing] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const handleSelect = (names: string[]) => {
    const label = names.join(" x ");
    setSelected(label);
    setShowCustom(false);
    onSelect(names);
  };

  const handleCustomSubmit = () => {
    if (customPairing.trim()) {
      setSelected(customPairing.trim());
      onSelect(
        customPairing
          .trim()
          .split(/\s*[x×\/]\s*/i)
          .map((n) => n.trim())
      );
    }
  };

  return (
    <div className="space-y-4 animate-fade-slide-in">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center size-8 rounded-lg bg-primary/15 text-primary">
          <Users className="size-4" />
        </div>
        <h2 className="font-display text-xl font-semibold">
          Choose a Pairing
        </h2>
      </div>
      {fandom && (
        <p className="text-sm text-muted-foreground">
          Popular pairings from {fandom}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((option) => {
          const label = option.names.join(" x ");
          return (
          <Card
            key={label}
            className={`cursor-pointer transition-all hover-lift ${
              selected === label
                ? "border-primary ring-2 ring-primary/20"
                : "border-border hover:border-primary/50"
            }`}
            onClick={() => handleSelect(option.names)}
          >
            <CardContent className="p-4">
              <p className="font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {option.description}
              </p>
            </CardContent>
          </Card>
          );
        })}

        {/* Custom pairing card */}
        <Card
          className={`cursor-pointer transition-all hover-lift ${
            showCustom
              ? "border-accent ring-2 ring-accent/20"
              : "border-dashed border-border hover:border-accent/50"
          }`}
          onClick={() => setShowCustom(true)}
        >
          <CardContent className="p-4">
            {showCustom ? (
              <div className="space-y-2">
                <Input
                  value={customPairing}
                  onChange={(e) => setCustomPairing(e.target.value)}
                  placeholder="e.g., Character A x Character B"
                  className="text-sm"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
                />
                <Button
                  size="sm"
                  onClick={handleCustomSubmit}
                  disabled={!customPairing.trim()}
                  className="w-full"
                >
                  Confirm
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Plus className="size-4" />
                <span className="text-sm">Custom pairing...</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
