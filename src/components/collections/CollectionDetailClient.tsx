"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Library, Lock, Pencil, Trash2, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { formatError } from "@/lib/format-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StoryCard, type StoryCardData } from "@/components/feed";
import {
  updateCollection,
  deleteCollection,
  removeStoryFromCollection,
} from "@/lib/actions/collection";

interface CollectionDetailClientProps {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  owner: { username: string; displayName: string | null };
  isOwner: boolean;
  stories: StoryCardData[];
}

export function CollectionDetailClient({
  id,
  title: initialTitle,
  description: initialDescription,
  isPublic: initialIsPublic,
  owner,
  isOwner,
  stories: initialStories,
}: CollectionDetailClientProps) {
  const router = useRouter();
  const [stories, setStories] = useState(initialStories);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [isPublic, setIsPublic] = useState(initialIsPublic);

  const [editOpen, setEditOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState(initialTitle);
  const [draftDesc, setDraftDesc] = useState(initialDescription ?? "");
  const [draftPublic, setDraftPublic] = useState(initialIsPublic);
  const [saving, setSaving] = useState(false);

  async function handleSaveEdit() {
    if (draftTitle.trim().length < 1) {
      toast.error("标题不能为空");
      return;
    }
    setSaving(true);
    try {
      await updateCollection({
        id,
        title: draftTitle.trim(),
        description: draftDesc.trim(),
        isPublic: draftPublic,
      });
      setTitle(draftTitle.trim());
      setDescription(draftDesc.trim() || null);
      setIsPublic(draftPublic);
      setEditOpen(false);
      toast.success("已保存");
    } catch (err) {
      toast.error(formatError(err, "保存失败"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCollection() {
    if (!confirm(`删除合集「${title}」？此操作不可恢复。`)) return;
    try {
      await deleteCollection(id);
      toast.success("合集已删除");
      router.push("/collections");
    } catch (err) {
      toast.error(formatError(err, "删除失败"));
    }
  }

  async function handleRemoveStory(storyId: string) {
    const prev = stories;
    setStories((s) => s.filter((x) => x.id !== storyId));
    try {
      await removeStoryFromCollection(id, storyId);
      toast.success("已移出合集");
    } catch (err) {
      setStories(prev);
      toast.error(formatError(err, "移出失败"));
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/collections"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="size-4" />
        全部合集
      </Link>

      <header className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="flex items-center gap-2.5 font-display text-2xl md:text-3xl font-bold text-foreground">
            <span className="flex items-center justify-center size-9 rounded-xl bg-primary/15 text-primary shrink-0">
              <Library className="size-5" />
            </span>
            <span className="flex items-center gap-2">
              {!isPublic && <Lock className="size-4 text-muted-foreground" />}
              {title}
            </span>
          </h1>
          {isOwner && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditOpen(true)}>
                <Pencil className="size-3.5" />
                编辑
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 text-muted-foreground hover:text-destructive"
                onClick={handleDeleteCollection}
                aria-label="删除合集"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          )}
        </div>
        {description && <p className="text-muted-foreground leading-relaxed">{description}</p>}
        <p className="text-sm text-muted-foreground">
          <Link href={`/users/${owner.username}`} className="hover:text-primary transition-colors">
            {owner.displayName || owner.username}
          </Link>{" "}
          · {stories.length} 篇
        </p>
      </header>

      {stories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="flex items-center justify-center size-16 rounded-2xl bg-secondary mx-auto mb-4">
              <Library className="size-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              {isOwner
                ? "合集还是空的 — 在任意故事页点「合集」把它收进来。"
                : "这个合集还没有作品。"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((s) => (
            <div key={s.id} className="relative">
              <StoryCard story={s} />
              {isOwner && (
                <button
                  type="button"
                  onClick={() => handleRemoveStory(s.id)}
                  aria-label="移出合集"
                  className="absolute top-2 right-2 z-30 flex items-center justify-center size-7 rounded-full bg-background/90 border border-border text-muted-foreground hover:text-destructive shadow-sm"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">编辑合集</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              aria-label="合集标题"
            />
            <Textarea
              value={draftDesc}
              onChange={(e) => setDraftDesc(e.target.value)}
              placeholder="简介（可选）"
              rows={3}
              className="resize-none"
              aria-label="合集简介"
            />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={draftPublic}
                onChange={(e) => setDraftPublic(e.target.checked)}
                className="size-4 accent-[var(--primary)]"
              />
              公开此合集
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              取消
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving || !draftTitle.trim()}>
              {saving ? "保存中…" : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
