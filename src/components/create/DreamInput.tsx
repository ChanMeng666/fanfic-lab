"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Check } from "lucide-react";
import { LENGTH_OPTIONS, type StoryLength } from "@/lib/billing/pricing";
import {
  HSR_CHARACTER_OPTIONS,
  TONE_OPTIONS,
  SETTING_OPTIONS,
  POV_OPTIONS,
  RATING_OPTIONS,
  ENDING_OPTIONS,
  type StructuredCreateInput,
} from "@/lib/create-options";
import { cn } from "@/lib/utils";

const QUICK_TAGS = ["现代AU", "ABO设定", "豆花甜饼", "HE", "强强", "双向奔赴"];

export interface CreateSubmit {
  prompt: string;
  length: StoryLength;
  structured?: StructuredCreateInput;
}

interface DreamInputProps {
  onSubmit: (input: CreateSubmit) => void;
  disabled?: boolean;
  // Seed text (e.g. from a remix). Remount via `key` to re-seed after it loads.
  initialPrompt?: string;
}

const selectClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function DreamInput({ onSubmit, disabled, initialPrompt }: DreamInputProps) {
  const [prompt, setPrompt] = useState(initialPrompt ?? "");
  const [length, setLength] = useState<StoryLength>("short");

  // Structured fields. Empty string = "unset / let the AI decide".
  const [cpA, setCpA] = useState("");
  const [cpB, setCpB] = useState("");
  const [tone, setTone] = useState("");
  const [setting, setSetting] = useState("");
  const [pov, setPov] = useState("");
  const [rating, setRating] = useState("");
  const [ending, setEnding] = useState("");
  const [avoid, setAvoid] = useState("");

  const cp = [cpA, cpB].filter(Boolean);
  const canSubmit = (prompt.trim().length > 0 || cp.length > 0) && !disabled;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const structured: StructuredCreateInput = {
      cp,
      tone: tone || undefined,
      setting: setting || undefined,
      pov: pov && pov !== "自动" ? pov : undefined,
      rating: rating || undefined,
      ending: ending && ending !== "不限" ? ending : undefined,
      avoid: avoid.trim() ? avoid.split(/[,，、\s]+/).filter(Boolean) : undefined,
    };
    onSubmit({ prompt: prompt.trim(), length, structured: cp.length > 0 ? structured : undefined });
  }

  function handleTagClick(tag: string) {
    setPrompt((p) => (p ? `${p}，${tag}` : `给我写一篇${tag}`));
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* CP picker — the heart of a fic request. */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <Field label="角色 A">
            <select className={selectClass} value={cpA} onChange={(e) => setCpA(e.target.value)} disabled={disabled}>
              <option value="">不指定</option>
              {HSR_CHARACTER_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <span className="pb-2 text-muted-foreground">×</span>
          <Field label="角色 B">
            <select className={selectClass} value={cpB} onChange={(e) => setCpB(e.target.value)} disabled={disabled}>
              <option value="">不指定</option>
              {HSR_CHARACTER_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* Structured customization grid. */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="基调 / 流派">
            <select className={selectClass} value={tone} onChange={(e) => setTone(e.target.value)} disabled={disabled}>
              <option value="">不限</option>
              {TONE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="设定 / AU">
            <select className={selectClass} value={setting} onChange={(e) => setSetting(e.target.value)} disabled={disabled}>
              <option value="">不限</option>
              {SETTING_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="人称视角">
            <select className={selectClass} value={pov} onChange={(e) => setPov(e.target.value)} disabled={disabled}>
              {POV_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="分级">
            <select className={selectClass} value={rating} onChange={(e) => setRating(e.target.value)} disabled={disabled}>
              <option value="">不限</option>
              {RATING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="结局">
            <select className={selectClass} value={ending} onChange={(e) => setEnding(e.target.value)} disabled={disabled}>
              {ENDING_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </Field>
          <Field label="避雷（不想看）">
            <input
              className={selectClass}
              value={avoid}
              onChange={(e) => setAvoid(e.target.value)}
              placeholder="如 ABO、第三者"
              disabled={disabled}
            />
          </Field>
        </div>

        {/* Free-text inspiration (optional once a CP is chosen). */}
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="灵感补充：想看的具体情节、梗、或一句话设定（可留空）"
          className="w-full min-h-[88px] p-4 rounded-xl border border-border bg-surface text-foreground placeholder:text-muted-foreground font-prose text-base resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          disabled={disabled}
        />
        <div className="flex flex-wrap gap-2">
          {QUICK_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleTagClick(tag)}
              disabled={disabled}
              className="px-3 py-1.5 text-sm rounded-full border border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50"
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Length selector — credit cost shown up front. */}
        <div className="grid grid-cols-3 gap-2">
          {LENGTH_OPTIONS.map((opt) => {
            const active = length === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLength(opt.value)}
                disabled={disabled}
                aria-pressed={active}
                className={cn(
                  "relative flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-colors disabled:opacity-50",
                  active ? "border-accent bg-ai-surface ai-glow" : "border-border bg-background hover:bg-secondary"
                )}
              >
                {active && <Check className="absolute right-2 top-2 size-3.5 text-accent" />}
                <span className="font-display text-base text-foreground">{opt.labelZh}</span>
                <span className="text-xs text-muted-foreground">{opt.approxZh}</span>
                <span className={cn("text-xs font-medium", opt.value === "short" ? "text-primary" : "text-accent")}>
                  {opt.value === "short" ? "每日免费起" : `${opt.cost} 积分`}
                </span>
              </button>
            );
          })}
        </div>

        <Button type="submit" size="lg" disabled={!canSubmit} className="w-full gap-2">
          <Sparkles className="size-4" />
          开始创作
        </Button>
      </form>
    </div>
  );
}
