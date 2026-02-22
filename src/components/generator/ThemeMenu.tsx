"use client";

import { useState } from "react";
import { Palette, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ThemeOption {
  name: string;
  description: string;
}

interface ThemeMenuProps {
  options: ThemeOption[];
  onSelect: (theme: string) => void;
}

export function ThemeMenu({ options, onSelect }: ThemeMenuProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [customTheme, setCustomTheme] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const handleSelect = (theme: string) => {
    setSelected(theme);
    setShowCustom(false);
    onSelect(theme);
  };

  const handleCustomSubmit = () => {
    if (customTheme.trim()) {
      setSelected(customTheme.trim());
      onSelect(customTheme.trim());
    }
  };

  return (
    <div className="space-y-4 animate-fade-slide-in">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center size-8 rounded-lg bg-accent/15 text-accent">
          <Palette className="size-4" />
        </div>
        <h2 className="font-display text-xl font-semibold">
          Pick a Theme
        </h2>
      </div>
      <p className="text-sm text-muted-foreground">
        What kind of story do you want?
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {options.map((option) => (
          <Card
            key={option.name}
            className={`cursor-pointer transition-all hover-lift ${
              selected === option.name
                ? "border-accent ring-2 ring-accent/20"
                : "border-border hover:border-accent/50"
            }`}
            onClick={() => handleSelect(option.name)}
          >
            <CardContent className="p-3">
              <p className="font-medium text-foreground text-sm">
                {option.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {option.description}
              </p>
            </CardContent>
          </Card>
        ))}

        {/* Custom theme */}
        <Card
          className={`cursor-pointer transition-all hover-lift ${
            showCustom
              ? "border-accent ring-2 ring-accent/20"
              : "border-dashed border-border hover:border-accent/50"
          }`}
          onClick={() => setShowCustom(true)}
        >
          <CardContent className="p-3">
            {showCustom ? (
              <div className="space-y-2">
                <Input
                  value={customTheme}
                  onChange={(e) => setCustomTheme(e.target.value)}
                  placeholder="Your theme..."
                  className="text-sm h-8"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
                />
                <Button
                  size="sm"
                  onClick={handleCustomSubmit}
                  disabled={!customTheme.trim()}
                  className="w-full h-7 text-xs"
                >
                  Confirm
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Plus className="size-4" />
                <span className="text-sm">Custom theme...</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
