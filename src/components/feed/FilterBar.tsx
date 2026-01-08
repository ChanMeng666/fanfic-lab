"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, ArrowUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  selectedFandom: string | null;
  onFandomChange: (fandom: string | null) => void;
  fandoms?: string[];
  selectedStatus: string | undefined;
  onStatusChange: (status: string | undefined) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  resultCount: number;
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

const STATUS_OPTIONS = [
  { value: undefined, label: "All" },
  { value: "PUBLISHED", label: "In Progress" },
  { value: "COMPLETE", label: "Complete" },
] as const;

export function FilterBar({
  selectedFandom,
  onFandomChange,
  fandoms = DEFAULT_FANDOMS,
  selectedStatus,
  onStatusChange,
  sortBy,
  onSortChange,
  resultCount,
}: FilterBarProps) {
  const [fandomOpen, setFandomOpen] = useState(false);

  const hasActiveFilters = selectedFandom || selectedStatus;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {/* Fandom Combobox */}
        <Popover open={fandomOpen} onOpenChange={setFandomOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={fandomOpen}
              className="w-[180px] justify-between gap-2"
            >
              <span className="truncate">
                {selectedFandom ?? "All Fandoms"}
              </span>
              <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search fandom..." />
              <CommandList>
                <CommandEmpty>No fandom found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="all"
                    onSelect={() => {
                      onFandomChange(null);
                      setFandomOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "size-4",
                        selectedFandom === null ? "opacity-100" : "opacity-0"
                      )}
                    />
                    All Fandoms
                  </CommandItem>
                  {fandoms.map((fandom) => (
                    <CommandItem
                      key={fandom}
                      value={fandom}
                      onSelect={() => {
                        onFandomChange(fandom);
                        setFandomOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "size-4",
                          selectedFandom === fandom ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {fandom}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Status Toggle */}
        <div className="flex items-center rounded-full border border-border bg-surface p-1">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.label}
              onClick={() => onStatusChange(option.value)}
              className={cn(
                "rounded-full px-3 py-1 text-sm font-medium transition-colors",
                selectedStatus === option.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onFandomChange(null);
              onStatusChange(undefined);
            }}
            className="gap-1 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
            Clear
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Results Count */}
        <span className="text-sm text-muted-foreground">
          {resultCount} {resultCount === 1 ? "story" : "stories"}
        </span>

        {/* Sort Select */}
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-[150px] gap-2">
            <ArrowUpDown className="size-4 text-muted-foreground" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="comments">Most Comments</SelectItem>
            <SelectItem value="words">Longest</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
