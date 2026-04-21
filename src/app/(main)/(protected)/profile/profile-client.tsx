"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  Heart,
  MessageSquare,
  FileText,
  Trash2,
  Edit,
  BarChart3,
  PenLine,
  Camera,
  X,
  Plus,
  Pencil,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StoryCard, type StoryCardData } from "@/components/feed";
import { updateProfile, updatePreferences } from "@/lib/actions/user";
import { deleteStory } from "@/lib/actions/story";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  username: string;
  displayName: string | null;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  preferences: {
    favoriteFandoms: string[];
    favoriteShips: string[];
    darkMode: boolean;
  } | null;
  _count: {
    stories: number;
    followers: number;
    follows: number;
  };
}

interface Story {
  id: string;
  title: string;
  summary: string | null;
  fandom: string;
  ships: string[];
  tags: string[];
  rating: string;
  status: string;
  wordCount: number;
  coverImageUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  _count: {
    likes: number;
    comments: number;
    chapters: number;
  };
}

interface UserStats {
  totalStories: number;
  publishedStories: number;
  totalWords: number;
  totalLikes: number;
  totalComments: number;
  followers: number;
}

interface ProfileClientProps {
  profile: UserProfile;
  stories: Story[];
  likedStories: Story[];
  stats: UserStats;
}

const KNOWN_FANDOMS = [
  "Honkai: Star Rail",
  "Genshin Impact",
  "Honkai Impact 3rd",
  "Zenless Zone Zero",
  "Arknights",
  "Fate Series",
];

function toCardData(story: Story, fallbackAuthor: { id: string; username: string; avatarUrl: string | null }): StoryCardData {
  const author = story.author ?? fallbackAuthor;
  const status = (["DRAFT", "PUBLISHED", "COMPLETE"] as const).includes(story.status as never)
    ? (story.status as "DRAFT" | "PUBLISHED" | "COMPLETE")
    : "PUBLISHED";
  const rating = (["GENERAL", "TEEN", "MATURE", "EXPLICIT"] as const).includes(story.rating as never)
    ? (story.rating as "GENERAL" | "TEEN" | "MATURE" | "EXPLICIT")
    : "GENERAL";
  return {
    id: story.id,
    title: story.title,
    summary: story.summary ?? "",
    fandom: story.fandom,
    ships: story.ships,
    tags: story.tags,
    rating,
    status,
    wordCount: story.wordCount,
    chapterCount: story._count.chapters,
    likes: story._count.likes,
    comments: story._count.comments,
    coverUrl: story.coverImageUrl ?? undefined,
    author: {
      id: author.id,
      username: author.username,
      avatarUrl: author.avatarUrl ?? undefined,
    },
    updatedAt: story.updatedAt,
  };
}

export function ProfileClient({
  profile: initialProfile,
  stories: initialStories,
  likedStories,
  stats,
}: ProfileClientProps) {
  const searchParams = useSearchParams();

  const [profile, setProfile] = useState(initialProfile);
  const [stories, setStories] = useState(initialStories);

  const tabParam = searchParams.get("tab");
  const initialTab = tabParam && ["stories", "liked"].includes(tabParam) ? tabParam : "stories";
  const [activeTab, setActiveTab] = useState(initialTab);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: profile.displayName || "",
    bio: profile.bio || "",
  });
  const [favoriteFandoms, setFavoriteFandoms] = useState<string[]>(
    profile.preferences?.favoriteFandoms ?? []
  );
  const [newFandom, setNewFandom] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fallbackAuthor = {
    id: profile.id,
    username: profile.username,
    avatarUrl: profile.avatarUrl,
  };

  function addFandom(value: string) {
    const v = value.trim();
    if (!v) return;
    if (favoriteFandoms.includes(v)) return;
    setFavoriteFandoms((prev) => [...prev, v]);
    setNewFandom("");
  }

  function removeFandom(value: string) {
    setFavoriteFandoms((prev) => prev.filter((f) => f !== value));
  }

  async function handleSaveProfile() {
    setIsSaving(true);
    try {
      await Promise.all([
        updateProfile({
          displayName: editForm.displayName || undefined,
          bio: editForm.bio || undefined,
        }),
        updatePreferences({ favoriteFandoms }),
      ]);
      setProfile((prev) => ({
        ...prev,
        displayName: editForm.displayName,
        bio: editForm.bio,
        preferences: {
          favoriteFandoms,
          favoriteShips: prev.preferences?.favoriteShips ?? [],
          darkMode: prev.preferences?.darkMode ?? false,
        },
      }));
      setIsEditingProfile(false);
      toast.success("资料更新成功");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "更新资料失败");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAvatarUpload(file: File) {
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/avatar", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "上传失败");
      }
      const data = await res.json();
      setProfile((prev) => ({ ...prev, avatarUrl: data.url }));
      toast.success("头像已更新");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "头像上传失败");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    setDeleting(true);
    try {
      await deleteStory(pendingDeleteId);
      setStories((prev) => prev.filter((s) => s.id !== pendingDeleteId));
      toast.success("故事已删除");
      setPendingDeleteId(null);
    } catch {
      toast.error("删除故事失败");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
          {/* Profile Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-24 w-24 mb-4 ring-4 ring-secondary">
                    <AvatarImage src={profile.avatarUrl || undefined} />
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                      {profile.displayName?.[0] || profile.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h1 className="text-xl font-display font-bold text-foreground">
                    {profile.displayName || profile.username}
                  </h1>
                  <p className="text-sm text-muted-foreground">@{profile.username}</p>
                  {profile.bio && (
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                      {profile.bio}
                    </p>
                  )}
                  <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="mt-4 gap-1.5">
                        <Edit className="size-3.5" />
                        编辑资料
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="font-display">编辑资料</DialogTitle>
                        <DialogDescription>
                          修改你的头像、昵称、简介与偏好
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-5 py-4">
                        {/* Avatar */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">头像</label>
                          <div className="flex items-center gap-4">
                            <Avatar className="size-16 ring-2 ring-border">
                              <AvatarImage src={profile.avatarUrl || undefined} />
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {profile.displayName?.[0] || profile.username[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col gap-1.5">
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleAvatarUpload(f);
                                }}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                disabled={uploadingAvatar}
                                onClick={() => fileInputRef.current?.click()}
                              >
                                <Camera className="size-3.5" />
                                {uploadingAvatar ? "上传中…" : "更换头像"}
                              </Button>
                              <p className="text-xs text-muted-foreground">
                                JPG / PNG / WebP，≤ 5MB
                              </p>
                            </div>
                          </div>
                        </div>
                        {/* Name */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">昵称</label>
                          <Input
                            value={editForm.displayName}
                            onChange={(e) =>
                              setEditForm({ ...editForm, displayName: e.target.value })
                            }
                            placeholder="输入你的昵称"
                          />
                        </div>
                        {/* Bio */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">个人简介</label>
                          <Textarea
                            value={editForm.bio}
                            onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                            placeholder="介绍一下自己吧..."
                            rows={3}
                          />
                        </div>
                        {/* Favorite Fandoms */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            喜欢的作品
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {favoriteFandoms.map((f) => (
                              <Badge
                                key={f}
                                variant="secondary"
                                className="gap-1 pr-1"
                              >
                                {f}
                                <button
                                  type="button"
                                  onClick={() => removeFandom(f)}
                                  aria-label={`移除 ${f}`}
                                  className="rounded-full hover:bg-background/40 p-0.5"
                                >
                                  <X className="size-3" />
                                </button>
                              </Badge>
                            ))}
                            {favoriteFandoms.length === 0 && (
                              <span className="text-xs text-muted-foreground">
                                暂未选择，可从下方常见作品中挑选或自行输入
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1.5">
                            <Input
                              value={newFandom}
                              onChange={(e) => setNewFandom(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addFandom(newFandom);
                                }
                              }}
                              placeholder="输入作品名后按回车"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addFandom(newFandom)}
                              className="gap-1"
                            >
                              <Plus className="size-3.5" />
                              添加
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {KNOWN_FANDOMS.filter((f) => !favoriteFandoms.includes(f)).map(
                              (f) => (
                                <button
                                  key={f}
                                  type="button"
                                  onClick={() => addFandom(f)}
                                  className="text-xs px-2 py-1 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-border-strong transition-colors"
                                >
                                  + {f}
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditingProfile(false)}>
                          取消
                        </Button>
                        <Button onClick={handleSaveProfile} disabled={isSaving}>
                          {isSaving ? "保存中..." : "保存"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="mt-6 pt-6 border-t border-border grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold text-foreground">
                      {profile._count.stories}
                    </div>
                    <div className="text-xs text-muted-foreground">作品</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-foreground">
                      {profile._count.followers}
                    </div>
                    <div className="text-xs text-muted-foreground">粉丝</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-foreground">
                      {profile._count.follows}
                    </div>
                    <div className="text-xs text-muted-foreground">关注</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2.5 text-base">
                  <div className="flex items-center justify-center size-8 rounded-xl bg-secondary text-secondary-foreground">
                    <BarChart3 className="size-4" />
                  </div>
                  创作统计
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">总字数</span>
                  <span className="font-medium text-foreground">
                    {stats.totalWords.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">已发布</span>
                  <span className="font-medium text-foreground">
                    {stats.publishedStories}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">获赞</span>
                  <span className="font-medium text-foreground">{stats.totalLikes}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">评论</span>
                  <span className="font-medium text-foreground">
                    {stats.totalComments}
                  </span>
                </div>
              </CardContent>
            </Card>

            {profile.preferences?.favoriteFandoms &&
              profile.preferences.favoriteFandoms.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2.5 text-base">
                      <div className="flex items-center justify-center size-8 rounded-xl bg-accent/15 text-accent">
                        <Heart className="size-4" />
                      </div>
                      喜欢的作品
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {profile.preferences.favoriteFandoms.map((fandom) => (
                        <Badge key={fandom} variant="secondary">
                          {fandom}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
          </div>

          {/* Main Content */}
          <div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 max-w-sm">
                <TabsTrigger value="stories" className="gap-1.5">
                  <BookOpen className="size-4" />
                  作品 ({stories.length})
                </TabsTrigger>
                <TabsTrigger value="liked" className="gap-1.5">
                  <Heart className="size-4" />
                  收藏 ({likedStories.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="stories" className="mt-6">
                {stories.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <div className="flex items-center justify-center size-16 rounded-2xl bg-secondary mx-auto mb-4">
                        <BookOpen className="size-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        还没有作品
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        你还没有创作过故事，开始你的创作之旅吧
                      </p>
                      <Link href="/create">
                        <Button className="gap-2">
                          <PenLine className="size-4" />
                          开始创作
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {stories.map((story) => (
                      <Card key={story.id} variant="story" className="overflow-hidden">
                        <Link
                          href={`/story/${story.id}`}
                          aria-label={story.title}
                          className="absolute inset-0 z-10"
                        />
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-foreground line-clamp-1">
                                {story.title}
                              </h3>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {story.fandom}
                                </Badge>
                                <Badge
                                  variant={story.status === "PUBLISHED" ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {story.status === "PUBLISHED"
                                    ? "已发布"
                                    : story.status === "COMPLETE"
                                      ? "已完结"
                                      : story.status === "DRAFT"
                                        ? "草稿"
                                        : story.status}
                                </Badge>
                              </div>
                            </div>
                            <div className="relative z-20 flex items-center gap-1">
                              <Link
                                href={`/story/${story.id}/edit`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1.5"
                                  aria-label="编辑故事"
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setPendingDeleteId(story.id);
                                }}
                                aria-label="删除故事"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                          {story.summary && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {story.summary}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FileText className="size-3.5" />
                              {story._count.chapters} 章
                            </span>
                            <span>{story.wordCount.toLocaleString()} 字</span>
                            <span className="flex items-center gap-1">
                              <Heart className="size-3.5" />
                              {story._count.likes}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="size-3.5" />
                              {story._count.comments}
                            </span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="liked" className="mt-6">
                {likedStories.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <div className="flex items-center justify-center size-16 rounded-2xl bg-accent/10 mx-auto mb-4">
                        <Heart className="size-8 text-accent" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        还没有收藏的故事
                      </h3>
                      <p className="text-muted-foreground">
                        浏览故事并点击收藏，你喜欢的故事会出现在这里
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {likedStories.map((story) => (
                      <StoryCard
                        key={story.id}
                        story={toCardData(story, fallbackAuthor)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* Delete confirmation dialog */}
      <Dialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDeleteId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              确认删除
            </DialogTitle>
            <DialogDescription>
              这篇故事将被永久删除，且无法恢复。确定继续吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingDeleteId(null)}
              disabled={deleting}
            >
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "删除中…" : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
