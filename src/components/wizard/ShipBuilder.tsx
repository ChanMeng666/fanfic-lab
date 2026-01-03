"use client";

import { useState } from "react";
import { Heart, Check, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ShipBuilderProps {
  fandom: string;
  onSelect: (ships: string[]) => void;
}

// Popular ships by fandom (sample data)
const FANDOM_SHIPS: Record<string, string[]> = {
  "Harry Potter": ["Drarry (Draco/Harry)", "Wolfstar (Sirius/Remus)", "Jily (James/Lily)", "Romione (Ron/Hermione)", "Hinny (Harry/Ginny)"],
  "Marvel Cinematic Universe": ["Stucky (Steve/Bucky)", "Stony (Steve/Tony)", "Thorki (Thor/Loki)", "WinterIron (Bucky/Tony)", "Spideypool (Peter/Wade)"],
  "BTS": ["Taekook (V/Jungkook)", "Yoonmin (Suga/Jimin)", "Namjin (RM/Jin)", "Jihope (Jimin/J-Hope)", "Vmin (V/Jimin)"],
  "Supernatural": ["Destiel (Dean/Castiel)", "Wincest (Sam/Dean)", "Sabriel (Sam/Gabriel)", "Cockles (J2M)", "Debriel (Dean/Gabriel)"],
  "Sherlock": ["Johnlock (John/Sherlock)", "Mystrade (Mycroft/Lestrade)", "Sherlolly (Sherlock/Molly)"],
  "My Hero Academia": ["Bakudeku (Bakugo/Deku)", "Tododeku (Todoroki/Deku)", "Kiribaku (Kirishima/Bakugo)", "Erasermic (Aizawa/Mic)"],
};

export function ShipBuilder({ fandom, onSelect }: ShipBuilderProps) {
  const [selectedShips, setSelectedShips] = useState<string[]>([]);
  const [customShip, setCustomShip] = useState("");

  const suggestedShips = FANDOM_SHIPS[fandom] || [];

  const toggleShip = (ship: string) => {
    setSelectedShips((prev) =>
      prev.includes(ship) ? prev.filter((s) => s !== ship) : [...prev, ship]
    );
  };

  const addCustomShip = () => {
    if (customShip.trim() && !selectedShips.includes(customShip.trim())) {
      setSelectedShips((prev) => [...prev, customShip.trim()]);
      setCustomShip("");
    }
  };

  const handleContinue = () => {
    onSelect(selectedShips);
  };

  const handleSkip = () => {
    onSelect([]);
  };

  return (
    <div className="p-5 rounded-2xl bg-surface border border-border shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-10 rounded-xl bg-pink-500/10 text-pink-500">
          <Heart className="size-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-semibold text-foreground">Define Ships & Pairings</h3>
            <Badge variant="secondary" className="text-xs">
              {fandom}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Select romantic pairings for your story</p>
        </div>
      </div>

      {/* Suggested Ships */}
      {suggestedShips.length > 0 && (
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Popular ships in {fandom}:
          </label>
          <div className="flex flex-wrap gap-2">
            {suggestedShips.map((ship) => (
              <Badge
                key={ship}
                variant={selectedShips.includes(ship) ? "default" : "outline"}
                className={`cursor-pointer py-1.5 px-3 transition-colors gap-1 ${
                  selectedShips.includes(ship)
                    ? ""
                    : "hover:bg-primary/10 hover:border-primary/30"
                }`}
                onClick={() => toggleShip(ship)}
              >
                {selectedShips.includes(ship) && <Check className="size-3" />}
                {ship}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Custom Ship Input */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">
          Add custom ship:
        </label>
        <div className="flex gap-2">
          <Input
            value={customShip}
            onChange={(e) => setCustomShip(e.target.value)}
            placeholder="e.g., Character A / Character B"
            className="bg-surface"
            onKeyDown={(e) => e.key === "Enter" && addCustomShip()}
          />
          <Button
            onClick={addCustomShip}
            disabled={!customShip.trim()}
            variant="outline"
            className="gap-1.5"
          >
            <Plus className="size-4" />
            Add
          </Button>
        </div>
      </div>

      {/* Selected Ships */}
      {selectedShips.length > 0 && (
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Selected ships ({selectedShips.length}):
          </label>
          <div className="flex flex-wrap gap-2">
            {selectedShips.map((ship) => (
              <Badge
                key={ship}
                variant="default"
                className="cursor-pointer gap-1"
                onClick={() => toggleShip(ship)}
              >
                {ship}
                <X className="size-3" />
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-border/50">
        <Button
          onClick={handleContinue}
          className="flex-1"
        >
          {selectedShips.length > 0
            ? `Continue with ${selectedShips.length} ship${selectedShips.length > 1 ? "s" : ""}`
            : "Continue"}
        </Button>
        <Button onClick={handleSkip} variant="outline">
          Skip (Gen Fic)
        </Button>
      </div>
    </div>
  );
}
