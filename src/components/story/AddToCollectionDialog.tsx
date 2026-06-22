"use client";

import { useEffect, useState } from "react";
import { Check, Plus, Loader2, FolderPlus, Lock } from "lucide-react";
import { toast } from "sonner";
import { formatError } from "@/lib/format-error";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  getMyCollectionsWithFlag,
  addStoryToCollection,
  removeStoryFromCollection,
  createCollection,
} from "@/lib/actions/collection";

interface CollectionRow {
  id: string;
  title: string;
  isPublic: boolean;
  storyCount: number;
  contains: boolean;
}

interface AddToCollectionDialogProps {
  storyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddToCollectionDialog({ storyId, open, onOpenChange }: AddToCollectionDialogProps) {
  const [rows, setRows] = useState<CollectionRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRows(null);
    getMyCollectionsWithFlag(storyId)
      .then(setRows)
      .catch(() => setRows([]));
  }, [open, storyId]);

  async function toggle(row: CollectionRow) {
    setBusyId(row.id);
    try {
      if (row.contains) {
        await removeStoryFromCollection(row.id, storyId);
      } else {
        await addStoryToCollection(row.id, storyId);
      }
      setRows((prev) =>
        prev!.map((r) =>
          r.id === row.id
            ? {
                ...r,
                contains: !r.contains,
                storyCount: r.storyCount + (r.contains ? -1 : 1),
              }
            : r
        )
      );
    } catch (err) {
      toast.error(formatError(err, "操作失败"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreate() {
    const title = newTitle.trim();
    if (title.length < 1) return;
    setCreating(true);
    try {
      const { id } = await createCollection({ title });
      await addStoryToCollection(id, storyId);
      setNewTitle("");
      setRows((prev) => [
        { id, title, isPublic: true, storyCount: 1, contains: true },
        ...(prev ?? []),
      ]);
      toast.success("已创建合集并加入");
    } catch (err) {
      toast.error(formatError(err, "创建失败"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <FolderPlus className="size-5 text-primary" />
            加入合集
          </DialogTitle>
          <DialogDescription>把这篇故事收进你的专题合集 / 书单。</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2 max-h-[50vh] overflow-y-auto">
          {rows === null ? (
            <p className="text-sm text-muted-foreground text-center py-6">加载中…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              还没有合集，在下面新建一个吧。
            </p>
          ) : (
            rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => toggle(row)}
                disabled={busyId === row.id}
                className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors disabled:opacity-60 ${
                  row.contains ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  {!row.isPublic && <Lock className="size-3.5 text-muted-foreground shrink-0" />}
                  <span className="truncate text-sm text-foreground">{row.title}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{row.storyCount} 篇</span>
                </span>
                {busyId === row.id ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground shrink-0" />
                ) : row.contains ? (
                  <Check className="size-4 text-primary shrink-0" />
                ) : (
                  <Plus className="size-4 text-muted-foreground shrink-0" />
                )}
              </button>
            ))
          )}
        </div>

        <div className="flex gap-2 border-t border-border pt-3">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreate();
              }
            }}
            placeholder="新建合集，如「甜饼专场」"
            aria-label="新合集标题"
          />
          <Button onClick={handleCreate} disabled={creating || !newTitle.trim()} className="gap-1.5 shrink-0">
            <Plus className="size-4" />
            新建
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
