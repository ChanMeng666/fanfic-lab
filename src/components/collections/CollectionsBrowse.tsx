"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Library, Plus, Lock, Trash2, FolderOpen } from "lucide-react";
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
import { createCollection, deleteCollection } from "@/lib/actions/collection";

export interface CollectionSummary {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  ownerName: string;
  ownerUsername: string;
  storyCount: number;
}

interface CollectionsBrowseProps {
  publicCollections: CollectionSummary[];
  myCollections: CollectionSummary[];
  isLoggedIn: boolean;
}

function CollectionCard({ c, owned }: { c: CollectionSummary; owned?: boolean }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`删除合集「${c.title}」？`)) return;
    setDeleting(true);
    try {
      await deleteCollection(c.id);
      toast.success("已删除");
      router.refresh();
    } catch (err) {
      toast.error(formatError(err, "删除失败"));
      setDeleting(false);
    }
  }

  return (
    <Card variant="story" className="overflow-hidden">
      <Link href={`/collections/${c.id}`} className="block p-4 hover:bg-muted/40 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground line-clamp-1 flex items-center gap-1.5">
            {!c.isPublic && <Lock className="size-3.5 text-muted-foreground shrink-0" />}
            {c.title}
          </h3>
          {owned && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              aria-label="删除合集"
              className="relative z-20 text-muted-foreground hover:text-destructive shrink-0"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
        {c.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1.5">{c.description}</p>
        )}
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <FolderOpen className="size-3.5" />
          {c.storyCount} 篇
          <span>·</span>
          <span className="truncate">{c.ownerName}</span>
        </div>
      </Link>
    </Card>
  );
}

export function CollectionsBrowse({
  publicCollections,
  myCollections,
  isLoggedIn,
}: CollectionsBrowseProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (title.trim().length < 1) {
      toast.error("请填写合集标题");
      return;
    }
    setSaving(true);
    try {
      await createCollection({ title: title.trim(), description: description.trim(), isPublic });
      toast.success("合集已创建");
      setCreateOpen(false);
      setTitle("");
      setDescription("");
      setIsPublic(true);
      router.refresh();
    } catch (err) {
      toast.error(formatError(err, "创建失败"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
            <span className="flex items-center justify-center size-10 rounded-xl bg-primary/15 text-primary">
              <Library className="size-6" />
            </span>
            专题合集
          </h1>
          <p className="text-muted-foreground">由社区策展的主题书单，发现成组的好故事。</p>
        </div>
        {isLoggedIn && (
          <Button className="gap-1.5 shrink-0" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            新建合集
          </Button>
        )}
      </div>

      {isLoggedIn && myCollections.length > 0 && (
        <section>
          <h2 className="font-display text-lg text-foreground mb-3">我的合集</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myCollections.map((c) => (
              <CollectionCard key={c.id} c={c} owned />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-display text-lg text-foreground mb-3">公开合集</h2>
        {publicCollections.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="flex items-center justify-center size-16 rounded-2xl bg-secondary mx-auto mb-4">
                <Library className="size-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">还没有公开合集，来建第一个吧。</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {publicCollections.map((c) => (
              <CollectionCard key={c.id} c={c} />
            ))}
          </div>
        )}
      </section>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">新建合集</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="合集标题，如「高质量长篇」"
              aria-label="合集标题"
            />
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简介（可选）"
              rows={3}
              className="resize-none"
              aria-label="合集简介"
            />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="size-4 accent-[var(--primary)]"
              />
              公开此合集（其他人可浏览）
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={saving || !title.trim()}>
              {saving ? "创建中…" : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
