"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, X, BookOpen, Tag, Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateStory, updateChapter } from "@/lib/actions/story";
import { countWords } from "@/lib/wordcount";
import { formatError } from "@/lib/format-error";

type Rating = "GENERAL" | "TEEN" | "MATURE" | "EXPLICIT";
type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED";

interface ChapterDraft {
  id: string;
  title: string | null;
  content: string;
  chapterNumber: number;
  wordCount: number;
  authorNotes: string | null;
}

interface EditStoryClientProps {
  story: {
    id: string;
    title: string;
    summary: string | null;
    fandom: string;
    ships: string[];
    tags: string[];
    rating: string;
    status: string;
    isComplete: boolean;
    chapters: ChapterDraft[];
  };
}

const RATING_OPTIONS: { value: Rating; label: string }[] = [
  { value: "GENERAL", label: "全年龄" },
  { value: "TEEN", label: "青少年" },
  { value: "MATURE", label: "成熟" },
  { value: "EXPLICIT", label: "限制级" },
];

// Visibility only. Completion (连载中 / 已完结) is a separate control below.
const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "DRAFT", label: "草稿（不公开）" },
  { value: "PUBLISHED", label: "已发布" },
  { value: "ARCHIVED", label: "已归档（下架）" },
];

const COMPLETION_OPTIONS: { value: "ongoing" | "complete"; label: string }[] = [
  { value: "ongoing", label: "连载中" },
  { value: "complete", label: "已完结" },
];

interface ChipInputProps {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  ariaLabel: string;
}

function ChipInput({ values, onChange, placeholder, ariaLabel }: ChipInputProps) {
  const [draft, setDraft] = useState("");
  function add() {
    const v = draft.trim();
    if (!v || values.includes(v)) {
      setDraft("");
      return;
    }
    onChange([...values, v]);
    setDraft("");
  }
  function remove(v: string) {
    onChange(values.filter((x) => x !== v));
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {values.length === 0 && (
          <span className="text-xs text-muted-foreground">尚未添加</span>
        )}
        {values.map((v) => (
          <Badge key={v} variant="secondary" className="gap-1 pr-1">
            {v}
            <button
              type="button"
              onClick={() => remove(v)}
              aria-label={`移除 ${v}`}
              className="rounded-full hover:bg-background/40 p-0.5"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-1.5">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          aria-label={ariaLabel}
        />
        <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1">
          <Plus className="size-3.5" />
          添加
        </Button>
      </div>
    </div>
  );
}

export function EditStoryClient({ story }: EditStoryClientProps) {
  const router = useRouter();

  const [title, setTitle] = useState(story.title);
  const [summary, setSummary] = useState(story.summary ?? "");
  const [ships, setShips] = useState<string[]>(story.ships);
  const [tags, setTags] = useState<string[]>(story.tags);
  const [rating, setRating] = useState<Rating>(story.rating as Rating);
  const [status, setStatus] = useState<Status>(story.status as Status);
  const [isComplete, setIsComplete] = useState(story.isComplete);

  const [chapters, setChapters] = useState<ChapterDraft[]>(story.chapters);
  const [saving, startSaving] = useTransition();

  function updateChapterField<K extends keyof ChapterDraft>(
    chapterId: string,
    key: K,
    value: ChapterDraft[K]
  ) {
    setChapters((prev) =>
      prev.map((c) => (c.id === chapterId ? { ...c, [key]: value } : c))
    );
  }

  function handleSave() {
    if (!title.trim()) {
      toast.error("标题不能为空");
      return;
    }
    if (chapters.some((c) => !c.content.trim())) {
      toast.error("章节正文不能为空");
      return;
    }

    startSaving(async () => {
      try {
        await updateStory({
          id: story.id,
          title: title.trim(),
          summary: summary.trim() || undefined,
          ships,
          tags,
          rating,
          status,
          isComplete,
        });

        // Update each changed chapter sequentially. Pre-PR-D each story
        // has a single chapter so this is a 1-call loop in practice.
        for (const ch of chapters) {
          const original = story.chapters.find((c) => c.id === ch.id);
          if (!original) continue;
          const titleChanged = (ch.title ?? "") !== (original.title ?? "");
          const contentChanged = ch.content !== original.content;
          const notesChanged = (ch.authorNotes ?? "") !== (original.authorNotes ?? "");
          if (!titleChanged && !contentChanged && !notesChanged) continue;
          await updateChapter({
            id: ch.id,
            title: ch.title?.trim() || undefined,
            content: contentChanged ? ch.content : undefined,
            authorNotes: ch.authorNotes?.trim() || undefined,
          });
        }

        toast.success("已保存");
        router.refresh();
      } catch (err) {
        toast.error(formatError(err, "保存失败"));
      }
    });
  }

  const totalWordCount = chapters.reduce((sum, c) => sum + countWords(c.content), 0);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href={`/story/${story.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            返回故事
          </Link>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            <Save className="size-4" />
            {saving ? "保存中…" : "保存"}
          </Button>
        </div>

        <header>
          <h1 className="font-display text-3xl font-bold text-foreground">编辑故事</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {story.fandom} · 全文 {totalWordCount.toLocaleString()} 字 · 共 {chapters.length} 章
          </p>
        </header>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2.5 text-base">
              <div className="flex items-center justify-center size-8 rounded-lg bg-primary/15 text-primary">
                <BookOpen className="size-4" />
              </div>
              <span className="font-display">基本信息</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">标题</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">简介</label>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                placeholder="一段 60~100 字的钩子文案"
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                显示在 Feed 卡片预览中。留空将下次生成时自动填充。
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">分级</label>
                <Select value={rating} onValueChange={(v) => setRating(v as Rating)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RATING_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">可见性</label>
                <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">连载状态</label>
                <Select
                  value={isComplete ? "complete" : "ongoing"}
                  onValueChange={(v) => setIsComplete(v === "complete")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPLETION_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  标记完结不会下架作品，仍会显示在 Feed 中。
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Heart className="size-3.5" />
                CP / 配对
              </label>
              <ChipInput
                values={ships}
                onChange={setShips}
                placeholder="如：砂金 × 开拓者"
                ariaLabel="配对"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Tag className="size-3.5" />
                标签
              </label>
              <ChipInput
                values={tags}
                onChange={setTags}
                placeholder="如：甜文、HE"
                ariaLabel="标签"
              />
            </div>
          </CardContent>
        </Card>

        {chapters.map((ch) => (
          <Card key={ch.id}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2.5 text-base">
                <div className="flex items-center justify-center size-8 rounded-lg bg-accent/15 text-accent">
                  <BookOpen className="size-4" />
                </div>
                <span className="font-display">
                  {chapters.length > 1 ? `第 ${ch.chapterNumber} 章` : "正文"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {chapters.length > 1 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">章节标题</label>
                  <Input
                    value={ch.title ?? ""}
                    onChange={(e) => updateChapterField(ch.id, "title", e.target.value)}
                    placeholder="可选"
                  />
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">正文</label>
                  <span className="text-xs text-muted-foreground">
                    {countWords(ch.content).toLocaleString()} 字
                  </span>
                </div>
                <Textarea
                  value={ch.content}
                  onChange={(e) => updateChapterField(ch.id, "content", e.target.value)}
                  rows={20}
                  className="font-prose leading-7 resize-y min-h-[400px]"
                />
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Link href={`/story/${story.id}`}>
            <Button variant="outline" disabled={saving}>
              取消
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            <Save className="size-4" />
            {saving ? "保存中…" : "保存"}
          </Button>
        </div>
      </main>
    </div>
  );
}
