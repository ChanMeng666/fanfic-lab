"use client";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FandomTabsProps {
  selectedFandom: string | null;
  onFandomChange: (fandom: string | null) => void;
  fandoms?: string[];
}

const DEFAULT_FANDOMS = [
  "Harry Potter",
  "Marvel",
  "BTS",
  "Supernatural",
  "Star Wars",
  "Sherlock",
  "My Hero Academia",
  "Attack on Titan",
  "Genshin Impact",
  "Haikyuu!!",
  "Stray Kids",
  "The Witcher",
];

export function FandomTabs({
  selectedFandom,
  onFandomChange,
  fandoms = DEFAULT_FANDOMS,
}: FandomTabsProps) {
  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 pb-3">
        <Button
          variant={selectedFandom === null ? "default" : "outline"}
          size="sm"
          onClick={() => onFandomChange(null)}
        >
          All Fandoms
        </Button>
        {fandoms.map((fandom) => (
          <Button
            key={fandom}
            variant={selectedFandom === fandom ? "default" : "outline"}
            size="sm"
            onClick={() => onFandomChange(fandom)}
          >
            {fandom}
          </Button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
