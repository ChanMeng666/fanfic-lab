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
  "Honkai: Star Rail",
  "Genshin Impact",
  "Honkai Impact 3rd",
  "Zenless Zone Zero",
  "Arknights",
  "Fate Series",
  "Harry Potter",
  "Marvel",
  "My Hero Academia",
  "Attack on Titan",
];

const STATUS_OPTIONS = [
  { value: undefined, label: "全部" },
  { value: "PUBLISHED", label: "连载中" },
  { value: "COMPLETE", label: "已完结" },
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
        <Popover open={fandomOpen} onOpenChange={setFandomOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={fandomOpen}
              aria-label="选择作品"
              className="w-[180px] justify-between gap-2"
            >
              <span className="truncate">{selectedFandom ?? "全部作品"}</span>
              <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-0" align="start">
            <Command>
              <CommandInput placeholder="搜索作品名…" />
              <CommandList>
                <CommandEmpty>未找到匹配的作品</CommandEmpty>
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
                    全部作品
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

        <div
          className="flex items-center rounded-full border border-border bg-surface p-1"
          role="group"
          aria-label="按状态筛选"
        >
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.label}
              onClick={() => onStatusChange(option.value)}
              aria-pressed={selectedStatus === option.value}
              className={cn(
                "rounded-full px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                selectedStatus === option.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

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
            清除
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          已加载 {resultCount} 篇
        </span>

        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-[150px] gap-2" aria-label="排序方式">
            <ArrowUpDown className="size-4 text-muted-foreground" />
            <SelectValue placeholder="排序" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">最新发布</SelectItem>
            <SelectItem value="popular">最受欢迎</SelectItem>
            <SelectItem value="comments">评论最多</SelectItem>
            <SelectItem value="words">字数最长</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
